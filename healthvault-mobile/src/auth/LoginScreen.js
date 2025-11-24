// src/auth/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const nav = useNavigation();
  const { login } = useAuth();
  const [destination, setDestination] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!destination.trim() || !password) {
      Alert.alert('Missing fields', 'Enter both email/phone and password.');
      return;
    }
    try {
      setLoading(true);
      await login(destination.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HEALTHVAULT</Text>

      <Text style={styles.label}>Email or Phone</Text>
      <TextInput
        placeholder="you@example.com or 98xxxxxx12"
        value={destination}
        onChangeText={setDestination}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      <View style={{ height: 12 }} />
      <TouchableOpacity onPress={() => nav.navigate('Signup')}>
        <Text style={styles.link}>Don’t have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fbff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#003366', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 16, color: '#003366', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#0055ff', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', color: '#0055ff' },
});
