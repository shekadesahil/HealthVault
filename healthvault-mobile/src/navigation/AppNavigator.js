// src/navigation/AppNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStack from './HomeStack';
import MyPatientScreen from '../screens/MyPatientScreen';
import CanteenScreen from '../screens/CanteenScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let icon = 'ellipse';
          if (route.name === 'Home') icon = 'home-outline';
          if (route.name === 'My Patient') icon = 'person-outline';
          if (route.name === 'Canteen') icon = 'fast-food-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0055ff',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="My Patient" component={MyPatientScreen} />
      <Tab.Screen name="Canteen" component={CanteenScreen} />
    </Tab.Navigator>
  );
}
