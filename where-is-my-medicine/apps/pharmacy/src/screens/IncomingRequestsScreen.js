// Incoming Requests Dashboard — Pharmacy sees real-time medicine requests
import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribePharmacyRequests } from '@wimm/firebase-config';
import usePharmacyStore from '../store/usePharmacyStore';

export default function IncomingRequestsScreen({ navigation }) {
    const { user, pharmacyData } = usePharmacyStore();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribePharmacyRequests(user.uid, (data) => {
            setRequests(data);
            setLoading(false);
        });
        return unsub;
    }, [user?.uid]);

    const getTimeAgo = (timestamp) => {
        if (!timestamp?.toDate) return '';
        const diff = Date.now() - timestamp.toDate().getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    const renderRequest = ({ item }) => {
        const hasResponded = item.responses && item.responses[user.uid];
        return (
            <TouchableOpacity
                style={[styles.card, hasResponded && styles.cardResponded]}
                onPress={() => navigation.navigate('RespondRequest', { requestId: item.id })}
            >
                <View style={styles.cardLeft}>
                    <View style={[styles.iconBg, hasResponded && { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons
                            name={hasResponded ? 'checkmark-circle' : 'medkit'}
                            size={24}
                            color={hasResponded ? '#059669' : '#7C3AED'}
                        />
                    </View>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.medicineName}>{item.medicineName}</Text>
                    <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
                    {item.prescription?.imageUrl && (
                        <View style={styles.rxBadge}>
                            <Ionicons name="document-text" size={12} color="#7C3AED" />
                            <Text style={styles.rxText}>Has Prescription</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardRight}>
                    {hasResponded ? (
                        <Text style={styles.respondedLabel}>Responded</Text>
                    ) : (
                        <View style={styles.newBadge}>
                            <Text style={styles.newText}>NEW</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Pharmacy Dashboard</Text>
                    <Text style={styles.headerTitle}>Incoming Requests</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Medicines')}>
                    <View style={styles.avatar}>
                        <Ionicons name="medical" size={20} color="#7C3AED" />
                    </View>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : requests.length > 0 ? (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.center}>
                    <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No pending requests</Text>
                    <Text style={styles.emptySubtext}>New requests will appear here in real time</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF5FF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    greeting: { fontSize: 14, color: '#6B7280' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
    avatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE',
        alignItems: 'center', justifyContent: 'center',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        borderRadius: 14, padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    cardResponded: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
    cardLeft: { marginRight: 14 },
    iconBg: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDE9FE',
        alignItems: 'center', justifyContent: 'center',
    },
    cardContent: { flex: 1 },
    medicineName: { fontSize: 16, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
    timeAgo: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    rxBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
        backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    rxText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    respondedLabel: { fontSize: 11, fontWeight: '600', color: '#059669' },
    newBadge: { backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    newText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    emptyText: { fontSize: 17, fontWeight: '600', color: '#6B7280' },
    emptySubtext: { fontSize: 13, color: '#9CA3AF' },
});
