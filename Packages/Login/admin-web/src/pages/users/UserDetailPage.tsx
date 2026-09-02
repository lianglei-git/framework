import React, { useCallback, useEffect, useState } from 'react'
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
  Form,
  Modal,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import { getUser, deleteUser, updateUser } from '../../core/adminApi'
import type { AdminUser } from '../../types'
import { formatAuthError } from '../../utils/authError'
import {
  ROLE_COLOR,
  ROLE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  BETA_STATUS_LABEL,
} from '../../utils/userLabels'
import {
  UserEditDrawer,
  buildUpdatePayload,
  fillUserEditForm,
  type UserEditFormValues,
} from './UserEditDrawer'

const { Title } = Typography

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editForm] = Form.useForm<UserEditFormValues>()
  const [editLoading, setEditLoading] = useState(false)

  const loadUser = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getUser(id)
      .then(setUser)
      .catch((err) => setError(formatAuthError(err, '加载用户信息失败')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadUser()
  }, [loadUser])

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

  const openEditDrawer = () => {
    if (!user) return
    editForm.setFieldsValue(fillUserEditForm(user))
    setEditDrawerOpen(true)
  }

  const saveEdit = async (values: UserEditFormValues) => {
    if (!user) return
    setEditLoading(true)
    try {
      await updateUser(user.id, buildUpdatePayload(values))
      message.success('用户信息已更新')
      setEditDrawerOpen(false)
      loadUser()
    } catch (err) {
      message.error(formatAuthError(err, '更新失败'))
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!user) return
    try {
      const values = await editForm.validateFields()
      if (
        (values.status === 'frozen' || values.status === 'cancelled') &&
        values.status !== user.status
      ) {
        const label = values.status === 'frozen' ? '冻结' : '注销'
        Modal.confirm({
          title: `确认${label}该账号？`,
          icon: <ExclamationCircleOutlined />,
          content: `${label}后该用户将无法登录，已有会话会被立即吊销。`,
          okText: '确认',
          cancelText: '取消',
          okType: values.status === 'cancelled' ? 'danger' : 'primary',
          onOk: () => saveEdit(values),
        })
        return
      }
      await saveEdit(values)
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return
      message.error(formatAuthError(err, '更新失败'))
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
                onClick={openEditDrawer}
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
            {user.beta && (
              <>
                <Descriptions.Item label="内测分组">{user.beta.beta_group || '-'}</Descriptions.Item>
                <Descriptions.Item label="内测资格">
                  {BETA_STATUS_LABEL[user.beta.status] ?? user.beta.status}
                </Descriptions.Item>
                <Descriptions.Item label="内测到期" span={2}>
                  {user.beta.expires_at
                    ? dayjs(user.beta.expires_at).format('YYYY-MM-DD HH:mm:ss')
                    : '不过期'}
                </Descriptions.Item>
              </>
            )}
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

      <UserEditDrawer
        open={editDrawerOpen}
        user={user}
        form={editForm}
        loading={editLoading}
        onClose={() => setEditDrawerOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}
