import React, { useEffect, useState } from 'react'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Typography,
  Skeleton,
  Alert,
  Popconfirm,
  message,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import { getUser, deleteUser } from '../../core/adminApi'
import type { AdminUser } from '../../types'
import { formatAuthError } from '../../utils/authError'

const { Title } = Typography

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  inactive: 'orange',
  suspended: 'red',
  pending: 'blue',
}

const STATUS_LABEL: Record<string, string> = {
  active: '活跃',
  inactive: '非活跃',
  suspended: '已暂停',
  pending: '待审核',
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'purple',
  moderator: 'blue',
  user: 'default',
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  moderator: '版主',
  user: '普通用户',
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getUser(id)
      .then(setUser)
      .catch((err) => setError(formatAuthError(err, '加载用户信息失败')))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteUser(id)
      message.success('用户已删除')
      navigate('/users')
    } catch (err) {
      message.error(formatAuthError(err, '删除失败'))
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
          返回列表
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          用户详情
        </Title>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : user ? (
        <Card
          extra={
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate('/users')}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除该用户？"
                description="此操作不可恢复，请谨慎操作。"
                okText="删除"
                cancelText="取消"
                okType="danger"
                onConfirm={handleDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Descriptions bordered column={{ xs: 1, sm: 2 }} labelStyle={{ fontWeight: 600 }}>
            <Descriptions.Item label="用户 ID" span={2}>
              <code style={{ fontSize: 12 }}>{user.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="用户名">{user.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <Space>
                {user.email || '-'}
                <Tag color={user.email_verified ? 'green' : 'default'}>
                  {user.email_verified ? '已验证' : '未验证'}
                </Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              <Space>
                {user.phone || '-'}
                <Tag color={user.phone_verified ? 'green' : 'default'}>
                  {user.phone_verified ? '已验证' : '未验证'}
                </Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              <Tag color={ROLE_COLOR[user.role] || 'default'}>
                {ROLE_LABEL[user.role] || user.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLOR[user.status] || 'default'}>
                {STATUS_LABEL[user.status] || user.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="登录次数">{user.login_count}</Descriptions.Item>
            <Descriptions.Item label="最后登录">
              {user.last_login_at ? dayjs(user.last_login_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {user.meta && Object.keys(user.meta).length > 0 && (
              <Descriptions.Item label="附加信息" span={2}>
                <pre style={{ fontSize: 12, margin: 0 }}>
                  {JSON.stringify(user.meta, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ) : !error ? (
        <Alert message="用户不存在" type="warning" showIcon />
      ) : null}
    </div>
  )
}
