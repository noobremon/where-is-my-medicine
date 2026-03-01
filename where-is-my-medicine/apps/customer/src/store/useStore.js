// Zustand store for customer app state management
import { create } from 'zustand';

const useStore = create((set, get) => ({
    // ─── Auth State ───────────────────────────────────
    user: null,
    userProfile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setLoading: (isLoading) => set({ isLoading }),

    // ─── Location State ───────────────────────────────
    location: null,
    setLocation: (location) => set({ location }),

    // ─── Medicine Search ──────────────────────────────
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setIsSearching: (isSearching) => set({ isSearching }),

    // ─── Active Requests ──────────────────────────────
    activeRequests: [],
    currentRequest: null,
    setActiveRequests: (activeRequests) => set({ activeRequests }),
    setCurrentRequest: (currentRequest) => set({ currentRequest }),

    // ─── Prescription Highlights ──────────────────────
    customerHighlights: [],
    prescriptionImage: null,
    addHighlight: (highlight) =>
        set((state) => ({
            customerHighlights: [...state.customerHighlights, highlight],
        })),
    removeHighlight: (index) =>
        set((state) => ({
            customerHighlights: state.customerHighlights.filter((_, i) => i !== index),
        })),
    clearHighlights: () => set({ customerHighlights: [] }),
    setPrescriptionImage: (prescriptionImage) => set({ prescriptionImage }),

    // ─── Reset ────────────────────────────────────────
    reset: () =>
        set({
            user: null,
            userProfile: null,
            location: null,
            searchQuery: '',
            searchResults: [],
            activeRequests: [],
            currentRequest: null,
            customerHighlights: [],
            prescriptionImage: null,
        }),
}));

export default useStore;
