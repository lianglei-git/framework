# Temp.json 数据结构分析文档

## 概述

`temp.json` 文件包含了一个语言学习平台的事件历史记录，主要记录了学生在学习课程过程中的各种交互事件和进度信息。该文件采用 JSON 格式存储，包含命令状态和事件历史两个主要部分。

## 文件结构

### 顶层结构

```json
{
    "commandStatus": {
        "errorMessage": "",
        "successful": true
    },
    "eventHistory": {
        "errorMessage": "",
        "events": [...],
        "lastVersion": 112
    }
}
```

## 主要组件详解

### 1. commandStatus (命令状态)

- **errorMessage**: 错误信息字符串，通常为空字符串
- **successful**: 布尔值，表示命令执行是否成功

### 2. eventHistory (事件历史)

包含完整的学习会话事件记录：

- **errorMessage**: 错误信息字符串，通常为空字符串
- **events**: 事件数组，包含所有学习过程中的事件记录
- **lastVersion**: 数字，表示最后一个事件的版本号

## 事件类型 (Event Types)

根据分析，该文件包含以下主要事件类型：

### 课程相关事件

1. **lesson-started** - 课程开始
   - 包含课程设置、进度配置、观察者等信息

2. **student-joined-lesson** - 学生加入课程
   - 包含组织信息、用户ID、会话ID

3. **lesson-plan-set** - 课程计划设置
   - 包含课程内容、活动结构、媒体资源等

4. **student-opened-lesson** - 学生打开课程
   - 包含课程设置和会话信息

### 活动相关事件

5. **activity-sent** - 活动发送
   - 包含具体的活动内容和任务信息

### 任务相关事件

6. **task-response-submitted** - 任务响应提交
   - 学生提交任务答案

7. **task-response-assessed** - 任务响应评估
   - 系统评估学生答案

8. **task-progressed** - 任务进度更新
   - 任务完成进度更新

9. **task-completed** - 任务完成
   - 任务完成状态

10. **task-passed** - 任务通过
    - 任务通过状态

### 进度相关事件

11. **activity-progressed** - 活动进度
    - 活动完成进度更新

12. **step-progressed** - 步骤进度
    - 学习步骤进度更新

13. **lesson-progressed** - 课程进度
    - 整体课程进度更新

## 事件数据结构

每个事件都包含以下基本字段：

```json
{
    "commandId": "UUID",
    "data": {
        // 具体事件数据
    },
    "id": "UUID",
    "lessonId": "UUID",
    "timestamp": "ISO 8601 时间戳",
    "type": "事件类型",
    "version": 数字
}
```

### 字段说明

- **commandId**: 命令的唯一标识符 (UUID)
- **data**: 事件的具体数据内容，根据事件类型而变化
- **id**: 事件的唯一标识符 (UUID)
- **lessonId**: 课程的唯一标识符 (UUID)
- **timestamp**: 事件发生的时间戳 (ISO 8601 格式)
- **type**: 事件的类型名称
- **version**: 事件的版本号，用于排序和追踪

## 课程设置 (Lesson Settings)

课程设置包含以下配置：

### 任务设置 (Task Settings)

```json
{
    "multipleChoice": {
        "fallbackToTap": true,
        "maxSpeechAttempts": 3
    },
    "writingCorrections": {
        "allowedExternalTools": ["ai"]
    }
}
```

### 进度配置 (Progress Configs)

```json
{
    "activity": {
        "passedPercentageConfig": {
            "thresholdInPercent": 70
        },
        "type": "completed-children-percentage"
    },
    "lesson": {
        "passedPercentageConfig": {
            "thresholdInPercent": 100
        },
        "type": "passed-children-percentage"
    },
    "step": {
        "passedPercentageConfig": {
            "thresholdInPercent": 60
        },
        "type": "passed-children-percentage"
    }
}
```

## 媒体资源类型

文件中包含多种媒体资源类型：

- **audio** - 音频资源
- **video** - 视频资源
- **media-with-time-markers** - 带时间标记的媒体
- **vocab** - 词汇资源

## 任务类型

- **matching** - 匹配题
- **multipleChoice** - 选择题
- **writingCorrections** - 写作纠错

## 数据特点

1. **时间序列性**: 事件按时间顺序排列，从课程开始到结束
2. **版本控制**: 每个事件都有版本号，便于追踪和回滚
3. **完整性**: 包含完整的学习会话记录
4. **结构化**: 数据高度结构化，便于程序处理
5. **多语言支持**: 支持多种语言环境 (zh_CN, en_US, ar_001 等)

## 用途

这个数据结构主要用于：

1. **学习分析**: 分析学生的学习行为和进度
2. **问题诊断**: 追踪学习过程中的问题
3. **进度恢复**: 恢复中断的学习会话
4. **数据分析**: 进行学习效果分析
5. **审计追踪**: 记录所有学习活动

## 文件大小

该文件包含约 6962 行，记录了 112 个版本的事件，是一个相当大的学习会话记录文件，表明这是一个较为完整和详细的学习过程记录。
