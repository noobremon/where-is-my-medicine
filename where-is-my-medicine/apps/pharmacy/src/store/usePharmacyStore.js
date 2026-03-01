// Zustand store for Pharmacy App
import { create } from 'zustand';

const usePharmacyStore = create((set) => ({
    // Auth
    user: null,
    userProfile: null,
    pharmacyData: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setPharmacyData: (pharmacyData) => set({ pharmacyData }),
    setLoading: (isLoading) => set({ isLoading }),

    // Incoming requests
    incomingRequests: [],
    setIncomingRequests: (incomingRequests) => set({ incomingRequests }),

    // Medicines
    medicines: [],
    setMedicines: (medicines) => set({ medicines }),

    reset: () =>
        set({
            user: null,
            userProfile: null,
            pharmacyData: null,
            incomingRequests: [],
            medicines: [],
        }),
}));

export default usePharmacyStore;
