// src/api/bookings.js
import * as SecureStore from 'expo-secure-store';
import { API } from './auth'; // NOTE: this assumes your existing auth.js exports `API`. If it's named differently, update this import.

async function authHeaders() {
  const token = await SecureStore.getItemAsync('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchDepartments() {
  const res = await fetch(`${API}/departments/`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchDoctorsByDepartment(deptId) {
  const res = await fetch(`${API}/doctors/?department=${deptId}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSlots(doctorId, dateStr) {
  const res = await fetch(`${API}/slots/?doctor=${doctorId}&date=${dateStr}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // expects something like: ["09:00", "09:30", ...]
}

export async function createBooking(payload) {
  // payload = { booking_type, patient?, department, doctor, slot_date, slot_time, notes? }
  const res = await fetch(`${API}/bookings/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchMyBookings(patientId) {
  // The viewset exposes /api/bookings/my-bookings/?patient=<id>
  const res = await fetch(`${API}/bookings/my-bookings/?patient=${patientId}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
