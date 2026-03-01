// Pharmacy Login Screen
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { signIn } from '@wimm/firebase-config';
import { Ionicons } from '@expo/vector-icons';

export default function PharmacyLoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            await signIn(email.trim(), password);
        } catch (error) {
            let msg = 'Login failed.';
            if (error.code === 'auth/user-not-found') msg = 'No account found.';
            if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
            Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Ionicons name="storefront" size={40} color="#7C3AED" />
                </View>
                <Text style={styles.title}>Pharmacy Portal</Text>
                <Text style={styles.subtitle}>Where Is My Medicine</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPw}
                    />
                    <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                        <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.btn, loading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                </TouchableOpacity>

                <Text style={styles.note}>
                    Pharmacy accounts are created by admin.{'\n'}Contact admin for registration.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF5FF', justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 48 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#EDE9FE',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#6B7280', marginTop: 4 },
    form: { gap: 16 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    input: { flex: 1, fontSize: 16, color: '#111827' },
    btn: {
        backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        marginTop: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    note: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 20, lineHeight: 20 },
});
