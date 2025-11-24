// src/screens/BookAppointmentScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { listDepartments, listDoctorsByDept } from '../api/masters';
import { authPost } from '../api/auth';

export default function BookAppointmentScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const deps = await listDepartments();     // GET /api/departments/
        if (!mounted) return;
        setDepartments(deps);
      } catch (e) {
        Alert.alert('Error', 'Failed to load departments\n' + String(e.message));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When department changes, fetch doctors filtered
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!departmentId) {
        setDoctors([]);
        setDoctorId('');
        return;
      }
      try {
        const docs = await listDoctorsByDept(departmentId); // GET /api/doctors/?department=ID
        if (!mounted) return;
        setDoctors(docs);
      } catch (e) {
        Alert.alert('Error', 'Failed to load doctors\n' + String(e.message));
      }
    })();
    return () => { mounted = false; };
  }, [departmentId]);

  async function onConfirm() {
    if (!departmentId) return Alert.alert('Missing info', 'Please choose a department.');
    if (!doctorId) return Alert.alert('Missing info', 'Please choose a doctor.');
    if (!date) return Alert.alert('Missing info', 'Please set a date.');
    if (!time) return Alert.alert('Missing info', 'Please set a time.');

    try {
      // DO NOT send patient id. Backend should infer from request.app_user.
      const body = {
        kind: 'appointment',        // keep consistent with your serializer if it uses a type/kind
        department: departmentId,
        doctor: doctorId,
        date,                       // "YYYY-MM-DD"
        time,                       // "HH:MM"
        notes: notes || '',
      };
      await authPost('/api/bookings/', body);
      Alert.alert('Success', 'Appointment booked.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Booking failed', String(e.message));
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.h1}>Book an Appointment</Text>

      {/* Department (simple select using text inputs for now) */}
      <Text style={s.label}>Department</Text>
      <TextInput
        style={s.input}
        placeholder="Type Department ID or Name"
        value={departmentId}
        onChangeText={setDepartmentId}
        onBlur={() => {
          // if user typed a name, try to match 1st by name
          const byName = departments.find(d =>
            d.name?.toLowerCase?.() === departmentId.trim().toLowerCase());
          if (byName) setDepartmentId(String(byName.id));
        }}
      />
      <Text style={s.hint}>Known IDs: {departments.map(d => `${d.id}-${d.name}`).join(', ')}</Text>

      {/* Doctor */}
      <Text style={s.label}>Doctor</Text>
      <TextInput
        style={s.input}
        placeholder="Type Doctor ID"
        value={doctorId}
        onChangeText={setDoctorId}
      />
      <Text style={s.hint}>
        {doctors.length ? `Available: ${doctors.map(d => `${d.id}-${d.full_name || d.name}`).join(', ')}` : 'Select a department first'}
      </Text>

      {/* Date & Time */}
      <Text style={s.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={date} onChangeText={setDate} />

      <Text style={s.label}>Time (HH:MM)</Text>
      <TextInput style={s.input} value={time} onChangeText={setTime} />

      {/* Notes */}
      <Text style={s.label}>Notes (optional)</Text>
      <TextInput
        style={[s.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Anything the doctor should know?"
      />

      <TouchableOpacity style={s.btn} onPress={onConfirm}>
        <Text style={s.btnText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: Platform.OS === 'android' ? 10 : 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, padding: 12,
  },
  hint: { marginTop: 6, fontSize: 12, color: '#666' },
  btn: { backgroundColor: '#0A57FF', borderRadius: 12, padding: 14, marginTop: 24, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
