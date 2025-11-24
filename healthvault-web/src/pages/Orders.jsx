import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag, Space, Popconfirm, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CanteenOrderCompose from './parts/CanteenOrderCompose'
import { listOrders, updateOrderStatus, cancelOrder } from '../api/canteen'

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'pending', value: 'pending' },
  { label: 'preparing', value: 'preparing' },
  { label: 'ready', value: 'ready' },
  { label: 'delivered', value: 'delivered' },
  { label: 'cancelled', value: 'cancelled' },
]

function StatusTag({ s }) {
  const color =
    s === 'pending' ? 'gold' :
    s === 'preparing' ? 'blue' :
    s === 'ready' ? 'geekblue' :
    s === 'delivered' ? 'green' :
    s === 'cancelled' ? 'red' :
    'default'
  return <Tag color={color}>{s}</Tag>
}

export default function Orders() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)

  // Query list
  const { data, isLoading } = useQuery({
    queryKey: ['orders', { status }],
    queryFn: () => listOrders(status ? { status } : {}),
  })
  const rows = data?.results || data || []

  // Mutations
  const mUpdate = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => {
      message.success('Order updated')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
  const mCancel = useMutation({
    mutationFn: (id) => cancelOrder(id),
    onSuccess: () => {
      message.success('Order cancelled')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  // Client search (patient name, MRN, order id)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const id = String(r.id || '').toLowerCase()
      const name = (r.patient_name || '').toLowerCase()
      const mrn = (r.patient_mrn || '').toLowerCase()
      return id.includes(t) || name.includes(t) || mrn.includes(t)
    })
  }, [rows, q])

  const columns = [
    { title: 'Order #', dataIndex: 'id', key: 'id', width: 100 },
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
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag s={s} />,
      width: 140,
    },
    {
      title: 'Total (₹)',
      dataIndex: 'total_rupees',
      key: 'total',
      render: v => (v ?? 0).toFixed(2),
      width: 120,
      align: 'right',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      render: v => v ? String(v).replace('T',' ').slice(0,16) : '-',
      width: 180,
    },
    {
      title: 'Paid',
      dataIndex: 'paid_at',
      key: 'paid',
      render: v => v ? String(v).replace('T',' ').slice(0,16) : '-',
      width: 180,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => mUpdate.mutate({ id: r.id, status: 'preparing' })}>Preparing</Button>
          <Button size="small" onClick={() => mUpdate.mutate({ id: r.id, status: 'ready' })}>Ready</Button>
          <Button size="small" onClick={() => mUpdate.mutate({ id: r.id, status: 'delivered' })}>Delivered</Button>
          <Popconfirm
            title="Cancel this order?"
            okText="Yes"
            onConfirm={() => mCancel.mutate(r.id)}
          >
            <Button size="small" danger>Cancel</Button>
          </Popconfirm>
        </Space>
      ),
      width: 360,
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Search by patient / MRN / order #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <Select
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 160 }}
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" onClick={() => setComposeOpen(true)}>
          New Order
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

      <CanteenOrderCompose
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={() => {
          setComposeOpen(false)
          qc.invalidateQueries({ queryKey: ['orders'] })
        }}
      />
    </>
  )
}
