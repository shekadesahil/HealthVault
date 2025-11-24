import React, { useEffect, useMemo, useState } from 'react'
import { Drawer, Form, Input, Select, Button, InputNumber, Table, Space, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { createOrder, addItem, listMenu } from '../../api/canteen'
import { searchPatients } from '../../api/patients'
import { getAppUserByEmail } from '../../api/appusers'
import { useAuth } from '../../auth/AuthContext'

export default function CanteenOrderCompose({ open, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [pForm] = Form.useForm()
  const { user } = useAuth()
  const [appUser, setAppUser] = useState(null)
  const [pQ, setPQ] = useState('')     // patient search query
  const [lines, setLines] = useState([]) // [{menu_item, name, price_cents, qty}]

  // Resolve current staff to AppUser (required by /canteen-orders/)
  useEffect(() => {
    let mounted = true
    async function run() {
      if (!user?.email) return
      try {
        const au = await getAppUserByEmail(user.email)
        if (mounted) setAppUser(au || null)
      } catch {
        setAppUser(null)
      }
    }
    if (open) run()
    return () => { mounted = false }
  }, [open, user?.email])

  // Menu
  const { data: menuData } = useQuery({
    queryKey: ['menu', { active: 1 }],
    queryFn: () => listMenu(true),
    enabled: open,
  })
  const menu = menuData?.results || menuData || []

  // Patients (search)
  const { data: patientsData } = useQuery({
    queryKey: ['patients', pQ],
    queryFn: () => searchPatients(pQ),
    enabled: open,
  })
  const patients = patientsData?.results || patientsData || []

  const menuOptions = useMemo(
    () => menu.map(m => ({ value: m.id, label: `${m.name} — ₹${(m.price_cents/100).toFixed(2)}` })),
    [menu]
  )

  const addLine = (menu_item) => {
    const mi = menu.find(x => x.id === menu_item)
    if (!mi) return
    setLines(prev => {
      // if already present, bump qty
      const i = prev.findIndex(l => l.menu_item === menu_item)
      if (i >= 0) {
        const copy = [...prev]
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 }
        return copy
      }
      return [...prev, { menu_item, name: mi.name, price_cents: mi.price_cents, qty: 1 }]
    })
  }

  const changeQty = (menu_item, qty) => {
    setLines(prev => prev.map(l => l.menu_item === menu_item ? { ...l, qty: Math.max(1, qty || 1) } : l))
  }

  const removeLine = (menu_item) => {
    setLines(prev => prev.filter(l => l.menu_item !== menu_item))
  }

  const totalRupees = useMemo(
    () => lines.reduce((sum, l) => sum + (l.qty * l.price_cents), 0) / 100,
    [lines]
  )

  const submit = async () => {
    try {
      const v = await form.validateFields()
      if (!appUser?.id) {
        message.error('Your staff account is not linked to an AppUser (by email). Create one in Django admin.')
        return
      }
      if (!lines.length) {
        message.error('Add at least one menu item')
        return
      }

      // 1) create order
      const order = await createCanteenOrder({
        user: appUser.id,
        patient: v.patient || null, // optional
        status: 'pending',
      })

      // 2) add items sequentially
      for (const line of lines) {
        await addOrderItem(order.id, { menu_item: line.menu_item, qty: line.qty })
      }

      message.success('Order created')
      setLines([])
      form.resetFields()
      onCreated?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Failed to create order')
    }
  }

  const columns = [
    { title: 'Item', dataIndex: 'name', key: 'name' },
    { title: 'Unit (₹)', key: 'price', render: (_, l) => (l.price_cents/100).toFixed(2), width: 100 },
    {
      title: 'Qty', key: 'qty', width: 120,
      render: (_, l) => (
        <InputNumber min={1} value={l.qty} onChange={(v) => changeQty(l.menu_item, v)} />
      )
    },
    { title: 'Line Total (₹)', key: 'lt', render: (_, l) => ((l.price_cents*l.qty)/100).toFixed(2), width: 140 },
    { title: '', key: 'rm', width: 80, render: (_, l) => <Button danger size="small" onClick={()=>removeLine(l.menu_item)}>Remove</Button>}
  ]

  return (
    <Drawer
      width={720}
      title="New Canteen Order"
      open={open}
      onClose={() => { setLines([]); form.resetFields(); onClose?.() }}
      extra={<Button type="primary" onClick={submit}>Create Order</Button>}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Patient (optional)" name="patient" tooltip="Link to a patient if this order is for a bedside delivery.">
          <Select
            showSearch
            allowClear
            placeholder="Search MRN or name"
            filterOption={false}
            onSearch={setPQ}
            options={patients.map(p => ({
              value: p.id,
              label: `${p.mrn} — ${p.first_name} ${p.last_name}`.trim()
            }))}
          />
        </Form.Item>

        <Form.Item label="Add Menu Item">
          <Space.Compact style={{ width: '100%' }}>
            <Select
              showSearch
              placeholder="Type to search menu"
              options={menuOptions}
              style={{ flex: 1 }}
              onChange={addLine}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Space.Compact>
        </Form.Item>

        <Table
          size="small"
          rowKey="menu_item"
          dataSource={lines}
          columns={columns}
          pagination={false}
        />

        <div style={{ textAlign:'right', marginTop: 12, fontWeight: 600 }}>
          Total: ₹{totalRupees.toFixed(2)}
        </div>
      </Form>
    </Drawer>
  )
}
