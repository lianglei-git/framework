package sprust

import (
	"strings"
	"unicode"
)

// let uppercase_a = 'A';false
// let uppercase_g = 'G';false
// let a = 'a';false
// let g = 'g';false
// let zero = '0';false
// let percent = '%';false
// let space = ' '; false
// let lf = '\n'; true
// let esc = '\x1b';  true
func IsASCIIControl(r rune) bool {
	return unicode.IsControl(r) && (r >= 0x00 && r <= 0x1F) || r == '"'
}

func Normalize2Nfc(r string) string {
	var result strings.Builder

	for _, c := range r {
		// 如果字符不是Combining类字符，则直接添加到结果中
		if !unicode.Is(unicode.Mn, c) {
			result.WriteRune(c)
		}
	}

	return result.String()
}
