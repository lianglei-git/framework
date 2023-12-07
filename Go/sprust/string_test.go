package sprust

import (
	"testing"
)

func TestNfc(t *testing.T) {
	// input := "Héllò, \x1f \n Wòrld!👌"
	input := "Café"
	normalized := Normalize2Nfc(input)
	t.Error(normalized == input)
}

func TestIsASCIIControl(t *testing.T) {
	ch := 'A'

	if IsASCIIControl(ch) {
		t.Errorf("%c is an ASCII control character.\n", ch)
	} else {
		t.Errorf("%c is not an ASCII control character.\n", ch)
	}
}
