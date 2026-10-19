package services

import (
	"bufio"
	"context"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func fakeClipboardTool(t *testing.T, name, script string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, name), []byte("#!/bin/sh\n"+script), 0755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+":"+os.Getenv("PATH"))
	return dir
}

func TestSelectionFrames(t *testing.T) {
	scanner := bufio.NewScanner(strings.NewReader("line one\nline two\x00line one\nline two\x00\x00incomplete"))
	scanner.Split(scanSelection)
	var got []string
	for scanner.Scan() {
		got = append(got, scanner.Text())
	}
	if scanner.Err() != nil || !reflect.DeepEqual(got, []string{"line one\nline two", "line one\nline two", ""}) {
		t.Fatalf("frames = %q, error = %v", got, scanner.Err())
	}
}

func TestWaylandSelectionDoesNotFallBackToClipboardOrX11(t *testing.T) {
	t.Setenv("WAYLAND_DISPLAY", "test-wayland")
	fakeClipboardTool(t, "xclip", "printf 'stale X11 selection'")
	fakeClipboardTool(t, "wl-paste", `case " $* " in *" --primary "*) exit 1;; *) printf 'clipboard text';; esac`)
	if got := GetSelectedText(); got != "" {
		t.Fatalf("expected empty PRIMARY, got %q", got)
	}
	if got := GetClipboardText(); got != "clipboard text" {
		t.Fatalf("CLIPBOARD = %q", got)
	}
}

func TestCopyWritesOnlyClipboardAndReportsErrors(t *testing.T) {
	t.Setenv("WAYLAND_DISPLAY", "test-wayland")
	dir := t.TempDir()
	t.Setenv("COPY_ARGS", filepath.Join(dir, "args"))
	t.Setenv("COPY_TEXT", filepath.Join(dir, "text"))
	fakeClipboardTool(t, "wl-copy", `printf '%s\n' "$*" > "$COPY_ARGS"; /bin/cat > "$COPY_TEXT"`)
	if err := WriteClipboardText("translated text"); err != nil {
		t.Fatal(err)
	}
	args, _ := os.ReadFile(filepath.Join(dir, "args"))
	text, _ := os.ReadFile(filepath.Join(dir, "text"))
	if strings.Contains(string(args), "primary") || string(text) != "translated text" {
		t.Fatalf("args = %q, text = %q", args, text)
	}
	fakeClipboardTool(t, "wl-copy", "exit 1")
	if err := WriteClipboardText("text"); err == nil {
		t.Fatal("expected copy failure to be reported")
	}
}

func TestWatchSelectionPreservesRepeatedEventsAndStops(t *testing.T) {
	t.Setenv("WAYLAND_DISPLAY", "test-wayland")
	fakeClipboardTool(t, "wl-paste", `printf 'same\ntext\000same\ntext\000\000'; exec /bin/sleep 30`)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := make(chan string, 3)
	done := make(chan struct{})
	go func() {
		defer close(done)
		WatchSelectedText(ctx, func(text string) { events <- text })
	}()
	for _, want := range []string{"same\ntext", "same\ntext", ""} {
		select {
		case got := <-events:
			if got != want {
				t.Fatalf("event = %q, want %q", got, want)
			}
		case <-time.After(2 * time.Second):
			t.Fatal("missing selection event")
		}
	}
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("watcher did not stop")
	}
}

func TestDictionaryQueryClassification(t *testing.T) {
	for _, text := range []string{"apple", "machine learning", "苹果", "分布式系统"} {
		if !isDictionaryQuery(text) {
			t.Errorf("expected dictionary query: %q", text)
		}
	}
	for _, text := range []string{"", "人工智能正在改变社会", "这是一个完整句子。", "Hello!", "I love you.", "a\nb", "Artificial intelligence is transforming society."} {
		if isDictionaryQuery(text) {
			t.Errorf("expected sentence or empty query: %q", text)
		}
	}
}

func TestCursorAllowsNegativeCoordinatesAndOrigin(t *testing.T) {
	for _, tc := range []struct {
		position string
		x, y     int
	}{{"-200, -100", -200, -100}, {"0, 0", 0, 0}} {
		t.Run(tc.position, func(t *testing.T) {
			fakeClipboardTool(t, "hyprctl", "printf '%s' '"+tc.position+"'")
			x, y := GetCursorScreenPoint()
			if x != tc.x || y != tc.y {
				t.Fatalf("cursor = (%d,%d), want (%d,%d)", x, y, tc.x, tc.y)
			}
		})
	}
}
