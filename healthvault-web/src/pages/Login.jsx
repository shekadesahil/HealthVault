// DEBUG: Login v1
import React, { useState } from 'react'
import { Card, Form, Input, Button, Typography } from 'antd'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    try {
      setLoading(true)
      await login(values.username, values.password)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:64 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{
          width:42, height:42, borderRadius:10, background:'#0ea5e9',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:26, fontWeight:900
        }}>+</div>
        <Typography.Title level={2} style={{ margin:0, letterSpacing:0.5 }}>HEALTHVAULT</Typography.Title>
      </div>

      <Card
        style={{ width:520, background:'#0b2540', border:'none', boxShadow:'0 8px 24px rgba(0,0,0,.18)' }}
        bodyStyle={{ padding:28 }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
          <Typography.Title level={2} style={{ color:'#fff', margin:0 }}>Login</Typography.Title>
          <a href="#" style={{ color:'#9cc5ff' }}>Forgot password?</a>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            label={<span style={{ color:'#dbeafe' }}>Username</span>}
            rules={[{ required: true }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color:'#dbeafe' }}>Password</span>}
            rules={[{ required: true }]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ marginTop:8 }}>
            Login
          </Button>
        </Form>
      </Card>
    </div>
  )
}
