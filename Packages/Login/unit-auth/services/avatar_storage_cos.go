package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/tencentyun/cos-go-sdk-v5"
)

// CosAvatarStorage 腾讯云 COS 头像存储
// 文档：https://cloud.tencent.com/document/product/436/7749
type CosAvatarStorage struct {
	client   *cos.Client
	bucket   string
	region   string
	prefix   string
	cdnBase  string
	maxBytes int64
}

func NewCosAvatarStorage() (*CosAvatarStorage, error) {
	secretID := strings.TrimSpace(os.Getenv("AVATAR_COS_SECRET_ID"))
	secretKey := strings.TrimSpace(os.Getenv("AVATAR_COS_SECRET_KEY"))
	region := strings.TrimSpace(os.Getenv("AVATAR_COS_REGION"))
	bucket := strings.TrimSpace(os.Getenv("AVATAR_COS_BUCKET"))

	if secretID == "" || secretKey == "" || region == "" || bucket == "" {
		return nil, fmt.Errorf("COS avatar storage requires AVATAR_COS_SECRET_ID, AVATAR_COS_SECRET_KEY, AVATAR_COS_REGION, AVATAR_COS_BUCKET")
	}

	prefix := strings.TrimSpace(os.Getenv("AVATAR_COS_PREFIX"))
	if prefix == "" {
		prefix = "avatars"
	}

	bucketURL, err := url.Parse(fmt.Sprintf("https://%s.cos.%s.myqcloud.com", bucket, region))
	if err != nil {
		return nil, err
	}

	client := cos.NewClient(&cos.BaseURL{BucketURL: bucketURL}, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  secretID,
			SecretKey: secretKey,
		},
	})

	return &CosAvatarStorage{
		client:   client,
		bucket:   bucket,
		region:   region,
		prefix:   prefix,
		cdnBase:  avatarCDNBase(),
		maxBytes: defaultAvatarMaxBytes,
	}, nil
}

func (s *CosAvatarStorage) Save(userID string, file multipart.File, header *multipart.FileHeader) (storedValue string, accessKey string, err error) {
	if header.Size > s.maxBytes {
		return "", "", fmt.Errorf("file too large")
	}

	ext, contentType, err := detectAvatarExt(header)
	if err != nil {
		return "", "", err
	}

	accessKey = buildAvatarObjectKey(userID, ext, s.prefix)
	_, err = s.client.Object.Put(context.Background(), accessKey, file, &cos.ObjectPutOptions{
		ObjectPutHeaderOptions: &cos.ObjectPutHeaderOptions{
			ContentType: contentType,
		},
	})
	if err != nil {
		return "", "", fmt.Errorf("cos put object: %w", err)
	}

	return "oss:" + accessKey, accessKey, nil
}

func (s *CosAvatarStorage) ResolvePublicURL(storedValue string, apiBase string) string {
	if strings.HasPrefix(storedValue, "http://") || strings.HasPrefix(storedValue, "https://") {
		return storedValue
	}

	if strings.HasPrefix(storedValue, "oss:") {
		key := storedValue[4:]
		if s.cdnBase != "" {
			return s.cdnBase + "/" + key
		}
		return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", s.bucket, s.region, key)
	}

	if strings.HasPrefix(storedValue, "local:") {
		return NewLocalAvatarStorage().ResolvePublicURL(storedValue, apiBase)
	}

	if s.cdnBase != "" {
		return s.cdnBase + "/" + storedValue
	}
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", s.bucket, s.region, storedValue)
}

func (s *CosAvatarStorage) LocalFilePath(filename string) (string, error) {
	return "", fmt.Errorf("avatar is stored in COS")
}
