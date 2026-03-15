// App.js — Root navigation for Customer App
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ScrollView } from 'react-native';
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

// Error boundary to capture and display runtime errors on screen
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <ScrollView style={{ flex: 1, padding: 40, paddingTop: 80, backgroundColor: '#FEE2E2' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#991B1B', marginBottom: 12 }}>
                        App Error
                    </Text>
                    <Text style={{ fontSize: 14, color: '#991B1B', fontFamily: 'monospace' }}>
                        {this.state.error?.toString()}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 12, fontFamily: 'monospace' }}>
                        {this.state.error?.stack}
                    </Text>
                </ScrollView>
            );
        }
        return this.props.children;
    }
}

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

function AppContent() {
    const { user, setUser, setUserProfile, setLoading, isLoading } = useStore();

    useEffect(() => {
        let unsub;
        try {
            unsub = onAuthChange(async (firebaseUser) => {
                setUser(firebaseUser);
                if (firebaseUser) {
                    try {
                        const profile = await getUserProfile(firebaseUser.uid);
                        setUserProfile(profile);
                    } catch (e) {
                        console.error('getUserProfile error:', e);
                    }
                } else {
                    setUserProfile(null);
                }
                setLoading(false);
            });
        } catch (e) {
            console.error('onAuthChange error:', e);
            setLoading(false);
        }
        return () => unsub && unsub();
    }, []);

    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}
