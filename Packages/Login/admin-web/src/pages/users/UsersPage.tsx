import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
  Form,
  Row,
  Col,
  Tooltip,
  Badge,
  Alert,
  Modal,
} from 'antd'
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  listUsers,
  deleteUser,
  createUser,
  updateUser,
  bulkUpdateUsers,
} from '../../core/adminApi'
import type { AdminUser } from '../../types'
import { formatAuthError } from '../../utils/authError'
import { ROLE_COLOR, ROLE_LABEL, STATUS_COLOR, STATUS_LABEL } from '../../utils/userLabels'
import {
  UserEditDrawer,
  buildCreatePayload,
  buildUpdatePayload,
  emptyCreateForm,
  fillUserEditForm,
  type UserEditFormValues,
} from './UserEditDrawer'

const { Title } = Typography
const { Option } = Select

export default function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm] = Form.useForm<UserEditFormValues>()
  const [editLoading, setEditLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsers({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      setUsers(res.users || [])
      setTotal(res.pagination.total)
    } catch (err) {
      setError(formatAuthError(err, '加载用户列表失败'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id)
      message.success('用户已删除')
      fetchUsers()
    } catch (err) {
      message.error(formatAuthError(err, '删除失败'))
    }
  }

  const openCreateDrawer = () => {
    setDrawerMode('create')
    setEditingUser(null)
    editForm.resetFields()
    editForm.setFieldsValue(emptyCreateForm())
    setEditDrawerOpen(true)
  }

  const openEditDrawer = (user: AdminUser) => {
    setDrawerMode('edit')
    setEditingUser(user)
    editForm.setFieldsValue(fillUserEditForm(user))
    setEditDrawerOpen(true)
  }

  const showCreatedPassword = (username: string, password: string) => {
    Modal.success({
      title: '用户已创建',
      content: (
        <div>
          <p>账号 <strong>{username}</strong> 已可登录。密码仅展示这一次，请复制后妥善保存。</p>
          <Input.Password value={password} readOnly />
          <Button
            type="link"
            style={{ paddingLeft: 0, marginTop: 8 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(password)
                message.success('密码已复制')
              } catch {
                message.error('复制失败，请手动复制')
              }
            }}
          >
            复制密码
          </Button>
        </div>
      ),
    })
  }

  const saveEdit = async (values: UserEditFormValues) => {
    if (!editingUser) return
    setEditLoading(true)
    try {
      await updateUser(editingUser.id, buildUpdatePayload(values))
      message.success('用户信息已更新')
      setEditDrawerOpen(false)
      fetchUsers()
    } catch (err) {
      message.error(formatAuthError(err, '更新失败'))
    } finally {
      setEditLoading(false)
    }
  }

  const saveCreate = async (values: UserEditFormValues) => {
    setEditLoading(true)
    try {
      const created = await createUser(buildCreatePayload(values))
      setEditDrawerOpen(false)
      fetchUsers()
      showCreatedPassword(created.username, values.password || '')
    } catch (err) {
      message.error(formatAuthError(err, '创建失败'))
    } finally {
      setEditLoading(false)
    }
  }

  const confirmSensitiveThen = (
    values: UserEditFormValues,
    onOk: () => void | Promise<void>,
    isCreate: boolean
  ) => {
    if (values.role === 'admin' && (isCreate || editingUser?.role !== 'admin')) {
      Modal.confirm({
        title: '确认授予管理员权限？',
        icon: <ExclamationCircleOutlined />,
        content: '该账号将能进入管理后台并管理其他用户，请确认操作人可信。',
        okText: '确认',
        cancelText: '取消',
        okType: 'danger',
        onOk,
      })
      return
    }
    if (
      (values.status === 'frozen' || values.status === 'cancelled') &&
      (isCreate || values.status !== editingUser?.status)
    ) {
      const label = values.status === 'frozen' ? '冻结' : '注销'
      Modal.confirm({
        title: isCreate ? `确认直接创建为${label}账号？` : `确认${label}该账号？`,
        icon: <ExclamationCircleOutlined />,
        content: isCreate
          ? `${label}账号创建后无法登录，除非之后改回正常。`
          : `${label}后该用户将无法登录，已有会话会被立即吊销。`,
        okText: '确认',
        cancelText: '取消',
        okType: values.status === 'cancelled' ? 'danger' : 'primary',
        onOk,
      })
      return
    }
    void onOk()
  }

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields()
      if (drawerMode === 'create') {
        confirmSensitiveThen(values, () => saveCreate(values), true)
        return
      }
      if (!editingUser) return
      confirmSensitiveThen(values, () => saveEdit(values), false)
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return
      message.error(formatAuthError(err, drawerMode === 'create' ? '创建失败' : '更新失败'))
    }
  }

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户')
      return
    }
    const actionLabel = action === 'activate' ? '激活' : action === 'deactivate' ? '冻结' : '删除'
    Modal.confirm({
      title: `批量${actionLabel}`,
      icon: <ExclamationCircleOutlined />,
      content: `确认要${actionLabel}选中的 ${selectedRowKeys.length} 个用户吗？`,
      okText: '确认',
      cancelText: '取消',
      okType: action === 'delete' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          const res = await bulkUpdateUsers(action, selectedRowKeys)
          message.success(
            `操作完成：${action === 'delete' ? `删除 ${res.deleted_count} 人` : `更新 ${res.updated_count} 人`}`
          )
          setSelectedRowKeys([])
          fetchUsers()
        } catch (err) {
          message.error(formatAuthError(err, '批量操作失败'))
        }
      },
    })
  }

  const columns: ColumnsType<AdminUser> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 130,
      render: (text, record) => (
        <a onClick={() => navigate(`/users/${record.id}`)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      render: (text, record) => (
        <Space size={4}>
          {text || '-'}
          {record.email_verified && (
            <Badge color="green" title="已验证" />
          )}
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text) => text || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => (
        <Tag color={ROLE_COLOR[role] || 'default'}>{ROLE_LABEL[role] || role}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={STATUS_COLOR[status] || 'default'}>{STATUS_LABEL[status] || status}</Tag>
      ),
    },
    {
      title: '登录次数',
      dataIndex: 'login_count',
      key: 'login_count',
      width: 90,
      align: 'center',
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 160,
      render: (t) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 130,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/users/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEditDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该用户？"
            description="此操作不可恢复，请谨慎操作。"
            okText="删除"
            cancelText="取消"
            okType="danger"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          用户管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            增加用户
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} lg={6}>
          <Input
            placeholder="搜索用户名 / 邮箱 / 昵称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Select
            placeholder="状态"
            value={statusFilter || undefined}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1) }}
            allowClear
            style={{ width: '100%' }}
          >
            <Option value="active">正常</Option>
            <Option value="frozen">冻结</Option>
            <Option value="cancelled">注销</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Select
            placeholder="角色"
            value={roleFilter || undefined}
            onChange={(v) => { setRoleFilter(v || ''); setPage(1) }}
            allowClear
            style={{ width: '100%' }}
          >
            <Option value="admin">管理员</Option>
            <Option value="moderator">版主</Option>
            <Option value="user">普通用户</Option>
            <Option value="beta">内测</Option>
            <Option value="ops">运营</Option>
          </Select>
        </Col>
      </Row>

      {selectedRowKeys.length > 0 && (
        <div
          style={{
            background: '#e6f4ff',
            padding: '8px 16px',
            borderRadius: 6,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>已选 {selectedRowKeys.length} 项</span>
          <Button size="small" type="primary" onClick={() => handleBulkAction('activate')}>
            批量激活
          </Button>
          <Button size="small" onClick={() => handleBulkAction('deactivate')}>
            批量冻结
          </Button>
          <Button size="small" danger onClick={() => handleBulkAction('delete')}>
            批量删除
          </Button>
          <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
            取消选择
          </Button>
        </div>
      )}

      <Table<AdminUser>
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        locale={{ emptyText: '暂无用户数据' }}
      />

      <UserEditDrawer
        open={editDrawerOpen}
        mode={drawerMode}
        user={editingUser}
        form={editForm}
        loading={editLoading}
        onClose={() => setEditDrawerOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}
