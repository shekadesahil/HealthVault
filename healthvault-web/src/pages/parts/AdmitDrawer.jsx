import React, { useState } from 'react'
import { Drawer, Form, Input, DatePicker, Select, Button, message, Card } from 'antd'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { searchPatients, listWards, listBeds, listDoctors } from '../../api/lookups'
import { createAdmission } from '../../api/admissions'
import { createPatient } from '../../api/patients'

export default function AdmitDrawer({ open, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [pForm] = Form.useForm() // mini form for new patient
  const [pQ, setPQ] = useState('')
  const [wardId, setWardId] = useState(null)
  const [newOpen, setNewOpen] = useState(false)

  // Patients (searchable)
  const { data: patients = [] } = useQuery({
    queryKey: ['patients', pQ],
    queryFn: () => searchPatients(pQ),
    enabled: open,
  })

  // Wards
  const { data: wards = [] } = useQuery({
    queryKey: ['wards'],
    queryFn: () => listWards(),
    enabled: open,
  })

  // Beds (by ward)
  const { data: beds = [] } = useQuery({
    queryKey: ['beds', wardId],
    queryFn: () => listBeds(wardId, 'available'), // change to null if you don’t track availability
    enabled: open && !!wardId,
  })

  // Doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
    enabled: open,
  })

  const submit = async () => {
    try {
      const v = await form.validateFields()
      await createAdmission({
        patient: v.patient,
        ward: v.ward,
        bed: v.bed,
        doctor: v.doctor || null,
        admit_time: v.admit_time.toDate().toISOString(), // dayjs -> Date -> ISO
        status: 'active', // keep lowercase; backend filters case-insensitively
        notes: v.notes || '',
      })
      message.success('Admission created')
      form.resetFields()
      onCreated?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Failed to create admission')
    }
  }

  const submitNewPatient = async () => {
    try {
      const v = await pForm.validateFields()
      const created = await createPatient({
        mrn: v.mrn,
        first_name: v.first_name,
        last_name: v.last_name,
        sex: v.sex || null,
        dob: v.dob ? v.dob.format('YYYY-MM-DD') : null,
        blood_group: v.blood_group || null,
        address: v.address || '',
        allergies: v.allergies || '',
      })
      // select new patient in main form
      form.setFieldsValue({ patient: created.id })
      setNewOpen(false)
      pForm.resetFields()
      // nudge the search so it appears in options quickly
      setPQ(created.mrn)
      message.success('Patient created')
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.response?.data?.detail || 'Failed to create patient')
    }
  }

  return (
    <Drawer
      width={520}
      title="Admit Patient"
      open={open}
      onClose={() => { form.resetFields(); onClose?.() }}
      extra={<Button type="primary" onClick={submit}>Submit</Button>}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ admit_time: dayjs() }}>
        {/* Patient select + inline create */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <label style={{ fontWeight: 500 }}>Patient</label>
          <Button type="link" onClick={() => setNewOpen(!newOpen)}>
            {newOpen ? 'Cancel new patient' : '+ Create new patient'}
          </Button>
        </div>

        {newOpen && (
          <Card size="small" style={{ marginBottom: 12 }}>
            <Form form={pForm} layout="vertical">
              <Form.Item label="MRN" name="mrn" rules={[{ required: true, message: 'MRN is required' }]}>
                <Input placeholder="e.g., P31008" />
              </Form.Item>

              <Form.Item label="First name" name="first_name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Last name" name="last_name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>

              <Form.Item label="Sex" name="sex">
                <Select allowClear options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]} />
              </Form.Item>

              <Form.Item label="DOB" name="dob">
                <DatePicker style={{ width:'100%' }} />
              </Form.Item>

              <Form.Item label="Blood group" name="blood_group">
                <Select allowClear options={[
                  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                ]} />
              </Form.Item>

              <Form.Item label="Address" name="address">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item label="Allergies" name="allergies">
                <Input.TextArea rows={2} />
              </Form.Item>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <Button onClick={() => { pForm.resetFields(); setNewOpen(false) }}>Cancel</Button>
                <Button type="primary" onClick={submitNewPatient}>Save Patient</Button>
              </div>
            </Form>
          </Card>
        )}

        <Form.Item name="patient" rules={[{ required: true, message: 'Select a patient' }]}>
          <Select
            showSearch
            placeholder="Search MRN or name"
            filterOption={false}
            onSearch={setPQ}
            options={(patients?.results || patients).map(p => ({
              value: p.id,
              label: `${p.mrn} — ${p.first_name} ${p.last_name}`.trim(),
            }))}
          />
        </Form.Item>

        <Form.Item label="Ward" name="ward" rules={[{ required: true }]}>
          <Select
            placeholder="Select ward"
            options={(wards?.results || wards).map(w => ({ value: w.id, label: w.name }))}
            onChange={(id) => { setWardId(id); form.setFieldsValue({ bed: undefined }) }}
          />
        </Form.Item>

        <Form.Item label="Bed" name="bed" rules={[{ required: true }]}>
          <Select
            placeholder={wardId ? 'Select bed' : 'Select ward first'}
            disabled={!wardId}
            options={(beds?.results || beds).map(b => ({ value: b.id, label: b.code }))}
          />
        </Form.Item>

        <Form.Item label="Doctor (optional)" name="doctor">
          <Select
            allowClear
            placeholder="Select doctor"
            options={(doctors?.results || doctors).map(d => ({ value: d.id, label: d.full_name }))}
          />
        </Form.Item>

        <Form.Item label="Admit date/time" name="admit_time" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width:'100%' }} />
        </Form.Item>

        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
