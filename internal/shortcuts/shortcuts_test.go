package shortcuts

import "testing"

func TestNormalize(t *testing.T) {
	for input, want := range map[string]string{
		"alt+a":             "Alt+A",
		"Shift+Ctrl+s":      "Ctrl+Shift+S",
		"Control + Alt + K": "Ctrl+Alt+K",
		"Super+Space":       "Super+Space",
		"F8":                "F8",
		"Ctrl++":            "Ctrl+Plus",
	} {
		got, err := Normalize(input)
		if err != nil || got != want {
			t.Fatalf("Normalize(%q) = %q, %v; want %q", input, got, err, want)
		}
	}
	for _, input := range []string{"", "A", "Hyper+A", "Ctrl+F25", "Ctrl+A+B"} {
		if _, err := Normalize(input); err == nil {
			t.Fatalf("Normalize(%q) succeeded, want error", input)
		}
	}
}

func TestFindDesktopConflict(t *testing.T) {
	bindings := []DesktopBinding{
		{Modifiers: []string{"Alt"}, Key: "D", Description: "Easydict: Selection", Easydict: true},
		{Modifiers: []string{"Ctrl", "Shift"}, Key: "S", Description: "Screenshot"},
	}
	if got := FindDesktopConflict("Alt+Shift+D", bindings); got != nil {
		t.Fatalf("unexpected conflict: %+v", got)
	}
	if got := FindDesktopConflict("alt+d", bindings); got == nil || !got.Easydict {
		t.Fatalf("Easydict conflict not found: %+v", got)
	}
	if got := FindDesktopConflict("Shift+Ctrl+S", bindings); got == nil || got.Description != "Screenshot" {
		t.Fatalf("desktop conflict not found: %+v", got)
	}
}

func TestParseHyprlandBindings(t *testing.T) {
	bindings, err := ParseHyprlandBindings([]byte(`[
		{"modmask":8,"key":"D","description":"Easydict: Selection Translate","arg":"59","submap":""},
		{"modmask":5,"key":"S","description":"Screenshot","arg":"","submap":""},
		{"modmask":9,"key":"S","description":"Easydict: Silent OCR","arg":"","submap":"resize"}
	]`))
	if err != nil {
		t.Fatal(err)
	}
	if len(bindings) != 2 {
		t.Fatalf("got %d bindings, want 2", len(bindings))
	}
	if got := FindDesktopConflict("Alt+D", bindings); got == nil || !got.Easydict {
		t.Fatalf("Easydict binding not detected: %+v", got)
	}
	if got := FindDesktopConflict("Ctrl+Shift+S", bindings); got == nil || got.Description != "Screenshot" {
		t.Fatalf("modifier mapping is wrong: %+v", got)
	}
}
