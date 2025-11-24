// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

function Tile({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={28} color="#0a2540" />
      <Text style={styles.tileText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {                   // <-- DEFAULT export
  const nav = useNavigation();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
        <Text style={styles.logo}>HEALTHVAULT</Text>
        {user && (
          <Text style={styles.subtle}>
            Signed in as {user.email || user.phone || user.username}
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        <Tile icon="calendar-outline" label="Book Appointment" onPress={() => nav.navigate('BookAppointment')} />
        <Tile icon="checkbox-outline" label="My Bookings" onPress={() => nav.navigate('MyBookings')} />
        <Tile icon="document-text-outline" label="Lab Reports" onPress={() => nav.navigate('LabReports')} />
        <Tile icon="information-circle-outline" label="About Us" onPress={() => nav.navigate('About')} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, paddingHorizontal:16, backgroundColor:'#f8fbff' },
  logo: { fontSize:28, fontWeight:'800', color:'#0a2540' },
  subtle: { marginTop:6, color:'#445', fontSize:13 },
  grid: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  tile: {
    width:'48%', backgroundColor:'#fff', borderRadius:14, paddingVertical:20, paddingHorizontal:16,
    marginBottom:14, borderWidth:1, borderColor:'#e6ecf5', shadowColor:'#000', shadowOpacity:0.05,
    shadowRadius:6, elevation:1, alignItems:'flex-start', gap:10
  },
  tileText: { fontSize:16, fontWeight:'700', color:'#0a2540' },
  logoutBtn: {
    marginTop:'auto', marginBottom:24, alignSelf:'center', backgroundColor:'#e53e3e',
    paddingVertical:10, paddingHorizontal:16, borderRadius:10, flexDirection:'row', alignItems:'center', gap:8
  },
  logoutText: { color:'#fff', fontWeight:'700' }
});
