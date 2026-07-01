package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"

	"github.com/tencentyun/cos-go-sdk-v5"
)

// CosFileStorage 腾讯云 COS 文件存储
type CosFileStorage struct {
	client   *cos.Client
	bucket   string
	region   string
	cdnBase  string
	maxBytes int64
}

func NewCosFileStorage() (*CosFileStorage, error) {
	secretID := cosSecretID()
	secretKey := cosSecretKey()
	region := cosRegion()
	bucket := cosBucket()

	if secretID == "" || secretKey == "" || region == "" || bucket == "" {
		return nil, fmt.Errorf("COS storage requires FILE_COS_* or AVATAR_COS_* credentials")
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

	return &CosFileStorage{
		client:   client,
		bucket:   bucket,
		region:   region,
		cdnBase:  fileCDNBase(),
		maxBytes: defaultFileMaxBytes,
	}, nil
}

func (s *CosFileStorage) Scheme() string {
	return SchemeOSS
}

func (s *CosFileStorage) Save(namespace, ownerID string, file multipart.File, header *multipart.FileHeader) (string, error) {
	if header.Size > s.maxBytes {
		return "", fmt.Errorf("file too large")
	}

	ext, contentType, err := detectImageExt(header)
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(namespace) == "" {
		namespace = "files"
	}

	objectKey := buildObjectKey(ownerID, ext, namespace)
	_, err = s.client.Object.Put(context.Background(), objectKey, file, &cos.ObjectPutOptions{
		ObjectPutHeaderOptions: &cos.ObjectPutHeaderOptions{
			ContentType: contentType,
		},
	})
	if err != nil {
		return "", fmt.Errorf("cos put object: %w", err)
	}

	return FormatStoredRef(SchemeOSS, objectKey), nil
}

func (s *CosFileStorage) ResolveURL(ref StoredFileRef, apiBase string) string {
	if ref.Scheme != SchemeOSS {
		return ""
	}
	if s.cdnBase != "" {
		return s.cdnBase + "/" + ref.Path
	}
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", s.bucket, s.region, ref.Path)
}

func (s *CosFileStorage) DefaultObjectURL(objectKey string) string {
	if s.cdnBase != "" {
		return s.cdnBase + "/" + objectKey
	}
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", s.bucket, s.region, objectKey)
}

func (s *CosFileStorage) Bucket() string  { return s.bucket }
func (s *CosFileStorage) Region() string  { return s.region }
func (s *CosFileStorage) CDNBase() string { return s.cdnBase }
