import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listComplaints } from '../api/complaints'
import ComplaintCompose from './parts/ComplaintCompose'

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'open', value: 'open' },
  { label: 'in_progress', value: 'in_progress' },
  { label: 'resolved', value: 'resolved' },
]

function StatusTag({ s }) {
  const color =
    s === 'open' ? 'red' :
    s === 'in_progress' ? 'gold' :
    s === 'resolved' ? 'green' :
    'default'
  return <Tag color={color}>{s}</Tag>
}

export default function Complaints() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', { status }],
    queryFn: () => listComplaints(status ? { status } : {}),
  })
  const rows = data?.results || data || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const name = (r.patient_name || '').toLowerCase()
      const mrn  = (r.patient_mrn || '').toLowerCase()
      const cat  = (r.category || '').toLowerCase()
      const desc = (r.description || '').toLowerCase()
      return name.includes(t) || mrn.includes(t) || cat.includes(t) || desc.includes(t)
    })
  }, [rows, q])

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, r) => {
        const name = r.patient_name
        const mrn  = r.patient_mrn
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{name || (mrn ? `MRN ${mrn}` : '—')}</div>
            <div style={{ color: '#6b7280' }}>{name && mrn ? `MRN ${mrn}` : ''}</div>
          </div>
        )
      }
    },
    {
      title: 'Ward / Bed',
      key: 'wb',
      render: (_, r) => (r.ward_name || r.bed_code ? `${r.ward_name || '-'} / ${r.bed_code || '-'}` : '—'),
      width: 180,
    },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 140 },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => <StatusTag s={s} />,
      width: 140,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      render: v => v ? String(v).replace('T',' ').slice(0,16) : '-',
      width: 180,
    },
    {
      title: 'Resolved',
      dataIndex: 'resolved_at',
      key: 'resolved',
      render: v => v ? String(v).replace('T',' ').slice(0,16) : '-',
      width: 180,
    },
  ]

  return (
    <>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <Input
          placeholder="Search name/MRN/category/description"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 180 }} />
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={()=>setOpen(true)}>New Complaint</Button>
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

      <ComplaintCompose
        open={open}
        onClose={()=>setOpen(false)}
        onCreated={()=>{
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['complaints'] })
        }}
      />
    </>
  )
}
