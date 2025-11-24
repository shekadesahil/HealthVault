// src/api/notifications.js
import client from './client'

// List notifications (optionally with params)
export function listNotifications(params = {}) {
  return client.get('/notifications/', { params })
}

// Create a notification (staff-only)
export function createNotification(payload) {
  return client.post('/notifications/', payload)
}

// Mark a notification as read
export function markNotificationRead(id) {
  return client.post(`/notifications/${id}/mark-read/`)
}
