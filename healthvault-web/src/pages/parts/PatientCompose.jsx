import React from 'react'
import { Drawer, Form, Input, Select, DatePicker, Button, message } from 'antd'
import dayjs from 'dayjs'
import { createPatient, updatePatient } from '../../api/patients'

const BG_OPTS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
].map(x => ({ value: x, label: x }))

export default function PatientCompose({ open, onClose, onSaved, record }) {
  const [form] = Form.useForm()
  const isEdit = !!record?.id

  // prefill on open
  React.useEffect(() => {
    if (!open) return
    if (record) {
      form.setFieldsValue({
        mrn: record.mrn,
        first_name: record.first_name,
        last_name: record.last_name,
        sex: record.sex || undefined,
        dob: record.dob ? dayjs(record.dob) : undefined,
        blood_group: record.blood_group || undefined,
        address: record.address || '',
        allergies: record.allergies || '',
      })
    } else {
      form.resetFields()
    }
  }, [open, record, form])

  const submit = async () => {
    try {
      const v = await form.validateFields()
      const payload = {
        mrn: v.mrn,
        first_name: v.first_name,
        last_name: v.last_name,
        sex: v.sex || null,
        dob: v.dob ? v.dob.format('YYYY-MM-DD') : null,
        blood_group: v.blood_group || null,
        address: v.address || '',
        allergies: v.allergies || '',
      }
      if (isEdit) {
        await updatePatient(record.id, payload)
        message.success('Patient updated')
      } else {
        await createPatient(payload)
        message.success('Patient created')
      }
      onSaved?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Save failed')
    }
  }

  return (
    <Drawer
      width={560}
      title={isEdit ? 'Edit Patient' : 'New Patient'}
      open={open}
      onClose={() => { form.resetFields(); onClose?.() }}
      destroyOnClose
      extra={<Button type="primary" onClick={submit}>{isEdit ? 'Update' : 'Create'}</Button>}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="MRN" name="mrn" rules={[{ required: true, message: 'MRN is required' }]}>
          <Input placeholder="e.g., P31009" />
        </Form.Item>

        <Form.Item label="First name" name="first_name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Last name" name="last_name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Sex" name="sex">
          <Select
            allowClear
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </Form.Item>

        <Form.Item label="DOB" name="dob">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Blood group" name="blood_group">
          <Select allowClear options={BG_OPTS} />
        </Form.Item>

        <Form.Item label="Address" name="address">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item label="Allergies" name="allergies">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
