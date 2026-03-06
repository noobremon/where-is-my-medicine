// Respond to Request Screen — Pharmacy accepts/rejects + draws highlights on prescription
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, Dimensions, PanResponder, ScrollView, Platform,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
    subscribeMedicineRequest,
    addPharmacyResponse,
    updatePharmacyHighlights,
    serverTimestamp,
} from '@wimm/firebase-config';
import { getDistanceKm } from '@wimm/shared';
import usePharmacyStore from '../store/usePharmacyStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 40;

export default function RespondRequestScreen({ route, navigation }) {
    const { requestId } = route.params;
    const { user, pharmacyData } = usePharmacyStore();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pharmacyHighlights, setPharmacyHighlights] = useState([]);
    const [currentRect, setCurrentRect] = useState(null);
    const [displaySize, setDisplaySize] = useState({ width: IMAGE_WIDTH, height: 300 });

    // Use refs to avoid stale closures in PanResponder
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentRectRef = useRef(null);
    const displaySizeRef = useRef({ width: IMAGE_WIDTH, height: 300 });

    const hasResponded = request?.responses?.[user?.uid];

    useEffect(() => {
        const unsub = subscribeMedicineRequest(requestId, (data) => {
            setRequest(data);
            setLoading(false);
            // Load existing pharmacy highlights if already responded
            if (data.responses?.[user?.uid]?.pharmacyHighlights) {
                setPharmacyHighlights(data.responses[user.uid].pharmacyHighlights);
            }
        });
        return unsub;
    }, [requestId]);

    // Calculate display size when image loads (cross-platform)
    const onImageLoad = (e) => {
        let imgW, imgH;
        if (Platform.OS === 'web') {
            imgW = e.nativeEvent?.target?.naturalWidth || IMAGE_WIDTH;
            imgH = e.nativeEvent?.target?.naturalHeight || 300;
        } else {
            imgW = e.nativeEvent?.source?.width || IMAGE_WIDTH;
            imgH = e.nativeEvent?.source?.height || 300;
        }
        const aspect = imgH / imgW;
        const newSize = { width: IMAGE_WIDTH, height: Math.min(IMAGE_WIDTH * aspect, 400) };
        setDisplaySize(newSize);
        displaySizeRef.current = newSize;
    };

    // PanResponder for drawing highlights
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    startPosRef.current = { x: locationX, y: locationY };
                    const rect = { x: locationX, y: locationY, width: 0, height: 0 };
                    currentRectRef.current = rect;
                    setCurrentRect(rect);
                },
                onPanResponderMove: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    const { x: sx, y: sy } = startPosRef.current;
                    const rect = {
                        x: Math.min(sx, locationX),
                        y: Math.min(sy, locationY),
                        width: Math.abs(locationX - sx),
                        height: Math.abs(locationY - sy),
                    };
                    currentRectRef.current = rect;
                    setCurrentRect(rect);
                },
                onPanResponderRelease: () => {
                    const rect = currentRectRef.current;
                    const ds = displaySizeRef.current;
                    if (rect && rect.width > 10 && rect.height > 10 && ds.width > 0 && ds.height > 0) {
                        const normalized = {
                            x: rect.x / ds.width,
                            y: rect.y / ds.height,
                            width: rect.width / ds.width,
                            height: rect.height / ds.height,
                        };
                        setPharmacyHighlights((prev) => [...prev, normalized]);
                    }
                    currentRectRef.current = null;
                    setCurrentRect(null);
                },
            }),
        []
    );

    const handleRespond = async (status) => {
        if (!pharmacyData?.location || !request?.customerLocation) {
            Alert.alert('Error', 'Location data missing.');
            return;
        }

        setSubmitting(true);
        try {
            const distKm = getDistanceKm(pharmacyData.location, request.customerLocation);

            await addPharmacyResponse(requestId, user.uid, {
                status,
                pharmacyHighlights: status === 'accepted' ? pharmacyHighlights : [],
                distanceKm: distKm,
                respondedAt: serverTimestamp(),
            });

            Alert.alert(
                status === 'accepted' ? '✅ Accepted' : 'Rejected',
                status === 'accepted'
                    ? 'Customer has been notified that you have the medicine.'
                    : 'Response recorded.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Response error:', error);
            Alert.alert('Error', 'Failed to submit response.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateHighlights = async () => {
        try {
            await updatePharmacyHighlights(requestId, user.uid, pharmacyHighlights);
            Alert.alert('Saved', 'Your highlights have been synced to the customer.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save highlights.');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medicine Request</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Medicine Info */}
            <View style={styles.infoCard}>
                <Ionicons name="medkit" size={28} color="#7C3AED" />
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.medName}>{request?.medicineName}</Text>
                    <Text style={styles.medSub}>Requested by customer nearby</Text>
                </View>
                {request?.prescription?.selectAll && (
                    <View style={styles.allBadge}>
                        <Text style={styles.allBadgeText}>ALL MEDICINES</Text>
                    </View>
                )}
            </View>

            {/* Prescription Image with Highlights */}
            {request?.prescription?.imageUrl && (
                <View style={styles.rxSection}>
                    <Text style={styles.sectionTitle}>Prescription</Text>
                    <Text style={styles.helpText}>
                        {hasResponded
                            ? 'You can update your highlights below. Changes sync in real time.'
                            : 'Draw rectangles on medicines you have in stock (green), then accept.'}
                    </Text>

                    <View
                        style={[styles.imageContainer, { width: displaySize.width, height: displaySize.height }]}
                        {...panResponder.panHandlers}
                    >
                        <Image
                            source={{ uri: request.prescription.imageUrl }}
                            style={{ width: displaySize.width, height: displaySize.height }}
                            resizeMode="contain"
                            onLoad={onImageLoad}
                        />
                        <Svg style={StyleSheet.absoluteFill} width={displaySize.width} height={displaySize.height}>
                            {/* Customer highlights = BLUE */}
                            {(request.prescription.customerHighlights || []).map((h, i) => (
                                <Rect
                                    key={`c-${i}`}
                                    x={h.x * displaySize.width}
                                    y={h.y * displaySize.height}
                                    width={h.width * displaySize.width}
                                    height={h.height * displaySize.height}
                                    fill="rgba(59, 130, 246, 0.2)"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                />
                            ))}
                            {/* Pharmacy highlights = GREEN */}
                            {pharmacyHighlights.map((h, i) => (
                                <Rect
                                    key={`p-${i}`}
                                    x={h.x * displaySize.width}
                                    y={h.y * displaySize.height}
                                    width={h.width * displaySize.width}
                                    height={h.height * displaySize.height}
                                    fill="rgba(16, 185, 129, 0.2)"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                />
                            ))}
                            {/* Current drawing */}
                            {currentRect && (
                                <Rect
                                    x={currentRect.x} y={currentRect.y}
                                    width={currentRect.width} height={currentRect.height}
                                    fill="rgba(16, 185, 129, 0.15)" stroke="#10B981"
                                    strokeWidth={2} strokeDasharray="6,3"
                                />
                            )}
                        </Svg>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                            <Text style={styles.legendText}>Customer highlighted</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Your highlights</Text>
                        </View>
                    </View>

                    {/* Highlight Controls */}
                    <View style={styles.hlControls}>
                        <TouchableOpacity
                            style={styles.hlBtn}
                            onPress={() => setPharmacyHighlights((prev) => prev.slice(0, -1))}
                            disabled={pharmacyHighlights.length === 0}
                        >
                            <Ionicons name="arrow-undo" size={16} color="#7C3AED" />
                            <Text style={styles.hlBtnText}>Undo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.hlBtn}
                            onPress={() => setPharmacyHighlights([])}
                            disabled={pharmacyHighlights.length === 0}
                        >
                            <Ionicons name="trash" size={16} color="#EF4444" />
                            <Text style={[styles.hlBtnText, { color: '#EF4444' }]}>Clear</Text>
                        </TouchableOpacity>
                        {hasResponded && (
                            <TouchableOpacity style={[styles.hlBtn, styles.hlBtnSave]} onPress={handleUpdateHighlights}>
                                <Ionicons name="cloud-upload" size={16} color="#fff" />
                                <Text style={[styles.hlBtnText, { color: '#fff' }]}>Sync</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            {!hasResponded && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleRespond('rejected')}
                        disabled={submitting}
                    >
                        <Ionicons name="close" size={20} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleRespond('accepted')}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={[styles.actionText, { color: '#fff' }]}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {hasResponded && (
                <View style={styles.respondedBanner}>
                    <Ionicons
                        name={hasResponded.status === 'accepted' ? 'checkmark-circle' : 'close-circle'}
                        size={24}
                        color={hasResponded.status === 'accepted' ? '#059669' : '#EF4444'}
                    />
                    <Text style={styles.respondedText}>
                        You {hasResponded.status} this request
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF5FF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF5FF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    infoCard: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
        backgroundColor: '#EDE9FE', borderRadius: 16, padding: 20, marginBottom: 20,
    },
    medName: { fontSize: 20, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
    medSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    allBadge: { backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    allBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    rxSection: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    helpText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
    imageContainer: {
        borderRadius: 14, overflow: 'hidden', backgroundColor: '#000',
        borderWidth: 2, borderColor: '#E5E7EB', alignSelf: 'center',
    },
    legend: { flexDirection: 'row', gap: 20, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 3 },
    legendText: { fontSize: 12, color: '#6B7280' },
    hlControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
    hlBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    },
    hlBtnSave: { backgroundColor: '#7C3AED' },
    hlBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
    actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 8 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 14, paddingVertical: 16,
    },
    rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
    acceptBtn: {
        backgroundColor: '#059669',
        shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    actionText: { fontSize: 16, fontWeight: '700' },
    respondedBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 20, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#BBF7D0', marginTop: 8,
    },
    respondedText: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
