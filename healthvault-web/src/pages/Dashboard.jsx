// src/pages/Dashboard.jsx
import React from 'react'
import { Card, Row, Col, List, Tag, Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  countAdmissions,
  countReports,
  countComplaints,
  recentAdmissions,
  recentReports,
  recentComplaints,
} from '../api/dashboard'

export default function Dashboard() {
  // counts
  const qAllAdmissions = useQuery({
    queryKey: ['dash', 'count', 'admissions'],
    queryFn: () => countAdmissions(), // all-time
  })
  const qRecentAdmissionsCount = useQuery({
    queryKey: ['dash', 'count', 'admissions', 'recent'],
    queryFn: () => countAdmissions({ from: new Date(Date.now() - 7*864e5).toISOString().slice(0,10) }), // last 7d by created_at date
  })
  const qActiveComplaints = useQuery({
    queryKey: ['dash', 'count', 'complaints', 'active'],
    queryFn: () => countComplaints({ status: 'open' }),
  })
  const qReportsPending = useQuery({
    queryKey: ['dash', 'count', 'reports', 'recent'],
    queryFn: () => countReports({}), // simple count for now
  })

  // lists
  const qRecAdm = useQuery({ queryKey: ['dash', 'recent', 'admissions'], queryFn: () => recentAdmissions(5) })
  const qRecRep = useQuery({ queryKey: ['dash', 'recent', 'reports'], queryFn: () => recentReports(5) })
  const qRecCmp = useQuery({ queryKey: ['dash', 'recent', 'complaints'], queryFn: () => recentComplaints(5) })

  const Stat = ({ title, value, loading }) => (
    <Card>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{title}</div>
      {loading ? <Skeleton active paragraph={false} title={{ width: 60 }} /> :
        <div style={{ fontSize: 32, fontWeight: 700 }}>{value ?? 0}</div>}
    </Card>
  )

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Dashboard</h1>

      <Row gutter={16}>
        <Col xs={24} md={6}><Stat title="Total Admissions" value={qAllAdmissions.data} loading={qAllAdmissions.isLoading} /></Col>
        <Col xs={24} md={6}><Stat title="Reports Uploaded" value={qReportsPending.data} loading={qReportsPending.isLoading} /></Col>
        <Col xs={24} md={6}><Stat title="Recent Admissions (7d)" value={qRecentAdmissionsCount.data} loading={qRecentAdmissionsCount.isLoading} /></Col>
        <Col xs={24} md={6}><Stat title="Active Complaints" value={qActiveComplaints.data} loading={qActiveComplaints.isLoading} /></Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Recent Admissions">
            <List
              loading={qRecAdm.isLoading}
              dataSource={qRecAdm.data || []}
              renderItem={(a) => (
                <List.Item>
                  <List.Item.Meta
                    title={a.patient_name || `MRN ${a.patient_mrn || a.patient}`}
                    description={`Ward ${a.ward_name ?? a.ward} / Bed ${a.bed_code ?? a.bed}`}
                  />
                  <Tag color="blue">{(a.status || '').toLowerCase()}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Recent Reports">
            <List
              loading={qRecRep.isLoading}
              dataSource={qRecRep.data || []}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta
                    title={r.file_name}
                    description={`${r.report_type} • Patient ${r.patient}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Recent Complaints">
            <List
              loading={qRecCmp.isLoading}
              dataSource={qRecCmp.data || []}
              renderItem={(c) => (
                <List.Item>
                  <List.Item.Meta
                    title={`Patient ${c.patient}`}
                    description={c.category ? `${c.category} — ${c.description?.slice(0, 60) || ''}` : c.description?.slice(0, 60)}
                  />
                  <Tag color={(!c.status || c.status.toLowerCase()==='open') ? 'red' : 'green'}>
                    {(c.status || '').toLowerCase()}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
