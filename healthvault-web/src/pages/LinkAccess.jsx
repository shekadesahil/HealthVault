// src/pages/LinkAccess.jsx
import React, { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Popconfirm, message, Tag } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// --- API helpers you should already have in src/api/* ---
import { listAdmissions } from '../api/admissions'
import { listAppUsers } from '../api/appusers'
import { listAccess, createAccess, deleteAccess } from '../api/access'

const RELATION_OPTS = [
  { value: 'guardian', label: 'guardian' },
  { value: 'self', label: 'self' },
  { value: 'caregiver', label: 'caregiver' },
  { value: 'other', label: 'other' },
]

export default function LinkAccess() {
  const qc = useQueryClient()

  // Form state
  const [userId, setUserId] = useState(null)
  const [patientId, setPatientId] = useState(null)
  const [relationship, setRelationship] = useState('guardian')
  const [q, setQ] = useState('') // filter existing links

  // ---- Load data -----------------------------------------------------------
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['appusers'],
    queryFn: () => listAppUsers({ page_size: 500 }),
  })
  const users = usersData?.results || usersData || []

  const { data: admsData, isLoading: loadingAdms } = useQuery({
    queryKey: ['admissions', { active_only: 1 }],
    queryFn: () => listAdmissions({ active_only: 1, page_size: 1000 }),
  })
  const admissions = admsData?.results || admsData || []

  const { data: linksData, isLoading: loadingLinks } = useQuery({
    queryKey: ['access'],
    queryFn: () => listAccess({ page_size: 1000 }),
  })
  const links = linksData?.results || linksData || []

  // ---- Build user options --------------------------------------------------
  const userOptions = useMemo(() => {
    return (users || []).map(u => ({
      value: u.id,
      label: u.username || u.email || u.phone || `User #${u.id}`,
    }))
  }, [users])

  // ---- Derive patient options from active admissions ----------------------
  // de-dup by patient id and show "MRN — Name • Ward/Bed"
  const patientOptions = useMemo(() => {
    const seen = new Set()
    const opts = []
    for (const a of (admissions || [])) {
      const pid = a.patient || a.patient_id
      if (!pid || seen.has(pid)) continue
      seen.add(pid)

      const name =
        (a.patient_name?.trim?.() ||
          `${a.patient_first_name ?? ''} ${a.patient_last_name ?? ''}`.trim()) || null
      const mrn = a.patient_mrn || a.mrn || ''
      const ward = a.ward_name || ''
      const bed = a.bed_code || ''

      const labelMain = [
        (mrn && `MRN ${mrn}`) || null,
        name || null,
      ].filter(Boolean).join(' — ')

      const labelTail = (ward || bed) ? ` • ${ward}${ward && bed ? ' / ' : ''}${bed}` : ''
      opts.push({ value: pid, label: `${labelMain}${labelTail}` })
    }
    return opts
  }, [admissions])

  // Maps to fix “MRN -” in the table when backend didn’t expand patient
  const pidToMrn = useMemo(() => {
    const m = {}
    for (const a of (admissions || [])) {
      const pid = a.patient || a.patient_id
      if (!pid) continue
      m[pid] = a.patient_mrn || a.mrn || null
    }
    return m
  }, [admissions])

  const pidToName = useMemo(() => {
    const m = {}
    for (const a of (admissions || [])) {
      const pid = a.patient || a.patient_id
      if (!pid) continue
      const nm =
        a.patient_name?.trim?.() ||
        `${a.patient_first_name ?? ''} ${a.patient_last_name ?? ''}`.trim() ||
        null
      m[pid] = nm
    }
    return m
  }, [admissions])

  // ---- Mutations -----------------------------------------------------------
  const createMut = useMutation({
    mutationFn: (payload) => createAccess(payload),
    onSuccess: () => {
      message.success('Link created')
      qc.invalidateQueries({ queryKey: ['access'] })
    },
    onError: (e) => {
      message.error(e?.response?.data?.detail || 'Failed to create link')
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAccess(id),
    onSuccess: () => {
      message.success('Link removed')
      qc.invalidateQueries({ queryKey: ['access'] })
    },
    onError: () => message.error('Failed to remove link'),
  })

  const createLink = () => {
    if (!userId || !patientId) {
      message.warning('Pick both App User and Patient')
      return
    }
    createMut.mutate({ user: userId, patient: patientId, relationship })
  }

  // ---- Table ---------------------------------------------------------------
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return links
    return (links || []).filter(l => {
      const uname = l.user_username || l.user || ''
      const rel = l.relationship || ''
      const pmrn = l.patient_mrn || ''
      const nm = l.patient_name || ''
      return [uname, rel, pmrn, nm].some(s => String(s).toLowerCase().includes(t))
    })
  }, [links, q])

  const columns = [
    {
      title: 'User',
      dataIndex: 'user_username',
      key: 'user',
      render: (v, l) => v || l.user_email || l.user_phone || `User #${l.user || l.user_id}`,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_, l) => {
        // normalize id
        const pid = typeof l.patient === 'object'
          ? (l.patient?.id ?? l.patient_id)
          : (l.patient ?? l.patient_id)

        const backendMrn = typeof l.patient === 'object' ? l.patient?.mrn : null
        const backendName = typeof l.patient === 'object'
          ? `${l.patient?.first_name || ''} ${l.patient?.last_name || ''}`.trim()
          : ''

        const mrn = backendMrn || l.patient_mrn || pidToMrn[pid] || ''
        const name = backendName || l.patient_name || pidToName[pid] || ''

        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {name || (mrn ? `MRN ${mrn}` : `(MRN -)`)}
            </div>
            <div style={{ color: '#6b7280' }}>
              {mrn ? `MRN ${mrn}` : ''}
            </div>
          </div>
        )
      }
    },
    {
      title: 'Relationship',
      dataIndex: 'relationship',
      key: 'relationship',
      render: r => <Tag>{r || 'guardian'}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, l) => (
        <Popconfirm
          title="Remove this link?"
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteMut.mutate(l.id)}
        >
          <Button danger size="small">Remove</Button>
        </Popconfirm>
      )
    }
  ]

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>App User</div>
            <Select
              style={{ width: 260 }}
              loading={loadingUsers}
              options={userOptions}
              value={userId}
              onChange={setUserId}
              placeholder="Pick app user"
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>Admitted Patient</div>
            <Select
              style={{ width: 360 }}
              loading={loadingAdms}
              options={patientOptions}
              value={patientId}
              onChange={setPatientId}
              placeholder="Pick active admission patient"
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>Relationship</div>
            <Select
              style={{ width: 160 }}
              options={RELATION_OPTS}
              value={relationship}
              onChange={setRelationship}
            />
          </div>

          <div style={{ alignSelf:'end' }}>
            <Button
              type="primary"
              onClick={createLink}
              loading={createMut.isPending}
            >
              Create Link
            </Button>
          </div>
        </Space>
      </Card>

      <Input
        placeholder="Search links by user/patient/relationship"
        value={q}
        onChange={e=>setQ(e.target.value)}
        style={{ maxWidth: 520, marginBottom: 12 }}
      />

      <Card>
        <Table
          rowKey="id"
          loading={loadingLinks}
          dataSource={filtered}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  )
}
