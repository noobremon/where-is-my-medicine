// Home Screen — Medicine Search + Request Creation
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
    findNearbyPharmacies,
    createMedicineRequest,
    subscribeCustomerRequests,
} from '@wimm/firebase-config';
import { createGeoLocation } from '@wimm/shared';
import useStore from '../store/useStore';

export default function HomeScreen({ navigation }) {
    const { user, location, setLocation, searchQuery, setSearchQuery } = useStore();
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentRequests, setRecentRequests] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Get user location on mount
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Required',
                    'Please enable location services to find nearby pharmacies.'
                );
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
            });
        })();
    }, []);

    // Subscribe to user's recent requests
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeCustomerRequests(user.uid, (requests) => {
            setRecentRequests(requests.slice(0, 5));
        });
        return unsub;
    }, [user?.uid]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            Alert.alert('Error', 'Please enter a medicine name.');
            return;
        }
        if (!location) {
            Alert.alert('Error', 'Location not available. Please enable GPS.');
            return;
        }

        setIsSearching(true);
        try {
            const pharmacies = await findNearbyPharmacies(
                location,
                10, // 10 km radius
                searchQuery.trim()
            );
            setResults(pharmacies);
            if (pharmacies.length === 0) {
                Alert.alert(
                    'No Results',
                    'No nearby pharmacies have this medicine. Try sending a request to all nearby pharmacies.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Send Request', onPress: () => handleSendRequest() },
                    ]
                );
            }
        } catch (error) {
            console.error('Search error:', error);
            Alert.alert('Error', 'Failed to search. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async () => {
        if (!searchQuery.trim() || !location) return;

        try {
            const geoLoc = createGeoLocation(location.lat, location.lng);
            const requestId = await createMedicineRequest({
                customerId: user.uid,
                medicineName: searchQuery.trim().toLowerCase(),
                status: 'pending',
                customerLocation: geoLoc,
                prescription: null,
            });
            Alert.alert('Request Sent!', 'Nearby pharmacies have been notified. You will receive updates shortly.');
            navigation.navigate('RequestDetail', { requestId });
        } catch (error) {
            console.error('Request error:', error);
            Alert.alert('Error', 'Failed to send request. Please try again.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'accepted': return '#059669';
            case 'pending': return '#D97706';
            case 'expired': return '#9CA3AF';
            case 'cancelled': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const renderPharmacy = ({ item }) => (
        <TouchableOpacity style={styles.pharmacyCard}>
            <View style={styles.pharmacyInfo}>
                <View style={styles.pharmacyHeader}>
                    <Ionicons name="medical" size={20} color="#0D9488" />
                    <Text style={styles.pharmacyName}>{item.name}</Text>
                </View>
                <Text style={styles.pharmacyAddress}>{item.address}</Text>
                <Text style={styles.pharmacyPhone}>{item.phone}</Text>
            </View>
            <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{item.distanceKm} km</Text>
            </View>
        </TouchableOpacity>
    );

    const renderRequest = ({ item }) => (
        <TouchableOpacity
            style={styles.requestCard}
            onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
        >
            <View style={styles.requestInfo}>
                <Text style={styles.requestMedicine}>{item.medicineName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello! 👋</Text>
                    <Text style={styles.headerTitle}>Find Your Medicine</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={20} color="#0D9488" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for a medicine..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    {isSearching ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Ionicons name="search" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('PrescriptionUpload')}
                >
                    <Ionicons name="camera" size={24} color="#0D9488" />
                    <Text style={styles.actionText}>Upload Prescription</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonAccent]}
                    onPress={handleSendRequest}
                    disabled={!searchQuery.trim()}
                >
                    <Ionicons name="send" size={24} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>Send Request</Text>
                </TouchableOpacity>
            </View>

            {/* Results or Recent Requests */}
            {results.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Nearby Pharmacies ({results.length})
                    </Text>
                    <FlatList
                        data={results}
                        renderItem={renderPharmacy}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            ) : (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Requests</Text>
                    {recentRequests.length > 0 ? (
                        <FlatList
                            data={recentRequests}
                            renderItem={renderRequest}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="medkit-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Search for a medicine to get started</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Location indicator */}
            <View style={styles.locationBar}>
                <Ionicons
                    name={location ? 'location' : 'location-outline'}
                    size={16}
                    color={location ? '#059669' : '#EF4444'}
                />
                <Text style={styles.locationText}>
                    {location ? 'Location active' : 'Location unavailable'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 15,
        color: '#6B7280',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    searchButton: {
        backgroundColor: '#0D9488',
        borderRadius: 14,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#CCFBF1',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    actionButtonAccent: {
        backgroundColor: '#0D9488',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0D9488',
    },
    section: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    pharmacyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pharmacyInfo: {
        flex: 1,
    },
    pharmacyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    pharmacyName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    pharmacyAddress: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    pharmacyPhone: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },
    distanceBadge: {
        backgroundColor: '#CCFBF1',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    distanceText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0D9488',
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    requestInfo: {
        flex: 1,
    },
    requestMedicine: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        textTransform: 'capitalize',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#9CA3AF',
    },
    locationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    locationText: {
        fontSize: 12,
        color: '#6B7280',
    },
});
