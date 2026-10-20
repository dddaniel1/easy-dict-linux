package services

// Language represents a language code
type Language string

const (
	LangAuto Language = "auto"
	LangZh   Language = "zh-CN"
	LangZhTw Language = "zh-TW"
	LangEn   Language = "en"
	LangJa   Language = "ja"
	LangKo   Language = "ko"
	LangFr   Language = "fr"
	LangDe   Language = "de"
	LangEs   Language = "es"
	LangRu   Language = "ru"
	LangIt   Language = "it"
	LangPt   Language = "pt"
)

// Phonetic represents word pronunciation information
type Phonetic struct {
	Type     string `json:"type"`      // "uk", "us", "pinyin", etc.
	Symbol   string `json:"symbol"`    // e.g., "[ˈæp(ə)l]"
	AudioURL string `json:"audio_url"` // Direct audio playback URL
}

// Definition represents a group of definitions by part of speech
type Definition struct {
	Pos      string   `json:"pos"`      // "n.", "v.", "adj.", etc.
	Meanings []string `json:"meanings"` // definitions
}

// Sentence represents a bilingual example sentence
type Sentence struct {
	Source     string `json:"source"`      // English/Source sentence
	Target     string `json:"target"`      // Chinese/Target translation
	SourceDict string `json:"source_dict"` // Dictionary citation, e.g. "牛津词典"
}

// ServiceResult is the normalized result returned by a translation or dictionary service
type ServiceResult struct {
	ServiceID    string       `json:"service_id"`
	ServiceName  string       `json:"service_name"`
	Status       string       `json:"status"` // "success", "error", "loading", "cancelled"
	Error        string       `json:"error,omitempty"`
	DurationMS   int64        `json:"duration_ms,omitempty"`
	IsDictionary bool         `json:"is_dictionary"`
	Phonetics    []Phonetic   `json:"phonetics,omitempty"`
	Definitions  []Definition `json:"definitions,omitempty"`
	Translation  string       `json:"translation,omitempty"`
	Sentences    []Sentence   `json:"sentences,omitempty"`
}

// QueryRequest is the incoming user query parameter
type QueryRequest struct {
	Text     string   `json:"text"`
	FromLang Language `json:"from_lang"`
	ToLang   Language `json:"to_lang"`
	Services []string `json:"services,omitempty"` // empty means use enabled services
}

// TranslationProvider defines the interface each service must implement
type TranslationProvider interface {
	ID() string
	Name() string
	Translate(req QueryRequest) (*ServiceResult, error)
}
