// Medicine Inventory Management Screen
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePharmacy, getPharmacy } from '@wimm/firebase-config';
import usePharmacyStore from '../store/usePharmacyStore';

export default function MedicinesScreen({ navigation }) {
    const { user, pharmacyData, setPharmacyData } = usePharmacyStore();
    const [medicines, setMedicines] = useState([]);
    const [newMedicine, setNewMedicine] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (pharmacyData?.medicines) {
            setMedicines([...pharmacyData.medicines]);
        }
    }, [pharmacyData]);

    const addMedicine = () => {
        const name = newMedicine.trim().toLowerCase();
        if (!name) return;
        if (medicines.includes(name)) {
            Alert.alert('Duplicate', 'This medicine is already in your list.');
            return;
        }
        setMedicines((prev) => [...prev, name].sort());
        setNewMedicine('');
    };

    const removeMedicine = (name) => {
        setMedicines((prev) => prev.filter((m) => m !== name));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            await updatePharmacy(user.uid, { medicines });
            const updated = await getPharmacy(user.uid);
            setPharmacyData(updated);
            Alert.alert('Saved', 'Your medicine list has been updated.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const renderMedicine = ({ item }) => (
        <View style={styles.medItem}>
            <View style={styles.medLeft}>
                <Ionicons name="medical" size={16} color="#7C3AED" />
                <Text style={styles.medName}>{item}</Text>
            </View>
            <TouchableOpacity onPress={() => removeMedicine(item)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medicine Inventory</Text>
                <TouchableOpacity onPress={saveChanges} disabled={saving}>
                    <Text style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                        {saving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.addRow}>
                <View style={styles.addInput}>
                    <Ionicons name="add" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.input}
                        placeholder="Add medicine name..."
                        placeholderTextColor="#9CA3AF"
                        value={newMedicine}
                        onChangeText={setNewMedicine}
                        onSubmitEditing={addMedicine}
                        returnKeyType="done"
                    />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={addMedicine}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <Text style={styles.count}>{medicines.length} medicine(s) in inventory</Text>

            <FlatList
                data={medicines}
                renderItem={renderMedicine}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF5FF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    saveBtn: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
    addRow: {
        flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12,
    },
    addInput: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFFFF', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    input: { flex: 1, fontSize: 15, color: '#111827' },
    addBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#7C3AED',
        alignItems: 'center', justifyContent: 'center',
    },
    count: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 12 },
    medItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB',
    },
    medLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    medName: { fontSize: 15, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
});
