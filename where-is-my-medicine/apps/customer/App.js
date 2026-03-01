// App.js — Root navigation for Customer App
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthChange, getUserProfile } from '@wimm/firebase-config';
import useStore from './src/store/useStore';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';
import PrescriptionUploadScreen from './src/screens/PrescriptionUploadScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
            <Stack.Screen name="PrescriptionUpload" component={PrescriptionUploadScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    const { user, setUser, setUserProfile, setLoading, isLoading } = useStore();

    useEffect(() => {
        const unsub = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    if (isLoading) {
        return null; // Or a splash screen
    }

    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}
