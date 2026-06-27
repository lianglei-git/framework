package models

import (
	"encoding/json"
	"time"
)

// SyncTask 同步任务表
type SyncTask struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	Name          string     `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description   string     `json:"description" gorm:"size:500"`
	SourceProject string     `json:"source_project" gorm:"not null;size:50"`
	TargetProject string     `json:"target_project" gorm:"not null;size:50"`
	SyncType      string     `json:"sync_type" gorm:"not null;size:20"`       // full, incremental, realtime
	Status        string     `json:"status" gorm:"default:'pending';size:20"` // pending, running, completed, failed
	Config        JSON       `json:"config" gorm:"type:json"`                 // 同步配置
	Schedule      string     `json:"schedule" gorm:"size:100"`                // Cron 表达式
	LastSyncAt    *time.Time `json:"last_sync_at"`
	NextSyncAt    *time.Time `json:"next_sync_at"`
	IsActive      bool       `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// SyncLog 同步日志表
type SyncLog struct {
	ID               uint       `json:"id" gorm:"primaryKey"`
	TaskID           uint       `json:"task_id" gorm:"not null"`
	Status           string     `json:"status" gorm:"not null;size:20"` // success, failed, partial
	StartTime        time.Time  `json:"start_time"`
	EndTime          *time.Time `json:"end_time"`
	RecordsProcessed int64      `json:"records_processed" gorm:"default:0"`
	RecordsSuccess   int64      `json:"records_success" gorm:"default:0"`
	RecordsFailed    int64      `json:"records_failed" gorm:"default:0"`
	ErrorMsg         string     `json:"error_msg" gorm:"size:1000"`
	Details          JSON       `json:"details" gorm:"type:json"`
	CreatedAt        time.Time  `json:"created_at"`

	// 关联
	Task SyncTask `json:"task" gorm:"foreignKey:TaskID"`
}

// DataChange 数据变更记录表
type DataChange struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	TableName   string     `json:"table_name" gorm:"not null;size:100"`
	RecordID    string     `json:"record_id" gorm:"not null;size:100"`
	ChangeType  string     `json:"change_type" gorm:"not null;size:20"` // insert, update, delete
	OldData     JSON       `json:"old_data" gorm:"type:json"`
	NewData     JSON       `json:"new_data" gorm:"type:json"`
	Project     string     `json:"project" gorm:"size:50"`
	UserID      string     `json:"user_id" gorm:"size:36"`
	SyncStatus  string     `json:"sync_status" gorm:"default:'pending';size:20"` // pending, synced, failed
	RetryCount  int        `json:"retry_count" gorm:"default:0"`
	LastRetryAt *time.Time `json:"last_retry_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// SyncMapping 同步映射表
type SyncMapping struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	TaskID        uint      `json:"task_id" gorm:"not null"`
	SourceTable   string    `json:"source_table" gorm:"not null;size:100"`
	TargetTable   string    `json:"target_table" gorm:"not null;size:100"`
	FieldMapping  JSON      `json:"field_mapping" gorm:"type:json"`  // 字段映射关系
	TransformRule JSON      `json:"transform_rule" gorm:"type:json"` // 数据转换规则
	IsActive      bool      `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// 关联
	Task SyncTask `json:"task" gorm:"foreignKey:TaskID"`
}

// SyncConflict 同步冲突表
type SyncConflict struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	TaskID       uint       `json:"task_id" gorm:"not null"`
	TableName    string     `json:"table_name" gorm:"not null;size:100"`
	RecordID     string     `json:"record_id" gorm:"not null;size:100"`
	ConflictType string     `json:"conflict_type" gorm:"not null;size:50"` // duplicate_key, constraint_violation, data_inconsistency
	SourceData   JSON       `json:"source_data" gorm:"type:json"`
	TargetData   JSON       `json:"target_data" gorm:"type:json"`
	Resolution   string     `json:"resolution" gorm:"size:20"` // source_wins, target_wins, manual, ignore
	ResolvedBy   string     `json:"resolved_by" gorm:"size:36"`
	ResolvedAt   *time.Time `json:"resolved_at"`
	Notes        string     `json:"notes" gorm:"size:1000"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// 关联
	Task SyncTask `json:"task" gorm:"foreignKey:TaskID"`
}

// SyncCheckpoint 同步检查点表
type SyncCheckpoint struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	TaskID     uint      `json:"task_id" gorm:"not null"`
	TableName  string    `json:"table_name" gorm:"not null;size:100"`
	Checkpoint JSON      `json:"checkpoint" gorm:"type:json"` // 检查点数据
	LastSyncID string    `json:"last_sync_id" gorm:"size:100"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	// 关联
	Task SyncTask `json:"task" gorm:"foreignKey:TaskID"`
}

// 请求和响应结构体

// CreateSyncTaskRequest 创建同步任务请求
type CreateSyncTaskRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Description   string                 `json:"description,omitempty"`
	SourceProject string                 `json:"source_project" binding:"required"`
	TargetProject string                 `json:"target_project" binding:"required"`
	SyncType      string                 `json:"sync_type" binding:"required,oneof=full incremental realtime"`
	Config        map[string]interface{} `json:"config,omitempty"`
	Schedule      string                 `json:"schedule,omitempty"`
}

// UpdateSyncTaskRequest 更新同步任务请求
type UpdateSyncTaskRequest struct {
	Name        *string                 `json:"name,omitempty"`
	Description *string                 `json:"description,omitempty"`
	SyncType    *string                 `json:"sync_type,omitempty"`
	Config      *map[string]interface{} `json:"config,omitempty"`
	Schedule    *string                 `json:"schedule,omitempty"`
	IsActive    *bool                   `json:"is_active,omitempty"`
}

// CreateSyncMappingRequest 创建同步映射请求
type CreateSyncMappingRequest struct {
	TaskID        uint                   `json:"task_id" binding:"required"`
	SourceTable   string                 `json:"source_table" binding:"required"`
	TargetTable   string                 `json:"target_table" binding:"required"`
	FieldMapping  map[string]string      `json:"field_mapping" binding:"required"`
	TransformRule map[string]interface{} `json:"transform_rule,omitempty"`
}

// SyncTaskResponse 同步任务响应
type SyncTaskResponse struct {
	ID            uint                   `json:"id"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	SourceProject string                 `json:"source_project"`
	TargetProject string                 `json:"target_project"`
	SyncType      string                 `json:"sync_type"`
	Status        string                 `json:"status"`
	Config        map[string]interface{} `json:"config"`
	Schedule      string                 `json:"schedule"`
	LastSyncAt    *time.Time             `json:"last_sync_at"`
	NextSyncAt    *time.Time             `json:"next_sync_at"`
	IsActive      bool                   `json:"is_active"`
	CreatedAt     time.Time              `json:"created_at"`
}

// SyncLogResponse 同步日志响应
type SyncLogResponse struct {
	ID               uint       `json:"id"`
	TaskID           uint       `json:"task_id"`
	TaskName         string     `json:"task_name"`
	Status           string     `json:"status"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          *time.Time `json:"end_time"`
	Duration         int64      `json:"duration"` // 持续时间（秒）
	RecordsProcessed int64      `json:"records_processed"`
	RecordsSuccess   int64      `json:"records_success"`
	RecordsFailed    int64      `json:"records_failed"`
	SuccessRate      float64    `json:"success_rate"`
	ErrorMsg         string     `json:"error_msg"`
	CreatedAt        time.Time  `json:"created_at"`
}

// DataChangeResponse 数据变更响应
type DataChangeResponse struct {
	ID         uint                   `json:"id"`
	TableName  string                 `json:"table_name"`
	RecordID   string                 `json:"record_id"`
	ChangeType string                 `json:"change_type"`
	OldData    map[string]interface{} `json:"old_data"`
	NewData    map[string]interface{} `json:"new_data"`
	Project    string                 `json:"project"`
	UserID     string                 `json:"user_id"`
	Username   string                 `json:"username"`
	SyncStatus string                 `json:"sync_status"`
	RetryCount int                    `json:"retry_count"`
	CreatedAt  time.Time              `json:"created_at"`
}

// SyncConflictResponse 同步冲突响应
type SyncConflictResponse struct {
	ID           uint                   `json:"id"`
	TaskID       uint                   `json:"task_id"`
	TaskName     string                 `json:"task_name"`
	TableName    string                 `json:"table_name"`
	RecordID     string                 `json:"record_id"`
	ConflictType string                 `json:"conflict_type"`
	SourceData   map[string]interface{} `json:"source_data"`
	TargetData   map[string]interface{} `json:"target_data"`
	Resolution   string                 `json:"resolution"`
	ResolvedBy   string                 `json:"resolved_by"`
	ResolvedAt   *time.Time             `json:"resolved_at"`
	Notes        string                 `json:"notes"`
	CreatedAt    time.Time              `json:"created_at"`
}

// 方法实现

// GetConfig 获取同步任务配置
func (st *SyncTask) GetConfig() (map[string]interface{}, error) {
	if len(st.Config) == 0 {
		return map[string]interface{}{}, nil
	}

	var config map[string]interface{}
	err := json.Unmarshal(st.Config, &config)
	if err != nil {
		return nil, err
	}
	return config, nil
}

// SetConfig 设置同步任务配置
func (st *SyncTask) SetConfig(config map[string]interface{}) error {
	if config == nil {
		st.Config = nil
		return nil
	}

	jsonData, err := json.Marshal(config)
	if err != nil {
		return err
	}
	st.Config = JSON(jsonData)
	return nil
}

// GetDetails 获取同步日志详情
func (sl *SyncLog) GetDetails() (map[string]interface{}, error) {
	if len(sl.Details) == 0 {
		return map[string]interface{}{}, nil
	}

	var details map[string]interface{}
	err := json.Unmarshal(sl.Details, &details)
	if err != nil {
		return nil, err
	}
	return details, nil
}

// SetDetails 设置同步日志详情
func (sl *SyncLog) SetDetails(details map[string]interface{}) error {
	if details == nil {
		sl.Details = nil
		return nil
	}

	jsonData, err := json.Marshal(details)
	if err != nil {
		return err
	}
	sl.Details = JSON(jsonData)
	return nil
}

// GetOldData 获取变更前的数据
func (dc *DataChange) GetOldData() (map[string]interface{}, error) {
	if len(dc.OldData) == 0 {
		return map[string]interface{}{}, nil
	}

	var oldData map[string]interface{}
	err := json.Unmarshal(dc.OldData, &oldData)
	if err != nil {
		return nil, err
	}
	return oldData, nil
}

// SetOldData 设置变更前的数据
func (dc *DataChange) SetOldData(oldData map[string]interface{}) error {
	if oldData == nil {
		dc.OldData = nil
		return nil
	}

	jsonData, err := json.Marshal(oldData)
	if err != nil {
		return err
	}
	dc.OldData = JSON(jsonData)
	return nil
}

// GetNewData 获取变更后的数据
func (dc *DataChange) GetNewData() (map[string]interface{}, error) {
	if len(dc.NewData) == 0 {
		return map[string]interface{}{}, nil
	}

	var newData map[string]interface{}
	err := json.Unmarshal(dc.NewData, &newData)
	if err != nil {
		return nil, err
	}
	return newData, nil
}

// SetNewData 设置变更后的数据
func (dc *DataChange) SetNewData(newData map[string]interface{}) error {
	if newData == nil {
		dc.NewData = nil
		return nil
	}

	jsonData, err := json.Marshal(newData)
	if err != nil {
		return err
	}
	dc.NewData = JSON(jsonData)
	return nil
}

// GetFieldMapping 获取字段映射
func (sm *SyncMapping) GetFieldMapping() (map[string]string, error) {
	if len(sm.FieldMapping) == 0 {
		return map[string]string{}, nil
	}

	var fieldMapping map[string]string
	err := json.Unmarshal(sm.FieldMapping, &fieldMapping)
	if err != nil {
		return nil, err
	}
	return fieldMapping, nil
}

// SetFieldMapping 设置字段映射
func (sm *SyncMapping) SetFieldMapping(fieldMapping map[string]string) error {
	if fieldMapping == nil {
		sm.FieldMapping = nil
		return nil
	}

	jsonData, err := json.Marshal(fieldMapping)
	if err != nil {
		return err
	}
	sm.FieldMapping = JSON(jsonData)
	return nil
}

// GetTransformRule 获取转换规则
func (sm *SyncMapping) GetTransformRule() (map[string]interface{}, error) {
	if len(sm.TransformRule) == 0 {
		return map[string]interface{}{}, nil
	}

	var transformRule map[string]interface{}
	err := json.Unmarshal(sm.TransformRule, &transformRule)
	if err != nil {
		return nil, err
	}
	return transformRule, nil
}

// SetTransformRule 设置转换规则
func (sm *SyncMapping) SetTransformRule(transformRule map[string]interface{}) error {
	if transformRule == nil {
		sm.TransformRule = nil
		return nil
	}

	jsonData, err := json.Marshal(transformRule)
	if err != nil {
		return err
	}
	sm.TransformRule = JSON(jsonData)
	return nil
}

// GetCheckpoint 获取检查点数据
func (sc *SyncCheckpoint) GetCheckpoint() (map[string]interface{}, error) {
	if len(sc.Checkpoint) == 0 {
		return map[string]interface{}{}, nil
	}

	var checkpoint map[string]interface{}
	err := json.Unmarshal(sc.Checkpoint, &checkpoint)
	if err != nil {
		return nil, err
	}
	return checkpoint, nil
}

// SetCheckpoint 设置检查点数据
func (sc *SyncCheckpoint) SetCheckpoint(checkpoint map[string]interface{}) error {
	if checkpoint == nil {
		sc.Checkpoint = nil
		return nil
	}

	jsonData, err := json.Marshal(checkpoint)
	if err != nil {
		return err
	}
	sc.Checkpoint = JSON(jsonData)
	return nil
}
