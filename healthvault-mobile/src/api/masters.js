// src/api/masters.js
import { authGet } from './auth';

export function listDepartments() {
  // trailing slash to avoid 301
  return authGet('/api/departments/');
}

export function listDoctorsByDept(departmentId) {
  const qs = departmentId ? `?department=${encodeURIComponent(departmentId)}` : '';
  return authGet(`/api/doctors/${qs}`);
}
