package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"
)

// ErrSelectionCancelled means the user dismissed the screenshot region picker.
var ErrSelectionCancelled = errors.New("截图选区已取消")

// IsSelectionCancelled reports whether a screenshot error came from the user
// dismissing the region picker instead of an OCR or capture failure.
func IsSelectionCancelled(err error) bool {
	return errors.Is(err, ErrSelectionCancelled)
}

// OCRService provides screenshot capture and text recognition capabilities
type OCRService struct {
	client *http.Client
}

func NewOCRService() *OCRService {
	return &OCRService{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// CaptureScreenArea invokes an interactive region selection tool on Linux
// (slurp + grim on Wayland, or import on X11) and returns the PNG image data.
func (o *OCRService) CaptureScreenArea() ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	// 1. Wayland slurp + grim
	if isCommandAvailable("slurp") && isCommandAvailable("grim") {
		// Run slurp with sleek modern styling (dimensions indicator, dim background, accent border)
		slurpCmd := exec.CommandContext(ctx, "slurp", "-d", "-b", "#00000044", "-c", "#3b82f6ff", "-s", "#3b82f622", "-w", "2")
		var slurpOut bytes.Buffer
		slurpCmd.Stdout = &slurpOut
		if err := slurpCmd.Run(); err != nil {
			if ctx.Err() != nil {
				return nil, fmt.Errorf("截图选区超时: %w", ctx.Err())
			}
			return nil, fmt.Errorf("%w: %v", ErrSelectionCancelled, err)
		}
		geom := strings.TrimSpace(slurpOut.String())
		if geom == "" {
			return nil, ErrSelectionCancelled
		}

		// Run grim to capture the selected area
		grimCmd := exec.CommandContext(ctx, "grim", "-g", geom, "-")
		var grimOut bytes.Buffer
		grimCmd.Stdout = &grimOut
		if err := grimCmd.Run(); err != nil {
			return nil, fmt.Errorf("grim capture failed: %w", err)
		}
		return grimOut.Bytes(), nil
	}

	// 2. X11 import (from imagemagick)
	if isCommandAvailable("import") {
		importCmd := exec.CommandContext(ctx, "import", "png:-")
		var importOut bytes.Buffer
		importCmd.Stdout = &importOut
		if err := importCmd.Run(); err == nil && importOut.Len() > 0 {
			return importOut.Bytes(), nil
		}
	}

	return nil, fmt.Errorf("no supported screenshot utility found (requires slurp+grim on Wayland or import on X11)")
}

// RecognizeText performs OCR on PNG image data.
// It prioritizes the high-accuracy Youdao OCR web API and falls back to local Tesseract.
func (o *OCRService) RecognizeText(imgData []byte) (string, error) {
	if len(imgData) == 0 {
		return "", fmt.Errorf("image data is empty")
	}

	// 1. Try Youdao OCR API (high accuracy cloud OCR)
	text, err := o.recognizeYoudao(imgData)
	if err == nil && strings.TrimSpace(text) != "" {
		return strings.TrimSpace(text), nil
	}

	// 2. Fallback to local Tesseract (with chi_sim + chi_tra + eng)
	if isCommandAvailable("tesseract") {
		text, err := o.recognizeTesseract(imgData)
		if err == nil && strings.TrimSpace(text) != "" {
			return strings.TrimSpace(text), nil
		}
	}

	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("no text recognized in image")
}

func (o *OCRService) recognizeYoudao(imgData []byte) (string, error) {
	b64 := base64.StdEncoding.EncodeToString(imgData)
	imgBase := "data:image/png;base64," + b64

	form := url.Values{}
	form.Set("imgBase", imgBase)

	req, err := http.NewRequest("POST", "https://aidemo.youdao.com/ocrtransapi1", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := o.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var ocrResp struct {
		ErrorCode string `json:"errorCode"`
		Lines     []struct {
			Context     string `json:"context"`
			TranContent string `json:"tranContent"`
		} `json:"lines"`
	}

	if err := json.Unmarshal(body, &ocrResp); err != nil {
		return "", err
	}

	if len(ocrResp.Lines) == 0 {
		return "", fmt.Errorf("no text detected by Youdao OCR")
	}

	var sb strings.Builder
	for _, line := range ocrResp.Lines {
		trimmed := strings.TrimSpace(line.Context)
		if trimmed == "" {
			continue
		}
		if sb.Len() > 0 {
			sb.WriteString("\n")
		}
		sb.WriteString(trimmed)
	}

	return sb.String(), nil
}

func (o *OCRService) recognizeTesseract(imgData []byte) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "tesseract", "stdin", "stdout", "-l", "chi_sim+chi_tra+eng")
	cmd.Stdin = bytes.NewReader(imgData)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		// Retry without specific lang in case chi_sim is missing
		cmd2 := exec.CommandContext(ctx, "tesseract", "stdin", "stdout")
		cmd2.Stdin = bytes.NewReader(imgData)
		var stdout2 bytes.Buffer
		cmd2.Stdout = &stdout2
		if err2 := cmd2.Run(); err2 == nil {
			return strings.TrimSpace(stdout2.String()), nil
		}
		return "", err
	}

	return strings.TrimSpace(stdout.String()), nil
}

// SendDesktopNotification triggers a Linux desktop notification using notify-send
func SendDesktopNotification(title, message string) {
	if isCommandAvailable("notify-send") {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = exec.CommandContext(ctx, "notify-send", "-a", "Easydict", "-i", "easydict", title, message).Run()
	}
}

func isCommandAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}
