// Request Detail Screen — Real-time tracking of medicine request responses
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeMedicineRequest, acceptRequest } from '@wimm/firebase-config';

export default function RequestDetailScreen({ route, navigation }) {
    const { requestId } = route.params;
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        const unsub = subscribeMedicineRequest(requestId, (data) => {
            setRequest(data);
            setLoading(false);
        });
        return unsub;
    }, [requestId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.loadingText}>Loading request...</Text>
            </View>
        );
    }

    if (!request) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Request not found.</Text>
            </View>
        );
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#D97706', bg: '#FEF3C7', icon: 'time', label: 'Waiting for pharmacies...' };
            case 'accepted':
                return { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'Medicine Found!' };
            case 'expired':
                return { color: '#9CA3AF', bg: '#F3F4F6', icon: 'time-outline', label: 'Request Expired' };
            case 'cancelled':
                return { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle', label: 'Cancelled' };
            default:
                return { color: '#6B7280', bg: '#F3F4F6', icon: 'help', label: status };
        }
    };

    const statusInfo = getStatusInfo(request.status);
    const responses = Object.entries(request.responses || {});
    const acceptedResponses = responses.filter(([, r]) => r.status === 'accepted');
    const rejectedResponses = responses.filter(([, r]) => r.status === 'rejected');

    const handleAcceptPharmacy = async (pharmacyId) => {
        setAccepting(true);
        try {
            await acceptRequest(requestId, pharmacyId);
        } catch (error) {
            console.error('Accept error:', error);
            Alert.alert('Error', 'Failed to accept pharmacy. Please try again.');
        } finally {
            setAccepting(false);
        }
    };

    const renderResponse = ({ item: [pharmacyId, response] }) => (
        <View
            style={[
                styles.responseCard,
                response.status === 'accepted' ? styles.responseAccepted : styles.responseRejected,
            ]}
        >
            <View style={styles.responseHeader}>
                <Ionicons
                    name={response.status === 'accepted' ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={response.status === 'accepted' ? '#059669' : '#EF4444'}
                />
                <View style={styles.responseInfo}>
                    <Text style={styles.responsePharmacy}>Pharmacy</Text>
                    <Text style={styles.responseStatus}>
                        {response.status === 'accepted' ? 'Medicine Available' : 'Not Available'}
                    </Text>
                </View>
                {response.distanceKm != null && (
                    <View style={styles.distBadge}>
                        <Text style={styles.distText}>{response.distanceKm?.toFixed(1) || '?'} km</Text>
                    </View>
                )}
            </View>

            {/* Show pharmacy highlights if they drew on the prescription */}
            {response.pharmacyHighlights?.length > 0 && (
                <View style={styles.highlightInfo}>
                    <Ionicons name="brush" size={14} color="#6B7280" />
                    <Text style={styles.highlightText}>
                        {response.pharmacyHighlights.length} medicine(s) marked as available
                    </Text>
                </View>
            )}
            {/* Accept button for accepted responses (let customer confirm which pharmacy to visit) */}
            {response.status === 'accepted' && !request.acceptedPharmacyId && (
                <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptPharmacy(pharmacyId)}
                    disabled={accepting}
                >
                    <Text style={styles.acceptBtnText}>
                        {accepting ? 'Accepting...' : 'Choose This Pharmacy'}
                    </Text>
                </TouchableOpacity>
            )}
            {request.acceptedPharmacyId === pharmacyId && (
                <View style={styles.chosenBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.chosenText}>Your chosen pharmacy</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Details</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
                <Ionicons name={statusInfo.icon} size={28} color={statusInfo.color} />
                <View style={styles.statusBannerInfo}>
                    <Text style={styles.medicineName}>{request.medicineName}</Text>
                    <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            {/* Prescription Preview */}
            {request.prescription?.imageUrl && (
                <View style={styles.prescriptionPreview}>
                    <Image
                        source={{ uri: request.prescription.imageUrl }}
                        style={styles.prescriptionThumb}
                        resizeMode="cover"
                    />
                    <View style={styles.prescriptionBadge}>
                        <Ionicons name="document-text" size={14} color="#0D9488" />
                        <Text style={styles.prescriptionBadgeText}>
                            Prescription Uploaded
                            {request.prescription.customerHighlights?.length > 0
                                ? ` · ${request.prescription.customerHighlights.length} highlighted`
                                : request.prescription.selectAll
                                    ? ' · All medicines'
                                    : ''}
                        </Text>
                    </View>
                </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{request.notifiedPharmacies?.length || 0}</Text>
                    <Text style={styles.statLabel}>Notified</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: '#059669' }]}>{acceptedResponses.length}</Text>
                    <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={[styles.statNumber, { color: '#EF4444' }]}>{rejectedResponses.length}</Text>
                    <Text style={styles.statLabel}>Unavailable</Text>
                </View>
            </View>

            {/* Responses List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pharmacy Responses</Text>
                {responses.length > 0 ? (
                    <FlatList
                        data={responses}
                        renderItem={renderResponse}
                        keyExtractor={([id]) => id}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyResponses}>
                        {request.status === 'pending' && (
                            <ActivityIndicator size="small" color="#0D9488" style={{ marginBottom: 10 }} />
                        )}
                        <Text style={styles.emptyText}>
                            {request.status === 'pending'
                                ? 'Waiting for pharmacy responses...'
                                : 'No responses received.'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
        borderRadius: 16, padding: 20, gap: 16, marginBottom: 16,
    },
    statusBannerInfo: { flex: 1 },
    medicineName: { fontSize: 20, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
    statusLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    prescriptionPreview: {
        marginHorizontal: 20, borderRadius: 14, overflow: 'hidden', marginBottom: 16,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    },
    prescriptionThumb: { width: '100%', height: 120 },
    prescriptionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#CCFBF1',
    },
    prescriptionBadgeText: { fontSize: 13, fontWeight: '600', color: '#0D9488' },
    statsRow: {
        flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#FFFFFF',
        borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    stat: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
    section: { flex: 1, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
    responseCard: {
        borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1,
    },
    responseAccepted: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    responseRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    responseInfo: { flex: 1 },
    responsePharmacy: { fontSize: 15, fontWeight: '700', color: '#111827' },
    responseStatus: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    distBadge: { backgroundColor: '#CCFBF1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    distText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
    highlightInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    highlightText: { fontSize: 12, color: '#6B7280' },
    emptyResponses: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: '#9CA3AF' },
    acceptBtn: {
        backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10,
        alignItems: 'center', marginTop: 12,
    },
    acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    chosenBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
        backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    chosenText: { fontSize: 12, fontWeight: '600', color: '#059669' },
});
