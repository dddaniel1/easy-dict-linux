package services

import (
	"bufio"
	"bytes"
	"context"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"
)

// WatchSelectedText reports PRIMARY events, including reselecting the same text.
func WatchSelectedText(ctx context.Context, onChange func(string)) {
	if os.Getenv("WAYLAND_DISPLAY") != "" && isCommandAvailable("wl-paste") {
		// NUL frames preserve newlines and separate consecutive selection events.
		cmd := exec.CommandContext(ctx, "wl-paste", "--primary", "--type", "text", "--watch",
			"sh", "-c", `case "$CLIPBOARD_STATE" in sensitive|nil|clear) ;; *) cat ;; esac; printf '\000'`)
		out, err := cmd.StdoutPipe()
		if err == nil {
			err = cmd.Start()
		}
		if err == nil {
			scanner := bufio.NewScanner(out)
			scanner.Buffer(make([]byte, 4096), 64*1024)
			scanner.Split(scanSelection)
			for scanner.Scan() {
				onChange(strings.TrimSpace(scanner.Text()))
			}
			_ = cmd.Process.Kill()
			_ = cmd.Wait()
		}
		if out != nil {
			_ = out.Close()
		}
		if ctx.Err() != nil {
			return
		}
		log.Printf("PRIMARY event watcher unavailable; falling back to polling")
	}

	// shortcut: polling cannot detect identical reselections without an intervening change;
	// use selection events on compositors that support data-control.
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	previous := GetSelectedText()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			text := GetSelectedText()
			if text != previous {
				previous = text
				onChange(text)
			}
		}
	}
}

func scanSelection(data []byte, atEOF bool) (int, []byte, error) {
	if i := bytes.IndexByte(data, 0); i >= 0 {
		return i + 1, data[:i], nil
	}
	return 0, nil, nil
}
