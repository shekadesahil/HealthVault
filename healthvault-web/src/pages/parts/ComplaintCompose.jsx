import React, { useState } from 'react'
import { Drawer, Form, Input, Select, Button, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { searchPatients } from '../../api/patients'
import { createComplaint } from '../../api/complaints'

const CATEGORY_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
]

export default function ComplaintCompose({ open, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [q, setQ] = useState('')

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', q],
    queryFn: () => searchPatients(q),
    enabled: open,
  })

  const submit = async () => {
    try {
      const v = await form.validateFields()
      await createComplaint({
        patient: v.patient,
        category: v.category || 'other',
        description: v.description,
        // admission/ward/bed auto-inferred by backend if patient has active admission
      })
      message.success('Complaint submitted')
      form.resetFields()
      onCreated?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Failed to submit complaint')
    }
  }

  return (
    <Drawer
      width={520}
      title="New Complaint"
      open={open}
      onClose={() => { form.resetFields(); onClose?.() }}
      destroyOnClose
      extra={<Button type="primary" onClick={submit}>Submit</Button>}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Patient" name="patient" rules={[{ required: true, message: 'Select a patient' }]}>
          <Select
            showSearch
            placeholder="Search MRN or name"
            filterOption={false}
            onSearch={setQ}
            options={(patients?.results || patients).map(p => ({
              value: p.id,
              label: `${p.mrn} — ${p.first_name} ${p.last_name}`.trim(),
            }))}
          />
        </Form.Item>

        <Form.Item label="Category" name="category">
          <Select
            allowClear
            placeholder="Select category"
            options={CATEGORY_OPTIONS}
          />
        </Form.Item>

        <Form.Item label="Description" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={5} placeholder="Describe the issue..." />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
