package bridge

import (
	"context"
	"encoding/json"

	"easydict-linux/internal/config"
	"easydict-linux/internal/services"
	"github.com/egoist/mygo"
)

// AppBridge is exposed to JavaScript via `mygo.BindAs("AppBridge", ...)` or `mygo.Bind(...)`
type AppBridge struct {
	manager        *services.Manager
	ocrService     *services.OCRService
	onQueryText    func(text string)
	onBubbleAction func()
	onReady        func() string
}

func NewAppBridge(mgr *services.Manager, onQueryText func(text string), onBubbleAction func(), onReady func() string) *AppBridge {
	return &AppBridge{
		manager:        mgr,
		ocrService:     services.NewOCRService(),
		onQueryText:    onQueryText,
		onBubbleAction: onBubbleAction,
		onReady:        onReady,
	}
}

// Ready hands off a launch query after React has loaded its configuration and hooks.
func (b *AppBridge) Ready(ctx context.Context) string {
	if b.onReady != nil {
		return b.onReady()
	}
	return ""
}

// Query triggers multi-service translation and dictionary lookup
func (b *AppBridge) Query(ctx context.Context, req services.QueryRequest) []services.ServiceResult {
	return b.manager.QueryAll(req)
}

// QuerySingle triggers query for a single service (for refreshing individual cards)
func (b *AppBridge) QuerySingle(ctx context.Context, serviceID string, req services.QueryRequest) services.ServiceResult {
	res := b.manager.QuerySingle(serviceID, req)
	if res == nil {
		return services.ServiceResult{
			ServiceID: serviceID,
			Status:    "error",
			Error:     "Empty response",
		}
	}
	return *res
}

// GetConfig returns current application configuration
func (b *AppBridge) GetConfig(ctx context.Context) config.Config {
	cfg := config.Get()
	return *cfg
}

// SaveConfig updates and saves configuration
func (b *AppBridge) SaveConfig(ctx context.Context, newCfg config.Config) bool {
	err := config.Get().Update(func(c *config.Config) {
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
	})
	if err == nil {
		win := mygo.CallerWindow(ctx)
		if win != nil {
			win.SetAlwaysOnTop(newCfg.AlwaysOnTop)
		}
		return true
	}
	return false
}

// GetClipboardText reads CLIPBOARD without falling back to the PRIMARY selection.
func (b *AppBridge) GetClipboardText(ctx context.Context) string {
	return services.GetClipboardText()
}

// CopyText copies string to system clipboard
func (b *AppBridge) CopyText(ctx context.Context, text string) bool {
	if text != "" {
		return services.WriteClipboardText(text) == nil
	}
	return false
}

// TriggerOCR triggers interactive screenshot OCR from the frontend UI or shortcuts
func (b *AppBridge) TriggerOCR(ctx context.Context, silent bool) string {
	img, err := b.ocrService.CaptureScreenArea()
	if err != nil {
		return ""
	}
	text, err := b.ocrService.RecognizeText(img)
	if err != nil {
		services.SendDesktopNotification("Easydict OCR 失败", err.Error())
		return ""
	}

	if silent {
		_ = services.WriteClipboardText(text)
		preview := text
		if len([]rune(preview)) > 35 {
			preview = string([]rune(preview)[:35]) + "..."
		}
		services.SendDesktopNotification("Easydict OCR 成功 (已复制到剪贴板)", preview)
		return text
	}

	// Non-silent: translate text
	if b.onQueryText != nil {
		b.onQueryText(text)
	}

	return text
}

// OnBubbleClicked handles click on floating selection bubble
func (b *AppBridge) OnBubbleClicked(ctx context.Context) {
	if b.onBubbleAction != nil {
		b.onBubbleAction()
	}
}

// SetAlwaysOnTop toggles window stay on top
func (b *AppBridge) SetAlwaysOnTop(ctx context.Context, onTop bool) bool {
	win := mygo.CallerWindow(ctx)
	if win != nil {
		win.SetAlwaysOnTop(onTop)
		_ = config.Get().Update(func(c *config.Config) {
			c.AlwaysOnTop = onTop
		})
		return true
	}
	return false
}

// IsAlwaysOnTop checks if the window is currently pinned
func (b *AppBridge) IsAlwaysOnTop(ctx context.Context) bool {
	win := mygo.CallerWindow(ctx)
	if win != nil {
		return win.IsAlwaysOnTop()
	}
	return false
}

// HideWindow hides the current application window
func (b *AppBridge) HideWindow(ctx context.Context) {
	win := mygo.CallerWindow(ctx)
	if win != nil {
		win.Hide()
	}
}

// CloseApp quits the application
func (b *AppBridge) CloseApp(ctx context.Context) {
	mygo.App.Quit()
}

// ShowContextMenu pops up a native context menu at the mouse cursor
func (b *AppBridge) ShowContextMenu(ctx context.Context, selectedText string) {
	win := mygo.CallerWindow(ctx)
	if win == nil {
		return
	}

	var menuItems []*mygo.MenuItem

	if selectedText != "" {
		menuItems = append(menuItems, &mygo.MenuItem{
			Label: "翻译选中文本: \"" + truncate(selectedText, 20) + "\"",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				escaped := selectedText
				win.Page().Eval(`window.__easydict_query && window.__easydict_query(` + stringify(escaped) + `)`)
			},
		})
		menuItems = append(menuItems, &mygo.MenuItem{
			Label: "复制选中文本",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				_ = services.WriteClipboardText(selectedText)
			},
		})
		menuItems = append(menuItems, mygo.Separator())
	}

	clipText := services.GetClipboardText()
	if clipText != "" && clipText != selectedText {
		menuItems = append(menuItems, &mygo.MenuItem{
			Label: "翻译剪贴板文本: \"" + truncate(clipText, 20) + "\"",
			Click: func(*mygo.MenuItem, *mygo.Window) {
				win.Page().Eval(`window.__easydict_query && window.__easydict_query(` + stringify(clipText) + `)`)
			},
		})
	}

	menuItems = append(menuItems, &mygo.MenuItem{
		Role: mygo.RolePaste,
	})

	menuItems = append(menuItems, mygo.Separator())

	menuItems = append(menuItems, &mygo.MenuItem{
		Label: "截图并翻译 (Alt+S)",
		Click: func(*mygo.MenuItem, *mygo.Window) {
			go func() {
				img, err := b.ocrService.CaptureScreenArea()
				if err == nil {
					text, err := b.ocrService.RecognizeText(img)
					if err == nil && text != "" {
						win.Page().Eval(`window.__easydict_query && window.__easydict_query(` + stringify(text) + `)`)
					}
				}
			}()
		},
	})

	menuItems = append(menuItems, &mygo.MenuItem{
		Label: "静默截图 OCR 复制 (Alt+Shift+S)",
		Click: func(*mygo.MenuItem, *mygo.Window) {
			go func() {
				img, err := b.ocrService.CaptureScreenArea()
				if err == nil {
					text, err := b.ocrService.RecognizeText(img)
					if err == nil && text != "" {
						_ = services.WriteClipboardText(text)
						services.SendDesktopNotification("Easydict OCR", "已识别并复制到剪贴板")
					}
				}
			}()
		},
	})

	menuItems = append(menuItems, mygo.Separator())

	menuItems = append(menuItems, &mygo.MenuItem{
		Label:   "窗口置顶",
		Type:    mygo.MenuItemCheckbox,
		Checked: win.IsAlwaysOnTop(),
		Click: func(it *mygo.MenuItem, _ *mygo.Window) {
			win.SetAlwaysOnTop(it.Checked)
			_ = config.Get().Update(func(c *config.Config) {
				c.AlwaysOnTop = it.Checked
			})
			win.Page().Eval(`window.__easydict_set_pinned && window.__easydict_set_pinned(` + boolStr(it.Checked) + `)`)
		},
	})

	menuItems = append(menuItems, &mygo.MenuItem{
		Label: "偏好设置 (Ctrl+,)...",
		Click: func(*mygo.MenuItem, *mygo.Window) {
			win.Page().Eval(`window.__easydict_open_settings && window.__easydict_open_settings()`)
		},
	})

	menuItems = append(menuItems, &mygo.MenuItem{
		Label: "刷新页面",
		Click: func(*mygo.MenuItem, *mygo.Window) {
			win.Page().Reload()
		},
	})

	menu := mygo.NewMenu(menuItems)
	menu.Popup(win)
}

func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}

func stringify(s string) string {
	b, err := json.Marshal(s)
	if err != nil {
		return `""`
	}
	return string(b)
}

func boolStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}
