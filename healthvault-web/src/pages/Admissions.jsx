import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAdmissions } from '../api/admissions'
import AdmitDrawer from './parts/AdmitDrawer'

const statuses = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Discharged', value: 'discharged' },
]

export default function Admissions() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', { status }],
    queryFn: () => listAdmissions(status ? { status } : {}),
  })

  const rows = data?.results || data || []

  // Search by patient_name and patient_mrn (added by the serializer)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const name = (r.patient_name || '').toLowerCase()
      const mrn  = (r.patient_mrn || '').toLowerCase()
      return name.includes(t) || mrn.includes(t)
    })
  }, [rows, q])

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, a) => {
        const name =
          a.patient_name?.trim() ||
          `${a.patient_first_name ?? ''} ${a.patient_last_name ?? ''}`.trim() ||
          null

        const mrn = a.patient_mrn || a.mrn || a.patient // final fallback

        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {name ?? `MRN ${mrn}`}{/* if no name, show "MRN P31009" */}
            </div>
            <div style={{ color: '#6b7280' }}>
              {name ? `MRN ${mrn}` : ''}{/* if we had a name, show MRN as subline */}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Ward / Bed',
      key: 'wb',
      render: (_, r) => `${r.ward_name || '-'} / ${r.bed_code || '-'}`,
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor_name',
      key: 'doctor',
      render: v => v || '-',
    },
    {
      title: 'Admit Date',
      dataIndex: 'admit_time',
      key: 'admit',
      render: v => (v ? String(v).slice(0, 10) : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => (
        <Tag color={s === 'active' ? 'red' : s === 'pending' ? 'gold' : 'green'}>
          {s}
        </Tag>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Search by name or MRN"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <Select value={status} onChange={setStatus} options={statuses} style={{ width: 160 }} />
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={() => setOpen(true)}>Admit Patient</Button>
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

      <AdmitDrawer
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['admissions'] })
        }}
      />
    </>
  )
}
