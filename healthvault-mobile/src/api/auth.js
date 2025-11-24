// src/api/auth.js
// Use your PC's LAN IP if testing on a real device via Expo Go,
import * as SecureStore from 'expo-secure-store';
// or 10.0.2.2 for Android emulator, or 127.0.0.1 for iOS Simulator.
const API = 'http://10.101.58.209:8000/api';  // ← replace with your LAN IP

const TOKEN_KEY = 'hv_token';
export async function saveToken(token) { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearToken() { await SecureStore.deleteItemAsync(TOKEN_KEY); }

// ---- safe URL join (prevents '/api/api' mistakes) ----
function apiUrl(path) {
  let base = API.replace(/\/+$/, '');         // strip trailing slashes
  // if someone accidentally set API ending with '/api', strip it:
  if (base.endsWith('/api')) base = base.slice(0, -4);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

// ---- generic authed fetchers ----
export async function authGet(path) {
  const token = await getToken();
  const res = await fetch(apiUrl(path), {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

export async function authPost(path, body) {
  const token = await getToken();
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// ---- auth endpoints ----
export async function loginWithPassword({ email_or_phone, password }) {
  return authPost('/api/app/auth/login/', { email_or_phone, password });
}

export async function sendOtp(destination) {
  // backend should allow unauth for this endpoint
  const res = await fetch(apiUrl('/api/app/auth/send-otp/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination }),
  });
  if (!res.ok) throw new Error(`POST /api/app/auth/send-otp/ -> ${res.status} ${await res.text()}`);
  return res.json();
}

export async function signupVerify({ destination, otp_code, password }) {
  return authPost('/api/app/auth/signup-verify/', { destination, otp_code, password });
}