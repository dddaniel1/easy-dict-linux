package main

import (
	"strings"

	"easydict-linux/internal/assets"
	"github.com/egoist/mygo"
)

func (a *Application) translationWindowFocused() bool {
	a.mu.Lock()
	win := a.selectionWindow
	a.mu.Unlock()
	return a.window.IsFocused() || (win != nil && win.IsFocused())
}

func (a *Application) showSelectionTranslation(text string, point mygo.Point) {
	var win *mygo.Window
	mygo.RunOnMain(func() {
		if a.selectionWindow == nil {
			popup := mygo.NewWindow(mygo.WindowOptions{
				Title: "Easydict 划词翻译", Width: 480, Height: 360,
				MinWidth: 420, MinHeight: 280, Panel: true, Hidden: true,
			})
			a.mu.Lock()
			a.selectionWindow = popup
			a.mu.Unlock()
			off := popup.OnClose(func(e *mygo.CloseEvent) {
				e.PreventDefault()
				popup.Hide()
			})
			mygo.App.OnBeforeQuit(func(*mygo.QuitEvent) { off() })
			// Reuse the same controls, without querying the clipboard on popup startup.
			html := strings.Replace(assets.GetHTML(), "<head>", "<head><script>window.__easydict_selection_window = true;</script>", 1)
			popup.Page().LoadHTML(html, "")
		}
		display := mygo.Screen.DisplayNearestPoint(point)
		area := display.WorkArea
		if area.Width <= 0 || area.Height <= 0 {
			area = display.Bounds
		}
		bounds := selectionWindowBounds(point, area)
		win = a.selectionWindow
		win.SetBounds(bounds)
		win.Show()
	})
	a.deliverQuery(win, text)
}

func selectionWindowBounds(point mygo.Point, area mygo.Rectangle) mygo.Rectangle {
	const gap = 12
	r := mygo.Rectangle{X: point.X + gap, Y: point.Y + gap, Width: 480, Height: 360}
	if area.Width <= 0 || area.Height <= 0 {
		return r
	}
	r.Width = min(r.Width, max(1, area.Width-2*gap))
	r.Height = min(r.Height, max(1, area.Height-2*gap))
	if r.X+r.Width > area.X+area.Width-gap {
		r.X = point.X - r.Width - gap
	}
	if r.Y+r.Height > area.Y+area.Height-gap {
		r.Y = point.Y - r.Height - gap
	}
	r.X = max(area.X+gap, min(r.X, area.X+area.Width-r.Width-gap))
	r.Y = max(area.Y+gap, min(r.Y, area.Y+area.Height-r.Height-gap))
	return r
}
