import client from './client'

// GET /api/reports/?patient=&admission=&type=
export function listReports(params = {}) {
  return client.get('/reports/', { params })
}

// POST /api/reports/upload/  (multipart)
export function uploadReport({ patient, admission, report_type, file, notes }) {
  const fd = new FormData()
  fd.append('patient', patient)
  if (admission) fd.append('admission', admission)
  fd.append('report_type', report_type)
  fd.append('file', file)
  if (notes) fd.append('notes', notes)
  return client.post('/reports/upload/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Build the direct download URL for a report
export function reportDownloadUrl(id) {
  return `/api/reports/${id}/download/`
}
