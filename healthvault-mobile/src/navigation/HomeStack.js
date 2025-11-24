// src/navigation/HomeStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import LabReportsScreen from '../screens/LabReportsScreen';
import AboutScreen from '../screens/AboutScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeRoot"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{ title: 'Book an Appointment' }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: 'My Bookings' }}
      />
      <Stack.Screen
        name="LabReports"
        component={LabReportsScreen}
        options={{ title: 'Lab Reports' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About Us' }}
      />
    </Stack.Navigator>
  );
}
