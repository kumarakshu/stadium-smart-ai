/**
 * SmartStadium AI - Simulation Engine (Worker Manager)
 * Manages the Web Worker for off-thread calculations.
 */

const SimulationEngine = {
    // Phase Cycle: 0: Entry Phase, 1: Match Phase, 2: Break Phase
    currentPhase: 0,
    phaseTick: 0,
    worker: null,

    start() {
        console.log("Simulation Engine: Starting Smart Cycle Logic (Worker Mode)...");
        
        // 1. Restore State
        if (!window.state) {
            const rawData = localStorage.getItem('smartstadium_data');
            if (rawData) window.state = JSON.parse(rawData);
        }
        
        // 2. Restore Phase
        const savedPhase = localStorage.getItem('smartstadium_sim_phase');
        if (savedPhase !== null) {
            this.currentPhase = parseInt(savedPhase);
            this.phaseTick = parseInt(localStorage.getItem('smartstadium_sim_tick') || "0");
            console.log(`Restored Simulation Phase: ${this.currentPhase} at tick ${this.phaseTick}`);
        }

        // Initialize Web Worker
        if (window.Worker) {
            try {
                this.worker = new Worker('src/engine/simulatorWorker.js');
                
                // Handle reply from Worker
                this.worker.onmessage = (e) => {
                    const { state } = e.data;
                    window.state = state;
                    
                    // Save and notify
                    localStorage.setItem('smartstadium_data', JSON.stringify(state));
                    window.dispatchEvent(new CustomEvent('simulation_update', { detail: state }));
                };
            } catch (err) {
                console.error("Worker initialization failed, fallback disabled for performance.", err);
            }
        } else {
            console.warn("Web Workers not supported in this browser.");
        }
        
        // Run simulation tick
        setInterval(() => this.tick(), CONFIG.SIMULATION_INTERVAL || 10000);
    },

    tick() {
        if (!window.state || !this.worker) return;

        this.phaseTick++;
        
        // Switch phases every 12 ticks (~2 mins if 10s interval)
        if (this.phaseTick > 12) {
            this.currentPhase = (this.currentPhase + 1) % 3;
            this.phaseTick = 0;
            console.log(`Simulation entering Phase: ${this.getPhaseName()}`);
        }

        // Save progress
        localStorage.setItem('smartstadium_sim_phase', this.currentPhase);
        localStorage.setItem('smartstadium_sim_tick', this.phaseTick);

        // Send task to Worker instead of calculating on main thread
        this.worker.postMessage({ 
            state: window.state, 
            currentPhase: this.currentPhase 
        });
    },

    getPhaseName() {
        return ["Crowd Inflow (Entry)", "Match in Progress", "Intermission (Break)"][this.currentPhase];
    }
};

if (CONFIG.SIMULATION_AUTO_START) {
    setTimeout(() => SimulationEngine.start(), 1500);
}
window.SimulationEngine = SimulationEngine;
