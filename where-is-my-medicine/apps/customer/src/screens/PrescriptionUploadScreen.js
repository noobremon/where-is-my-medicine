// Prescription Upload + Highlight Drawing Screen
// User can capture/pick an image and draw rectangles to highlight specific medicines
import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Dimensions,
    PanResponder,
    TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
    uploadPrescriptionImage,
    createMedicineRequest,
    updatePrescription,
} from '@wimm/firebase-config';
import { createGeoLocation } from '@wimm/shared';
import useStore from '../store/useStore';
import Svg, { Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_AREA_WIDTH = SCREEN_WIDTH - 40;

export default function PrescriptionUploadScreen({ navigation }) {
    const { user, location } = useStore();
    const [imageUri, setImageUri] = useState(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
    const [highlights, setHighlights] = useState([]);
    const [currentRect, setCurrentRect] = useState(null);
    const [selectAll, setSelectAll] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [medicineName, setMedicineName] = useState('');

    // Use refs to avoid stale closures in PanResponder
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentRectRef = useRef(null);
    const displaySizeRef = useRef({ width: 0, height: 0 });
    const selectAllRef = useRef(false);

    // Keep refs in sync with state
    const updateDisplaySize = (size) => {
        setDisplaySize(size);
        displaySizeRef.current = size;
    };

    const updateSelectAll = (val) => {
        setSelectAll(val);
        selectAllRef.current = val;
    };

    // ─── PanResponder for drawing rectangles ───────────
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !selectAllRef.current,
                onMoveShouldSetPanResponder: () => !selectAllRef.current,
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
                        // Normalize to 0-1 range
                        const normalized = {
                            x: rect.x / ds.width,
                            y: rect.y / ds.height,
                            width: rect.width / ds.width,
                            height: rect.height / ds.height,
                        };
                        setHighlights((prev) => [...prev, normalized]);
                    }
                    currentRectRef.current = null;
                    setCurrentRect(null);
                },
            }),
        []
    );

    // ─── Image Picker ──────────────────────────────────
    const pickImage = async (useCamera) => {
        // Request appropriate permissions
        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera access is needed to take prescription photos.');
                return;
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Gallery access is needed to select prescription images.');
                return;
            }
        }

        const method = useCamera
            ? ImagePicker.launchCameraAsync
            : ImagePicker.launchImageLibraryAsync;

        const result = await method({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageSize({ width: asset.width, height: asset.height });

            // Calculate display size maintaining aspect ratio
            const aspectRatio = asset.height / asset.width;
            const displayHeight = IMAGE_AREA_WIDTH * aspectRatio;
            updateDisplaySize({ width: IMAGE_AREA_WIDTH, height: Math.min(displayHeight, 400) });
            setHighlights([]);
        }
    };

    // ─── Remove last highlight ─────────────────────────
    const undoLastHighlight = () => {
        setHighlights((prev) => prev.slice(0, -1));
    };

    // ─── Submit prescription with request ──────────────
    const handleSubmit = async () => {
        if (!imageUri) {
            Alert.alert('Error', 'Please upload a prescription image first.');
            return;
        }
        if (!location) {
            Alert.alert('Error', 'Location not available.');
            return;
        }

        setUploading(true);
        try {
            // 1. Create the medicine request
            const geoLoc = createGeoLocation(location.lat, location.lng);
            const requestId = await createMedicineRequest({
                customerId: user.uid,
                medicineName: medicineName || 'prescription-medicines',
                status: 'pending',
                customerLocation: geoLoc,
                prescription: null,
            });

            // 2. Upload image to Firebase Storage
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const imageUrl = await uploadPrescriptionImage(requestId, blob);

            // 3. Update request with prescription data
            await updatePrescription(requestId, {
                imageUrl,
                selectAll: selectAll || highlights.length === 0,
                customerHighlights: highlights,
            });

            Alert.alert(
                'Prescription Sent!',
                'Nearby pharmacies have been notified with your prescription.',
                [{ text: 'View Request', onPress: () => navigation.replace('RequestDetail', { requestId }) }]
            );
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload prescription. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upload Prescription</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Medicine Name Input */}
            <View style={styles.nameInputRow}>
                <Ionicons name="medkit-outline" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.nameInput}
                    placeholder="Medicine name (optional)"
                    placeholderTextColor="#9CA3AF"
                    value={medicineName}
                    onChangeText={setMedicineName}
                />
            </View>

            {/* Image Area */}
            {imageUri ? (
                <View style={styles.imageSection}>
                    <View
                        style={[styles.imageContainer, { width: displaySize.width, height: displaySize.height }]}
                        {...panResponder.panHandlers}
                    >
                        <Image
                            source={{ uri: imageUri }}
                            style={{ width: displaySize.width, height: displaySize.height }}
                            resizeMode="contain"
                        />
                        {/* SVG overlay for highlights */}
                        <Svg
                            style={StyleSheet.absoluteFill}
                            width={displaySize.width}
                            height={displaySize.height}
                        >
                            {/* Existing highlights (blue) */}
                            {highlights.map((h, i) => (
                                <Rect
                                    key={i}
                                    x={h.x * displaySize.width}
                                    y={h.y * displaySize.height}
                                    width={h.width * displaySize.width}
                                    height={h.height * displaySize.height}
                                    fill="rgba(59, 130, 246, 0.2)"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                />
                            ))}
                            {/* Current drawing rectangle */}
                            {currentRect && (
                                <Rect
                                    x={currentRect.x}
                                    y={currentRect.y}
                                    width={currentRect.width}
                                    height={currentRect.height}
                                    fill="rgba(59, 130, 246, 0.15)"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    strokeDasharray="6,3"
                                />
                            )}
                        </Svg>
                    </View>

                    {/* Highlight Controls */}
                    <View style={styles.controlsRow}>
                        <TouchableOpacity
                            style={[styles.controlBtn, selectAll && styles.controlBtnActive]}
                            onPress={() => {
                                updateSelectAll(!selectAll);
                                if (!selectAll) setHighlights([]);
                            }}
                        >
                            <Ionicons name="checkbox" size={18} color={selectAll ? '#fff' : '#0D9488'} />
                            <Text style={[styles.controlText, selectAll && { color: '#fff' }]}>
                                Need All
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlBtn}
                            onPress={undoLastHighlight}
                            disabled={highlights.length === 0}
                        >
                            <Ionicons name="arrow-undo" size={18} color="#0D9488" />
                            <Text style={styles.controlText}>Undo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlBtn}
                            onPress={() => setHighlights([])}
                            disabled={highlights.length === 0}
                        >
                            <Ionicons name="trash" size={18} color="#EF4444" />
                            <Text style={[styles.controlText, { color: '#EF4444' }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.helpText}>
                        {selectAll
                            ? 'All medicines in the prescription will be requested.'
                            : highlights.length > 0
                                ? `${highlights.length} medicine(s) highlighted. Draw more or submit.`
                                : 'Draw rectangles over medicines you need, or tap "Need All".'}
                    </Text>
                </View>
            ) : (
                /* Image Picker Buttons */
                <View style={styles.pickerSection}>
                    <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.pickerTitle}>Upload Prescription</Text>
                    <Text style={styles.pickerSubtitle}>
                        Take a photo or choose from gallery
                    </Text>
                    <View style={styles.pickerButtons}>
                        <TouchableOpacity
                            style={styles.pickerBtn}
                            onPress={() => pickImage(true)}
                        >
                            <Ionicons name="camera" size={28} color="#0D9488" />
                            <Text style={styles.pickerBtnText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.pickerBtn}
                            onPress={() => pickImage(false)}
                        >
                            <Ionicons name="images" size={28} color="#0D9488" />
                            <Text style={styles.pickerBtnText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Submit Button */}
            {imageUri && (
                <TouchableOpacity
                    style={[styles.submitButton, uploading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#fff" />
                            <Text style={styles.submitText}>Send to Pharmacies</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
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
    nameInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFFFFF',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    nameInput: { flex: 1, fontSize: 15, color: '#111827' },
    imageSection: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
    imageContainer: {
        borderRadius: 14, overflow: 'hidden', backgroundColor: '#000',
        borderWidth: 2, borderColor: '#E5E7EB',
    },
    controlsRow: {
        flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8,
    },
    controlBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#CCFBF1', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    controlBtnActive: { backgroundColor: '#0D9488' },
    controlText: { fontSize: 13, fontWeight: '600', color: '#0D9488' },
    helpText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    pickerSection: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
    },
    pickerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
    pickerSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    pickerButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
    pickerBtn: {
        alignItems: 'center', gap: 8, backgroundColor: '#CCFBF1',
        borderRadius: 16, padding: 24, width: 120,
    },
    pickerBtnText: { fontSize: 14, fontWeight: '600', color: '#0D9488' },
    submitButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#0D9488', marginHorizontal: 20, marginBottom: 40,
        borderRadius: 14, paddingVertical: 16,
        shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        // Web compatibility
        boxShadow: '0px 4px 8px rgba(13, 148, 136, 0.3)',
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
