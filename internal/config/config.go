package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type Config struct {
	// Translation services
	EnabledServices   []string `json:"enabled_services"`
	DefaultTargetLang string   `json:"default_target_lang"`

	// AI Configuration (DeepSeek, OpenAI, Ollama, etc.)
	AIEnabled bool   `json:"ai_enabled"`
	AIBaseURL string `json:"ai_base_url"`
	AIAPIKey  string `json:"ai_api_key"`
	AIModel   string `json:"ai_model"`

	// DeepL Configuration
	DeepLEnabled bool   `json:"deepl_enabled"`
	DeepLAuthKey string `json:"deepl_auth_key"`
	DeepLIsFree  bool   `json:"deepl_is_free"`

	// App Window & Behavior
	AutoQueryClipboard     bool `json:"auto_query_clipboard"`
	AutoShowFloatingButton bool `json:"auto_show_floating_button"` // Show floating bubble upon text selection
	AlwaysOnTop            bool `json:"always_on_top"`

	// Global Shortcuts (align with original Easydict)
	ShortcutInput     string `json:"shortcut_input"`      // ⌥ + A: Open window and focus input
	ShortcutSelection string `json:"shortcut_selection"`  // ⌥ + D: Translate highlighted selection
	ShortcutOCR       string `json:"shortcut_ocr"`        // ⌥ + S: Screenshot region and translate
	ShortcutOCRSilent string `json:"shortcut_ocr_silent"` // ⌥ + ⇧ + S: Silent screenshot OCR to clipboard

	Theme        string `json:"theme"` // "auto", "light", "dark"
	WindowWidth  int    `json:"window_width"`
	WindowHeight int    `json:"window_height"`
}

var (
	globalConfig *Config
	configOnce   sync.Once
	configMu     sync.RWMutex
)

func DefaultConfig() *Config {
	return &Config{
		EnabledServices:        []string{"youdao", "bing", "google", "ai"},
		DefaultTargetLang:      "zh-CN",
		AIEnabled:              true,
		AIBaseURL:              "https://api.deepseek.com/v1",
		AIAPIKey:               "",
		AIModel:                "deepseek-chat",
		DeepLEnabled:           false,
		DeepLAuthKey:           "",
		DeepLIsFree:            true,
		AutoQueryClipboard:     true,
		AutoShowFloatingButton: true,
		AlwaysOnTop:            false,
		ShortcutInput:          "Alt+A",
		ShortcutSelection:      "Alt+D",
		ShortcutOCR:            "Alt+S",
		ShortcutOCRSilent:      "Alt+Shift+S",
		Theme:                  "auto",
		WindowWidth:            640,
		WindowHeight:           580,
	}
}

func configPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, ".config")
	}
	return filepath.Join(configDir, "easydict-linux", "config.json")
}

func Get() *Config {
	configOnce.Do(func() {
		globalConfig = loadConfig()
	})
	return globalConfig
}

func loadConfig() *Config {
	cfg := DefaultConfig()
	path := configPath()

	data, err := os.ReadFile(path)
	if err != nil {
		return cfg
	}

	_ = json.Unmarshal(data, cfg)
	return cfg
}

func (c *Config) Save() error {
	path := configPath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func (c *Config) Update(updater func(cfg *Config)) error {
	configMu.Lock()
	updater(c)
	configMu.Unlock()
	return c.Save()
}
