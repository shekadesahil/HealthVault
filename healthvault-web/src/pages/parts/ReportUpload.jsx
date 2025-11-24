import React, { useState } from 'react'
import { Drawer, Form, Input, Select, Upload, Button, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { searchPatients } from '../../api/lookups'   // you already have this
import { uploadReport } from '../../api/reports'

const { Dragger } = Upload

export default function ReportUpload({ open, onClose, onUploaded }) {
  const [form] = Form.useForm()
  const [pQ, setPQ] = useState('')
  const [file, setFile] = useState(null)

  // patient search
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', pQ],
    queryFn: () => searchPatients(pQ),
    enabled: open,
  })

  const submit = async () => {
    try {
      const v = await form.validateFields()
      if (!file) {
        message.error('Please attach a file')
        return
      }
      await uploadReport({
        patient: v.patient,
        admission: v.admission || null,   // optional
        report_type: v.report_type,
        file,
        notes: v.notes || '',
      })
      message.success('Report uploaded')
      form.resetFields()
      setFile(null)
      onUploaded?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Upload failed')
    }
  }

  return (
    <Drawer
      width={520}
      title="Upload Report"
      open={open}
      onClose={() => { form.resetFields(); setFile(null); onClose?.() }}
      extra={<Button type="primary" onClick={submit}>Submit</Button>}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Patient" name="patient" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Search MRN or name"
            filterOption={false}
            onSearch={setPQ}
            options={(patients?.results || patients).map(p => ({
              value: p.id,
              label: `${p.mrn} — ${p.first_name} ${p.last_name}`.trim(),
            }))}
          />
        </Form.Item>

        <Form.Item label="Admission (optional)" name="admission">
          <Input placeholder="Leave blank if not tied to a specific admission" />
          {/* If you want, replace with a Select populated by patient’s admissions later */}
        </Form.Item>

        <Form.Item label="Report type" name="report_type" rules={[{ required: true }]}>
          <Select
            placeholder="e.g. imaging, labs, discharge"
            options={[
              { value: 'imaging', label: 'imaging' },
              { value: 'lab',     label: 'lab' },        // <-- singular
              { value: 'discharge', label: 'discharge' },
              { value: 'billing', label: 'billing' },    // <-- DB allows this too
              { value: 'other',    label: 'other' },
            ]}
          />
        </Form.Item>

        <Form.Item label="File" required>
          <Dragger
            multiple={false}
            accept="application/pdf,image/*"
            beforeUpload={(f) => { setFile(f); return false }} // prevent auto-upload
            onRemove={() => setFile(null)}
            fileList={file ? [file] : []}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag file to this area</p>
            <p className="ant-upload-hint">PDF or image files supported</p>
          </Dragger>
        </Form.Item>

        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
