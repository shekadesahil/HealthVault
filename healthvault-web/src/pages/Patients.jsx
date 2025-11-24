import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Table, Space, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listPatients } from '../api/patients'
import PatientCompose from './parts/PatientCompose'

export default function Patients() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patients', { q }],
    queryFn: () => listPatients(q ? { q } : {}),
  })
  const rows = data?.results || data || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim().toLowerCase()
      const mrn  = (r.mrn || '').toLowerCase()
      const addr = (r.address || '').toLowerCase()
      const bg   = (r.blood_group || '').toLowerCase()
      return name.includes(t) || mrn.includes(t) || addr.includes(t) || bg.includes(t)
    })
  }, [rows, q])

  const columns = [
    {
      title: 'MRN',
      dataIndex: 'mrn',
      key: 'mrn',
      width: 140,
      render: (v) => v || '—',
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}</div>
          <div style={{ color: '#6b7280' }}>{r.sex ? r.sex : ''}{r.dob ? ` • ${String(r.dob).slice(0, 10)}` : ''}</div>
        </div>
      ),
    },
    { title: 'Blood Group', dataIndex: 'blood_group', key: 'bg', width: 120, render: v => v || '—' },
    { title: 'Allergies', dataIndex: 'allergies', key: 'allergies', ellipsis: true },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(r); setOpen(true) }}>Edit</Button>
          {/* You can add a "View" button later if you want a details page */}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Search name / MRN / address / blood group"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={() => { setEditing(null); setOpen(true) }}>
          New Patient
        </Button>
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

      <PatientCompose
        open={open}
        record={editing}
        onClose={() => setOpen(false)}
        onSaved={async () => {
          setOpen(false)
          await qc.invalidateQueries({ queryKey: ['patients'] })
          message.success('Saved')
        }}
      />
    </>
  )
}
