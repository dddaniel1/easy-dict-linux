package assets

import _ "embed"

//go:embed dist/index.html
var mainHTML string

//go:embed dist/bubble.html
var bubbleHTML string

// GetHTML returns the self-contained React + Base UI main window.
func GetHTML() string {
	return mainHTML
}

// GetBubbleHTML returns the self-contained React + Base UI selection bubble.
func GetBubbleHTML() string {
	return bubbleHTML
}
