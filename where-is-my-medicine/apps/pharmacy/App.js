// App.js — Root navigation for Pharmacy App
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthChange, subscribeUserProfile, getPharmacy, signOut } from '@wimm/firebase-config';
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
        let unsubAuth;
        let unsubProfile;

        try {
            unsubAuth = onAuthChange((firebaseUser) => {
                if (unsubProfile) {
                    unsubProfile();
                    unsubProfile = null;
                }

                if (firebaseUser) {
                    unsubProfile = subscribeUserProfile(firebaseUser.uid, async (profile) => {
                        if (profile) {
                            if (profile.role !== 'pharmacy') {
                                Alert.alert('Unauthorized', 'This account is not registered as a pharmacy.');
                                if (unsubProfile) {
                                    unsubProfile();
                                    unsubProfile = null;
                                }
                                await signOut();
                                return;
                            }
                            setUserProfile(profile);
                            
                            // Load pharmacy-specific data
                            try {
                                const pharmacy = await getPharmacy(firebaseUser.uid);
                                setPharmacyData(pharmacy);
                            } catch (err) {
                                console.error('getPharmacy error:', err);
                            }
                            
                            setUser(firebaseUser);
                            setLoading(false);
                        } else {
                            // User is signed in but profile is not created yet
                            setUser(firebaseUser);
                            setUserProfile(null);
                            setPharmacyData(null);
                            setLoading(false);
                        }
                    });
                } else {
                    setUser(null);
                    setUserProfile(null);
                    setPharmacyData(null);
                    setLoading(false);
                }
            });
        } catch (e) {
            console.error('onAuthChange error:', e);
            setLoading(false);
        }

        return () => {
            if (unsubAuth) unsubAuth();
            if (unsubProfile) unsubProfile();
        };
    }, []);

    if (isLoading) return null;

    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}
