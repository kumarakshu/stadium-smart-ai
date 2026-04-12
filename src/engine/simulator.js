/**
 * SmartStadium AI - Simulation Engine (Smart Cycle Mode with Persistence)
 */

const SimulationEngine = {
    // Phase Cycle: 0: Entry Phase, 1: Match Phase, 2: Break Phase
    currentPhase: 0,
    phaseTick: 0,

    start() {
        console.log("Simulation Engine: Starting Smart Cycle Logic...");
        
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
        
        // Run simulation tick every few seconds (sync with config)
        setInterval(() => this.tick(), CONFIG.SIMULATION_INTERVAL || 10000);
    },

    tick() {
        if (!window.state) return;
        let state = window.state;

        this.phaseTick++;
        
        // Switch phases every 12 ticks (~2 mins if 10s interval)
        if (this.phaseTick > 12) {
            this.currentPhase = (this.currentPhase + 1) % 3;
            this.phaseTick = 0;
            console.log(`Simulation entering Phase: ${this.getPhaseName()}`);
        }

        // Save progress to prevent reset on refresh
        localStorage.setItem('smartstadium_sim_phase', this.currentPhase);
        localStorage.setItem('smartstadium_sim_tick', this.phaseTick);

        state.stadiums.forEach(stadium => {
            stadium.zones.forEach(zone => {
                let delta = 0;

                switch (this.currentPhase) {
                    case 0: // ENTRY PHASE (Gates filling, stands filling)
                        if (zone.type === 'entry') delta = Math.floor(Math.random() * 8) - 1; 
                        if (zone.type === 'seating') delta = Math.floor(Math.random() * 5) + 1; 
                        break;
                    case 1: // MATCH PHASE (Gates empty, stands steady)
                        if (zone.type === 'entry') delta = -Math.floor(Math.random() * 6); 
                        if (zone.type === 'seating') delta = Math.floor(Math.random() * 3) - 1; 
                        if (zone.id.includes('food')) delta = Math.floor(Math.random() * 3) - 1;
                        break;
                    case 2: // BREAK PHASE (Stalls peak, washrooms peak)
                        if (zone.type === 'seating') delta = -Math.floor(Math.random() * 3); 
                        if (zone.type === 'amenity' || zone.id.includes('food')) delta = Math.floor(Math.random() * 8) + 1; 
                        break;
                }

                zone.crowd = Math.max(5, Math.min(100, zone.crowd + delta));
            });
        });

        // 2. Fluctuate Stall Queues
        state.stalls.forEach(stall => {
            let qDelta = 0;
            if (this.currentPhase === 2) qDelta = Math.floor(Math.random() * 5); 
            else qDelta = Math.floor(Math.random() * 3) - 2; 

            stall.queue_length = Math.max(0, stall.queue_length + qDelta);
            stall.avg_wait = stall.queue_length * 2;
        });

        // 3. Update window reference & Save & Notify
        window.state = state;
        localStorage.setItem('smartstadium_data', JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('simulation_update', { detail: state }));
    },

    getPhaseName() {
        return ["Crowd Inflow (Entry)", "Match in Progress", "Intermission (Break)"][this.currentPhase];
    }
};

if (CONFIG.SIMULATION_AUTO_START) {
    setTimeout(() => SimulationEngine.start(), 1500);
}
