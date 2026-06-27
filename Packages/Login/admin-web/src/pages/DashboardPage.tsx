import React, { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Statistic, Button, Alert, Typography, Skeleton } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  LoginOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { getUserStats } from '../core/adminApi'
import type { UserStats } from '../types'
import { formatAuthError } from '../utils/authError'

const { Title } = Typography

function buildChartOption(stats: UserStats) {
  const categories = ['今日', '本周', '本月']
  const values = [stats.new_users_today, stats.new_users_week, stats.new_users_month]
  return {
    title: { text: '新增用户趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '新增用户',
        type: 'bar',
        data: values,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' },
            ],
          },
        },
        label: { show: true, position: 'top' },
      },
    ],
    grid: { left: '5%', right: '5%', bottom: '8%', top: '18%' },
  }
}

function buildPieOption(stats: UserStats) {
  return {
    title: { text: '用户状态分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '5%', left: 'center' },
    series: [
      {
        name: '用户状态',
        type: 'pie',
        radius: ['40%', '65%'],
        data: [
          { value: stats.active_users, name: '活跃用户', itemStyle: { color: '#52c41a' } },
          { value: stats.inactive_users, name: '非活跃用户', itemStyle: { color: '#faad14' } },
          {
            value: Math.max(0, stats.total_users - stats.active_users - stats.inactive_users),
            name: '其他状态',
            itemStyle: { color: '#ff4d4f' },
          },
        ].filter((d) => d.value > 0),
        label: { show: true },
      },
    ],
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserStats()
      setStats(data)
    } catch (err) {
      setError(formatAuthError(err, '加载统计数据失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const statCards = stats
    ? [
        {
          title: '总用户数',
          value: stats.total_users,
          icon: <TeamOutlined />,
          color: '#667eea',
        },
        {
          title: '活跃用户',
          value: stats.active_users,
          icon: <CheckCircleOutlined />,
          color: '#52c41a',
        },
        {
          title: '今日新增',
          value: stats.new_users_today,
          icon: <UserAddOutlined />,
          color: '#1890ff',
        },
        {
          title: '今日登录',
          value: stats.login_count_today,
          icon: <LoginOutlined />,
          color: '#faad14',
        },
        {
          title: '邮箱已验证',
          value: stats.email_verified,
          icon: <CheckCircleOutlined />,
          color: '#722ed1',
        },
        {
          title: '管理员账号',
          value: stats.admin_users,
          icon: <TeamOutlined />,
          color: '#f5222d',
        },
      ]
    : []

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          运营仪表盘
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>
          刷新
        </Button>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {loading && !stats ? (
        <Row gutter={[16, 16]}>
          {[...Array(6)].map((_, i) => (
            <Col key={i} xs={24} sm={12} xl={8}>
              <Card>
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {statCards.map((card) => (
              <Col key={card.title} xs={24} sm={12} xl={8}>
                <Card
                  style={{
                    borderTop: `3px solid ${card.color}`,
                    borderRadius: 8,
                  }}
                  hoverable
                >
                  <Statistic
                    title={card.title}
                    value={card.value}
                    prefix={
                      <span style={{ color: card.color, marginRight: 8 }}>
                        {card.icon}
                      </span>
                    }
                    valueStyle={{ color: '#1a1a2e', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {stats && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card
                  title="新增用户趋势"
                  style={{ borderRadius: 8 }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <ReactECharts
                    option={buildChartOption(stats)}
                    style={{ height: 280 }}
                    notMerge
                  />
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card
                  title="用户状态分布"
                  style={{ borderRadius: 8 }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <ReactECharts
                    option={buildPieOption(stats)}
                    style={{ height: 280 }}
                    notMerge
                  />
                </Card>
              </Col>
            </Row>
          )}

          {stats && (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card title="本周 / 本月统计" style={{ borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col xs={12} md={6}>
                      <Statistic title="本周新增" value={stats.new_users_week} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Statistic title="本月新增" value={stats.new_users_month} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Statistic title="手机已验证" value={stats.phone_verified} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Statistic title="非活跃用户" value={stats.inactive_users} />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </div>
  )
}
