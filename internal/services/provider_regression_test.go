package services

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func jsonResponse(body string) *http.Response {
	return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body))}
}

func TestBingAutoDetectStillLooksUpDictionary(t *testing.T) {
	bing := NewBingProvider()
	bing.ig, bing.key, bing.token, bing.expiresAt = "ig", "key", "token", time.Now().Add(time.Hour)
	var calls []string
	bing.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls = append(calls, r.URL.Path)
		if strings.Contains(r.URL.Path, "ttranslatev3") {
			return jsonResponse(`[{"detectedLanguage":{"language":"en"},"translations":[{"text":"苹果"}]}]`), nil
		}
		if err := r.ParseForm(); err != nil {
			t.Fatal(err)
		}
		if r.Form.Get("from") != "en" {
			t.Errorf("lookup source = %q", r.Form.Get("from"))
		}
		return jsonResponse(`[{"translations":[{"displayTarget":"苹果","posTag":"NOUN"}]}]`), nil
	})
	res, err := bing.Translate(QueryRequest{Text: "apple", FromLang: LangAuto, ToLang: LangZh})
	if err != nil || !res.IsDictionary || res.Translation != "苹果" || len(calls) != 2 {
		t.Fatalf("result = %+v, error = %v, calls = %v", res, err, calls)
	}
}

func TestYoudaoRejectsUnsupportedLanguagePair(t *testing.T) {
	y := NewYoudaoProvider()
	y.client.Transport = roundTripFunc(func(*http.Request) (*http.Response, error) {
		t.Fatal("unsupported language pair must not make a request")
		return nil, nil
	})
	res, err := y.Translate(QueryRequest{Text: "apple", FromLang: LangEn, ToLang: LangJa})
	if err != nil || res.Status != "error" {
		t.Fatalf("result = %+v, error = %v", res, err)
	}
}

func TestGoogleFallbackDoesNotGuessEnglish(t *testing.T) {
	g := NewGoogleProvider()
	count := 0
	g.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		count++
		return nil, fmt.Errorf("offline")
	})
	res, err := g.Translate(QueryRequest{Text: "こんにちは", FromLang: LangAuto, ToLang: LangZh})
	if err != nil || res.Status != "error" || count != 1 {
		t.Fatalf("result = %+v, error = %v, requests = %d", res, err, count)
	}
}

func TestGoogleFallbackValidatesStatusAndNamesProvider(t *testing.T) {
	for _, status := range []int{200, 403} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			g := NewGoogleProvider()
			g.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.URL.Host == "translate.googleapis.com" {
					return nil, fmt.Errorf("offline")
				}
				return jsonResponse(fmt.Sprintf(`{"responseStatus":%d,"responseData":{"translatedText":"result"}}`, status)), nil
			})
			res, err := g.Translate(QueryRequest{Text: "apple", FromLang: LangEn, ToLang: LangZh})
			if err != nil || (res.Status == "success") != (status == 200) {
				t.Fatalf("result = %+v, error = %v", res, err)
			}
			if status == 200 && !strings.Contains(res.ServiceName, "MyMemory") {
				t.Fatalf("fallback source is hidden: %s", res.ServiceName)
			}
		})
	}
}
