// DEBUG: AppLayout v1
import { Layout, Menu, Button, Input, Space, Avatar } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { UserOutlined } from '@ant-design/icons'

const { Header, Sider, Content } = Layout

const items = [
  { key: '/dashboard',      label: <Link to="/dashboard">Dashboard</Link> },
  { key: '/admissions',     label: <Link to="/admissions">Admissions</Link> },
  { key: '/bed-board',      label: <Link to="/bed-board">Bed Board</Link> },
  { key: '/reports',        label: <Link to="/reports">Reports</Link> },
  { key: '/orders',         label: <Link to="/orders">Orders</Link> },
  { key: '/notifications',  label: <Link to="/notifications">Notifications</Link> },
  { key: '/complaints',     label: <Link to="/complaints">Complaints</Link> },
  { key: '/patients',       label: <Link to="/patients">Patients</Link> },
  { key: '/settings',       label: <Link to="/settings">User Management</Link> },
  { key: '/access', label: <Link to="/access">Link Patient</Link> },
]

export default function AppLayout({ children }) {
  const { logout, user } = useAuth()
  const loc = useLocation()
  const active = items.find(i => loc.pathname.startsWith(i.key))?.key || '/dashboard'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="dark">
        <div style={{
          color:'#fff', fontWeight:800, padding:16, 
          display:'flex', alignItems:'center', gap:8, letterSpacing:0.3
        }}>
          <div style={{
            width:28, height:28, borderRadius:6, background:'#0ea5e9',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900
          }}>+</div>
          HEALTHVAULT
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[active]} items={items} />
      </Sider>

      <Layout>
        <Header style={{ background:'#fff', display:'flex', alignItems:'center', gap:16, paddingInline:16 }}>
          <Input.Search placeholder="Search..." style={{ maxWidth: 420, marginLeft: 4 }} />
          <div style={{ marginLeft:'auto' }} />
          <Space>
            <Avatar icon={<UserOutlined />} />
            <span style={{ fontWeight:600 }}>{user?.username}</span>
            <Button onClick={logout}>Logout</Button>
          </Space>
        </Header>

        <Content style={{ padding:24 }}>
          {/* DEBUG: header should show search + avatar + Logout */}
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
