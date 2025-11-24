// src/api/access.js
import client from './client'

// List existing links. Supports ?user= and ?patient=
export function listAccess(params = {}) {
  return client.get('/patient-access/', { params })
}

// Create a link { user, patient, relationship? }
export function createAccess(payload) {
  return client.post('/patient-access/', payload)
}

// Delete a link by id
export function deleteAccess(id) {
  return client.delete(`/patient-access/${id}/`)
}
