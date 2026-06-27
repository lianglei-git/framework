import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AdminAuthProvider } from './auth/AdminAuthProvider'
import AppRouter from './router'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AdminAuthProvider>
          <AppRouter />
        </AdminAuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}
