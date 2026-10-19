package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

type BingProvider struct {
	client     *http.Client
	mu         sync.Mutex
	ig         string
	key        string
	token      string
	expiresAt  time.Time
	tokenRegex *regexp.Regexp
	igRegex    *regexp.Regexp
}

func NewBingProvider() *BingProvider {
	jar, _ := cookiejar.New(nil)
	return &BingProvider{
		client: &http.Client{
			Jar:     jar,
			Timeout: 10 * time.Second,
		},
		tokenRegex: regexp.MustCompile(`params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]`),
		igRegex:    regexp.MustCompile(`IG:"([^"]+)"`),
	}
}

func (b *BingProvider) ID() string {
	return "bing"
}

func (b *BingProvider) Name() string {
	return "Bing 词典 / 翻译"
}

func (b *BingProvider) ensureCredentials() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.ig != "" && b.token != "" && time.Now().Before(b.expiresAt) {
		return nil
	}

	req, err := http.NewRequest("GET", "https://cn.bing.com/translator", nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := b.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	html := string(body)

	igMatches := b.igRegex.FindStringSubmatch(html)
	if len(igMatches) < 2 {
		return fmt.Errorf("failed to extract Bing IG")
	}
	b.ig = igMatches[1]

	tokenMatches := b.tokenRegex.FindStringSubmatch(html)
	if len(tokenMatches) < 2 {
		return fmt.Errorf("failed to extract Bing token")
	}

	rawParts := strings.Split(tokenMatches[1], ",")
	if len(rawParts) < 2 {
		return fmt.Errorf("malformed Bing token")
	}

	b.key = strings.Trim(rawParts[0], "\" ")
	b.token = strings.Trim(rawParts[1], "\" ")
	// Expire in 30 minutes
	b.expiresAt = time.Now().Add(30 * time.Minute)

	return nil
}

func (b *BingProvider) mapLanguage(lang Language) string {
	switch lang {
	case LangAuto:
		return "auto-detect"
	case LangZh:
		return "zh-Hans"
	case LangZhTw:
		return "zh-Hant"
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

func (b *BingProvider) Translate(req QueryRequest) (*ServiceResult, error) {
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return &ServiceResult{
			ServiceID:   b.ID(),
			ServiceName: b.Name(),
			Status:      "error",
			Error:       "Query text is empty",
		}, nil
	}

	if err := b.ensureCredentials(); err != nil {
		return &ServiceResult{
			ServiceID:   b.ID(),
			ServiceName: b.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("Failed to get Bing session: %v", err),
		}, nil
	}

	b.mu.Lock()
	ig := b.ig
	key := b.key
	token := b.token
	b.mu.Unlock()

	fromLang := b.mapLanguage(req.FromLang)
	toLang := b.mapLanguage(req.ToLang)
	if toLang == "auto-detect" || toLang == "" {
		toLang = "zh-Hans"
	}

	// Translate first so dictionary lookup can use the detected language.
	transURL := fmt.Sprintf("https://cn.bing.com/ttranslatev3?isVertical=1&&IG=%s&IID=translator.5028", ig)
	form := url.Values{}
	form.Set("text", text)
	form.Set("fromLang", fromLang)
	form.Set("to", toLang)
	form.Set("key", key)
	form.Set("token", token)

	postReq, err := http.NewRequest("POST", transURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	postReq.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := b.client.Do(postReq)
	if err != nil {
		return &ServiceResult{
			ServiceID:   b.ID(),
			ServiceName: b.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("Bing request failed: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var translations []struct {
		DetectedLanguage struct {
			Language string `json:"language"`
		} `json:"detectedLanguage"`
		Translations []struct {
			Text            string `json:"text"`
			Transliteration struct {
				Text   string `json:"text"`
				Script string `json:"script"`
			} `json:"transliteration"`
		} `json:"translations"`
	}

	if err := json.Unmarshal(body, &translations); err != nil || len(translations) == 0 || len(translations[0].Translations) == 0 {
		return &ServiceResult{
			ServiceID:   b.ID(),
			ServiceName: b.Name(),
			Status:      "error",
			Error:       "Failed to parse Bing response",
		}, nil
	}

	if fromLang == "auto-detect" && translations[0].DetectedLanguage.Language != "" {
		fromLang = translations[0].DetectedLanguage.Language
	}

	// Look up dictionary definitions after resolving the detected source language.
	var dictResult *ServiceResult
	isWord := isDictionaryQuery(text)
	if isWord && fromLang != "auto-detect" {
		lookupURL := fmt.Sprintf("https://cn.bing.com/tlookupv3?isVertical=1&&IG=%s&IID=translator.5028", ig)
		form := url.Values{}
		form.Set("text", text)
		form.Set("from", fromLang)
		form.Set("to", toLang)
		form.Set("key", key)
		form.Set("token", token)

		postReq, err := http.NewRequest("POST", lookupURL, strings.NewReader(form.Encode()))
		if err == nil {
			postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			postReq.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
			resp, err := b.client.Do(postReq)
			if err == nil {
				defer resp.Body.Close()
				body, _ := io.ReadAll(resp.Body)
				var lookups []struct {
					Translations []struct {
						NormalizedTarget string  `json:"normalizedTarget"`
						DisplayTarget    string  `json:"displayTarget"`
						PosTag           string  `json:"posTag"`
						Confidence       float64 `json:"confidence"`
					} `json:"translations"`
				}
				if json.Unmarshal(body, &lookups) == nil && len(lookups) > 0 && len(lookups[0].Translations) > 0 {
					dictResult = &ServiceResult{
						ServiceID:    b.ID(),
						ServiceName:  b.Name(),
						Status:       "success",
						IsDictionary: true,
					}
					posMap := make(map[string][]string)
					for _, t := range lookups[0].Translations {
						pos := strings.ToLower(t.PosTag)
						if pos == "noun" {
							pos = "n."
						} else if pos == "verb" {
							pos = "v."
						} else if pos == "adjective" {
							pos = "adj."
						} else if pos == "adverb" {
							pos = "adv."
						}
						posMap[pos] = append(posMap[pos], t.DisplayTarget)
					}
					for pos, means := range posMap {
						dictResult.Definitions = append(dictResult.Definitions, Definition{
							Pos:      pos,
							Meanings: means,
						})
					}
				}
			}
		}
	}

	primaryTrans := translations[0].Translations[0].Text
	pinyin := translations[0].Translations[0].Transliteration.Text

	res := &ServiceResult{
		ServiceID:   b.ID(),
		ServiceName: b.Name(),
		Status:      "success",
		Translation: primaryTrans,
	}

	if dictResult != nil && len(dictResult.Definitions) > 0 {
		res.IsDictionary = true
		res.Definitions = dictResult.Definitions
	}

	if pinyin != "" {
		res.Phonetics = append(res.Phonetics, Phonetic{
			Type:   "pinyin",
			Symbol: pinyin,
		})
	}

	return res, nil
}
