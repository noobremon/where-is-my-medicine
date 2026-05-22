// App.js — Root navigation for Pharmacy App
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthChange, getUserProfile, getPharmacy, signOut } from '@wimm/firebase-config';
import usePharmacyStore from './src/store/usePharmacyStore';

import PharmacyLoginScreen from './src/screens/PharmacyLoginScreen';
import IncomingRequestsScreen from './src/screens/IncomingRequestsScreen';
import RespondRequestScreen from './src/screens/RespondRequestScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={PharmacyLoginScreen} />
        </Stack.Navigator>
    );
}

function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="IncomingRequests" component={IncomingRequestsScreen} />
            <Stack.Screen name="RespondRequest" component={RespondRequestScreen} />
            <Stack.Screen name="Medicines" component={MedicinesScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    const { user, setUser, setUserProfile, setPharmacyData, setLoading, isLoading } =
        usePharmacyStore();

    useEffect(() => {
        const unsub = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const profile = await getUserProfile(firebaseUser.uid);
                    if (profile && profile.role !== 'pharmacy') {
                        Alert.alert('Unauthorized', 'This account is not registered as a pharmacy.');
                        await signOut();
                        setLoading(false);
                        return;
                    }
                    setUserProfile(profile);
                    // Load pharmacy-specific data
                    const pharmacy = await getPharmacy(firebaseUser.uid);
                    setPharmacyData(pharmacy);
                    setUser(firebaseUser);
                } catch (e) {
                    console.error('getUserProfile error:', e);
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setPharmacyData(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    if (isLoading) return null;

    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}
