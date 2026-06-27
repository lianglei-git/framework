package utils

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"sync"
)

const rsaPublicKeyPEM = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnDBkAtd9b/mpIgWLPmxC
XHJUNZrQF2+ofiFM/xL/VNHXRxxtyepSjUwIPQsp91N6sf9z38qQwE16Xo/hj2AI
eP4dZ7zkyPk6YEjhzHf5rgeczl0wSBap415CF6BwH5d+2qhSeMj9HuiRVlHAM3yB
jgsUU+Tf4UPlKIEsXaYsGHwsqu5iAmyfB8DlGz1b5IeSv5NA+/r2S2SjewanUDvx
eecsc7/aeB9uzNNzoU9F+CgDyPcB+tBej0fJn6egHKMNFsNHfPQ3HHDqZ9mdi4EO
BgswSH4WMB3e6TqJsfJJ1nbZCbWy3a6RswnPbd9HGt/4paHLIkJFXNbLpZuvYQW9
cwIDAQAB
-----END PUBLIC KEY-----
`

var (
	rsaPublicKey     *rsa.PublicKey
	rsaPublicKeyOnce sync.Once
	rsaPublicKeyErr  error
)

func getRSAPublicKey() (*rsa.PublicKey, error) {
	rsaPublicKeyOnce.Do(func() {
		block, _ := pem.Decode([]byte(rsaPublicKeyPEM))
		if block == nil {
			rsaPublicKeyErr = fmt.Errorf("failed to decode RSA public key PEM")
			return
		}
		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			rsaPublicKeyErr = fmt.Errorf("failed to parse RSA public key: %w", err)
			return
		}
		key, ok := pub.(*rsa.PublicKey)
		if !ok {
			rsaPublicKeyErr = fmt.Errorf("parsed key is not RSA public key")
			return
		}
		rsaPublicKey = key
	})
	if rsaPublicKeyErr != nil {
		return nil, rsaPublicKeyErr
	}
	return rsaPublicKey, nil
}
