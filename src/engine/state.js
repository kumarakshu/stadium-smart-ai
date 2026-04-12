/**
 * SmartStadium AI - Central State Engine
 * Handles application data, persistence, and simulation broadcast.
 */

window.state = {
    stadiums: [],
    stalls: [],
    emergency: { active: false, message: "" }
};

const StateManager = {
    async init() {
        console.log("StateManager: Initializing...");
        const saved = localStorage.getItem('smartstadium_data');
        
        if (saved) {
            window.state = JSON.parse(saved);
        } else {
            await this.loadMockData();
        }
        
        this.broadcast();
    },

    async loadMockData() {
        try {
            const res = await fetch('data/mockData.json');
            window.state = await res.json();
            this.save();
        } catch (err) {
            console.error("StateManager: Failed to load mock data:", err);
            // Fallback empty state
            window.state = { stadiums: [], stalls: [], emergency: { active: false } };
        }
    },

    save() {
        localStorage.setItem('smartstadium_data', JSON.stringify(window.state));
    },

    updateZone(stadiumId, zoneId, crowdValue) {
        const stadium = window.state.stadiums.find(s => s.id === stadiumId);
        if (!stadium) return;
        
        const zone = stadium.zones.find(z => z.id === zoneId);
        if (zone) {
            zone.crowd = parseInt(crowdValue);
            this.save();
            this.broadcast();
        }
    },

    setEmergency(active, message = "") {
        window.state.emergency = { active, message };
        this.save();
        this.broadcast();
    },

    broadcast() {
        window.dispatchEvent(new CustomEvent('simulation_update', { detail: window.state }));
    }
};

// Global accessor
window.StateManager = StateManager;
