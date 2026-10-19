package services

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type YoudaoProvider struct {
	client *http.Client
}

func NewYoudaoProvider() *YoudaoProvider {
	return &YoudaoProvider{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (y *YoudaoProvider) ID() string {
	return "youdao"
}

func (y *YoudaoProvider) Name() string {
	return "有道词典"
}

func md5Str(s string) string {
	h := md5.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

func (y *YoudaoProvider) Translate(req QueryRequest) (*ServiceResult, error) {
	// This parser handles the English-Chinese dictionary, not arbitrary language pairs.
	if (req.FromLang != "" && req.FromLang != LangAuto && req.FromLang != LangEn) ||
		(req.ToLang != "" && req.ToLang != LangAuto && req.ToLang != LangZh) {
		return &ServiceResult{
			ServiceID: y.ID(), ServiceName: y.Name(), Status: "error",
			Error: "有道词典当前仅支持英译中，请使用其他翻译服务查询此语言组合",
		}, nil
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return &ServiceResult{
			ServiceID:   y.ID(),
			ServiceName: y.Name(),
			Status:      "error",
			Error:       "Query text is empty",
		}, nil
	}

	ww := text + "webdict"
	timeVal := len(ww) % 10
	salt := md5Str(ww)
	key := "Mk6hqtUp33DGGtoS63tTJbMUYjRrG1Lu"
	sign := md5Str(fmt.Sprintf("web%s%d%s%s", text, timeVal, key, salt))

	form := url.Values{}
	form.Set("q", text)
	form.Set("le", "en")
	form.Set("client", "web")
	form.Set("t", strconv.Itoa(timeVal))
	form.Set("sign", sign)
	form.Set("keyfrom", "webdict")

	httpReq, err := http.NewRequest("POST", "https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := y.client.Do(httpReq)
	if err != nil {
		return &ServiceResult{
			ServiceID:   y.ID(),
			ServiceName: y.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("Network request failed: %v", err),
		}, nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Youdao HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &ServiceResult{
			ServiceID:   y.ID(),
			ServiceName: y.Name(),
			Status:      "error",
			Error:       fmt.Sprintf("Reading response failed: %v", err),
		}, nil
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return &ServiceResult{
			ServiceID:   y.ID(),
			ServiceName: y.Name(),
			Status:      "error",
			Error:       "Parsing response failed",
		}, nil
	}

	res := &ServiceResult{
		ServiceID:   y.ID(),
		ServiceName: y.Name(),
		Status:      "success",
	}

	// 1. Try EC (English-Chinese dictionary definitions)
	if ecRaw, ok := raw["ec"]; ok {
		var ecData struct {
			Word struct {
				UsPhone  string `json:"usphone"`
				UkPhone  string `json:"ukphone"`
				UsSpeech string `json:"usspeech"`
				UkSpeech string `json:"ukspeech"`
				Trs      []struct {
					Pos  string `json:"pos"`
					Tran string `json:"tran"`
				} `json:"trs"`
			} `json:"word"`
		}
		if err := json.Unmarshal(ecRaw, &ecData); err == nil {
			if ecData.Word.UkPhone != "" {
				audio := fmt.Sprintf("https://dict.youdao.com/dictvoice?audio=%s&type=1", url.QueryEscape(text))
				if ecData.Word.UkSpeech != "" {
					audio = "https://dict.youdao.com/dictvoice?audio=" + ecData.Word.UkSpeech
				}
				res.Phonetics = append(res.Phonetics, Phonetic{
					Type:     "uk",
					Symbol:   "[" + ecData.Word.UkPhone + "]",
					AudioURL: audio,
				})
			}
			if ecData.Word.UsPhone != "" {
				audio := fmt.Sprintf("https://dict.youdao.com/dictvoice?audio=%s&type=2", url.QueryEscape(text))
				if ecData.Word.UsSpeech != "" {
					audio = "https://dict.youdao.com/dictvoice?audio=" + ecData.Word.UsSpeech
				}
				res.Phonetics = append(res.Phonetics, Phonetic{
					Type:     "us",
					Symbol:   "[" + ecData.Word.UsPhone + "]",
					AudioURL: audio,
				})
			}

			for _, tr := range ecData.Word.Trs {
				tran := strings.TrimSpace(tr.Tran)
				if tran != "" {
					pos := strings.TrimSpace(tr.Pos)
					res.Definitions = append(res.Definitions, Definition{
						Pos:      pos,
						Meanings: []string{tran},
					})
				}
			}

			if len(res.Definitions) > 0 || len(res.Phonetics) > 0 {
				res.IsDictionary = true
			}
		}
	}

	// 2. Try simple
	if !res.IsDictionary {
		if simpleRaw, ok := raw["simple"]; ok {
			var simpleData struct {
				Word []struct {
					ReturnPhrase string `json:"return-phrase"`
					Usphone      string `json:"usphone"`
					Ukphone      string `json:"ukphone"`
				} `json:"word"`
			}
			if err := json.Unmarshal(simpleRaw, &simpleData); err == nil && len(simpleData.Word) > 0 {
				w := simpleData.Word[0]
				if w.Ukphone != "" {
					res.Phonetics = append(res.Phonetics, Phonetic{
						Type:     "uk",
						Symbol:   "[" + w.Ukphone + "]",
						AudioURL: fmt.Sprintf("https://dict.youdao.com/dictvoice?audio=%s&type=1", url.QueryEscape(text)),
					})
				}
				if w.Usphone != "" {
					res.Phonetics = append(res.Phonetics, Phonetic{
						Type:     "us",
						Symbol:   "[" + w.Usphone + "]",
						AudioURL: fmt.Sprintf("https://dict.youdao.com/dictvoice?audio=%s&type=2", url.QueryEscape(text)),
					})
				}
			}
		}
	}

	// 3. Try fanyi (machine translation)
	if fanyiRaw, ok := raw["fanyi"]; ok {
		var fanyiData struct {
			Tran string `json:"tran"`
		}
		if err := json.Unmarshal(fanyiRaw, &fanyiData); err == nil && fanyiData.Tran != "" {
			res.Translation = fanyiData.Tran
		}
	}

	// 4. Try bilingual example sentences
	if sentsRaw, ok := raw["blng_sents_part"]; ok {
		var sentsData struct {
			SentencePair []struct {
				Sentence            string `json:"sentence"`
				SentenceEng         string `json:"sentence-eng"`
				SentenceTranslation string `json:"sentence-translation"`
				Source              string `json:"source"`
			} `json:"sentence-pair"`
		}
		if err := json.Unmarshal(sentsRaw, &sentsData); err == nil {
			for i, sp := range sentsData.SentencePair {
				if i >= 4 {
					break
				}
				s := sp.Sentence
				if s == "" {
					s = sp.SentenceEng
				}
				// Remove basic HTML bold tags from sentence
				s = strings.ReplaceAll(s, "<b>", "")
				s = strings.ReplaceAll(s, "</b>", "")
				t := strings.TrimSpace(sp.SentenceTranslation)
				if s != "" && t != "" {
					res.Sentences = append(res.Sentences, Sentence{
						Source:     strings.TrimSpace(s),
						Target:     t,
						SourceDict: strings.TrimSpace(sp.Source),
					})
				}
			}
		}
	}

	// Fallback translation if translation is empty but definitions exist
	if res.Translation == "" && len(res.Definitions) > 0 {
		var defStrs []string
		for _, d := range res.Definitions {
			if d.Pos != "" {
				defStrs = append(defStrs, d.Pos+" "+strings.Join(d.Meanings, ", "))
			} else {
				defStrs = append(defStrs, strings.Join(d.Meanings, ", "))
			}
		}
		res.Translation = strings.Join(defStrs, "\n")
	}

	if res.Translation == "" && len(res.Definitions) == 0 {
		res.Status = "error"
		res.Error = "有道未返回释义或译文，请查看其他翻译服务"
	}
	return res, nil
}
