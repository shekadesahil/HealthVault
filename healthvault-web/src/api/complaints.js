// src/api/complaints.js
import client from './client'

// List complaints (supports ?patient=, ?status=)
export function listComplaints(params = {}) {
  return client.get('/complaints/', { params })
}

// Create a complaint
// payload: { patient, admission?, ward?, bed?, category?, description }
export function createComplaint(payload) {
  return client.post('/complaints/', payload)
}
