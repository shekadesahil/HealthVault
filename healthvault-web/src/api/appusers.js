// src/api/appusers.js
import client from './client'

// Fetch the AppUser that matches an email (returns the first match or null)
export async function getAppUserByEmail(email) {
  const data = await client.get('/appusers/', { params: { email } })
  const list = data?.results || data || []
  return list[0] || null
}

export function listAppUsers(params = {}) {
  return client.get('/appusers/', { params })
}

// Create new AppUser (staff-only)
export function createAppUser(payload) {
  // { email?, phone?, username?, role?, is_active? }
  return client.post('/appusers/', payload)
}

// Update existing AppUser (staff-only)
export function updateAppUser(id, patch) {
  return client.patch(`/appusers/${id}/`, patch)
}

// Quick toggle
export function toggleActive(id, isActive) {
  return updateAppUser(id, { is_active: isActive })
}