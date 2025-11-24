import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag, Space, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listNotifications, markNotificationRead } from '../api/notifications'
import NotifyCompose from './parts/NotifyCompose'
import { useAuth } from '../auth/AuthContext'

export default function Notifications() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const [q, setQ] = useState('')
  const [channel, setChannel] = useState('')
  const [readFilter, setReadFilter] = useState('') // '', 'unread', 'read'
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { channel }],
    queryFn: () => listNotifications(channel ? { channels: channel } : {}),
  })
  const rows = data?.results || data || []

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    let items = rows
    if (readFilter === 'unread') items = items.filter(n => !n.read_at)
    if (readFilter === 'read')   items = items.filter(n => !!n.read_at)
    if (!t) return items
    return items.filter(n => {
      const title = (n.title || '').toLowerCase()
      const msg   = (n.message || '').toLowerCase()
      const who   = (n.target_user || '').toLowerCase() // email if present
      return title.includes(t) || msg.includes(t) || who.includes(t)
    })
  }, [rows, q, readFilter])

  const onMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    } catch (e) {
      message.error(e?.response?.data?.detail || 'Failed to mark read')
    }
  }

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {v} {(!r.read_at) && <Tag color="red">NEW</Tag>}
          </div>
          <div style={{ color: '#6b7280' }}>{r.message}</div>
        </div>
      ),
    },
    {
      title: 'Channel',
      dataIndex: 'channels',
      key: 'channels',
      render: v => <Tag color="blue">{v || 'in_app'}</Tag>,
      width: 120,
    },
    {
      title: 'Target',
      dataIndex: 'target_user',
      key: 'target',
      render: v => v || <span style={{ color:'#6b7280' }}>Broadcast</span>,
      width: 200,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      render: v => v ? String(v).slice(0,16).replace('T',' ') : '-',
      width: 160,
    },
    {
      title: 'Read',
      dataIndex: 'read_at',
      key: 'read',
      render: v => v ? String(v).slice(0,16).replace('T',' ') : <span style={{color:'#ef4444'}}>—</span>,
      width: 160,
    },
    {
      title: 'Actions',
      key: 'act',
      width: 140,
      render: (_, r) => (
        <Space>
          {!r.read_at && <Button size="small" onClick={() => onMarkRead(r.id)}>Mark read</Button>}
        </Space>
      ),
    },
  ]

  return (
    <>
      {/* Filters + Compose */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <Input
          placeholder="Search title/message/target"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ maxWidth: 360 }}
          allowClear
        />
        <Select
          value={readFilter}
          onChange={setReadFilter}
          style={{ width: 140 }}
          options={[
            { label: 'All', value: '' },
            { label: 'Unread', value: 'unread' },
            { label: 'Read', value: 'read' },
          ]}
        />
        <Select
          value={channel}
          onChange={setChannel}
          style={{ width: 160 }}
          options={[
            { label: 'All channels', value: '' },
            { label: 'In-app', value: 'in_app' },
          ]}
        />
        <div style={{ flex:1 }} />
        {user?.is_staff && (
          <Button type="primary" onClick={() => setOpen(true)}>Compose</Button>
        )}
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

      <NotifyCompose
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['notifications'] })
        }}
      />
    </>
  )
}
