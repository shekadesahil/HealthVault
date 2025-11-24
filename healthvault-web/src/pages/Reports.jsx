import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listReports, reportDownloadUrl } from '../api/reports'
import ReportUpload from './parts/ReportUpload'

export default function Reports() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')           // search by name/MRN/file
  const [type, setType] = useState('')     // report_type filter
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', { type }],
    queryFn: () => listReports(type ? { type } : {}),
  })

  const rows = data?.results || data || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const name = `${r.patient_first_name ?? ''} ${r.patient_last_name ?? ''}`.toLowerCase()
      const mrn = (r.patient_mrn || '').toLowerCase()
      const file = (r.file_name || '').toLowerCase()
      return name.includes(t) || mrn.includes(t) || file.includes(t)
    })
  }, [rows, q])

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {(r.patient_first_name || r.patient_last_name)
              ? `${r.patient_first_name ?? ''} ${r.patient_last_name ?? ''}`.trim()
              : `MRN ${r.patient_mrn || r.patient}`}
          </div>
          <div style={{ color: '#6b7280' }}>MRN {r.patient_mrn}</div>
        </div>
      ),
    },
    { title: 'Report Type', dataIndex: 'report_type', key: 'type',
      render: v => <Tag color="blue">{v}</Tag> },
    { title: 'File Name', dataIndex: 'file_name', key: 'file' },
    { title: 'Uploaded', dataIndex: 'uploaded_at', key: 'at',
      render: v => v ? String(v).slice(0, 16).replace('T', ' ') : '-' },
    {
      title: 'Actions',
      key: 'act',
      render: (_, r) => (
        <Button size="small" onClick={() => window.open(reportDownloadUrl(r.id), '_blank')}>
          Download
        </Button>
      ),
    },
  ]

  return (
    <>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <Input placeholder="Search patient/MRN/file…" value={q} onChange={e=>setQ(e.target.value)} style={{ maxWidth: 360 }} />
        <Select
          value={type}
          onChange={setType}
          style={{ width: 180 }}
          options={[
            { value: '',         label: 'All types' },
            { value: 'imaging',  label: 'imaging' },
            { value: 'lab',      label: 'lab' },       // <-- singular
            { value: 'discharge',label: 'discharge' },
            { value: 'billing',  label: 'billing' },   // <-- include it
            { value: 'other',    label: 'other' },
          ]}
        />
        <div style={{ flex:1 }} />
        <Button type="primary" onClick={() => setOpen(true)}>Upload Report</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={filtered}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <ReportUpload
        open={open}
        onClose={() => setOpen(false)}
        onUploaded={() => {
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['reports'] })
        }}
      />
    </>
  )
}
