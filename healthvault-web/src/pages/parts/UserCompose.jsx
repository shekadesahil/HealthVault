// src/pages/parts/UserCompose.jsx
import React from 'react'
import { Drawer, Form, Input, Select, Switch, Button, message } from 'antd'
import { createAppUser, updateAppUser } from '../../api/appusers'

const ROLE_OPTS = [
  { value: 'staff', label: 'Staff' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'patient', label: 'Patient' },
]

export default function UserCompose({ open, onClose, onSaved, record }) {
  const [form] = Form.useForm()
  const isEdit = !!record?.id

  React.useEffect(() => {
    if (!open) return
    if (record) {
      form.setFieldsValue({
        email: record.email || '',
        phone: record.phone || '',
        username: record.username || '',
        role: record.role || undefined,
        is_active: record.is_active !== false,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ is_active: true })
    }
  }, [open, record, form])

  const submit = async () => {
    try {
      const v = await form.validateFields()
      const payload = {
        email: v.email || null,
        phone: v.phone || null,
        username: v.username || null,
        role: v.role || null,
        is_active: v.is_active !== false,
      }
      if (isEdit) {
        await updateAppUser(record.id, payload)
        message.success('User updated')
      } else {
        await createAppUser(payload)
        message.success('User created')
      }
      onSaved?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Save failed')
    }
  }

  return (
    <Drawer
      width={520}
      title={isEdit ? 'Edit User' : 'New User'}
      open={open}
      onClose={() => { form.resetFields(); onClose?.() }}
      destroyOnClose
      extra={<Button type="primary" onClick={submit}>{isEdit ? 'Update' : 'Create'}</Button>}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Username" name="username">
          <Input placeholder="(optional) staff login handle or alias" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Invalid email' }]}>
          <Input placeholder="user@hospital.tld" />
        </Form.Item>
        <Form.Item label="Phone" name="phone">
          <Input placeholder="+91…" />
        </Form.Item>
        <Form.Item label="Role" name="role">
          <Select allowClear placeholder="Pick a role" options={ROLE_OPTS} />
        </Form.Item>
        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
        {/* Note: password_hash is managed by mobile flows/OTP; we don't edit it here */}
      </Form>
    </Drawer>
  )
}
