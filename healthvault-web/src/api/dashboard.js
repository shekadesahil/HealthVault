// src/api/dashboard.js
import client from './client'

// counts
export function countAdmissions(params = {}) {
  return client.get('/admissions/', { params }).then(r => r.count ?? (Array.isArray(r) ? r.length : 0))
}
export function countReports(params = {}) {
  return client.get('/reports/', { params }).then(r => r.count ?? (Array.isArray(r) ? r.length : 0))
}
export function countComplaints(params = {}) {
  return client.get('/complaints/', { params }).then(r => r.count ?? (Array.isArray(r) ? r.length : 0))
}

// recents (top N)
export function recentAdmissions(limit = 5) {
  return client.get('/admissions/', { params: { page_size: limit } }).then(r => r.results ?? r)
}
export function recentReports(limit = 5) {
  return client.get('/reports/', { params: { page_size: limit } }).then(r => r.results ?? r)
}
export function recentComplaints(limit = 5) {
  return client.get('/complaints/', { params: { page_size: limit } }).then(r => r.results ?? r)
}
