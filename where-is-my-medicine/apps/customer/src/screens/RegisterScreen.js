// Register Screen for Customer App
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { registerUser } from '@wimm/firebase-config';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !phone.trim() || !password) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            await registerUser(email.trim(), password, name.trim(), phone.trim(), 'customer');
            Alert.alert('Success', 'Account created successfully!');
        } catch (error) {
            let msg = 'Registration failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            if (error.code === 'auth/weak-password') msg = 'Password is too weak.';
            if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
            Alert.alert('Registration Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to find medicines near you</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
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
                        <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor="#9CA3AF"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#9CA3AF"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.registerButton, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.registerButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        marginBottom: 36,
    },
    backButton: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginTop: 8,
    },
    form: {
        gap: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    registerButton: {
        backgroundColor: '#0D9488',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    loginLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    loginText: {
        color: '#6B7280',
        fontSize: 14,
    },
    loginTextBold: {
        color: '#0D9488',
        fontWeight: '700',
    },
});
