package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"slices"
	"strings"
	"sync"
	"time"

	"easydict-linux/internal/assets"
	"easydict-linux/internal/bridge"
	"easydict-linux/internal/config"
	"easydict-linux/internal/services"
	"easydict-linux/internal/shortcuts"
	"github.com/egoist/mygo"
)

type Application struct {
	window          *mygo.Window
	bubbleWindow    *mygo.Window
	selectionWindow *mygo.Window
	tray            *mygo.Tray
	manager         *services.Manager
	bridge          *bridge.AppBridge
	ocrService      *services.OCRService

	mu                 sync.Mutex
	lastSelection      string
	lastSelectionPoint mygo.Point
	frontendReady      map[*mygo.Window]bool
	pendingQuery       map[*mygo.Window]string
	deliveredQuery     map[*mygo.Window]string
	registeredKeys     []string
	shortcutStatuses   []shortcuts.Status
	resizeSaveTimer    *time.Timer
}

func main() {
	configureWebKitRenderer()
	inputFlag := flag.Bool("input", false, "Open window and focus input field")
	flag.BoolVar(inputFlag, "i", false, "Short alias for --input")
	selectionFlag := flag.Bool("selection", false, "Query highlighted text on launch")
	flag.BoolVar(selectionFlag, "s", false, "Short alias for --selection")
	ocrFlag := flag.Bool("ocr", false, "Capture screen area and translate")
	ocrSilentFlag := flag.Bool("ocr-silent", false, "Silent screenshot OCR to clipboard")
	flag.Parse()

	app := &Application{
		manager:        services.NewManager(),
		ocrService:     services.NewOCRService(),
		frontendReady:  make(map[*mygo.Window]bool),
		pendingQuery:   make(map[*mygo.Window]string),
		deliveredQuery: make(map[*mygo.Window]string),
	}
	app.bridge = bridge.NewAppBridge(
		app.manager,
		func(text string) {
			app.queryText(text)
		},
		func() {
			app.triggerBubbleSelection()
		},
		func(win *mygo.Window) string {
			app.mu.Lock()
			defer app.mu.Unlock()
			app.frontendReady[win] = true
			text := app.pendingQuery[win]
			delete(app.pendingQuery, win)
			if text != "" {
				app.deliveredQuery[win] = text
			}
			return text
		},
		app.saveConfigAndSyncShortcuts,
		app.shortcutStatusesSnapshot,
		app.expandSelectionWindow,
	)

	// 1. Set App name BEFORE single instance lock so socket hash is consistent
	mygo.App.SetName("Easydict")
	if !mygo.App.RequestSingleInstanceLock() {
		// If another instance is running, it hands over args and exits
		return
	}

	// 2. Bind Go RPC methods & keep running on window close
	mygo.App.OnWindowAllClosed(func() {}) // keep running in background/tray
	mygo.BindAs("AppBridge", app.bridge)

	// 3. Second instance handler: wake up window according to CLI flags
	mygo.App.OnSecondInstance(func(args []string, cwd string) {
		if slices.Contains(args, "--ocr-silent") {
			go app.triggerOCRSilent()
			return
		}
		if slices.Contains(args, "--ocr") {
			go app.triggerOCRTranslate()
			return
		}
		if slices.Contains(args, "--selection") || slices.Contains(args, "-s") {
			app.querySelection()
			return
		}
		for _, arg := range args {
			if !strings.HasPrefix(arg, "-") && strings.TrimSpace(arg) != "" {
				app.queryText(strings.TrimSpace(arg))
				return
			}
		}
		// Default or --input: open and focus input
		app.showWindowInput()
	})

	// 4. When runtime is ready
	mygo.App.WhenReady(func() {
		app.initWindow()
		app.initBubbleWindow()
		app.initTray()
		app.initShortcuts()
		app.startSelectionWatcher()

		// Handle initial flags
		if *ocrSilentFlag {
			go app.triggerOCRSilent()
		} else if *ocrFlag {
			go app.triggerOCRTranslate()
		} else if *selectionFlag {
			app.querySelection()
		} else if len(flag.Args()) > 0 {
			query := strings.Join(flag.Args(), " ")
			app.queryText(query)
		} else {
			app.showWindowInput()
		}
	})

	if err := mygo.App.Run(); err != nil {
		log.Fatal("Easydict application error:", err)
	}
}

func configureWebKitRenderer() {
	// mygo disables DMA-BUF by default; retain WebKit's native renderer unless explicitly overridden.
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "0")
	}
}

func (a *Application) initWindow() {
	cfg := config.Get()

	w := cfg.WindowWidth
	if w <= 0 {
		w = 640
	}
	h := cfg.WindowHeight
	if h <= 0 {
		h = 580
	}

	a.window = mygo.NewWindow(mygo.WindowOptions{
		Title:       "Easydict",
		Width:       w,
		Height:      h,
		MinWidth:    460,
		MinHeight:   420,
		AlwaysOnTop: cfg.AlwaysOnTop,
		Hidden:      true,
	})

	// Set application icon
	iconBytes := assets.GenerateAppIcon()
	_ = a.window.SetIcon(iconBytes)

	// Intercept window close so it hides into system tray instead of terminating
	stopHidingOnClose := a.window.OnClose(func(e *mygo.CloseEvent) {
		e.PreventDefault()
		a.saveWindowSize()
		a.window.Hide()
	})
	mygo.App.OnBeforeQuit(func(*mygo.QuitEvent) { stopHidingOnClose() })
	a.window.OnResize(a.scheduleWindowSizeSave)
	a.window.OnHide(a.saveWindowSize)
	mygo.App.OnBeforeQuit(func(*mygo.QuitEvent) { a.saveWindowSize() })

	// Load embedded single-page HTML interface
	a.window.Page().LoadHTML(assets.GetHTML(), "")
	a.window.Center()
}

func (a *Application) scheduleWindowSizeSave() {
	a.mu.Lock()
	if a.resizeSaveTimer != nil {
		a.resizeSaveTimer.Stop()
	}
	a.resizeSaveTimer = time.AfterFunc(350*time.Millisecond, a.saveWindowSize)
	a.mu.Unlock()
}

func (a *Application) saveWindowSize() {
	a.mu.Lock()
	if a.resizeSaveTimer != nil {
		a.resizeSaveTimer.Stop()
		a.resizeSaveTimer = nil
	}
	window := a.window
	a.mu.Unlock()
	if window == nil {
		return
	}
	width, height := window.Size()
	if width < 460 || height < 420 {
		return
	}
	cfg := config.Get()
	if cfg.WindowWidth == width && cfg.WindowHeight == height {
		return
	}
	if err := cfg.Update(func(c *config.Config) {
		c.WindowWidth = width
		c.WindowHeight = height
	}); err != nil {
		log.Printf("Save window size: %v", err)
	}
}

func (a *Application) initBubbleWindow() {
	a.bubbleWindow = mygo.NewWindow(mygo.WindowOptions{
		Title:         "Easydict Selection Bubble",
		Width:         36,
		Height:        36,
		Frameless:     true,
		AlwaysOnTop:   true,
		Panel:         true, // Uses gtk-layer-shell overlay on Wayland
		SkipTaskbar:   true,
		DisableResize: true,
		DisableShadow: true,
		Transparent:   true,
		Hidden:        true,
	})
	if err := keepBubbleUnfocused(a.bubbleWindow); err != nil {
		log.Fatalf("Configure selection bubble focus: %v", err)
	}

	a.bubbleWindow.Page().LoadHTML(assets.GetBubbleHTML(), "")
}

func (a *Application) focusAppWindow() {
	if a.window == nil {
		return
	}
	a.window.Focus()
	if isCommandAvailable("hyprctl") {
		cmd := exec.Command("hyprctl", "repl", `return hl.dsp.focus({ window = "class:easydict" })`)
		cmd.Stdin = strings.NewReader("\n")
		_ = cmd.Run()
	}
}

func (a *Application) showWindowInput() {
	if a.window == nil {
		return
	}
	a.hideBubble()
	a.hideSelectionWindow()
	if !a.window.IsVisible() {
		a.window.Center()
		a.window.Show()
	}
	a.focusAppWindow()

	// Focus and select input text
	a.window.Page().Eval(`
		(function() {
			if (window.__easydict_focus_input) {
				window.__easydict_focus_input();
			} else {
				const el = document.getElementById("query-input") || document.querySelector("input[type=text]");
				if (el) {
					el.focus();
					el.select();
				}
			}
		})();
	`)
}

func (a *Application) hideSelectionWindow() {
	a.mu.Lock()
	selectionWindow := a.selectionWindow
	a.mu.Unlock()
	if selectionWindow != nil && selectionWindow.IsVisible() {
		selectionWindow.Hide()
	}
}

// expandSelectionWindow carries the popup's current query into the main
// window, where a long answer has more room.
func (a *Application) expandSelectionWindow() {
	a.mu.Lock()
	selectionWindow := a.selectionWindow
	text := a.deliveredQuery[selectionWindow]
	if selectionWindow != nil {
		if text == "" {
			text = a.pendingQuery[selectionWindow]
		}
	}
	a.mu.Unlock()
	if selectionWindow != nil {
		selectionWindow.Hide()
	}
	if text != "" {
		a.queryText(text)
		return
	}
	a.showWindowInput()
}

func (a *Application) positionWindowNearCursor() {
	if a.window == nil {
		return
	}
	x, y := services.GetCursorScreenPoint()
	cfg := config.Get()
	w := cfg.WindowWidth
	if w <= 0 {
		w = 640
	}
	h := cfg.WindowHeight
	if h <= 0 {
		h = 580
	}

	targetX := x + 16
	targetY := y + 16

	d := mygo.Screen.DisplayNearestPoint(mygo.Point{X: x, Y: y})
	if d.Bounds.Width > 0 && d.Bounds.Height > 0 {
		maxX := d.Bounds.X + d.Bounds.Width - w - 20
		maxY := d.Bounds.Y + d.Bounds.Height - h - 40
		if targetX > maxX {
			targetX = x - w - 16
		}
		if targetX < d.Bounds.X+20 {
			targetX = d.Bounds.X + 20
		}
		if targetY > maxY {
			targetY = y - h - 16
		}
		if targetY < d.Bounds.Y+20 {
			targetY = d.Bounds.Y + 20
		}
	}

	a.window.SetPosition(targetX, targetY)
}

func (a *Application) triggerBubbleSelection() {
	a.mu.Lock()
	text := a.lastSelection
	point := a.lastSelectionPoint
	a.mu.Unlock()
	a.hideBubble()

	if text == "" {
		return
	}
	a.showSelectionTranslation(text, point)
}

func (a *Application) querySelection() {
	a.hideBubble()
	text := services.GetSelectedText()
	if text == "" {
		services.SendDesktopNotification("Easydict", "未读取到选中文字，请重新选中或使用截图翻译")
		return
	}
	x, y := services.GetCursorScreenPoint()
	a.showSelectionTranslation(text, mygo.Point{X: x, Y: y})
}

func (a *Application) queryText(text string) {
	if a.window == nil {
		return
	}
	a.hideBubble()
	if !a.window.IsVisible() {
		a.window.Center()
		a.window.Show()
	}
	a.focusAppWindow()
	a.deliverQuery(a.window, text)
}

func (a *Application) deliverQuery(win *mygo.Window, text string) {
	a.mu.Lock()
	if !a.frontendReady[win] {
		a.pendingQuery[win] = text
		a.mu.Unlock()
		return
	}
	a.deliveredQuery[win] = text
	a.mu.Unlock()
	escaped, _ := json.Marshal(text)
	cfg, _ := json.Marshal(config.Get())
	js := fmt.Sprintf(`
		(function() {
			if (window.__easydict_query) {
				window.__easydict_query(%s, %s);
			}
		})();
	`, escaped, cfg)
	win.Page().Eval(js)
}

func (a *Application) triggerOCRTranslate() {
	wasVisible := false
	if a.window != nil && a.window.IsVisible() {
		wasVisible = true
		a.window.Hide()
		time.Sleep(120 * time.Millisecond)
	}

	img, err := a.ocrService.CaptureScreenArea()
	if err != nil {
		if services.IsSelectionCancelled(err) {
			if wasVisible {
				a.window.Show()
			}
			return
		}
		services.SendDesktopNotification("Easydict OCR", "截图失败："+err.Error())
		if wasVisible {
			a.window.Show()
		}
		return
	}

	text, err := a.ocrService.RecognizeText(img)
	if err != nil || strings.TrimSpace(text) == "" {
		services.SendDesktopNotification("Easydict OCR", "未识别出有效文本")
		if wasVisible {
			a.window.Show()
		}
		return
	}

	a.positionWindowNearCursor()
	a.queryText(strings.TrimSpace(text))
}

func (a *Application) triggerOCRSilent() {
	wasVisible := false
	if a.window != nil && a.window.IsVisible() {
		wasVisible = true
		a.window.Hide()
		time.Sleep(120 * time.Millisecond)
	}

	_ = a.bridge.TriggerOCR(context.Background(), true)

	if wasVisible {
		a.window.Show()
	}
}

func (a *Application) hideBubble() {
	a.mu.Lock()
	a.lastSelection = ""
	a.mu.Unlock()
	if a.bubbleWindow != nil && a.bubbleWindow.IsVisible() {
		a.bubbleWindow.Hide()
	}
}

func (a *Application) startSelectionWatcher() {
	ctx, cancel := context.WithCancel(context.Background())
	mygo.App.OnWillQuit(func(*mygo.QuitEvent) { cancel() })
	updates := make(chan string, 1)
	go services.WatchSelectedText(ctx, func(text string) {
		select {
		case <-updates:
		default:
		}
		select {
		case updates <- text:
		case <-ctx.Done():
		}
	})
	go func() {
		ticker := time.NewTicker(250 * time.Millisecond)
		defer ticker.Stop()
		debounce := time.NewTimer(time.Hour)
		debounce.Stop()
		defer debounce.Stop()
		hide := time.NewTimer(time.Hour)
		hide.Stop()
		defer hide.Stop()
		var pending string
		var x, y int
		for {
			select {
			case <-ctx.Done():
				return
			case text := <-updates:
				a.hideBubble()
				debounce.Stop()
				hide.Stop()
				pending = ""
				if text == "" || len([]rune(text)) > 1000 || !config.Get().AutoShowFloatingButton || a.translationWindowFocused() {
					continue
				}
				pending = text
				x, y = services.GetCursorScreenPoint()
				debounce.Reset(180 * time.Millisecond)
			case <-debounce.C:
				if pending == "" || !config.Get().AutoShowFloatingButton || a.translationWindowFocused() {
					continue
				}
				a.mu.Lock()
				a.lastSelection = pending
				a.lastSelectionPoint = mygo.Point{X: x, Y: y}
				a.mu.Unlock()
				// Reset the persistent page for every newly displayed selection.
				if _, err := a.bubbleWindow.Page().Eval(`window.__easydict_reset_bubble && window.__easydict_reset_bubble()`); err != nil {
					log.Printf("Reset selection bubble: %v", err)
					continue
				}
				d := mygo.Screen.DisplayNearestPoint(mygo.Point{X: x, Y: y})
				bx, by := x+14, y+14
				if d.Bounds.Width > 0 && d.Bounds.Height > 0 {
					bx = max(d.Bounds.X, min(bx, d.Bounds.X+d.Bounds.Width-36))
					by = max(d.Bounds.Y, min(by, d.Bounds.Y+d.Bounds.Height-36))
				}
				a.bubbleWindow.SetPosition(bx, by)
				a.bubbleWindow.ShowInactive()
				hide.Reset(5 * time.Second)
			case <-hide.C:
				pending = ""
				a.hideBubble()
			case <-ticker.C:
				if pending == "" {
					continue
				}
				if !config.Get().AutoShowFloatingButton || a.translationWindowFocused() {
					pending = ""
					debounce.Stop()
					a.hideBubble()
				}
			}
		}
	}()
}

func (a *Application) initTray() {
	trayIcon := assets.GenerateTrayIcon()
	tray, err := mygo.NewTray(mygo.TrayOptions{
		Icon:           trayIcon,
		IconIsTemplate: false,
		ToolTip:        "Easydict - 词典与翻译",
	})
	if err != nil {
		log.Printf("System tray warning: %v", err)
		return
	}
	a.tray = tray

	menu := mygo.NewMenu([]*mygo.MenuItem{
		{
			Label: "显示主窗口 (输入查词)",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				a.showWindowInput()
			},
		},
		{
			Label: "划词翻译 (Alt+D)",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				a.querySelection()
			},
		},
		{
			Label: "截图翻译 (Alt+S)",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				go a.triggerOCRTranslate()
			},
		},
		{
			Label: "静默截图 OCR (Alt+Shift+S)",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				go a.triggerOCRSilent()
			},
		},
		mygo.Separator(),
		{
			Label:   "划词自动弹出悬浮图标",
			Type:    mygo.MenuItemCheckbox,
			Checked: config.Get().AutoShowFloatingButton,
			Click: func(it *mygo.MenuItem, _ *mygo.Window) {
				_ = config.Get().Update(func(c *config.Config) {
					c.AutoShowFloatingButton = it.Checked
				})
			},
		},
		{
			Label:   "窗口置顶",
			Type:    mygo.MenuItemCheckbox,
			Checked: a.window.IsAlwaysOnTop(),
			Click: func(it *mygo.MenuItem, _ *mygo.Window) {
				a.window.SetAlwaysOnTop(it.Checked)
				_ = config.Get().Update(func(c *config.Config) {
					c.AlwaysOnTop = it.Checked
				})
			},
		},
		{
			Label: "偏好设置...",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				a.showWindowInput()
				a.window.Page().Eval(`window.__easydict_open_settings && window.__easydict_open_settings()`)
			},
		},
		mygo.Separator(),
		{
			Label: "退出 Easydict",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				mygo.App.Quit()
			},
		},
	})

	a.tray.SetMenu(menu)
	mygo.App.OnWillQuit(func(*mygo.QuitEvent) {
		if a.tray != nil {
			a.tray.Destroy()
		}
	})
}

func (a *Application) initShortcuts() {
	statuses := a.syncShortcuts(config.Get())
	a.mu.Lock()
	a.shortcutStatuses = statuses
	a.mu.Unlock()
	for _, status := range statuses {
		if !status.OK {
			log.Printf("Global shortcut %s: %s", status.Accelerator, status.Message)
		}
	}
}

func (a *Application) saveConfigAndSyncShortcuts(newCfg config.Config) shortcuts.SaveResult {
	cfg := config.Get()
	if err := cfg.Update(func(c *config.Config) {
		c.EnabledServices = newCfg.EnabledServices
		c.DefaultTargetLang = newCfg.DefaultTargetLang
		c.AIEnabled = newCfg.AIEnabled
		c.AIBaseURL = newCfg.AIBaseURL
		c.AIAPIKey = newCfg.AIAPIKey
		c.AIModel = newCfg.AIModel
		c.DeepLEnabled = newCfg.DeepLEnabled
		c.DeepLAuthKey = newCfg.DeepLAuthKey
		c.DeepLIsFree = newCfg.DeepLIsFree
		c.AutoQueryClipboard = newCfg.AutoQueryClipboard
		c.AutoShowFloatingButton = newCfg.AutoShowFloatingButton
		c.AlwaysOnTop = newCfg.AlwaysOnTop
		c.ShortcutInput = newCfg.ShortcutInput
		c.ShortcutSelection = newCfg.ShortcutSelection
		c.ShortcutOCR = newCfg.ShortcutOCR
		c.ShortcutOCRSilent = newCfg.ShortcutOCRSilent
		c.Theme = newCfg.Theme
	}); err != nil {
		return shortcuts.SaveResult{OK: false, Error: "保存设置失败：" + err.Error()}
	}

	result := shortcuts.SaveResult{OK: true, Saved: true, Shortcuts: a.syncShortcuts(cfg)}
	a.mu.Lock()
	a.shortcutStatuses = result.Shortcuts
	a.mu.Unlock()
	for _, status := range result.Shortcuts {
		if !status.OK {
			result.OK = false
		}
	}
	return result
}

type shortcutAction struct {
	value string
	fn    func()
}

func (a *Application) syncShortcuts(cfg *config.Config) []shortcuts.Status {
	actions := []shortcutAction{
		{cfg.ShortcutInput, a.showWindowInput},
		{cfg.ShortcutSelection, a.querySelection},
		{cfg.ShortcutOCR, func() { go a.triggerOCRTranslate() }},
		{cfg.ShortcutOCRSilent, func() { go a.triggerOCRSilent() }},
	}
	labels := []string{"输入查词", "划词翻译", "截图翻译", "静默截图 OCR"}
	ids := []string{"shortcut_input", "shortcut_selection", "shortcut_ocr", "shortcut_ocr_silent"}
	defaults := []string{"Alt+A", "Alt+D", "Alt+S", "Alt+Shift+S"}

	for _, key := range a.registeredShortcuts() {
		mygo.GlobalShortcut.Unregister(key)
	}
	a.mu.Lock()
	a.registeredKeys = nil
	a.mu.Unlock()

	desktopBindings := loadDesktopBindings()
	seen := map[string]string{}
	statuses := make([]shortcuts.Status, len(actions))
	for i, action := range actions {
		status := shortcuts.Status{ID: ids[i], Label: labels[i], Accelerator: action.value}
		value := action.value
		if strings.TrimSpace(value) == "" {
			value = defaults[i]
			status.Accelerator = value
		}
		normalized, err := shortcuts.Normalize(value)
		if err != nil {
			status.Source = "error"
			status.Message = "格式无效：" + err.Error()
			statuses[i] = status
			continue
		}
		status.Accelerator = normalized
		if other, duplicate := seen[normalized]; duplicate {
			status.Source = "error"
			status.Message = "与“" + other + "”使用同一快捷键"
			statuses[i] = status
			continue
		}
		seen[normalized] = labels[i]
		conflict := shortcuts.FindDesktopConflict(normalized, desktopBindings)
		if conflict != nil && !conflict.Easydict {
			status.Source = "error"
			status.Message = "已被窗口管理器占用：" + conflict.Description + "。请换一个组合，或移除桌面绑定"
			statuses[i] = status
			continue
		}
		if conflict != nil && conflict.Easydict {
			status.OK = true
			status.Source = "desktop"
			status.Message = "由窗口管理器处理，应用内不会重复注册"
			statuses[i] = status
			continue
		}
		if err := mygo.GlobalShortcut.Register(normalized, action.fn); err != nil {
			status.Source = "error"
			status.Message = friendlyShortcutError(err)
			statuses[i] = status
			continue
		}
		a.mu.Lock()
		a.registeredKeys = append(a.registeredKeys, normalized)
		a.mu.Unlock()
		status.OK = true
		status.Source = "app"
		statuses[i] = status
	}
	return statuses
}

func (a *Application) registeredShortcuts() []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]string(nil), a.registeredKeys...)
}

func (a *Application) shortcutStatusesSnapshot() []shortcuts.Status {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]shortcuts.Status(nil), a.shortcutStatuses...)
}

func friendlyShortcutError(err error) string {
	message := err.Error()
	switch {
	case strings.Contains(message, "already registered"), strings.Contains(message, "already a global shortcut"):
		return "该快捷键已被其他应用占用，请换一个组合"
	case strings.Contains(message, "need the app installed"), strings.Contains(message, "GlobalShortcuts portal"):
		return "Wayland 无法注册全局快捷键：请先执行 make install，并在系统提示中允许快捷键"
	case strings.Contains(message, "no key for"):
		return "当前键盘布局不支持这个按键"
	default:
		return "注册失败：" + message
	}
}

func loadDesktopBindings() []shortcuts.DesktopBinding {
	if !isCommandAvailable("hyprctl") {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 700*time.Millisecond)
	defer cancel()
	output, err := exec.CommandContext(ctx, "hyprctl", "binds", "-j").Output()
	if err != nil {
		return nil
	}
	bindings, err := shortcuts.ParseHyprlandBindings(output)
	if err != nil {
		return nil
	}
	return bindings
}

func isCommandAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}
