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
  Descriptions,
  Statistic,
  Card,
  Divider,
  InputNumber,
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
  getSSOClientStats,
} from '../../core/adminApi'
import type { SSOClient, SSOClientCreateRequest, SSOClientUpdateRequest, SSOClientStats } from '../../types'
import { formatAuthError } from '../../utils/authError'
import {
  saveSubProject,
  scaffoldConfigFromSSOClient,
  setPendingScaffoldLoad,
  inferBffPort,
} from '../../utils/subProjectScaffold'
import styles from './SSOClientsPage.module.less'

const { Title, Text, Paragraph } = Typography

const GRANT_TAG_COLORS: Record<string, string> = {
  authorization_code: 'blue',
  refresh_token: 'green',
  client_credentials: 'orange',
  implicit: 'gold',
  password: 'purple',
}

const SCOPE_TAG_COLORS: Record<string, string> = {
  openid: 'purple',
  profile: 'cyan',
  email: 'geekblue',
  phone: 'magenta',
  offline_access: 'volcano',
}

function parseJsonArray(str: string): string[] {
  if (!str) return []
  try {
    return JSON.parse(str) as string[]
  } catch {
    return str.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

function slugProjectName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return slug || 'my_sso'
}

/** 展示用 app_id：优先库表字段，否则按名称推导 */
function resolveAppId(client: SSOClient): string {
  return client.app_id?.trim() || `sso_${slugProjectName(client.name)}`
}

function truncateMiddle(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

function JsonTags({
  value,
  palette = 'default',
}: {
  value: string
  palette?: 'grant' | 'scope' | 'default'
}) {
  const items = parseJsonArray(value)
  if (!items.length) return <Text type="secondary">—</Text>
  const colorMap =
    palette === 'grant' ? GRANT_TAG_COLORS : palette === 'scope' ? SCOPE_TAG_COLORS : {}
  return (
    <div className={styles.tagWrap}>
      <Space size={[4, 4]} wrap>
        {items.map((item) => (
          <Tag key={item} color={colorMap[item] || 'default'} style={{ margin: 0, maxWidth: 160 }}>
            <span style={{ display: 'inline-block', maxWidth: 148, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>
              {item}
            </span>
          </Tag>
        ))}
      </Space>
    </div>
  )
}

function IdChip({ value, kind }: { value: string; kind: 'client' | 'app' }) {
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(
      () => message.success('已复制'),
      () => message.warning('复制失败'),
    )
  }
  const display = kind === 'client' ? truncateMiddle(value, 10, 4) : value
  return (
    <div className={styles.idChip} data-kind={kind}>
      <Tooltip title={value}>
        <span className={styles.idText}>{display}</span>
      </Tooltip>
      <Button
        className={styles.idCopy}
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={copy}
      />
    </div>
  )
}

function CopyableCode({ value, maxWidth = 360 }: { value: string; maxWidth?: number }) {
  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => message.success('已复制'),
      () => message.warning('复制失败'),
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth }}>
      <Tooltip title={value}>
        <code
          style={{
            fontSize: 11,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </code>
      </Tooltip>
      <Button type="text" size="small" icon={<CopyOutlined />} onClick={copy} style={{ flexShrink: 0 }} />
    </div>
  )
}

interface ClientFormValues {
  name: string
  app_id: string
  description?: string
  frontend_port: number
  bff_port: number
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
  const [stats, setStats] = useState<SSOClientStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(false)

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
      const [data, statData] = await Promise.all([listSSOClients(), getSSOClientStats()])
      setClients(data || [])
      setStats(statData)
    } catch (err) {
      setError(formatAuthError(err, '加载 SSO 客户端失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  const visibleClients = showActiveOnly ? clients.filter((c) => c.is_active) : clients

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const openCreateDrawer = () => {
    const nextFrontend = 5176 + clients.length
    const nextBff = inferBffPort(nextFrontend)
    setDrawerMode('create')
    setEditingClient(null)
    form.resetFields()
    form.setFieldsValue({
      frontend_port: nextFrontend,
      bff_port: nextBff,
      redirect_uris: `http://localhost:${nextFrontend}`,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: ['openid', 'profile', 'email'],
      auto_approve: false,
      is_active: true,
    })
    setDrawerOpen(true)
  }

  const syncPortsToRedirect = (frontendPort?: number, bffPort?: number) => {
    const fp = frontendPort ?? form.getFieldValue('frontend_port') ?? 5176
    const bp = bffPort ?? form.getFieldValue('bff_port') ?? inferBffPort(fp)
    form.setFieldsValue({
      frontend_port: fp,
      bff_port: bp,
      redirect_uris: `http://localhost:${fp}`,
    })
  }

  const suggestAppIdFromName = () => {
    const name = form.getFieldValue('name')
    if (name) {
      form.setFieldValue('app_id', `sso_${slugProjectName(name)}`)
    }
  }

  const openEditDrawer = (client: SSOClient) => {
    setDrawerMode('edit')
    setEditingClient(client)
    form.setFieldsValue({
      name: client.name,
      app_id: resolveAppId(client),
      description: client.description,
      frontend_port: client.frontend_port || 5176,
      bff_port: client.bff_port || inferBffPort(client.frontend_port || 5176),
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
          app_id: values.app_id?.trim(),
          description: values.description,
          redirect_uris: redirectUris,
          grant_types: values.grant_types,
          response_types: values.response_types,
          scope: values.scope,
          frontend_port: values.frontend_port,
          bff_port: values.bff_port,
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
          app_id: values.app_id?.trim(),
          description: values.description,
          redirect_uris: redirectUris,
          grant_types: values.grant_types,
          response_types: values.response_types,
          scope: values.scope,
          frontend_port: values.frontend_port,
          bff_port: values.bff_port,
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
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      ellipsis: true,
      render: (text, record) => (
        <div className={styles.nameCell}>
          <div className={styles.nameBadge}>
            <span className={styles.nameDot} data-active={record.is_active ? 'true' : 'false'} />
            <span className={styles.nameTitle}>{text}</span>
          </div>
          {record.description ? (
            <Tooltip title={record.description}>
              <span className={styles.descLine}>{record.description}</span>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    {
      title: 'client_id',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      render: (id) => <IdChip value={id} kind="client" />,
    },
    {
      title: 'app_id',
      key: 'app_id',
      width: 140,
      ellipsis: true,
      render: (_, record) => <IdChip value={resolveAppId(record)} kind="app" />,
    },
    {
      title: '端口',
      key: 'ports',
      width: 108,
      render: (_, record) => (
        <div className={styles.portTags}>
          <Tag color="blue" style={{ margin: 0 }}>
            前端 {record.frontend_port || '—'}
          </Tag>
          <Tag color="geekblue" style={{ margin: 0 }}>
            BFF {record.bff_port || '—'}
          </Tag>
        </div>
      ),
    },
    {
      title: '回调 URI',
      dataIndex: 'redirect_uris',
      key: 'redirect_uris',
      width: 168,
      ellipsis: true,
      render: (text) => {
        const uris = parseJsonArray(text)
        const first = uris[0]
        if (!first) return <Text type="secondary">—</Text>
        return (
          <Tooltip title={uris.join('\n')}>
            <span className={styles.uriLine}>{first}</span>
            {uris.length > 1 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                +{uris.length - 1} 条
              </Text>
            )}
          </Tooltip>
        )
      },
    },
    {
      title: 'grant_types',
      dataIndex: 'grant_types',
      key: 'grant_types',
      width: 160,
      ellipsis: true,
      render: (text) => <JsonTags value={text} palette="grant" />,
    },
    {
      title: 'scope',
      dataIndex: 'scope',
      key: 'scope',
      width: 150,
      ellipsis: true,
      render: (text) => <JsonTags value={text} palette="scope" />,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 72,
      align: 'center',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '自动授权',
      dataIndex: 'auto_approve',
      key: 'auto_approve',
      width: 88,
      align: 'center',
      render: (v) => <Tag color={v ? 'blue' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '创建 / 更新',
      key: 'timestamps',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            创建 {record.created_at ? dayjs(record.created_at).format('MM-DD HH:mm') : '—'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            更新 {record.updated_at ? dayjs(record.updated_at).format('MM-DD HH:mm') : '—'}
          </Text>
        </Space>
      ),
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

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="字段说明"
        description={
          <span>
            数据来自 <code>sso_clients</code> 表。<code>id</code> 即 OAuth <code>client_id</code>；
            <code>app_id</code> 为子项目 BFF <code>APP_ID</code>，创建时请填写并与前端配置保持一致。
          </span>
        }
      />

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="客户端总数" value={stats.total_clients} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="启用中" value={stats.active_clients} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="已禁用" value={stats.inactive_clients} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ marginBottom: 12 }}>
        <Switch
          checked={showActiveOnly}
          onChange={setShowActiveOnly}
          checkedChildren="仅启用"
          unCheckedChildren="全部"
        />
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          当前显示 {visibleClients.length} / {clients.length} 条
        </Text>
      </div>

      <div className={styles.tableWrap}>
        <Table<SSOClient>
          className={styles.clientTable}
          columns={columns}
          dataSource={visibleClients}
          rowKey="id"
          loading={loading}
          tableLayout="fixed"
          size="middle"
          scroll={{ x: 1586 }}
          rowClassName={(record) => (record.is_active ? '' : 'ssoClientRowInactive')}
          locale={{ emptyText: '暂无 SSO 客户端' }}
          pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true, pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="id (client_id)">
                <CopyableCode value={record.id} maxWidth={360} />
              </Descriptions.Item>
              <Descriptions.Item label="app_id">
                <CopyableCode value={resolveAppId(record)} maxWidth={360} />
              </Descriptions.Item>
              <Descriptions.Item label="frontend_port">
                {record.frontend_port || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="bff_port">{record.bff_port || '—'}</Descriptions.Item>
              <Descriptions.Item label="name">{record.name}</Descriptions.Item>
              <Descriptions.Item label="description" span={3}>
                {record.description || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="is_active">
                {record.is_active ? 'true（启用）' : 'false（禁用）'}
              </Descriptions.Item>
              <Descriptions.Item label="auto_approve">
                {record.auto_approve ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="secret">（已隐藏，仅创建/重置时返回）</Descriptions.Item>
              <Descriptions.Item label="redirect_uris" span={3}>
                <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(parseJsonArray(record.redirect_uris), null, 2)}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="grant_types" span={3}>
                <JsonTags value={record.grant_types} palette="grant" />
              </Descriptions.Item>
              <Descriptions.Item label="response_types" span={3}>
                <JsonTags value={record.response_types} />
              </Descriptions.Item>
              <Descriptions.Item label="scope" span={3}>
                <JsonTags value={record.scope} palette="scope" />
              </Descriptions.Item>
              <Descriptions.Item label="created_at">
                {record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="updated_at">
                {record.updated_at ? dayjs(record.updated_at).format('YYYY-MM-DD HH:mm:ss') : '—'}
              </Descriptions.Item>
            </Descriptions>
          ),
          rowExpandable: () => true,
          }}
        />
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        title={drawerMode === 'create' ? '新建 SSO 客户端' : `编辑：${editingClient?.name || ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
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
          <Divider orientation="left" plain>
            子项目标识
          </Divider>

          {drawerMode === 'edit' && editingClient && (
            <Form.Item label="client_id（只读）">
              <Input value={editingClient.id} readOnly style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="客户端名称"
            rules={[{ required: true, message: '请输入客户端名称' }]}
          >
            <Input placeholder="例如：sso_test_d" onBlur={suggestAppIdFromName} />
          </Form.Item>

          <Form.Item
            name="app_id"
            label="app_id"
            rules={[{ required: true, message: '请输入 app_id' }]}
            extra="子项目 BFF 环境变量 APP_ID、前端 sso 配置中的 appId"
          >
            <Input placeholder="例如：sso_test_d" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="客户端描述（可选）" rows={2} />
          </Form.Item>

          <Divider orientation="left" plain>
            端口与回调
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="frontend_port"
                label="前端端口"
                rules={[{ required: true, message: '请输入前端端口' }]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  onChange={(v) => syncPortsToRedirect(Number(v) || 5176)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bff_port"
                label="BFF 端口"
                rules={[{ required: true, message: '请输入 BFF 端口' }]}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="redirect_uris"
            label="回调 URI（每行一个）"
            rules={[{ required: true, message: '请输入至少一个回调 URI' }]}
            extra="通常与前端端口一致，如 http://localhost:5176"
          >
            <Input.TextArea
              placeholder="http://localhost:5176"
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>

          <Divider orientation="left" plain>
            OAuth 参数
          </Divider>

          <Form.Item name="grant_types" label="授权类型 (grant_types)">
            <Select mode="multiple" placeholder="选择授权类型">
              <Select.Option value="authorization_code">authorization_code</Select.Option>
              <Select.Option value="refresh_token">refresh_token</Select.Option>
              <Select.Option value="client_credentials">client_credentials</Select.Option>
              <Select.Option value="implicit">implicit</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="response_types" label="响应类型 (response_types)">
            <Select mode="multiple" placeholder="选择响应类型">
              <Select.Option value="code">code</Select.Option>
              <Select.Option value="token">token</Select.Option>
              <Select.Option value="id_token">id_token</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="scope" label="权限范围 (scope)">
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
        {createdSecretModal.client && (
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="client_id">
              <code>{createdSecretModal.clientId}</code>
            </Descriptions.Item>
            <Descriptions.Item label="app_id">
              {resolveAppId(createdSecretModal.client)}
            </Descriptions.Item>
            <Descriptions.Item label="前端 / BFF 端口">
              {createdSecretModal.client.frontend_port || '—'} /{' '}
              {createdSecretModal.client.bff_port || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="redirect_uri">
              {parseJsonArray(createdSecretModal.client.redirect_uris).join(', ') || '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
        <Paragraph>
          <Text strong>client_id：</Text>
          <br />
          <code style={{ fontSize: 12 }}>{createdSecretModal.clientId}</code>
        </Paragraph>
        <Paragraph>
          <Text strong>client_secret：</Text>
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
