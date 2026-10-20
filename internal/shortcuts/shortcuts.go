package shortcuts

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

// Status is the result of registering one shortcut.
type Status struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Accelerator string `json:"accelerator"`
	OK          bool   `json:"ok"`
	Source      string `json:"source"` // "app", "desktop", or "error"
	Message     string `json:"message"`
}

// SaveResult is returned to the settings panel after persisting preferences.
type SaveResult struct {
	OK        bool     `json:"ok"`
	Saved     bool     `json:"saved"`
	Error     string   `json:"error,omitempty"`
	Shortcuts []Status `json:"shortcuts,omitempty"`
}

// Definition describes one global shortcut shown in settings.
type Definition struct {
	ID          string
	Label       string
	Accelerator string
}

var namedKeys = map[string]string{
	"space": "Space", "tab": "Tab", "enter": "Enter", "return": "Enter",
	"escape": "Escape", "esc": "Escape", "backspace": "Backspace",
	"delete": "Delete", "del": "Delete", "insert": "Insert", "ins": "Insert",
	"home": "Home", "end": "End", "pageup": "PageUp", "pagedown": "PageDown",
	"up": "Up", "down": "Down", "left": "Left", "right": "Right",
	"plus": "Plus", "capslock": "CapsLock", "numlock": "NumLock",
	"scrolllock": "ScrollLock", "printscreen": "PrintScreen",
	"volumeup": "VolumeUp", "volumedown": "VolumeDown", "volumemute": "VolumeMute",
	"medianexttrack": "MediaNextTrack", "mediaprevioustrack": "MediaPreviousTrack",
	"mediastop": "MediaStop", "mediaplaypause": "MediaPlayPause",
}

// Normalize validates an Electron-style accelerator and returns its canonical
// form. A global shortcut must include a modifier unless it is an F-key.
func Normalize(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("请录制一个快捷键")
	}

	parts := strings.Split(value, "+")
	if strings.HasSuffix(value, "++") {
		parts = append(parts[:len(parts)-2], "+")
	}
	if len(parts) < 2 {
		key, ok := normalizeKey(value)
		if !ok || !isFunctionKey(key) {
			return "", fmt.Errorf("快捷键需要包含 Ctrl、Alt、Shift 或 Super")
		}
		return key, nil
	}

	modifiers := map[string]bool{}
	for _, raw := range parts[:len(parts)-1] {
		switch strings.ToLower(strings.TrimSpace(raw)) {
		case "ctrl", "control":
			modifiers["Ctrl"] = true
		case "alt", "option", "altgr":
			modifiers["Alt"] = true
		case "shift":
			modifiers["Shift"] = true
		case "super", "meta", "cmd", "command", "win":
			modifiers["Super"] = true
		case "cmdorctrl", "commandorcontrol":
			modifiers["Ctrl"] = true
		default:
			return "", fmt.Errorf("不支持的修饰键：%s", strings.TrimSpace(raw))
		}
	}

	key, ok := normalizeKey(parts[len(parts)-1])
	if !ok {
		return "", fmt.Errorf("不支持的按键：%s", strings.TrimSpace(parts[len(parts)-1]))
	}
	if len(modifiers) == 0 {
		return "", fmt.Errorf("快捷键需要包含 Ctrl、Alt、Shift 或 Super")
	}

	ordered := []string{"Super", "Ctrl", "Alt", "Shift"}
	var canonical []string
	for _, modifier := range ordered {
		if modifiers[modifier] {
			canonical = append(canonical, modifier)
		}
	}
	canonical = append(canonical, key)
	return strings.Join(canonical, "+"), nil
}

func normalizeKey(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", false
	}
	if raw == "+" {
		return "Plus", true
	}
	lower := strings.ToLower(raw)
	if key, ok := namedKeys[lower]; ok {
		return key, true
	}
	if len(lower) >= 2 && lower[0] == 'f' {
		var n int
		if _, err := fmt.Sscanf(lower[1:], "%d", &n); err == nil && n >= 1 && n <= 24 && fmt.Sprint(n) == lower[1:] {
			return fmt.Sprintf("F%d", n), true
		}
	}
	if strings.HasPrefix(lower, "num") && len(lower) == 4 && lower[3] >= '0' && lower[3] <= '9' {
		return "Num" + lower[3:], true
	}
	if utf8.RuneCountInString(raw) == 1 {
		return strings.ToUpper(raw), true
	}
	return "", false
}

func isFunctionKey(key string) bool {
	if len(key) < 2 || key[0] != 'F' {
		return false
	}
	var n int
	_, err := fmt.Sscanf(key[1:], "%d", &n)
	return err == nil && n >= 1 && n <= 24
}

// Definitions returns the configured shortcuts in display order.
func Definitions(input, selection, ocr, ocrSilent string) []Definition {
	return []Definition{
		{ID: "shortcut_input", Label: "输入查词", Accelerator: input},
		{ID: "shortcut_selection", Label: "划词翻译", Accelerator: selection},
		{ID: "shortcut_ocr", Label: "截图翻译", Accelerator: ocr},
		{ID: "shortcut_ocr_silent", Label: "静默截图 OCR", Accelerator: ocrSilent},
	}
}

// DesktopBinding is the subset of a window-manager binding needed to avoid
// registering the same accelerator twice.
type DesktopBinding struct {
	Modifiers   []string
	Key         string
	Description string
	Easydict    bool
}

type hyprBinding struct {
	Modmask     int    `json:"modmask"`
	Key         string `json:"key"`
	Description string `json:"description"`
	Arg         any    `json:"arg"`
	Submap      string `json:"submap"`
}

// ParseHyprlandBindings reads `hyprctl binds -j` output. Bindings inside a
// submap are ignored because they do not apply to the normal desktop mode.
func ParseHyprlandBindings(data []byte) ([]DesktopBinding, error) {
	var raw []hyprBinding
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}
	bindings := make([]DesktopBinding, 0, len(raw))
	for _, item := range raw {
		if item.Submap != "" || strings.TrimSpace(item.Key) == "" {
			continue
		}
		bindings = append(bindings, DesktopBinding{
			Modifiers:   hyprModifiers(item.Modmask),
			Key:         item.Key,
			Description: item.Description,
			Easydict: strings.Contains(strings.ToLower(item.Description), "easydict") ||
				strings.Contains(strings.ToLower(fmt.Sprint(item.Arg)), "easydict"),
		})
	}
	return bindings, nil
}

func hyprModifiers(mask int) []string {
	var modifiers []string
	for _, item := range []struct {
		bit  int
		name string
	}{{64, "Super"}, {4, "Ctrl"}, {8, "Alt"}, {1, "Shift"}} {
		if mask&item.bit != 0 {
			modifiers = append(modifiers, item.name)
		}
	}
	return modifiers
}

// FindDesktopConflict returns the first desktop binding using accelerator.
func FindDesktopConflict(accelerator string, bindings []DesktopBinding) *DesktopBinding {
	canonical, err := Normalize(accelerator)
	if err != nil {
		return nil
	}
	parts := strings.Split(canonical, "+")
	key := parts[len(parts)-1]
	modifiers := map[string]bool{}
	for _, modifier := range parts[:len(parts)-1] {
		modifiers[modifier] = true
	}
	for i := range bindings {
		binding := &bindings[i]
		if !strings.EqualFold(normalizeDesktopKey(binding.Key), key) || len(binding.Modifiers) != len(modifiers) {
			continue
		}
		matches := true
		for _, modifier := range binding.Modifiers {
			if !modifiers[modifier] {
				matches = false
				break
			}
		}
		if matches {
			return binding
		}
	}
	return nil
}

func normalizeDesktopKey(key string) string {
	if normalized, ok := normalizeKey(key); ok {
		return normalized
	}
	switch strings.ToLower(key) {
	case "return":
		return "Enter"
	case "prior":
		return "PageUp"
	case "next":
		return "PageDown"
	}
	return key
}
