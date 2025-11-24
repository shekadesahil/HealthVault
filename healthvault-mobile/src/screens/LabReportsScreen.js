import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LabReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lab Reports</Text>
      <Text>Will fetch downloadable reports here.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex:1, padding:16 },
  title: { fontSize:22, fontWeight:'700', marginBottom:8 },
});
