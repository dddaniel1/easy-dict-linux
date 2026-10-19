package main

import (
	"testing"

	"github.com/egoist/mygo"
)

func TestSelectionWindowBounds(t *testing.T) {
	for _, tc := range []struct {
		name  string
		point mygo.Point
		area  mygo.Rectangle
		want  mygo.Rectangle
	}{
		{"lower right", mygo.Point{X: 300, Y: 200}, mygo.Rectangle{Width: 1600, Height: 1000}, mygo.Rectangle{X: 312, Y: 212, Width: 480, Height: 360}},
		{"right edge", mygo.Point{X: 1500, Y: 200}, mygo.Rectangle{Width: 1600, Height: 1000}, mygo.Rectangle{X: 1008, Y: 212, Width: 480, Height: 360}},
		{"bottom edge", mygo.Point{X: 300, Y: 950}, mygo.Rectangle{Width: 1600, Height: 1000}, mygo.Rectangle{X: 312, Y: 578, Width: 480, Height: 360}},
		{"negative monitor", mygo.Point{X: -1000, Y: 100}, mygo.Rectangle{X: -1600, Width: 1600, Height: 1000}, mygo.Rectangle{X: -988, Y: 112, Width: 480, Height: 360}},
		{"work area inset", mygo.Point{}, mygo.Rectangle{X: 20, Y: 40, Width: 1580, Height: 960}, mygo.Rectangle{X: 32, Y: 52, Width: 480, Height: 360}},
		{"unknown monitor", mygo.Point{X: 300, Y: 200}, mygo.Rectangle{}, mygo.Rectangle{X: 312, Y: 212, Width: 480, Height: 360}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := selectionWindowBounds(tc.point, tc.area); got != tc.want {
				t.Fatalf("bounds = %+v, want %+v", got, tc.want)
			}
		})
	}
}
