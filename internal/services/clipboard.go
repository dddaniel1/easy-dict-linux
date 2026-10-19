package services

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/egoist/mygo"
)

// GetSelectedText returns the currently highlighted mouse selection (PRIMARY), or empty string.
func GetSelectedText() string {
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		return runCommandQuick("wl-paste", "--primary", "--type", "text", "--no-newline")
	}
	if text := runCommandQuick("xclip", "-o", "-selection", "primary"); text != "" {
		return text
	}
	return runCommandQuick("xsel", "-o", "-p")
}

// GetClipboardText returns the standard CLIPBOARD text.
func GetClipboardText() string {
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		return runCommandQuick("wl-paste", "--type", "text", "--no-newline")
	}
	if text := runCommandQuick("xclip", "-o", "-selection", "clipboard"); text != "" {
		return text
	}
	if text := runCommandQuick("xsel", "-o", "-b"); text != "" {
		return text
	}
	if mygo.App != nil {
		return strings.TrimSpace(mygo.Clipboard.ReadText())
	}
	return ""
}

// WriteClipboardText sets the system clipboard on Wayland/X11
func WriteClipboardText(text string) error {
	name := ""
	var args []string
	switch {
	case os.Getenv("WAYLAND_DISPLAY") != "":
		name, args = "wl-copy", []string{"--type", "text/plain;charset=utf-8"}
	case isCommandAvailable("xclip"):
		name, args = "xclip", []string{"-selection", "clipboard"}
	case isCommandAvailable("xsel"):
		name, args = "xsel", []string{"-i", "-b"}
	default:
		return fmt.Errorf("no clipboard tool available")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin = strings.NewReader(text)
	cmd.WaitDelay = 100 * time.Millisecond
	return cmd.Run()
}

// GetCursorScreenPoint returns global cursor coordinates (X, Y) reliably on Linux
func GetCursorScreenPoint() (int, int) {
	// 1. Try hyprctl cursorpos on Hyprland (fastest & 100% accurate on Wayland)
	if isCommandAvailable("hyprctl") {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()
		out, err := exec.CommandContext(ctx, "hyprctl", "cursorpos").Output()
		if err == nil {
			parts := strings.Split(strings.TrimSpace(string(out)), ",")
			if len(parts) == 2 {
				x, errX := strconv.Atoi(strings.TrimSpace(parts[0]))
				y, errY := strconv.Atoi(strings.TrimSpace(parts[1]))
				if errX == nil && errY == nil {
					return x, y
				}
			}
		}
	}

	// 2. Try mygo.Screen.CursorScreenPoint()
	if mygo.App != nil {
		pt := mygo.Screen.CursorScreenPoint()
		if pt.X != 0 || pt.Y != 0 {
			return pt.X, pt.Y
		}
	}

	// 3. Try xdotool on X11 / XWayland
	if isCommandAvailable("xdotool") {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()
		out, err := exec.CommandContext(ctx, "xdotool", "getmouselocation", "--shell").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			var x, y int
			var haveX, haveY bool
			for _, line := range lines {
				if strings.HasPrefix(line, "X=") {
					var err error
					x, err = strconv.Atoi(strings.TrimPrefix(line, "X="))
					haveX = err == nil
				} else if strings.HasPrefix(line, "Y=") {
					var err error
					y, err = strconv.Atoi(strings.TrimPrefix(line, "Y="))
					haveY = err == nil
				}
			}
			if haveX && haveY {
				return x, y
			}
		}
	}

	return 500, 300
}

func runCommandQuick(name string, args ...string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err == nil {
		s := strings.TrimSpace(stdout.String())
		if s != "" {
			return s
		}
	}
	return ""
}
