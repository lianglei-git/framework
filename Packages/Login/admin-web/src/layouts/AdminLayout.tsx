import React, { useEffect, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Tag } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  ApiOutlined,
  AppstoreAddOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../auth/useAdminAuth'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/users',
    icon: <TeamOutlined />,
    label: '用户管理',
  },
  {
    key: '/logs/login',
    icon: <FileTextOutlined />,
    label: '登录日志',
  },
  {
    key: 'sso',
    icon: <ApiOutlined />,
    label: 'SSO',
    children: [
      { key: '/sso/clients', label: '客户端管理' },
      { key: '/sso/subprojects', icon: <AppstoreAddOutlined />, label: '子项目脚手架' },
    ],
  },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAdminAuth()

  useEffect(() => {
    if (location.pathname.startsWith('/sso')) {
      setOpenKeys(['sso'])
    }
  }, [location.pathname])

  const selectedKey =
    menuItems
      .flatMap((item) => ('children' in item && item.children ? item.children : [item]))
      .find((item) => location.pathname.startsWith(item.key as string))?.key?.toString() ||
    '/dashboard'

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key)
    }
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: logout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: '#001529',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {collapsed ? (
            <span style={{ color: '#fff', fontSize: 20 }}>🛡️</span>
          ) : (
            <Space>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>账户管理后台</Text>
            </Space>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            height: 64,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ background: '#667eea' }}
              />
              <Space size={4}>
                <Text style={{ fontSize: 14 }}>{user?.nickname || user?.username || '管理员'}</Text>
                <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                  {user?.role}
                </Tag>
              </Space>
            </Space>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 24,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
