// src/screens/MyBookingsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { fetchMyBookings } from '../api/bookings';

function BookingCard({ b }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{b.booking_type === 'doctor' ? 'Doctor Appointment' : 'Booking'}</Text>
      <Text style={styles.line}>Department: {b.department || b.department_name || '-'}</Text>
      <Text style={styles.line}>Doctor: {b.doctor || b.doctor_name || '-'}</Text>
      <Text style={styles.line}>Date: {b.slot_date}  Time: {b.slot_time}</Text>
      <Text style={styles.status}>Status: {b.status}</Text>
    </View>
  );
}

export default function MyBookingsScreen() {
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!patientId) {
      Alert.alert('Patient required', 'Enter Patient ID to fetch your bookings.');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchMyBookings(patientId);
      setItems(data);
    } catch (e) {
      Alert.alert('Error', typeof e.message === 'string' ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bookings</Text>

      <Text style={styles.label}>Patient ID</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter Patient ID"
          value={patientId}
          onChangeText={setPatientId}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Load</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <BookingCard b={item} />}
          contentContainerStyle={{ paddingVertical: 12 }}
          ListEmptyComponent={<Text style={{ marginTop: 24, textAlign: 'center', color: '#667' }}>No bookings found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fbff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#0a2540' },
  label: { marginTop: 12, marginBottom: 8, fontWeight: '700', color: '#0a2540' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryBtn: { backgroundColor: '#0a55ff', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f2', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontWeight: '800', marginBottom: 4, color: '#0a2540' },
  line: { color: '#334' },
  status: { marginTop: 6, fontWeight: '700', color: '#0a55ff' },
});
