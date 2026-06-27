import React from 'react'
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../auth/useAdminAuth'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        status="403"
        title="无访问权限"
        subTitle="当前账号不是管理员，无法访问后台管理系统。请使用 admin 角色账号登录。"
        extra={[
          <Button
            type="primary"
            key="logout"
            onClick={logout}
          >
            切换账号
          </Button>,
          <Button key="back" onClick={() => navigate(-1)}>
            返回上页
          </Button>,
        ]}
      />
    </div>
  )
}
