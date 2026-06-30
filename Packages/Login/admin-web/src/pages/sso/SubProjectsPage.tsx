import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  message,
  Tag,
  Tooltip,
} from 'antd'
import {
  DownloadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { createSSOClient } from '../../core/adminApi'
import { formatAuthError } from '../../utils/authError'
import {
  type SubProjectScaffoldConfig,
  type SavedSubProject,
  defaultScaffoldConfig,
  syncDerivedUrls,
  listSavedSubProjects,
  saveSubProject,
  deleteSavedSubProject,
  buildFrontendConfigJson,
  buildBackendConfigJson,
  generateScaffoldFiles,
  downloadTextFile,
  downloadScaffoldZip,
  consumePendingScaffoldLoad,
} from '../../utils/subProjectScaffold'

const { Title, Text, Paragraph } = Typography

const SCOPE_OPTIONS = ['openid', 'profile', 'email', 'phone', 'offline_access']
const GRANT_OPTIONS = ['authorization_code', 'refresh_token', 'password', 'client_credentials']
const RESPONSE_OPTIONS = ['code', 'token', 'id_token']

export default function SubProjectsPage() {
  const [form] = Form.useForm<SubProjectScaffoldConfig>()
  const [saved, setSaved] = useState<SavedSubProject[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [previewFiles, setPreviewFiles] = useState<Record<string, string>>({})
  const [scaffoldingId, setScaffoldingId] = useState<string | null>(null)

  const reloadSaved = useCallback(() => {
    setSaved(listSavedSubProjects())
  }, [])

  useEffect(() => {
    reloadSaved()
    const initial = defaultScaffoldConfig({ frontendPort: 5176, bffPort: 5558 })
    form.setFieldsValue(initial)
    setPreviewFiles(generateScaffoldFiles(initial))

    const pendingId = consumePendingScaffoldLoad()
    if (pendingId) {
      const item = listSavedSubProjects().find((s) => s.id === pendingId)
      if (item) {
        setEditingId(item.id)
        form.setFieldsValue(item.config)
        setPreviewFiles(generateScaffoldFiles(item.config))
        message.info(`已从 SSO 客户端载入：${item.config.displayName}`)
      }
    }
  }, [form, reloadSaved])

  const updatePreview = () => {
    const values = form.getFieldsValue()
    const merged = syncDerivedUrls({ ...defaultScaffoldConfig(), ...values })
    setPreviewFiles(generateScaffoldFiles(merged))
  }

  const handlePortChange = () => {
    const values = form.getFieldsValue()
    form.setFieldsValue(
      syncDerivedUrls({
        ...defaultScaffoldConfig(),
        ...values,
      }),
    )
    updatePreview()
  }

  const handleSave = async (registerClient = false) => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      let config = syncDerivedUrls(values)

      if (registerClient && !config.clientId) {
        setRegistering(true)
        const res = await createSSOClient({
          name: config.displayName || config.projectName,
          app_id: config.appId,
          description: config.description || `子项目 ${config.appId}`,
          redirect_uris: [config.redirectUri],
          grant_types: config.grantTypes,
          response_types: config.responseTypes,
          scope: config.allowedScopes,
          frontend_port: config.frontendPort,
          bff_port: config.bffPort,
          auto_approve: config.autoApprove,
          ...(config.clientSecret?.trim() ? { secret: config.clientSecret.trim() } : {}),
        })
        config = {
          ...config,
          clientId: res.id,
          clientSecret: res.secret,
        }
        form.setFieldsValue({ clientId: res.id, clientSecret: res.secret })
        message.success('已在 unit-auth 注册 SSO 客户端')
      }

      const record = saveSubProject(config, editingId ?? undefined)
      setEditingId(record.id)
      reloadSaved()
      setPreviewFiles(generateScaffoldFiles(config))
      message.success(registerClient ? '已保存并注册 SSO 客户端' : '配置已保存到浏览器')
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return
      message.error(formatAuthError(err, '保存失败'))
    } finally {
      setSaving(false)
      setRegistering(false)
    }
  }

  const loadRecord = (record: SavedSubProject) => {
    setEditingId(record.id)
    form.setFieldsValue(record.config)
    setPreviewFiles(generateScaffoldFiles(record.config))
    message.success({
      content: `已加载「${record.config.projectName}」到左侧表单，可修改后保存或创建脚手架`,
      duration: 4,
    })
  }

  const handleNew = () => {
    const nextPort = 5176 + saved.length
    const nextBff = 5558 + saved.length
    const initial = defaultScaffoldConfig({
      frontendPort: nextPort,
      bffPort: nextBff,
      projectName: `sso_${nextPort}`,
      appId: `sso_test_${String.fromCharCode(100 + saved.length)}`,
    })
    setEditingId(null)
    form.setFieldsValue(initial)
    setPreviewFiles(generateScaffoldFiles(initial))
  }

  const configForDownload = (): SubProjectScaffoldConfig => {
    const values = form.getFieldsValue()
    return syncDerivedUrls({ ...defaultScaffoldConfig(), ...values })
  }

  const handleCreateScaffold = async (config: SubProjectScaffoldConfig, recordId?: string) => {
    if (!config.clientId) {
      message.warning('尚未关联 client_id，ZIP 中后端配置需手动补全 secret')
    }
    if (!config.clientSecret) {
      message.warning('无 client_secret，请在解压后编辑 server/config.json')
    }
    try {
      if (recordId) setScaffoldingId(recordId)
      await downloadScaffoldZip(config)
      message.success(`已生成 ${config.projectName}-scaffold.zip`)
    } catch (e) {
      message.error(formatAuthError(e, '生成脚手架失败'))
    } finally {
      setScaffoldingId(null)
    }
  }

  const fileList = Object.keys(previewFiles).sort()

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        子项目 SSO 脚手架
      </Title>
      <Paragraph type="secondary">
        配置新子项目的端口、app_id、OAuth 参数，保存到本地浏览器；可选一键在 unit-auth 注册客户端。
        支持下载前端/后端 JSON 配置及完整脚手架 ZIP。
        详细说明见 <Text code>SUBPROJECT_SSO_GUIDE.md</Text>。
      </Paragraph>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="client_secret 仅写入后端 config.json，不会出现在前端配置中"
      />

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card
            title="项目配置"
            extra={
              <Space>
                {editingId && (
                  <Tag color="processing" icon={<ImportOutlined />}>
                    已加载保存记录，正在编辑
                  </Tag>
                )}
                <Button icon={<PlusOutlined />} onClick={handleNew}>
                  新建
                </Button>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={updatePreview}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="projectName"
                    label="项目目录名"
                    rules={[
                      { required: true },
                      { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母、数字、下划线' },
                    ]}
                    tooltip="生成路径 Js/project/{projectName}"
                  >
                    <Input placeholder="d_sso" onBlur={updatePreview} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}>
                    <Input placeholder="SSO Test D" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="appId" label="app_id" rules={[{ required: true }]}>
                    <Input placeholder="sso_test_d" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="description" label="描述">
                    <Input placeholder="子项目说明" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                端口与 URL
              </Divider>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="frontendPort" label="前端端口" rules={[{ required: true }]}>
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} onChange={handlePortChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="bffPort" label="BFF 端口" rules={[{ required: true }]}>
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} onChange={handlePortChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="unitAuthUrl" label="IdP 地址" rules={[{ required: true }]}>
                    <Input placeholder="http://localhost:8080" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="redirectUri" label="redirect_uri（自动）">
                    <Input readOnly />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="ssoServerUrl" label="ssoServerUrl / BFF（自动）">
                    <Input readOnly />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="ssoHomeUrl" label="登录中心 ssoHomeUrl" rules={[{ required: true }]}>
                <Input placeholder="http://localhost:3033" />
              </Form.Item>

              <Divider orientation="left" plain>
                SSO 客户端（注册后自动填入）
              </Divider>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="clientId" label="client_id">
                    <Input placeholder="保存并注册后自动填充" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="clientSecret" label="client_secret（仅后端）">
                    <Input.Password placeholder="保存并注册后自动填充" visibilityToggle />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                OAuth 选项
              </Divider>

              <Form.Item name="allowedScopes" label="scope">
                <Select mode="multiple" options={SCOPE_OPTIONS.map((v) => ({ value: v, label: v }))} />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="grantTypes" label="grant_types">
                    <Select mode="multiple" options={GRANT_OPTIONS.map((v) => ({ value: v, label: v }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="responseTypes" label="response_types">
                    <Select mode="multiple" options={RESPONSE_OPTIONS.map((v) => ({ value: v, label: v }))} />
                  </Form.Item>
                </Col>
              </Row>

              <Space size="large">
                <Form.Item name="autoRefresh" label="autoRefresh" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="autoApprove" label="auto_approve（注册客户端）" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Space>

              <Divider />

              <Space wrap>
                <Button icon={<SaveOutlined />} loading={saving} onClick={() => handleSave(false)}>
                  保存配置
                </Button>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  loading={saving || registering}
                  onClick={() => handleSave(true)}
                >
                  保存并注册 SSO 客户端
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => downloadTextFile('frontend-config.json', buildFrontendConfigJson(configForDownload()))}
                >
                  下载前端 JSON
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => downloadTextFile('backend-config.json', buildBackendConfigJson(configForDownload()))}
                >
                  下载后端 JSON
                </Button>
                <Button
                  type="primary"
                  ghost
                  icon={<FolderOpenOutlined />}
                  onClick={async () => {
                    try {
                      await downloadScaffoldZip(configForDownload())
                      message.success('脚手架 ZIP 已下载')
                    } catch (e) {
                      message.error(formatAuthError(e, '打包失败'))
                    }
                  }}
                >
                  下载完整脚手架 ZIP
                </Button>
              </Space>
            </Form>
          </Card>

          <Card title="将生成的文件" style={{ marginTop: 16 }}>
            <Collapse
              size="small"
              items={fileList.map((path) => ({
                key: path,
                label: (
                  <Space>
                    <Text code style={{ fontSize: 12 }}>{path.replace(/^Js\/project\/[^/]+\//, '')}</Text>
                    <Tooltip title="复制内容">
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(previewFiles[path] || '')
                          message.success('已复制')
                        }}
                      />
                    </Tooltip>
                  </Space>
                ),
                children: (
                  <pre style={{ margin: 0, fontSize: 11, maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 8 }}>
                    {previewFiles[path]}
                  </pre>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <span>已保存的子项目</span>
                {saved.length > 0 && (
                  <Tag color="blue">{saved.length} 条</Tag>
                )}
              </Space>
            }
            extra={<Text type="secondary">浏览器 localStorage</Text>}
            styles={{
              body: { paddingTop: 12 },
            }}
            style={{
              border: '3px solid #1677ff',
            }}
          >
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined style={{ color: '#1677ff' }} />}
              message={
                <Text strong style={{ color: '#0958d9' }}>
                  点击下方列表中的「加载」，即可把历史配置恢复到左侧表单
                </Text>
              }
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text style={{ color: '#434343' }}>
                    保存后不必重新填写：点 <Text strong style={{ color: '#1677ff' }}>加载</Text> 继续编辑，
                    或点 <Text strong style={{ color: '#52c41a' }}>创建脚手架</Text> 直接下载 ZIP。
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    提示：也可点击列表条目（项目名称区域）快速加载
                  </Text>
                </Space>
              }
              style={{
                marginBottom: 16,
                background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
                border: '1px solid #91caff',
              }}
            />

            <List
              dataSource={saved}
              locale={{
                emptyText: (
                  <Text type="secondary">
                    暂无保存记录。填写左侧表单后点「保存配置」，记录会出现在这里并支持「加载」。
                  </Text>
                ),
              }}
              renderItem={(item) => {
                const isActive = editingId === item.id
                return (
                <List.Item
                  style={{
                    marginBottom: 8,
                    padding: '12px 12px',
                    borderRadius: 8,
                    border: isActive ? '2px solid #1677ff' : '1px solid #f0f0f0',
                    background: isActive
                      ? 'linear-gradient(90deg, #e6f4ff 0%, #ffffff 60%)'
                      : '#fafafa',
                    transition: 'all 0.2s ease',
                  }}
                  actions={[
                    <Tooltip key="load-tip" title="将本条配置载入左侧表单继续编辑">
                      <Button
                        key="load"
                        type="primary"
                        size="small"
                        ghost={!isActive}
                        icon={<ImportOutlined />}
                        onClick={() => loadRecord(item)}
                      >
                        加载
                      </Button>
                    </Tooltip>,
                    <Button
                      key="scaffold"
                      type="link"
                      size="small"
                      icon={<FolderOpenOutlined />}
                      loading={scaffoldingId === item.id}
                      onClick={() => handleCreateScaffold(item.config, item.id)}
                    >
                      创建脚手架
                    </Button>,
                    <Popconfirm
                      key="del"
                      title="删除这条保存记录？"
                      onConfirm={() => {
                        deleteSavedSubProject(item.id)
                        if (editingId === item.id) setEditingId(null)
                        reloadSaved()
                      }}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div
                    style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                    onClick={() => loadRecord(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') loadRecord(item)
                    }}
                  >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Text strong style={{ color: isActive ? '#1677ff' : undefined }}>
                          {item.config.projectName}
                        </Text>
                        <Tag color={isActive ? 'blue' : 'default'}>{item.config.appId}</Tag>
                        {isActive && (
                          <Tag color="processing" style={{ margin: 0 }}>
                            当前已加载
                          </Tag>
                        )}
                        {!isActive && (
                          <Tag
                            color="gold"
                            style={{ margin: 0, borderStyle: 'dashed' }}
                          >
                            可加载
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <>
                        <div>
                          :{item.config.frontendPort} → BFF :{item.config.bffPort}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新于 {dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                        {item.config.clientId && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              client: {item.config.clientId.slice(0, 8)}…
                            </Text>
                          </div>
                        )}
                      </>
                    }
                  />
                  </div>
                </List.Item>
              )}}
            />
          </Card>

          <Card title="解压后启动" style={{ marginTop: 16 }} size="small">
            <pre style={{ margin: 0, fontSize: 12, background: '#fafafa', padding: 12, borderRadius: 8 }}>
{`# 解压到仓库根目录（保留 Js/project/... 路径）
unzip my_sso-scaffold.zip -d /path/to/framework

cd Js/project/<projectName>/server
go mod tidy && go run .

cd Js/project/<projectName>
pnpm install && pnpm dev`}
            </pre>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
