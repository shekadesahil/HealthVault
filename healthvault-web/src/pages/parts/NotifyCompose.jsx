import React from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { createNotification } from '../../api/notifications'

export default function NotifyCompose({ open, onClose, onCreated }) {
  const [form] = Form.useForm()

  const submit = async () => {
    try {
      const v = await form.validateFields()
      const payload = {
        title: v.title,
        message: v.message,
        channels: v.channels || 'in_app',
      }
      // Target optional: email string; leave empty for broadcast
      if (v.target_user) payload.target_user = v.target_user

      await createNotification(payload)
      message.success('Notification sent')
      form.resetFields()
      onCreated?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Failed to send')
    }
  }

  return (
    <Drawer
      width={520}
      title="Send Notification"
      open={open}
      onClose={() => { form.resetFields(); onClose?.() }}
      extra={<Button type="primary" onClick={submit}>Send</Button>}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ channels: 'in_app' }}>
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input maxLength={120} />
        </Form.Item>
        <Form.Item label="Message" name="message" rules={[{ required: true }]}>
          <Input.TextArea rows={4} maxLength={2000} />
        </Form.Item>
        <Form.Item label="Channels" name="channels">
          <Select
            options={[
              { value: 'in_app', label: 'In-app' },
              // add 'email' later if you enable email
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Target user (email)"
          name="target_user"
          tooltip="Leave empty for broadcast to eligible users"
        >
          <Input placeholder="user@example.com (optional)" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
