package assets

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/png"
)

// GenerateAppIcon produces a 64x64 PNG app icon
func GenerateAppIcon() []byte {
	img := image.NewNRGBA(image.Rect(0, 0, 64, 64))

	// Rounded rect background: indigo gradient / modern blue
	bg := color.NRGBA{R: 59, G: 130, B: 246, A: 255} // Blue-500
	accent := color.NRGBA{R: 37, G: 99, B: 235, A: 255}

	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			// Check rounded corners with radius 14
			dx := min(x, 63-x)
			dy := min(y, 63-y)
			if dx < 14 && dy < 14 {
				d2 := (14-dx)*(14-dx) + (14-dy)*(14-dy)
				if d2 > 14*14 {
					continue
				}
			}
			t := float64(y) / 64.0
			r := uint8(float64(bg.R)*(1-t) + float64(accent.R)*t)
			g := uint8(float64(bg.G)*(1-t) + float64(accent.G)*t)
			b := uint8(float64(bg.B)*(1-t) + float64(accent.B)*t)
			img.Set(x, y, color.NRGBA{R: r, G: g, B: b, A: 255})
		}
	}

	white := color.NRGBA{R: 255, G: 255, B: 255, A: 255}

	// Draw dictionary book spine & pages symbol
	// Left page
	draw.Draw(img, image.Rect(16, 20, 30, 44), image.NewUniform(white), image.Point{}, draw.Src)
	// Right page
	draw.Draw(img, image.Rect(34, 20, 48, 44), image.NewUniform(white), image.Point{}, draw.Src)
	// Center fold line (darker)
	draw.Draw(img, image.Rect(31, 20, 33, 44), image.NewUniform(color.NRGBA{R: 30, G: 64, B: 175, A: 255}), image.Point{}, draw.Src)

	// Horizontal lines on left page
	bookInk := color.NRGBA{R: 37, G: 99, B: 235, A: 255}
	draw.Draw(img, image.Rect(19, 26, 27, 28), image.NewUniform(bookInk), image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(19, 31, 27, 33), image.NewUniform(bookInk), image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(19, 36, 25, 38), image.NewUniform(bookInk), image.Point{}, draw.Src)

	// Horizontal lines on right page
	draw.Draw(img, image.Rect(37, 26, 45, 28), image.NewUniform(bookInk), image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(37, 31, 45, 33), image.NewUniform(bookInk), image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(37, 36, 43, 38), image.NewUniform(bookInk), image.Point{}, draw.Src)

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

// GenerateTrayIcon produces a 22x22 tray icon for Linux panels
func GenerateTrayIcon() []byte {
	img := image.NewNRGBA(image.Rect(0, 0, 22, 22))
	ink := color.NRGBA{R: 59, G: 130, B: 246, A: 255}

	// Draw "E" shape or book outline
	for y := 3; y <= 18; y++ {
		img.Set(4, y, ink)
		img.Set(5, y, ink)
	}
	for x := 4; x <= 16; x++ {
		img.Set(x, 3, ink)
		img.Set(x, 4, ink)
		img.Set(x, 10, ink)
		img.Set(x, 11, ink)
		img.Set(x, 17, ink)
		img.Set(x, 18, ink)
	}

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}
