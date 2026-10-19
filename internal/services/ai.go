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

type AIProvider struct {
	client *http.Client
}

func NewAIProvider() *AIProvider {
	return &AIProvider{
		client: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (a *AIProvider) ID() string {
	return "ai"
}

func (a *AIProvider) Name() string {
	cfg := config.Get()
	if strings.Contains(strings.ToLower(cfg.AIModel), "deepseek") {
		return "DeepSeek AI"
	}
	if strings.Contains(strings.ToLower(cfg.AIBaseURL), "localhost") || strings.Contains(strings.ToLower(cfg.AIBaseURL), "127.0.0.1") {
		return "Ollama AI (" + cfg.AIModel + ")"
	}
	if cfg.AIModel != "" {
		return "AI 翻译 (" + cfg.AIModel + ")"
	}
	return "AI 智能翻译与词典"
}

func (a *AIProvider) Translate(req QueryRequest) (*ServiceResult, error) {
	cfg := config.Get()
	if !cfg.AIEnabled {
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       "AI service is disabled in settings.",
		}, nil
	}

	apiKey := strings.TrimSpace(cfg.AIAPIKey)
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.AIBaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.deepseek.com/v1"
	}
	model := strings.TrimSpace(cfg.AIModel)
	if model == "" {
		model = "deepseek-chat"
	}

	// For non-local endpoints, require API key
	isLocal := strings.Contains(baseURL, "localhost") || strings.Contains(baseURL, "127.0.0.1")
	if !isLocal && apiKey == "" {
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       "API Key is not configured. Please enter your API Key in Settings (⚙).",
		}, nil
	}

	text := strings.TrimSpace(req.Text)
	if text == "" {
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       "Query text is empty",
		}, nil
	}

	targetLang := string(req.ToLang)
	if targetLang == "auto" || targetLang == "" {
		targetLang = "Chinese (Simplified)"
	}

	// Distinguish between single word dictionary lookup and full sentence translation
	isWord := isDictionaryQuery(text)

	var systemPrompt string
	var userPrompt string

	if isWord {
		systemPrompt = "You are an expert bilingual lexicographer and dictionary assistant. " +
			"For the query word/phrase, provide:\n" +
			"1. Phonetics (UK/US IPA)\n" +
			"2. Concise definitions grouped by Part of Speech (n., v., adj., etc.) in " + targetLang + "\n" +
			"3. 2-3 practical, high-quality bilingual example sentences\n" +
			"4. Common synonyms or collocations if applicable.\n" +
			"Output clean, beautiful Markdown with clear headings and formatting. Do not output unnecessary preamble."
		userPrompt = fmt.Sprintf("Explain the word or phrase: \"%s\"", text)
	} else {
		systemPrompt = "You are a master translator. " +
			"Translate the input text into " + targetLang + " naturally, elegantly, and accurately. " +
			"Keep proper nouns and technical terms accurate. Only return the translated text directly in Markdown. " +
			"If there are critical cultural context or nuance explanations, provide them in a brief '### 译注' section."
		userPrompt = text
	}

	chatReq := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.3,
	}

	reqBody, _ := json.Marshal(chatReq)
	apiURL := baseURL + "/chat/completions"

	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("AI request failed: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(bodyBytes, &errResp)
		msg := errResp.Error.Message
		if msg == "" {
			msg = string(bodyBytes)
		}
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("API error (%d): %s", resp.StatusCode, msg),
		}, nil
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(bodyBytes, &chatResp); err != nil || len(chatResp.Choices) == 0 {
		return &ServiceResult{
			ServiceID:   a.ID(),
			ServiceName: a.Name(),
			Status:      "error",
			Error:       "Failed to parse AI response",
		}, nil
	}

	content := strings.TrimSpace(chatResp.Choices[0].Message.Content)

	return &ServiceResult{
		ServiceID:    a.ID(),
		ServiceName:  a.Name(),
		Status:       "success",
		IsDictionary: isWord,
		Translation:  content,
	}, nil
}
