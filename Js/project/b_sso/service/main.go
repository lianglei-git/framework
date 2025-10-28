package service

import (
	"bytes"
	"io"
	"log"
	"net/http"
)

func exchangeToken() {
	response, err := http.Post("http://localhost:8080/oauth/token", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}
}
