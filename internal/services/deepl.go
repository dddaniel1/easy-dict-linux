package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"easydict-linux/internal/config"
)

type DeepLProvider struct {
	client *http.Client
}

func NewDeepLProvider() *DeepLProvider {
	return &DeepLProvider{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (d *DeepLProvider) ID() string {
	return "deepl"
}

func (d *DeepLProvider) Name() string {
	return "DeepL 翻译"
}

func (d *DeepLProvider) mapTargetLanguage(lang Language) string {
	switch lang {
	case LangZh, LangZhTw:
		return "ZH"
	case LangEn:
		return "EN-US"
	case LangJa:
		return "JA"
	case LangKo:
		return "KO"
	case LangFr:
		return "FR"
	case LangDe:
		return "DE"
	case LangEs:
		return "ES"
	case LangRu:
		return "RU"
	case LangIt:
		return "IT"
	case LangPt:
		return "PT-PT"
	default:
		return "ZH"
	}
}

func (d *DeepLProvider) Translate(req QueryRequest) (*ServiceResult, error) {
	cfg := config.Get()
	if !cfg.DeepLEnabled || strings.TrimSpace(cfg.DeepLAuthKey) == "" {
		return &ServiceResult{
			ServiceID:   d.ID(),
			ServiceName: d.Name(),
			Status:      "error",
			Error:       "DeepL API key not configured. Please set it in Settings.",
		}, nil
	}

	text := strings.TrimSpace(req.Text)
	if text == "" {
		return &ServiceResult{
			ServiceID:   d.ID(),
			ServiceName: d.Name(),
			Status:      "error",
			Error:       "Query text is empty",
		}, nil
	}

	targetLang := d.mapTargetLanguage(req.ToLang)
	endpoint := "https://api-free.deepl.com/v2/translate"
	if !cfg.DeepLIsFree {
		endpoint = "https://api.deepl.com/v2/translate"
	}

	payload := map[string]any{
		"text":        []string{text},
		"target_lang": targetLang,
	}
	bodyData, _ := json.Marshal(payload)

	httpReq, err := http.NewRequest("POST", endpoint, bytes.NewReader(bodyData))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "DeepL-Auth-Key "+strings.TrimSpace(cfg.DeepLAuthKey))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(httpReq)
	if err != nil {
		return &ServiceResult{
			ServiceID:   d.ID(),
			ServiceName: d.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("DeepL network error: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return &ServiceResult{
			ServiceID:   d.ID(),
			ServiceName: d.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("DeepL returned error (%d): %s", resp.StatusCode, string(respBytes)),
		}, nil
	}

	var dlResp struct {
		Translations []struct {
			DetectedSourceLanguage string `json:"detected_source_language"`
			Text                   string `json:"text"`
		} `json:"translations"`
	}

	if err := json.Unmarshal(respBytes, &dlResp); err != nil || len(dlResp.Translations) == 0 {
		return &ServiceResult{
			ServiceID:   d.ID(),
			ServiceName: d.Name(),
			Status:      "error",
			Error:       "Failed to parse DeepL response",
		}, nil
	}

	return &ServiceResult{
		ServiceID:   d.ID(),
		ServiceName: d.Name(),
		Status:      "success",
		Translation: dlResp.Translations[0].Text,
	}, nil
}
