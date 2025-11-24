// src/auth/SignupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendOtp, signupVerify } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen() {
  const nav = useNavigation();
  const { login } = useAuth();

  const [destination, setDestination] = useState('');   // email or phone
  const [code, setCode] = useState('');                 // OTP
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  const onSendOtp = async () => {
    if (!destination.trim()) {
      Alert.alert('Enter email or phone');
      return;
    }
    try {
      setSending(true);
      const resp = await sendOtp(destination.trim(), 'signup');
      if (resp?.debug_code) {
        Alert.alert('OTP sent', `Use code: ${resp.debug_code}\n(Dev mode)`);
      } else {
        Alert.alert('OTP sent', 'Check your email/SMS.');
      }
    } catch (e) {
      Alert.alert('Failed to send OTP', String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const onCreate = async () => {
    if (!destination.trim() || !code.trim() || !password) {
      Alert.alert('Missing fields', 'Fill destination, OTP, and password.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match');
      return;
    }
    try {
      setCreating(true);
      // Verify OTP and create/set password on server
      await signupVerify(destination.trim(), code.trim(), password);
      // Then sign in with password (reuses AuthContext flow)
      await login(destination.trim(), password);
      // Success → RootNavigator will switch to tabs
    } catch (e) {
      Alert.alert('Signup failed', String(e?.message || e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.label}>Email or Phone</Text>
      <TextInput
        placeholder="you@example.com or 98xxxxxx12"
        value={destination}
        onChangeText={setDestination}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TouchableOpacity style={[styles.secondaryButton, sending && styles.disabled]} onPress={onSendOtp} disabled={sending}>
        {sending ? <ActivityIndicator /> : <Text style={styles.secondaryText}>Send OTP</Text>}
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 16 }]}>OTP Code</Text>
      <TextInput
        placeholder="Enter 6-digit code"
        value={code}
        onChangeText={setCode}
        style={styles.input}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Set a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        placeholder="Re-enter password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={[styles.button, creating && styles.disabled]} onPress={onCreate} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => nav.goBack()}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fbff' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#003366', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 16, color: '#003366', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#0055ff', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#e8f0ff', borderRadius: 8, padding: 12, alignItems: 'center' },
  secondaryText: { color: '#0055ff', fontSize: 14, fontWeight: '600' },
  link: { textAlign: 'center', color: '#0055ff', marginTop: 18 },
  disabled: { opacity: 0.6 },
});
