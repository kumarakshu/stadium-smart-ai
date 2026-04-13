/**
 * SmartStadium AI - Web Worker for Simulation Engine
 * Process heavy crowd calculations off the main UI thread.
 */

self.onmessage = function(e) {
    const data = e.data;
    if (!data || !data.state) return;

    const { state, currentPhase } = data;

    // Apply calculations based on phase
    state.stadiums.forEach(stadium => {
        stadium.zones.forEach(zone => {
            let delta = 0;

            switch (currentPhase) {
                case 0: // ENTRY PHASE
                    if (zone.type === 'entry') delta = Math.floor(Math.random() * 8) - 1; 
                    if (zone.type === 'seating') delta = Math.floor(Math.random() * 5) + 1; 
                    break;
                case 1: // MATCH PHASE
                    if (zone.type === 'entry') delta = -Math.floor(Math.random() * 6); 
                    if (zone.type === 'seating') delta = Math.floor(Math.random() * 3) - 1; 
                    if (zone.id.includes('food')) delta = Math.floor(Math.random() * 3) - 1;
                    break;
                case 2: // BREAK PHASE
                    if (zone.type === 'seating') delta = -Math.floor(Math.random() * 3); 
                    if (zone.type === 'amenity' || zone.id.includes('food')) delta = Math.floor(Math.random() * 8) + 1; 
                    break;
            }

            zone.crowd = Math.max(5, Math.min(100, zone.crowd + delta));
        });
    });

    state.stalls.forEach(stall => {
        let qDelta = 0;
        if (currentPhase === 2) qDelta = Math.floor(Math.random() * 5); 
        else qDelta = Math.floor(Math.random() * 3) - 2; 

        stall.queue_length = Math.max(0, stall.queue_length + qDelta);
        stall.avg_wait = stall.queue_length * 2;
    });

    // Send the mutated state back to the main thread
    self.postMessage({ state: state });
};
