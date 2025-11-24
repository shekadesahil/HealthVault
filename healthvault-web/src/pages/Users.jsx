// src/pages/Users.jsx
import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Table, Tag, Space, Popconfirm, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAppUsers, toggleActive } from '../api/appusers'
import UserCompose from './parts/UserCompose'

export default function Users() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['appusers', { q }],
    queryFn: () => listAppUsers(q ? { q } : {}),
  })
  const rows = data?.results || data || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(u => {
      const uname = (u.username || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const phone = (u.phone || '').toLowerCase()
      const role  = (u.role || '').toLowerCase()
      return uname.includes(t) || email.includes(t) || phone.includes(t) || role.includes(t)
    })
  }, [rows, q])

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: 'User',
      key: 'user',
      render: (_, u) => (
        <div>
          <div style={{ fontWeight: 600 }}>{u.username || u.email || u.phone || `AppUser ${u.id}`}</div>
          <div style={{ color: '#6b7280' }}>
            {u.email ? u.email : ''}{u.email && u.phone ? ' • ' : ''}{u.phone ? u.phone : ''}
          </div>
        </div>
      )
    },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 140, render: r => r || '—' },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'active',
      width: 120,
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'active' : 'inactive'}</Tag>
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      width: 180,
      render: v => v ? String(v).replace('T', ' ').slice(0, 16) : '—'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, u) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(u); setOpen(true) }}>Edit</Button>
          {u.is_active ? (
            <Popconfirm
              title="Deactivate this user?"
              onConfirm={async () => {
                await toggleActive(u.id, false)
                message.success('User deactivated')
                qc.invalidateQueries({ queryKey: ['appusers'] })
              }}
            >
              <Button size="small" danger>Deactivate</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Activate this user?"
              onConfirm={async () => {
                await toggleActive(u.id, true)
                message.success('User activated')
                qc.invalidateQueries({ queryKey: ['appusers'] })
              }}
            >
              <Button size="small" type="primary">Activate</Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Search username / email / phone / role"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={() => { setEditing(null); setOpen(true) }}>
          New User
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

      <UserCompose
        open={open}
        record={editing}
        onClose={() => setOpen(false)}
        onSaved={async () => {
          setOpen(false)
          await qc.invalidateQueries({ queryKey: ['appusers'] })
        }}
      />
    </>
  )
}
