package main

import (
	"github.com/ebitengine/purego"
	"github.com/egoist/mygo"
)

func keepBubbleUnfocused(w *mygo.Window) error {
	gtk, err := purego.Dlopen("libgtk-3.so.0", purego.RTLD_NOW|purego.RTLD_LOCAL)
	if err != nil {
		return err
	}
	var setAcceptFocus, setFocusOnMap func(uintptr, bool)
	purego.RegisterLibFunc(&setAcceptFocus, gtk, "gtk_window_set_accept_focus")
	purego.RegisterLibFunc(&setFocusOnMap, gtk, "gtk_window_set_focus_on_map")
	handle := w.NativeHandle()
	setAcceptFocus(handle, false)
	setFocusOnMap(handle, false)

	layer, err := purego.Dlopen("libgtk-layer-shell.so.0", purego.RTLD_NOW|purego.RTLD_LOCAL)
	if err != nil {
		return nil // X11 and compositors without layer-shell use GTK's focus hints.
	}
	var isLayerWindow func(uintptr) bool
	var setKeyboardMode func(uintptr, int32)
	purego.RegisterLibFunc(&isLayerWindow, layer, "gtk_layer_is_layer_window")
	purego.RegisterLibFunc(&setKeyboardMode, layer, "gtk_layer_set_keyboard_mode")
	if isLayerWindow(handle) {
		setKeyboardMode(handle, 0) // GTK_LAYER_SHELL_KEYBOARD_MODE_NONE
		// ShowInactive sets ON_DEMAND; restore NONE before GTK flushes the map.
		w.OnShow(func() { setKeyboardMode(handle, 0) })
	}
	return nil
}
