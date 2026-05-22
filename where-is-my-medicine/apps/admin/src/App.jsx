// WIMM Admin Panel — Full application with login, dashboard, pharmacy management
import React, { useState, useEffect, useCallback } from 'react';

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { geohashForLocation } from 'geofire-common';

// ═══════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════
function useAuth() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const snap = await getDoc(doc(db, 'users', u.uid));
                setProfile(snap.exists() ? snap.data() : null);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    return { user, profile, loading };
}

// ═══════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════
function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>🏥 Admin Panel</h1>
                <p className="subtitle">Where Is My Medicine — Management Console</p>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="admin@wimm.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════
function Sidebar({ onNavigate, activePage }) {
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <h1>🏥 <span>WIMM</span></h1>
                <p>Admin Panel</p>
            </div>
            <button className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
                📊 Dashboard
            </button>
            <button className={`nav-item ${activePage === 'pharmacies' ? 'active' : ''}`} onClick={() => onNavigate('pharmacies')}>
                🏪 Pharmacies
            </button>
            <button className={`nav-item ${activePage === 'requests' ? 'active' : ''}`} onClick={() => onNavigate('requests')}>
                💊 Requests
            </button>
            <button className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
                ⚙️ Settings
            </button>
            <div style={{ flex: 1 }} />
            <button className="nav-item" onClick={() => signOut(auth)} style={{ color: 'var(--danger)' }}>
                🚪 Sign Out
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════
function DashboardPage({ pharmacies, requests }) {
    const activePharmacies = pharmacies.filter((p) => p.isActive).length;
    const pendingRequests = requests.filter((r) => r.status === 'pending').length;
    const acceptedRequests = requests.filter((r) => r.status === 'accepted').length;

    return (
        <div>
            <div className="page-header">
                <h2>Dashboard</h2>
            </div>

            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-label">Total Pharmacies</div>
                    <div className="stat-value">{pharmacies.length}</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-label">Active Pharmacies</div>
                    <div className="stat-value">{activePharmacies}</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-label">Pending Requests</div>
                    <div className="stat-value">{pendingRequests}</div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-label">Fulfilled Requests</div>
                    <div className="stat-value">{acceptedRequests}</div>
                </div>
            </div>

            <div className="table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Recent Requests</th>
                            <th>Medicine</th>
                            <th>Status</th>
                            <th>Responses</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.slice(0, 10).map((r) => (
                            <tr key={r.id}>
                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.id?.slice(0, 8)}...</td>
                                <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.medicineName}</td>
                                <td>
                                    <span className={`badge badge-${r.status === 'accepted' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td>{Object.keys(r.responses || {}).length}</td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No requests yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// PHARMACIES PAGE (CRUD + Onboarding)
// ═══════════════════════════════════════════════════════
function PharmaciesPage({ pharmacies, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        name: '', ownerName: '', email: '', phone: '', address: '', lat: '', lng: '',
        password: '',
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({ name: '', ownerName: '', email: '', phone: '', address: '', lat: '', lng: '', password: '' });
        setShowModal(true);
    };

    const openEdit = (pharmacy) => {
        setEditingId(pharmacy.id);
        setForm({
            name: pharmacy.name, ownerName: pharmacy.ownerName,
            email: pharmacy.email, phone: pharmacy.phone, address: pharmacy.address,
            lat: String(pharmacy.location?.lat || ''), lng: String(pharmacy.location?.lng || ''),
            password: '',
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const lat = parseFloat(form.lat);
            const lng = parseFloat(form.lng);
            const geohash = geohashForLocation([lat, lng], 6);

            if (editingId) {
                // Updating existing pharmacy
                await updateDoc(doc(db, 'pharmacies', editingId), {
                    name: form.name, ownerName: form.ownerName,
                    phone: form.phone, address: form.address,
                    location: { lat, lng, geohash },
                });
                showToast('Pharmacy updated successfully!');
            } else {
                // Creating new pharmacy securely using Cloud Function
                const onboardPharmacyFn = httpsCallable(functions, 'onboardPharmacy');
                await onboardPharmacyFn({
                    email: form.email,
                    password: form.password,
                    name: form.name,
                    ownerName: form.ownerName,
                    phone: form.phone,
                    address: form.address,
                    location: { lat, lng, geohash },
                });

                showToast('Pharmacy onboarded successfully!');
            }

            setShowModal(false);
            onRefresh();
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (pharmacy) => {
        await updateDoc(doc(db, 'pharmacies', pharmacy.id), {
            isActive: !pharmacy.isActive,
        });
        onRefresh();
        showToast(`${pharmacy.name} ${pharmacy.isActive ? 'deactivated' : 'activated'}.`);
    };

    const toggleSubscription = async (pharmacy) => {
        const newStatus = !pharmacy.subscription?.isActive;
        await updateDoc(doc(db, 'pharmacies', pharmacy.id), {
            'subscription.isActive': newStatus,
        });
        onRefresh();
        showToast(`Subscription ${newStatus ? 'activated' : 'deactivated'} for ${pharmacy.name}.`);
    };

    return (
        <div>
            <div className="page-header">
                <h2>Pharmacies</h2>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Onboard Pharmacy
                </button>
            </div>

            <div className="table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Pharmacy</th>
                            <th>Owner</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Subscription</th>
                            <th>Medicines</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pharmacies.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.address}</div>
                                </td>
                                <td>{p.ownerName}</td>
                                <td>{p.phone}</td>
                                <td>
                                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                                        {p.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${p.subscription?.isActive ? 'badge-primary' : 'badge-danger'}`}>
                                        {p.subscription?.plan || 'free'} — {p.subscription?.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{p.medicines?.length || 0}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                        <button
                                            className={`btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => toggleActive(p)}
                                        >
                                            {p.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => toggleSubscription(p)}
                                        >
                                            {p.subscription?.isActive ? 'Unsub' : 'Sub'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {pharmacies.length === 0 && (
                            <tr>
                                <td colSpan={7}>
                                    <div className="empty-state">
                                        <div className="emoji">🏪</div>
                                        <p>No pharmacies onboarded yet. Click "Onboard Pharmacy" to add one.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Onboard / Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>{editingId ? 'Edit Pharmacy' : 'Onboard New Pharmacy'}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Pharmacy Name</label>
                                <input className="form-input" placeholder="MedPlus Pharmacy" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Owner Name</label>
                                    <input className="form-input" placeholder="John Doe" value={form.ownerName}
                                        onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input className="form-input" placeholder="+91 98765 43210" value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                                </div>
                            </div>
                            {!editingId && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input className="form-input" type="email" placeholder="pharmacy@email.com" value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <input className="form-input" type="password" placeholder="Min 6 chars" value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Address</label>
                                <input className="form-input" placeholder="123 Main St, City" value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Latitude</label>
                                    <input className="form-input" type="number" step="any" placeholder="28.6139" value={form.lat}
                                        onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Longitude</label>
                                    <input className="form-input" type="number" step="any" placeholder="77.2090" value={form.lng}
                                        onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : editingId ? 'Update' : 'Onboard'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// REQUESTS PAGE
// ═══════════════════════════════════════════════════════
function RequestsPage({ requests }) {
    return (
        <div>
            <div className="page-header">
                <h2>Medicine Requests</h2>
                <span className="badge badge-primary">{requests.length} total</span>
            </div>

            <div className="table-card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Medicine</th>
                            <th>Status</th>
                            <th>Notified</th>
                            <th>Responses</th>
                            <th>Prescription</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((r) => (
                            <tr key={r.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                                    {r.id?.slice(0, 10)}
                                </td>
                                <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.medicineName}</td>
                                <td>
                                    <span className={`badge badge-${r.status === 'accepted' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td>{r.notifiedPharmacies?.length || 0}</td>
                                <td>
                                    {Object.entries(r.responses || {}).map(([id, resp]) => (
                                        <span key={id} className={`badge ${resp.status === 'accepted' ? 'badge-success' : 'badge-danger'}`}
                                            style={{ marginRight: 4 }}>
                                            {resp.status === 'accepted' ? '✓' : '✗'}
                                        </span>
                                    ))}
                                    {Object.keys(r.responses || {}).length === 0 && '—'}
                                </td>
                                <td>{r.prescription?.imageUrl ? '📄 Yes' : '—'}</td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No requests yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════
function SettingsPage() {
    const [config, setConfig] = useState({ maxRequestRadiusKm: 10, requestTTLMinutes: 30 });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        (async () => {
            const snap = await getDoc(doc(db, 'adminConfig', 'settings'));
            if (snap.exists()) setConfig(snap.data());
        })();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'adminConfig', 'settings'), config, { merge: true });
            setToast({ msg: 'Settings saved!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            setToast({ msg: 'Failed to save.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Settings</h2>
            </div>

            <div className="table-card" style={{ padding: 32 }}>
                <h3 style={{ marginBottom: 20, fontSize: 16 }}>Platform Configuration</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label>Search Radius (km)</label>
                        <input className="form-input" type="number" value={config.maxRequestRadiusKm}
                            onChange={(e) => setConfig({ ...config, maxRequestRadiusKm: parseInt(e.target.value) || 10 })} />
                    </div>
                    <div className="form-group">
                        <label>Request TTL (minutes)</label>
                        <input className="form-input" type="number" value={config.requestTTLMinutes}
                            onChange={(e) => setConfig({ ...config, requestTTLMinutes: parseInt(e.target.value) || 30 })} />
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
    const { user, profile, loading } = useAuth();
    const [page, setPage] = useState('dashboard');
    const [pharmacies, setPharmacies] = useState([]);
    const [requests, setRequests] = useState([]);

    const loadData = useCallback(async () => {
        const pSnap = await getDocs(collection(db, 'pharmacies'));
        setPharmacies(pSnap.docs.map((d) => ({ ...d.data(), id: d.id })));

        const rSnap = await getDocs(query(collection(db, 'medicineRequests'), orderBy('createdAt', 'desc')));
        setRequests(rSnap.docs.map((d) => ({ ...d.data(), id: d.id })));
    }, []);

    useEffect(() => {
        if (user && profile?.role === 'admin') {
            loadData();
        }
    }, [user, profile, loadData]);

    if (loading) {
        return (
            <div className="login-page">
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            </div>
        );
    }

    if (!user || profile?.role !== 'admin') {
        return <LoginPage />;
    }

    const renderPage = () => {
        switch (page) {
            case 'dashboard': return <DashboardPage pharmacies={pharmacies} requests={requests} />;
            case 'pharmacies': return <PharmaciesPage pharmacies={pharmacies} onRefresh={loadData} />;
            case 'requests': return <RequestsPage requests={requests} />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardPage pharmacies={pharmacies} requests={requests} />;
        }
    };

    return (
        <div className="app-layout">
            <Sidebar onNavigate={setPage} activePage={page} />
            <div className="main-content">{renderPage()}</div>
        </div>
    );
}
