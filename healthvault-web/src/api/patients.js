// src/api/patients.js
import client from './client'

// Search by MRN or name. If q is empty, returns all (paginated) patients.
export function searchPatients(q = '') {
  const params = q ? { q } : {}
  return client.get('/patients/', { params })
}

// Get one by id (optional helper)
export function getPatient(id) {
  return client.get(`/patients/${id}/`)
}

export function createPatient(payload) {
  return client.post('/patients/', payload)
}

export function listPatients(params = {}) {
  return client.get('/patients/', { params })
}

export function updatePatient(id, patch) {
  return client.patch(`/patients/${id}/`, patch)
}

