// Profile / Settings Screen — Sign out + user info
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@wimm/firebase-config';
import useStore from '../store/useStore';

export default function ProfileScreen({ navigation }) {
    const { user, userProfile, reset } = useStore();

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await signOut();
                        reset();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to sign out.');
                    }
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.profileCard}>
                <View style={styles.avatarLarge}>
                    <Ionicons name="person" size={36} color="#0D9488" />
                </View>
                <Text style={styles.name}>
                    {userProfile?.displayName || user?.displayName || 'User'}
                </Text>
                <Text style={styles.email}>{user?.email}</Text>
                {userProfile?.phone ? (
                    <Text style={styles.phone}>{userProfile.phone}</Text>
                ) : null}
            </View>

            <View style={styles.menuSection}>
                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="notifications-outline" size={22} color="#111827" />
                    <Text style={styles.menuText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="help-circle-outline" size={22} color="#111827" />
                    <Text style={styles.menuText}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    <Text style={[styles.menuText, { color: '#EF4444' }]}>Sign Out</Text>
                    <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <Text style={styles.version}>Where Is My Medicine v1.0.0</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    profileCard: {
        alignItems: 'center', paddingVertical: 32, marginHorizontal: 20,
        backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    avatarLarge: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: '#CCFBF1',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    name: { fontSize: 20, fontWeight: '800', color: '#111827' },
    email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    phone: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    menuSection: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12,
    },
    menuText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
    dangerItem: { borderBottomWidth: 0 },
    version: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, marginTop: 32 },
});
