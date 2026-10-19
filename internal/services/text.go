package services

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

func isDictionaryQuery(text string) bool {
	text = strings.TrimSpace(text)
	if text == "" || strings.ContainsAny(text, "\n\r.!?;。！？；") || len(strings.Fields(text)) > 3 || utf8.RuneCountInString(text) > 60 {
		return false
	}
	for _, r := range text {
		if unicode.Is(unicode.Han, r) || unicode.Is(unicode.Hiragana, r) || unicode.Is(unicode.Katakana, r) || unicode.Is(unicode.Hangul, r) {
			// shortcut: short CJK phrases use dictionary mode; add an explicit mode if ambiguous phrases need it.
			return utf8.RuneCountInString(text) <= 6
		}
	}
	return true
}
