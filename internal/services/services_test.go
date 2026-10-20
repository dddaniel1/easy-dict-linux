package services

import (
	"os"
	"strings"
	"testing"
)

func TestYoudaoWordQuery(t *testing.T) {
	yd := NewYoudaoProvider()
	res, err := yd.Translate(QueryRequest{
		Text:     "apple",
		FromLang: LangAuto,
		ToLang:   LangZh,
	})
	if err != nil {
		t.Fatalf("Youdao query failed with error: %v", err)
	}
	if res.Status != "success" {
		t.Fatalf("Expected success, got: %s (error: %s)", res.Status, res.Error)
	}
	if !res.IsDictionary {
		t.Errorf("Expected apple to be recognized as a dictionary word")
	}
	if len(res.Definitions) == 0 {
		t.Errorf("Expected definitions for apple, got 0")
	}
	if len(res.Phonetics) == 0 {
		t.Errorf("Expected phonetics for apple, got 0")
	}
}

func TestYoudaoSentenceQuery(t *testing.T) {
	yd := NewYoudaoProvider()
	res, err := yd.Translate(QueryRequest{
		Text:     "Artificial intelligence is transforming society.",
		FromLang: LangAuto,
		ToLang:   LangZh,
	})
	if err != nil {
		t.Fatalf("Youdao sentence query failed: %v", err)
	}
	if res.Status != "success" {
		t.Fatalf("Expected success, got: %s", res.Status)
	}
	if res.Translation == "" {
		t.Errorf("Expected non-empty translation for sentence")
	}
}

func TestBingWordQuery(t *testing.T) {
	bing := NewBingProvider()
	res, err := bing.Translate(QueryRequest{
		Text:     "hello",
		FromLang: LangEn,
		ToLang:   LangZh,
	})
	if err != nil {
		t.Fatalf("Bing query failed: %v", err)
	}
	if res.Status != "success" {
		t.Fatalf("Expected success, got: %s (error: %s)", res.Status, res.Error)
	}
	if res.Translation == "" {
		t.Errorf("Expected non-empty translation from Bing")
	}
}

func TestManagerQueryAll(t *testing.T) {
	mgr := NewManager()
	results := mgr.QueryAll(QueryRequest{
		Text:     "book",
		FromLang: LangAuto,
		ToLang:   LangZh,
		Services: []string{"youdao", "bing"},
	})
	if len(results) == 0 {
		t.Fatalf("Expected results from manager, got 0")
	}
	foundSuccess := false
	for _, r := range results {
		if r.Status == "success" {
			foundSuccess = true
			break
		}
	}
	if !foundSuccess {
		t.Errorf("Expected at least one successful service result")
	}
}

func TestOCRRecognition(t *testing.T) {
	ocr := NewOCRService()
	// Test on test_ocr.png generated earlier
	data, err := os.ReadFile("/tmp/test_ocr.png")
	if err != nil {
		t.Skip("test image /tmp/test_ocr.png not found")
	}
	text, err := ocr.RecognizeText(data)
	if err != nil {
		t.Fatalf("OCR recognition failed: %v", err)
	}
	if !strings.Contains(strings.ToLower(text), "hello") {
		t.Errorf("Expected OCR text to contain 'Hello', got: %q", text)
	}
}
