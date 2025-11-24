import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About HealthVault</Text>
      <Text>Basic hospital details / contact info.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex:1, padding:16 },
  title: { fontSize:22, fontWeight:'700', marginBottom:8 },
});
