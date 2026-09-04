import React from 'react'
import { Button, Col, DatePicker, Drawer, Form, Input, Row, Select, Space } from 'antd'
import type { FormInstance } from 'antd/es/form'
import dayjs, { type Dayjs } from 'dayjs'
import type { AdminUser, CreateUserRequest, UpdateUserRequest } from '../../types'

const { Option } = Select

export interface UserEditFormValues {
  username?: string
  password?: string
  nickname?: string
  email?: string
  phone?: string
  role?: string
  status?: string
  email_verified?: boolean
  phone_verified?: boolean
  beta?: {
    beta_group?: string
    status?: number
    expires_at?: Dayjs | null
  }
}

export function emptyCreateForm(): UserEditFormValues {
  return {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    email_verified: true,
    phone_verified: false,
    beta: {
      beta_group: 'A',
      status: 1,
      expires_at: null,
    },
  }
}

export function fillUserEditForm(user: AdminUser): UserEditFormValues {
  return {
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    beta: {
      beta_group: user.beta?.beta_group || 'A',
      status: user.beta?.status ?? 1,
      expires_at: user.beta?.expires_at ? dayjs(user.beta.expires_at) : null,
    },
  }
}

function buildBetaPayload(values: UserEditFormValues) {
  if (values.role !== 'beta') return undefined
  return {
    beta_group: values.beta?.beta_group || 'A',
    status: values.beta?.status ?? 1,
    expires_at: values.beta?.expires_at ? values.beta.expires_at.toISOString() : null,
  }
}

export function buildCreatePayload(values: UserEditFormValues): CreateUserRequest {
  return {
    username: values.username || '',
    password: values.password || '',
    nickname: values.nickname,
    email: values.email,
    phone: values.phone,
    role: values.role,
    status: values.status,
    email_verified: values.email_verified,
    phone_verified: values.phone_verified,
    beta: buildBetaPayload(values),
  }
}

export function buildUpdatePayload(values: UserEditFormValues): UpdateUserRequest {
  const payload: UpdateUserRequest = {
    username: values.username,
    nickname: values.nickname,
    email: values.email,
    phone: values.phone,
    role: values.role,
    status: values.status,
    email_verified: values.email_verified,
    phone_verified: values.phone_verified,
  }
  payload.beta = buildBetaPayload(values)
  return payload
}

interface UserEditDrawerProps {
  open: boolean
  mode?: 'create' | 'edit'
  user: AdminUser | null
  form: FormInstance<UserEditFormValues>
  loading: boolean
  onClose: () => void
  onSubmit: () => void
}

export function UserEditDrawer({
  open,
  mode = 'edit',
  user,
  form,
  loading,
  onClose,
  onSubmit,
}: UserEditDrawerProps) {
  const role = Form.useWatch('role', form)
  const isCreate = mode === 'create'

  return (
    <Drawer
      title={isCreate ? '增加用户' : `编辑用户：${user?.username || ''}`}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={onSubmit}>
            {isCreate ? '创建' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: isCreate, message: '请填写用户名' },
                { min: 2, message: '至少 2 个字符' },
              ]}
            >
              <Input placeholder="用户名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nickname" label="昵称">
              <Input placeholder="昵称" />
            </Form.Item>
          </Col>
        </Row>

        {isCreate && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请填写密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password placeholder="至少 8 位，创建后仅展示一次" />
          </Form.Item>
        )}

        <Form.Item
          name="email"
          label="邮箱"
          dependencies={['phone']}
          rules={[
            { type: 'email', message: '请输入有效邮箱' },
            ({ getFieldValue }) => ({
              validator: async () => {
                if (!isCreate) return
                if (!getFieldValue('email') && !getFieldValue('phone')) {
                  throw new Error('请填写邮箱或手机号')
                }
              },
            }),
          ]}
        >
          <Input placeholder="邮箱" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          dependencies={['email']}
          rules={[
            ({ getFieldValue }) => ({
              validator: async () => {
                if (!isCreate) return
                if (!getFieldValue('email') && !getFieldValue('phone')) {
                  throw new Error('请填写邮箱或手机号')
                }
              },
            }),
          ]}
        >
          <Input placeholder="手机号" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="role" label="角色">
              <Select>
                <Option value="user">普通用户</Option>
                <Option value="moderator">版主</Option>
                <Option value="admin">管理员</Option>
                <Option value="beta">内测</Option>
                <Option value="ops">运营</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="状态">
              <Select>
                <Option value="active">正常</Option>
                <Option value="frozen">冻结</Option>
                <Option value="cancelled">注销</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {role === 'beta' && (
          <>
            <Form.Item
              name={['beta', 'beta_group']}
              label="内测分组"
              rules={[{ required: true, message: '请选择内测分组' }]}
            >
              <Select>
                <Option value="A">A</Option>
                <Option value="B">B</Option>
                <Option value="C">C</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name={['beta', 'status']}
              label="内测资格"
              rules={[{ required: true, message: '请选择资格状态' }]}
            >
              <Select>
                <Option value={1}>有效</Option>
                <Option value={2}>暂停</Option>
                <Option value={0}>失效</Option>
              </Select>
            </Form.Item>
            <Form.Item name={['beta', 'expires_at']} label="到期时间">
              <DatePicker showTime style={{ width: '100%' }} placeholder="不填则不过期" />
            </Form.Item>
          </>
        )}

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="email_verified" label="邮箱验证">
              <Select>
                <Option value={true}>已验证</Option>
                <Option value={false}>未验证</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone_verified" label="手机验证">
              <Select>
                <Option value={true}>已验证</Option>
                <Option value={false}>未验证</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}
