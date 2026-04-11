/**
 * SmartStadium AI - Simulation Engine (Multi-Stadium Support)
 */

const SimulationEngine = {
    start() {
        console.log("Simulation Engine: Multi-Stadium Mode Active");
        setInterval(() => this.updateData(), CONFIG.SIMULATION_INTERVAL);
    },

    updateData() {
        const rawData = localStorage.getItem('smartstadium_data');
        if (!rawData) return;

        let state = JSON.parse(rawData);

        // 1. Loop through all stadiums
        state.stadiums.forEach(stadium => {
            // Fluctuate Zone Crowd
            stadium.zones.forEach(zone => {
                const delta = Math.floor(Math.random() * 7) - 3;
                zone.crowd = Math.max(5, Math.min(100, zone.crowd + delta));
            });
        });

        // 2. Fluctuate Stall Queues (shared across venue)
        state.stalls.forEach(stall => {
            const qDelta = Math.floor(Math.random() * 3) - 1;
            stall.queue_length = Math.max(0, stall.queue_length + qDelta);
            stall.avg_wait = stall.queue_length * 2;
        });

        // 3. Save & Notify
        localStorage.setItem('smartstadium_data', JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('simulation_update', { detail: state }));
    }
};

if (CONFIG.SIMULATION_AUTO_START) {
    SimulationEngine.start();
}
