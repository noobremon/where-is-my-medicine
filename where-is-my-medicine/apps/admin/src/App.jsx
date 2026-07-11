// ─────────────────────────────────────────────────────────────
// WIMM Unified Portal — Admin / Customer / Pharmacy in one app
// Single login → role-based dashboard routing
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import {
    collection, getDocs, doc, getDoc, setDoc,
    updateDoc, deleteDoc, onSnapshot, serverTimestamp,
    query, where, orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { geohashForLocation } from 'geofire-common';

// ═══════════════════════════════════════════
// AUTH HOOK
// ═══════════════════════════════════════════
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

    return { user, profile, loading, setProfile };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function timeAgo(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
}

function statusBadge(status) {
    const map = {
        pending:   'warning',
        accepted:  'success',
        cancelled: 'danger',
        expired:   'muted',
    };
    return <span className={`badge badge-${map[status] || 'muted'}`}>{status}</span>;
}

// ═══════════════════════════════════════════
// LOGIN PAGE (shared for all roles)
// ═══════════════════════════════════════════
function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'register'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'register') {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', cred.user.uid), {
                    uid: cred.user.uid,
                    email: cred.user.email,
                    role: 'customer',
                    createdAt: serverTimestamp(),
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            const msgs = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Incorrect password.',
                'auth/email-already-in-use': 'Email already registered.',
                'auth/invalid-email': 'Invalid email address.',
                'auth/weak-password': 'Password must be at least 6 characters.',
                'auth/invalid-credential': 'Invalid email or password.',
            };
            setError(msgs[err.code] || 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root">
            <div className="login-card">
                <div className="login-logo">💊</div>
                <h1 className="login-title">Where Is My Medicine</h1>
                <p className="login-subtitle">Unified portal for patients, pharmacies & administrators</p>
                <div className="role-badges">
                    <span className="role-badge admin">🔑 Admin</span>
                    <span className="role-badge customer">👤 Customer</span>
                    <span className="role-badge pharmacy">🏥 Pharmacy</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        />
                    </div>
                    {error && <div className="error-msg">⚠️ {error}</div>}
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                        style={{ marginBottom: 14 }}
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--admin)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                        {mode === 'login' ? 'Register' : 'Sign In'}
                    </button>
                </p>

                <div className="notice-bar" style={{ marginTop: 24, marginBottom: 0 }}>
                    ℹ️ New accounts are Customer by default. Contact an admin for pharmacy or admin access.
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// ACCESS PENDING PAGE
// ═══════════════════════════════════════════
function AccessPendingPage({ profile, onSignOut }) {
    const role = profile?.role;
    return (
        <div className="access-pending">
            <div className="icon">{role ? '⏳' : '🔒'}</div>
            <h2>{role ? 'Setting Up Your Account' : 'Access Pending'}</h2>
            <p>
                {role === 'pharmacy'
                    ? 'Your pharmacy account is being set up. If this persists, contact an administrator.'
                    : 'Your account has been created. An administrator will grant you the appropriate role.'}
            </p>
            <button className="btn btn-ghost" onClick={onSignOut}>Sign Out</button>
        </div>
    );
}

// ═══════════════════════════════════════════
// ──────────────────────────────────────────
// ADMIN DASHBOARD
// ──────────────────────────────────────────
// ═══════════════════════════════════════════

function AdminSidebar({ page, setPage, profile, onSignOut }) {
    const navItems = [
        { id: 'dashboard',  icon: '📊', label: 'Dashboard' },
        { id: 'users',      icon: '👥', label: 'Users & Roles' },
        { id: 'pharmacies', icon: '🏥', label: 'Pharmacies' },
        { id: 'requests',   icon: '💊', label: 'All Requests' },
    ];
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <h1>💊 WIMM</h1>
                <span className="role-tag" style={{ background: 'var(--admin-light)', color: 'var(--admin)' }}>Admin Portal</span>
            </div>
            <div className="sidebar-user">
                <div className="sidebar-user-name">{profile?.displayName || 'Administrator'}</div>
                <div className="sidebar-user-email">{profile?.email || auth.currentUser?.email}</div>
            </div>
            <div className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item${page === item.id ? ' active admin' : ''}`}
                        onClick={() => setPage(item.id)}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
            <div className="sidebar-footer">
                <button className="nav-item" onClick={onSignOut} style={{ color: 'var(--danger)', width: '100%' }}>
                    <span>🚪</span><span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}

// Admin: Users & Roles Management
function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchQ, setSearchQ] = useState('');

    const loadUsers = useCallback(async () => {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleSetRole = async () => {
        if (!editingUser || !newRole) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', editingUser.id), { role: newRole });
            setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, role: newRole } : u));
            setEditingUser(null);
        } catch (e) {
            alert('Failed to update role: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const roleBadgeClass = (r) => ({ admin: 'admin', pharmacy: 'pharmacy', customer: 'customer' }[r] || 'muted');

    const filtered = users.filter((u) =>
        !searchQ || u.email?.toLowerCase().includes(searchQ.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Users & Roles</h2>
                    <p className="page-subheader">Grant or revoke roles for all users</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={loadUsers}>↻ Refresh</button>
            </div>

            <div className="search-bar">
                <span>🔍</span>
                <input
                    placeholder="Search by email..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                />
            </div>

            <div className="table-card">
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.email}</td>
                                    <td>
                                        <span className={`badge badge-${roleBadgeClass(u.role)}`}>
                                            {u.role || 'no role'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {timeAgo(u.createdAt)}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => { setEditingUser(u); setNewRole(u.role || 'customer'); }}
                                        >
                                            ✏️ Edit Role
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Change Role</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                            User: <strong style={{ color: 'var(--text)' }}>{editingUser.email}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">New Role</label>
                            <select
                                className="form-input"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                style={{ appearance: 'auto' }}
                            >
                                <option value="customer">👤 Customer</option>
                                <option value="pharmacy">🏥 Pharmacy</option>
                                <option value="admin">🔑 Admin</option>
                            </select>
                        </div>
                        {newRole === 'pharmacy' && (
                            <div className="notice-bar">
                                ⚠️ After setting pharmacy role, you must also create a pharmacy profile in the Pharmacies tab.
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setEditingUser(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSetRole} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Admin: Pharmacies Management
function PharmaciesPage({ onRefresh }) {
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', address: '', phone: '', lat: '', lng: '', ownerId: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const snap = await getDocs(collection(db, 'pharmacies'));
        setPharmacies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const uid = form.ownerId.trim() || doc(collection(db, 'pharmacies')).id;
            const gh = geohashForLocation([parseFloat(form.lat), parseFloat(form.lng)]);
            await setDoc(doc(db, 'pharmacies', uid), {
                id: uid,
                name: form.name,
                address: form.address,
                phone: form.phone,
                location: { lat: parseFloat(form.lat), lng: parseFloat(form.lng), geohash: gh },
                medicines: [],
                isActive: true,
                createdAt: serverTimestamp(),
            });
            setShowForm(false);
            setForm({ name: '', address: '', phone: '', lat: '', lng: '', ownerId: '' });
            await load();
            onRefresh?.();
        } catch (e) {
            alert('Error creating pharmacy: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p) => {
        await updateDoc(doc(db, 'pharmacies', p.id), { isActive: !p.isActive });
        setPharmacies((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
    };

    const deletePharmacy = async (id) => {
        if (!window.confirm('Delete this pharmacy?')) return;
        await deleteDoc(doc(db, 'pharmacies', id));
        setPharmacies((prev) => prev.filter((x) => x.id !== id));
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Pharmacies</h2>
                    <p className="page-subheader">Onboard and manage pharmacy partners</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Pharmacy</button>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>🏥 Add New Pharmacy</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Pharmacy Name</label>
                                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="City Pharmacy" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="123 Main Street" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 99999 00000" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Latitude</label>
                                    <input className="form-input" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required placeholder="12.9716" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Longitude</label>
                                    <input className="form-input" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required placeholder="77.5946" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pharmacy Owner UID (optional)</label>
                                <input className="form-input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} placeholder="Firebase Auth UID of pharmacy user" />
                            </div>
                            <div className="notice-bar">ℹ️ To link a user: first set their role to 'pharmacy' in the Users tab, then enter their UID here.</div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Pharmacy'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-card">
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : pharmacies.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏥</div>
                        <p>No pharmacies yet</p>
                        <small>Click "Add Pharmacy" to onboard one</small>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Address</th>
                                <th>Medicines</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pharmacies.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.address}</td>
                                    <td>{p.medicines?.length ?? 0}</td>
                                    <td>
                                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {p.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)}>
                                            {p.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => deletePharmacy(p.id)}>🗑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// Admin: All Requests
function AdminRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'medicineRequests'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>All Requests</h2>
                    <p className="page-subheader">Live view of all medicine requests</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 13, padding: '6px 14px' }}>
                    🔴 Live
                </span>
            </div>
            <div className="table-card">
                {loading ? (
                    <div className="empty-state"><div className="spinner" /></div>
                ) : requests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💊</div>
                        <p>No requests yet</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Status</th>
                                <th>Customer</th>
                                <th>Responses</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.slice(0, 50).map((r) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.medicineName}</td>
                                    <td>{statusBadge(r.status)}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.customerId?.slice(0, 8)}…</td>
                                    <td>{Object.keys(r.responses || {}).length} pharmacies</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{timeAgo(r.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// Admin: Dashboard Overview
function AdminDashboardPage() {
    const [stats, setStats] = useState({ users: 0, pharmacies: 0, pending: 0, accepted: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'pharmacies')),
            getDocs(query(collection(db, 'medicineRequests'), where('status', '==', 'pending'))),
            getDocs(query(collection(db, 'medicineRequests'), where('status', '==', 'accepted'))),
        ]).then(([u, p, pending, accepted]) => {
            setStats({ users: u.size, pharmacies: p.size, pending: pending.size, accepted: accepted.size });
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="empty-state"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Dashboard</h2>
                    <p className="page-subheader">System overview</p>
                </div>
            </div>
            <div className="stats-grid">
                <div className="stat-card admin">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{stats.users}</div>
                </div>
                <div className="stat-card pharmacy">
                    <div className="stat-label">Pharmacies</div>
                    <div className="stat-value">{stats.pharmacies}</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-label">Pending Requests</div>
                    <div className="stat-value">{stats.pending}</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-label">Fulfilled Requests</div>
                    <div className="stat-value">{stats.accepted}</div>
                </div>
            </div>

            <div className="form-card">
                <h3>Quick Guide</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                    {[
                        { icon: '1️⃣', text: 'Go to Users & Roles → find a user → click Edit Role → set to "pharmacy" or "admin"' },
                        { icon: '2️⃣', text: 'Go to Pharmacies → Add Pharmacy → fill in details and paste the pharmacy user\'s UID' },
                        { icon: '3️⃣', text: 'The pharmacy user can now log in here and see their own dashboard' },
                        { icon: '4️⃣', text: 'Customers can register themselves, search medicines, and send requests' },
                    ].map((step, i) => (
                        <div key={i} className="notice-bar" style={{ marginBottom: 0 }}>
                            {step.icon} {step.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Main Admin App
function AdminApp({ profile, onSignOut }) {
    const [page, setPage] = useState('dashboard');

    const renderPage = () => {
        switch (page) {
            case 'dashboard':  return <AdminDashboardPage />;
            case 'users':      return <UsersPage />;
            case 'pharmacies': return <PharmaciesPage />;
            case 'requests':   return <AdminRequestsPage />;
            default:           return <AdminDashboardPage />;
        }
    };

    return (
        <div className="app-layout">
            <AdminSidebar page={page} setPage={setPage} profile={profile} onSignOut={onSignOut} />
            <div className="main-content">{renderPage()}</div>
        </div>
    );
}

// ═══════════════════════════════════════════
// ──────────────────────────────────────────
// CUSTOMER DASHBOARD
// ──────────────────────────────────────────
// ═══════════════════════════════════════════

function CustomerSidebar({ page, setPage, profile, onSignOut }) {
    const navItems = [
        { id: 'search',   icon: '🔍', label: 'Find Medicine' },
        { id: 'requests', icon: '📋', label: 'My Requests' },
        { id: 'profile',  icon: '👤', label: 'Profile' },
    ];
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <h1>💊 WIMM</h1>
                <span className="role-tag" style={{ background: 'var(--customer-light)', color: 'var(--customer)' }}>Customer</span>
            </div>
            <div className="sidebar-user">
                <div className="sidebar-user-name">{profile?.displayName || 'Customer'}</div>
                <div className="sidebar-user-email">{profile?.email || auth.currentUser?.email}</div>
            </div>
            <div className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item${page === item.id ? ' active customer' : ''}`}
                        onClick={() => setPage(item.id)}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
            <div className="sidebar-footer">
                <button className="nav-item" onClick={onSignOut} style={{ color: 'var(--danger)', width: '100%' }}>
                    <span>🚪</span><span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}

function CustomerSearchPage({ user }) {
    const [query2, setQuery2] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query2.trim()) return;
        setLoading(true);
        setResults([]);
        setMsg('');
        try {
            const snap = await getDocs(collection(db, 'pharmacies'));
            const all = snap.docs.map((d) => d.data());
            const filtered = all.filter(
                (p) => p.isActive && p.medicines?.some((m) => m.includes(query2.toLowerCase()))
            );
            setResults(filtered);
            if (filtered.length === 0) setMsg('No pharmacies nearby have this medicine. You can send a request to all pharmacies.');
        } catch (err) {
            setMsg('Error searching. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async () => {
        setSending(true);
        try {
            const allSnap = await getDocs(query(collection(db, 'pharmacies'), where('isActive', '==', true)));
            const allIds = allSnap.docs.map((d) => d.id);
            const ref = doc(collection(db, 'medicineRequests'));
            await setDoc(ref, {
                id: ref.id,
                customerId: user.uid,
                medicineName: query2.trim().toLowerCase(),
                status: 'pending',
                notifiedPharmacies: allIds,
                responses: {},
                acceptedPharmacyId: null,
                prescription: null,
                customerLocation: { lat: 0, lng: 0, geohash: '' },
                createdAt: serverTimestamp(),
                expiresAt: null,
            });
            setMsg('✅ Request sent! Nearby pharmacies have been notified.');
        } catch (err) {
            setMsg('Failed to send request: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Find Medicine</h2>
                    <p className="page-subheader">Search pharmacies or send a request</p>
                </div>
            </div>

            <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
                <div className="search-bar" style={{ marginBottom: 12 }}>
                    <span>💊</span>
                    <input
                        placeholder="Search for a medicine (e.g. paracetamol)..."
                        value={query2}
                        onChange={(e) => { setQuery2(e.target.value); setMsg(''); setResults([]); }}
                        style={{ color: 'var(--text)' }}
                    />
                    <button type="submit" className="btn btn-customer btn-sm" disabled={loading || !query2.trim()}>
                        {loading ? '...' : 'Search'}
                    </button>
                </div>
            </form>

            {msg && (
                <div className="notice-bar" style={{ marginBottom: 16 }}>
                    {msg}
                    {results.length === 0 && query2 && (
                        <button
                            className="btn btn-customer btn-sm"
                            style={{ marginLeft: 'auto' }}
                            onClick={handleSendRequest}
                            disabled={sending}
                        >
                            {sending ? 'Sending...' : '📤 Send Request'}
                        </button>
                    )}
                </div>
            )}

            {results.length > 0 && (
                <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        {results.length} pharmacy(s) have this medicine:
                    </p>
                    {results.map((p) => (
                        <div key={p.id} className="list-card" style={{ cursor: 'default' }}>
                            <div className="list-card-icon" style={{ background: 'var(--customer-light)' }}>🏥</div>
                            <div className="list-card-body">
                                <div className="list-card-title">{p.name}</div>
                                <div className="list-card-sub">{p.address} · {p.phone}</div>
                            </div>
                            <span className="badge badge-success">Available</span>
                        </div>
                    ))}
                </>
            )}

            {!loading && !msg && results.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <p>Search for a medicine above</p>
                    <small>We'll find nearby pharmacies that have it in stock</small>
                </div>
            )}
        </div>
    );
}

function CustomerRequestsPage({ user }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'medicineRequests'), where('customerId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return bt - at;
            });
            setRequests(list);
            setLoading(false);
        });
        return unsub;
    }, [user.uid]);

    const cancelRequest = async (id) => {
        await updateDoc(doc(db, 'medicineRequests', id), { status: 'cancelled' });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>My Requests</h2>
                    <p className="page-subheader">Track your medicine requests in real-time</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 13, padding: '6px 14px' }}>🔴 Live</span>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner" /></div>
            ) : requests.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No requests yet</p>
                    <small>Use "Find Medicine" to send your first request</small>
                </div>
            ) : (
                requests.map((r) => {
                    const responseCount = Object.keys(r.responses || {}).length;
                    return (
                        <div key={r.id} className="list-card" onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                            <div className="list-card-icon" style={{ background: 'var(--customer-light)' }}>💊</div>
                            <div className="list-card-body">
                                <div className="list-card-title" style={{ textTransform: 'capitalize' }}>{r.medicineName}</div>
                                <div className="list-card-sub">
                                    {responseCount > 0 ? `${responseCount} pharmacy response(s)` : 'Waiting for responses'} · {timeAgo(r.createdAt)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                {statusBadge(r.status)}
                                {r.status === 'pending' && (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={(e) => { e.stopPropagation(); cancelRequest(r.id); }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {selected && Object.keys(selected.responses || {}).length > 0 && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>💊 {selected.medicineName} — Responses</h3>
                        {Object.entries(selected.responses).map(([phId, resp]) => (
                            <div key={phId} className="form-card" style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Pharmacy Response</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Available: <strong style={{ color: resp.available ? 'var(--success)' : 'var(--danger)' }}>
                                        {resp.available ? 'Yes ✓' : 'No'}
                                    </strong>
                                </div>
                                {resp.price && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Price: ₹{resp.price}</div>}
                                {resp.notes && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes: {resp.notes}</div>}
                            </div>
                        ))}
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomerProfilePage({ profile, user, onSignOut }) {
    return (
        <div>
            <div className="page-header">
                <h2>Profile</h2>
            </div>
            <div className="form-card">
                <h3>Account Info</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Email</span><br /><strong>{user.email}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Role</span><br /><span className="badge badge-customer">Customer</span></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>UID</span><br /><code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.uid}</code></div>
                </div>
            </div>
            <div className="notice-bar">
                ℹ️ To upgrade to a pharmacy account, contact an administrator with your UID above.
            </div>
            <button className="btn btn-danger" style={{ marginTop: 20 }} onClick={onSignOut}>Sign Out</button>
        </div>
    );
}

function CustomerApp({ profile, user, onSignOut }) {
    const [page, setPage] = useState('search');
    const renderPage = () => {
        switch (page) {
            case 'search':   return <CustomerSearchPage user={user} />;
            case 'requests': return <CustomerRequestsPage user={user} />;
            case 'profile':  return <CustomerProfilePage profile={profile} user={user} onSignOut={onSignOut} />;
            default:         return <CustomerSearchPage user={user} />;
        }
    };
    return (
        <div className="app-layout">
            <CustomerSidebar page={page} setPage={setPage} profile={profile} onSignOut={onSignOut} />
            <div className="main-content">{renderPage()}</div>
        </div>
    );
}

// ═══════════════════════════════════════════
// ──────────────────────────────────────────
// PHARMACY DASHBOARD
// ──────────────────────────────────────────
// ═══════════════════════════════════════════

function PharmacySidebar({ page, setPage, profile, pharmacyData, onSignOut }) {
    const navItems = [
        { id: 'requests',   icon: '📥', label: 'Incoming Requests' },
        { id: 'medicines',  icon: '💊', label: 'Medicine Inventory' },
        { id: 'profile',    icon: '🏥', label: 'Pharmacy Profile' },
    ];
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <h1>💊 WIMM</h1>
                <span className="role-tag" style={{ background: 'var(--pharmacy-light)', color: 'var(--pharmacy)' }}>Pharmacy</span>
            </div>
            <div className="sidebar-user">
                <div className="sidebar-user-name">{pharmacyData?.name || 'Pharmacy'}</div>
                <div className="sidebar-user-email">{profile?.email || auth.currentUser?.email}</div>
            </div>
            <div className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item${page === item.id ? ' active pharmacy' : ''}`}
                        onClick={() => setPage(item.id)}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
            <div className="sidebar-footer">
                <button className="nav-item" onClick={onSignOut} style={{ color: 'var(--danger)', width: '100%' }}>
                    <span>🚪</span><span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}

function PharmacyRequestsPage({ user, pharmacyData }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [respondingTo, setRespondingTo] = useState(null);
    const [resp, setResp] = useState({ available: true, price: '', notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'medicineRequests'),
            where('notifiedPharmacies', 'array-contains', user.uid),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, [user?.uid]);

    const handleRespond = async () => {
        if (!respondingTo) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'medicineRequests', respondingTo.id), {
                [`responses.${user.uid}`]: {
                    available: resp.available,
                    price: resp.price,
                    notes: resp.notes,
                    respondedAt: serverTimestamp(),
                    pharmacyName: pharmacyData?.name || 'Pharmacy',
                },
            });
            setRespondingTo(null);
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Incoming Requests</h2>
                    <p className="page-subheader">Real-time medicine requests from customers</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 13, padding: '6px 14px' }}>🔴 Live</span>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner" /></div>
            ) : requests.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No pending requests</p>
                    <small>New requests will appear here in real time</small>
                </div>
            ) : (
                requests.map((r) => {
                    const hasResponded = r.responses?.[user.uid];
                    return (
                        <div
                            key={r.id}
                            className="list-card"
                            style={hasResponded ? { borderColor: 'var(--success)', opacity: 0.8 } : {}}
                            onClick={() => !hasResponded && setRespondingTo(r)}
                        >
                            <div
                                className="list-card-icon"
                                style={{ background: hasResponded ? 'rgba(16,185,129,0.15)' : 'var(--pharmacy-light)' }}
                            >
                                {hasResponded ? '✅' : '💊'}
                            </div>
                            <div className="list-card-body">
                                <div className="list-card-title" style={{ textTransform: 'capitalize' }}>{r.medicineName}</div>
                                <div className="list-card-sub">
                                    {r.prescription?.imageUrl ? '📄 Has prescription · ' : ''}
                                    {timeAgo(r.createdAt)}
                                </div>
                            </div>
                            <div>
                                {hasResponded ? (
                                    <span className="badge badge-success">Responded ✓</span>
                                ) : (
                                    <span className="badge badge-pharmacy">Respond →</span>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {respondingTo && (
                <div className="modal-overlay" onClick={() => setRespondingTo(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Respond to Request</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                            Medicine: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{respondingTo.medicineName}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Availability</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    className={`btn ${resp.available ? 'btn-customer' : 'btn-ghost'}`}
                                    onClick={() => setResp({ ...resp, available: true })}
                                >✓ Available</button>
                                <button
                                    type="button"
                                    className={`btn ${!resp.available ? 'btn-danger' : 'btn-ghost'}`}
                                    onClick={() => setResp({ ...resp, available: false })}
                                >✗ Not Available</button>
                            </div>
                        </div>
                        {resp.available && (
                            <div className="form-group">
                                <label className="form-label">Price (₹)</label>
                                <input className="form-input" type="number" placeholder="0.00" value={resp.price} onChange={(e) => setResp({ ...resp, price: e.target.value })} />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input className="form-input" placeholder="e.g. Generic available, Brand name only, etc." value={resp.notes} onChange={(e) => setResp({ ...resp, notes: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setRespondingTo(null)}>Cancel</button>
                            <button className="btn btn-pharmacy" onClick={handleRespond} disabled={saving}>{saving ? 'Sending...' : 'Send Response'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PharmacyMedicinesPage({ user, pharmacyData, setPharmacyData }) {
    const [medicines, setMedicines] = useState(pharmacyData?.medicines || []);
    const [newMed, setNewMed] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        setMedicines(pharmacyData?.medicines || []);
    }, [pharmacyData]);

    const addMed = () => {
        const name = newMed.trim().toLowerCase();
        if (!name || medicines.includes(name)) return;
        setMedicines((prev) => [...prev, name].sort());
        setNewMed('');
    };

    const removeMed = (m) => setMedicines((prev) => prev.filter((x) => x !== m));

    const save = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'pharmacies', user.uid), { medicines });
            const snap = await getDoc(doc(db, 'pharmacies', user.uid));
            setPharmacyData(snap.data());
            setMsg('✅ Inventory saved!');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg('❌ Failed to save: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Medicine Inventory</h2>
                    <p className="page-subheader">Manage medicines you currently stock</p>
                </div>
                <button className="btn btn-pharmacy" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
            </div>

            {msg && <div className="notice-bar" style={{ marginBottom: 16 }}>{msg}</div>}

            <div className="form-card">
                <h3>Add Medicine</h3>
                <div className="input-group">
                    <input
                        className="form-input"
                        placeholder="Type medicine name (e.g. paracetamol)..."
                        value={newMed}
                        onChange={(e) => setNewMed(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMed()}
                    />
                    <button className="btn btn-pharmacy" onClick={addMed} disabled={!newMed.trim()}>+ Add</button>
                </div>
            </div>

            <div className="table-card">
                <div className="table-card-header">
                    <span>Inventory ({medicines.length} items)</span>
                </div>
                {medicines.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💊</div>
                        <p>No medicines added yet</p>
                        <small>Add medicines above to appear in customer searches</small>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Medicine Name</th><th style={{ width: 80 }}>Remove</th></tr>
                        </thead>
                        <tbody>
                            {medicines.map((m) => (
                                <tr key={m}>
                                    <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{m}</td>
                                    <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => removeMed(m)}>✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function PharmacyProfilePage({ profile, user, pharmacyData, onSignOut }) {
    return (
        <div>
            <div className="page-header"><h2>Pharmacy Profile</h2></div>
            <div className="form-card">
                <h3>Pharmacy Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { label: 'Pharmacy Name', value: pharmacyData?.name || '—' },
                        { label: 'Address', value: pharmacyData?.address || '—' },
                        { label: 'Phone', value: pharmacyData?.phone || '—' },
                        { label: 'Status', value: <span className={`badge ${pharmacyData?.isActive ? 'badge-success' : 'badge-danger'}`}>{pharmacyData?.isActive ? 'Active' : 'Inactive'}</span> },
                        { label: 'Email', value: user.email },
                        { label: 'UID', value: <code style={{ fontSize: 12 }}>{user.uid}</code> },
                    ].map((item) => (
                        <div key={item.label}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontWeight: 500 }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>
            <button className="btn btn-danger" onClick={onSignOut}>Sign Out</button>
        </div>
    );
}

function PharmacyApp({ profile, user, onSignOut }) {
    const [page, setPage] = useState('requests');
    const [pharmacyData, setPharmacyData] = useState(null);
    const [loadingPh, setLoadingPh] = useState(true);

    useEffect(() => {
        getDoc(doc(db, 'pharmacies', user.uid)).then((snap) => {
            setPharmacyData(snap.exists() ? snap.data() : null);
            setLoadingPh(false);
        });
    }, [user.uid]);

    if (loadingPh) return <div className="loading-screen"><div className="spinner" /></div>;

    if (!pharmacyData) {
        return (
            <div className="access-pending">
                <div className="icon">🏥</div>
                <h2>Pharmacy Profile Not Set Up</h2>
                <p>Your pharmacy profile hasn't been created yet. Please contact an administrator to complete your onboarding.</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your UID: <code>{user.uid}</code></p>
                <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={onSignOut}>Sign Out</button>
            </div>
        );
    }

    const renderPage = () => {
        switch (page) {
            case 'requests':  return <PharmacyRequestsPage user={user} pharmacyData={pharmacyData} />;
            case 'medicines': return <PharmacyMedicinesPage user={user} pharmacyData={pharmacyData} setPharmacyData={setPharmacyData} />;
            case 'profile':   return <PharmacyProfilePage profile={profile} user={user} pharmacyData={pharmacyData} onSignOut={onSignOut} />;
            default:          return <PharmacyRequestsPage user={user} pharmacyData={pharmacyData} />;
        }
    };

    return (
        <div className="app-layout">
            <PharmacySidebar page={page} setPage={setPage} profile={profile} pharmacyData={pharmacyData} onSignOut={onSignOut} />
            <div className="main-content">{renderPage()}</div>
        </div>
    );
}

// ═══════════════════════════════════════════
// ROOT APP — Role-based routing
// ═══════════════════════════════════════════
export default function App() {
    const { user, profile, loading, setProfile } = useAuth();

    const handleSignOut = async () => {
        await signOut(auth);
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const role = profile?.role;

    if (role === 'admin')    return <AdminApp    profile={profile} user={user} onSignOut={handleSignOut} />;
    if (role === 'customer') return <CustomerApp profile={profile} user={user} onSignOut={handleSignOut} />;
    if (role === 'pharmacy') return <PharmacyApp profile={profile} user={user} onSignOut={handleSignOut} />;

    return <AccessPendingPage profile={profile} onSignOut={handleSignOut} />;
}
