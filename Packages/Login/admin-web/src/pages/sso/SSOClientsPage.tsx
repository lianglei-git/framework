import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Alert,
  Modal,
  Form,
  Input,
  Switch,
  Popconfirm,
  message,
  Drawer,
  Tooltip,
  Select,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  KeyOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  listSSOClients,
  createSSOClient,
  updateSSOClient,
  deleteSSOClient,
  regenerateSSOClientSecret,
} from '../../core/adminApi'
import type { SSOClient, SSOClientCreateRequest, SSOClientUpdateRequest } from '../../types'
import { formatAuthError } from '../../utils/authError'
import {
  saveSubProject,
  scaffoldConfigFromSSOClient,
  setPendingScaffoldLoad,
} from '../../utils/subProjectScaffold'

const { Title, Text, Paragraph } = Typography

function parseJsonArray(str: string): string[] {
  if (!str) return []
  try {
    return JSON.parse(str) as string[]
  } catch {
    return str.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

interface ClientFormValues {
  name: string
  description?: string
  redirect_uris: string
  grant_types?: string[]
  response_types?: string[]
  scope?: string[]
  auto_approve: boolean
  is_active?: boolean
}

export default function SSOClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<SSOClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create / Edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editingClient, setEditingClient] = useState<SSOClient | null>(null)
  const [form] = Form.useForm<ClientFormValues>()
  const [saveLoading, setSaveLoading] = useState(false)

  // New secret display
  const [newSecretModal, setNewSecretModal] = useState<{
    open: boolean
    clientId: string
    secret: string
  }>({ open: false, clientId: '', secret: '' })

  // Created client secret
  const [createdSecretModal, setCreatedSecretModal] = useState<{
    open: boolean
    secret: string
    clientId: string
    client?: SSOClient
  }>({ open: false, secret: '', clientId: '' })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSSOClients()
      setClients(data || [])
    } catch (err) {
      setError(formatAuthError(err, '加载 SSO 客户端失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const openCreateDrawer = () => {
    setDrawerMode('create')
    setEditingClient(null)
    form.resetFields()
    form.setFieldsValue({
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: ['openid', 'profile', 'email'],
      auto_approve: false,
      is_active: true,
    })
    setDrawerOpen(true)
  }

  const openEditDrawer = (client: SSOClient) => {
    setDrawerMode('edit')
    setEditingClient(client)
    form.setFieldsValue({
      name: client.name,
      description: client.description,
      redirect_uris: parseJsonArray(client.redirect_uris).join('\n'),
      grant_types: parseJsonArray(client.grant_types),
      response_types: parseJsonArray(client.response_types),
      scope: parseJsonArray(client.scope),
      auto_approve: client.auto_approve,
      is_active: client.is_active,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaveLoading(true)
      const redirectUris = values.redirect_uris
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      if (drawerMode === 'create') {
        const req: SSOClientCreateRequest = {
          name: values.name,
          description: values.description,
          redirect_uris: redirectUris,
          grant_types: values.grant_types,
          response_types: values.response_types,
          scope: values.scope,
          auto_approve: values.auto_approve,
        }
        const res = await createSSOClient(req)
        setDrawerOpen(false)
        fetchClients()
        setCreatedSecretModal({
          open: true,
          secret: res.secret,
          clientId: res.id,
          client: res,
        })
      } else if (editingClient) {
        const req: SSOClientUpdateRequest = {
          name: values.name,
          description: values.description,
          redirect_uris: redirectUris,
          grant_types: values.grant_types,
          response_types: values.response_types,
          scope: values.scope,
          auto_approve: values.auto_approve,
          is_active: values.is_active,
        }
        await updateSSOClient(editingClient.id, req)
        message.success('SSO 客户端已更新')
        setDrawerOpen(false)
        fetchClients()
      }
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return
      message.error(formatAuthError(err, '保存失败'))
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSSOClient(id)
      message.success('SSO 客户端已删除')
      fetchClients()
    } catch (err) {
      message.error(formatAuthError(err, '删除失败'))
    }
  }

  const handleRegenerate = (client: SSOClient) => {
    Modal.confirm({
      title: '重置客户端密钥',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确认要重置 <strong>{client.name}</strong> 的客户端密钥吗？</p>
          <p style={{ color: '#ff4d4f' }}>
            ⚠️ 旧密钥将立即失效，所有使用旧密钥的应用需要更新。
          </p>
        </div>
      ),
      okText: '确认重置',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await regenerateSSOClientSecret(client.id)
          message.success('密钥已重置，请通过管理员渠道获取新密钥')
          fetchClients()
        } catch (err) {
          message.error(formatAuthError(err, '重置密钥失败'))
        }
      },
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => message.success('已复制到剪贴板'),
      () => message.warning('复制失败，请手动复制')
    )
  }

  const goToScaffold = (client: SSOClient, clientSecret = '') => {
    const config = scaffoldConfigFromSSOClient(client, { clientSecret })
    const record = saveSubProject(config)
    setPendingScaffoldLoad(record.id)
    navigate('/sso/subprojects')
    message.success('已载入子项目脚手架，可补充端口后点「创建脚手架」下载')
  }

  const columns: ColumnsType<SSOClient> = [
    {
      title: '客户端名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '客户端 ID',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      ellipsis: true,
      render: (id) => (
        <Tooltip title={id}>
          <code style={{ fontSize: 11 }}>{id}</code>
        </Tooltip>
      ),
    },
    {
      title: '回调 URI',
      dataIndex: 'redirect_uris',
      key: 'redirect_uris',
      ellipsis: true,
      render: (text) => {
        const uris = parseJsonArray(text)
        return (
          <Space direction="vertical" size={2}>
            {uris.slice(0, 2).map((uri, i) => (
              <Text key={i} type="secondary" style={{ fontSize: 12 }}>
                {uri}
              </Text>
            ))}
            {uris.length > 2 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                +{uris.length - 2} 更多
              </Text>
            )}
          </Space>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '自动授权',
      dataIndex: 'auto_approve',
      key: 'auto_approve',
      width: 90,
      align: 'center',
      render: (v) => <Tag color={v ? 'blue' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="生成脚手架">
            <Button
              type="text"
              icon={<FolderOpenOutlined />}
              size="small"
              onClick={() => goToScaffold(record)}
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
          <Tooltip title="重置密钥">
            <Button
              type="text"
              icon={<KeyOutlined />}
              size="small"
              onClick={() => handleRegenerate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该客户端？"
            description="此操作不可恢复，使用此客户端的应用将无法登录。"
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
          SSO 客户端管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchClients} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新建客户端
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

      <Table<SSOClient>
        columns={columns}
        dataSource={clients}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        locale={{ emptyText: '暂无 SSO 客户端' }}
        pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
      />

      {/* Create / Edit Drawer */}
      <Drawer
        title={drawerMode === 'create' ? '新建 SSO 客户端' : `编辑：${editingClient?.name || ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saveLoading} onClick={handleSave}>
              {drawerMode === 'create' ? '创建' : '保存'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="客户端名称"
            rules={[{ required: true, message: '请输入客户端名称' }]}
          >
            <Input placeholder="例如：Main App" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="客户端描述（可选）" rows={2} />
          </Form.Item>

          <Form.Item
            name="redirect_uris"
            label="回调 URI（每行一个）"
            rules={[{ required: true, message: '请输入至少一个回调 URI' }]}
          >
            <Input.TextArea
              placeholder="http://localhost:3033/callback&#10;https://example.com/callback"
              rows={4}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>

          <Form.Item name="grant_types" label="授权类型">
            <Select mode="multiple" placeholder="选择授权类型">
              <Select.Option value="authorization_code">authorization_code</Select.Option>
              <Select.Option value="refresh_token">refresh_token</Select.Option>
              <Select.Option value="client_credentials">client_credentials</Select.Option>
              <Select.Option value="implicit">implicit</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="response_types" label="响应类型">
            <Select mode="multiple" placeholder="选择响应类型">
              <Select.Option value="code">code</Select.Option>
              <Select.Option value="token">token</Select.Option>
              <Select.Option value="id_token">id_token</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="scope" label="权限范围">
            <Select mode="multiple" placeholder="选择权限范围">
              <Select.Option value="openid">openid</Select.Option>
              <Select.Option value="profile">profile</Select.Option>
              <Select.Option value="email">email</Select.Option>
              <Select.Option value="phone">phone</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auto_approve" label="自动授权" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            {drawerMode === 'edit' && (
              <Col span={12}>
                <Form.Item name="is_active" label="启用状态" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Drawer>

      {/* Created secret modal */}
      <Modal
        title="🔑 客户端创建成功 — 请保存密钥"
        open={createdSecretModal.open}
        onCancel={() => setCreatedSecretModal({ open: false, secret: '', clientId: '' })}
        footer={[
          <Button
            key="scaffold"
            icon={<FolderOpenOutlined />}
            onClick={() => {
              const client =
                createdSecretModal.client ||
                clients.find((c) => c.id === createdSecretModal.clientId)
              if (client) {
                goToScaffold(client, createdSecretModal.secret)
              }
              setCreatedSecretModal({ open: false, secret: '', clientId: '' })
            }}
          >
            生成脚手架
          </Button>,
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(createdSecretModal.secret)}
          >
            复制密钥
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setCreatedSecretModal({ open: false, secret: '', clientId: '' })}
          >
            我已保存，关闭
          </Button>,
        ]}
        closable={false}
        maskClosable={false}
      >
        <Alert
          type="warning"
          showIcon
          message="密钥只显示一次，关闭后无法再次查看！"
          style={{ marginBottom: 16 }}
        />
        <Paragraph>
          <Text strong>客户端 ID：</Text>
          <br />
          <code style={{ fontSize: 12 }}>{createdSecretModal.clientId}</code>
        </Paragraph>
        <Paragraph>
          <Text strong>客户端密钥（Client Secret）：</Text>
          <br />
          <div
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 12,
              wordBreak: 'break-all',
              marginTop: 4,
            }}
          >
            {createdSecretModal.secret}
          </div>
        </Paragraph>
      </Modal>

      {/* Regenerated secret info */}
      <Modal
        title="密钥已重置"
        open={newSecretModal.open}
        onCancel={() => setNewSecretModal({ open: false, clientId: '', secret: '' })}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setNewSecretModal({ open: false, clientId: '', secret: '' })}
          >
            关闭
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          message="密钥已成功重置，请联系开发人员通过安全渠道获取新密钥。"
        />
      </Modal>
    </div>
  )
}
