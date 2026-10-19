package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type GoogleProvider struct {
	client *http.Client
}

func NewGoogleProvider() *GoogleProvider {
	return &GoogleProvider{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (g *GoogleProvider) ID() string {
	return "google"
}

func (g *GoogleProvider) Name() string {
	return "Google 翻译"
}

func (g *GoogleProvider) mapLanguage(lang Language) string {
	switch lang {
	case LangAuto:
		return "auto"
	case LangZh:
		return "zh-CN"
	case LangZhTw:
		return "zh-TW"
	case LangEn:
		return "en"
	case LangJa:
		return "ja"
	case LangKo:
		return "ko"
	case LangFr:
		return "fr"
	case LangDe:
		return "de"
	case LangEs:
		return "es"
	case LangRu:
		return "ru"
	case LangIt:
		return "it"
	case LangPt:
		return "pt"
	default:
		return string(lang)
	}
}

func (g *GoogleProvider) Translate(req QueryRequest) (*ServiceResult, error) {
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return &ServiceResult{
			ServiceID:   g.ID(),
			ServiceName: g.Name(),
			Status:      "error",
			Error:       "Query text is empty",
		}, nil
	}

	sl := g.mapLanguage(req.FromLang)
	tl := g.mapLanguage(req.ToLang)
	if tl == "auto" || tl == "" {
		tl = "zh-CN"
	}

	// 1. Try Google Translate gtx
	googleURL := fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=%s&tl=%s&dt=t&dt=bd&dt=rm&q=%s",
		sl, tl, url.QueryEscape(text))

	httpReq, err := http.NewRequest("GET", googleURL, nil)
	if err == nil {
		httpReq.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		resp, err := g.client.Do(httpReq)
		if err == nil {
			defer resp.Body.Close()
		}
		if err == nil && resp.StatusCode == 200 {
			body, _ := io.ReadAll(resp.Body)
			var root []any
			if err := json.Unmarshal(body, &root); err == nil && len(root) > 0 {
				var sb strings.Builder
				if parts, ok := root[0].([]any); ok {
					for _, item := range parts {
						if seg, ok := item.([]any); ok && len(seg) > 0 {
							if str, ok := seg[0].(string); ok {
								sb.WriteString(str)
							}
						}
					}
				}

				translated := sb.String()
				if translated != "" {
					res := &ServiceResult{
						ServiceID:   g.ID(),
						ServiceName: g.Name(),
						Status:      "success",
						Translation: translated,
					}

					// Check for dictionary definitions in root[1]
					if len(root) > 1 {
						if dictParts, ok := root[1].([]any); ok {
							for _, d := range dictParts {
								if dArr, ok := d.([]any); ok && len(dArr) >= 2 {
									pos, _ := dArr[0].(string)
									if means, ok := dArr[1].([]any); ok {
										var meanings []string
										for _, m := range means {
											if ms, ok := m.(string); ok {
												meanings = append(meanings, ms)
											}
										}
										if len(meanings) > 0 {
											res.Definitions = append(res.Definitions, Definition{
												Pos:      pos,
												Meanings: meanings,
											})
										}
									}
								}
							}
							if len(res.Definitions) > 0 {
								res.IsDictionary = true
							}
						}
					}

					return res, nil
				}
			}
		}
	}

	// 2. Fallback to MyMemory if Google is blocked/rate-limited
	myMemoryURL := fmt.Sprintf("https://api.mymemory.translated.net/get?q=%s&langpair=%s|%s",
		url.QueryEscape(text), sl, tl)
	if sl == "auto" || sl == "" {
		return &ServiceResult{
			ServiceID: g.ID(), ServiceName: g.Name(), Status: "error",
			Error: "Google 不可用；备用服务需要明确源语言，请选择语言后重试",
		}, nil
	}

	fbReq, err := http.NewRequest("GET", myMemoryURL, nil)
	if err == nil {
		fbReq.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
		resp, err := g.client.Do(fbReq)
		if err == nil {
			defer resp.Body.Close()
		}
		if err == nil && resp.StatusCode == 200 {
			body, _ := io.ReadAll(resp.Body)
			var mmResp struct {
				ResponseStatus int `json:"responseStatus"`
				ResponseData   struct {
					TranslatedText string `json:"translatedText"`
				} `json:"responseData"`
			}
			if json.Unmarshal(body, &mmResp) == nil && mmResp.ResponseStatus == 200 && mmResp.ResponseData.TranslatedText != "" {
				return &ServiceResult{
					ServiceID:   g.ID(),
					ServiceName: g.Name() + "（MyMemory 备用）",
					Status:      "success",
					Translation: mmResp.ResponseData.TranslatedText,
				}, nil
			}
		}
	}

	return &ServiceResult{
		ServiceID:   g.ID(),
		ServiceName: g.Name(),
		Status:      "error",
		Error:       "Google Translate service unavailable (rate limited)",
	}, nil
}
