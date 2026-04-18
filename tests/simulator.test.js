/**
 * SmartStadium AI - Simulator Tests
 */
const fs = require('fs');

// Mock browser environment
global.window = {
    state: { stadiums: [], stalls: [], emergency: { active: false } },
    dispatchEvent: jest.fn(),
    Worker: class {
        constructor() { this.postMessage = jest.fn(); }
    }
};

global.localStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(() => null)
};

global.CONFIG = {
    SIMULATION_AUTO_START: false,
    SIMULATION_INTERVAL: 10000
};

// Require the simulator engine component safely
const simulatorCode = fs.readFileSync('./src/engine/simulator.js', 'utf8');
eval(simulatorCode);

describe('Simulation Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.window.SimulationEngine.currentPhase = 0;
        global.window.SimulationEngine.phaseTick = 0;
        global.window.SimulationEngine.worker = { postMessage: jest.fn() };
    });

    it('should increment phaseTick on tick()', () => {
        global.window.SimulationEngine.tick();
        expect(global.window.SimulationEngine.phaseTick).toBe(1);
    });

    it('should change phase after 12 ticks', () => {
        global.window.SimulationEngine.phaseTick = 12;
        global.window.SimulationEngine.tick(); // 13th tick changes phase
        expect(global.window.SimulationEngine.currentPhase).toBe(1);
        expect(global.window.SimulationEngine.phaseTick).toBe(0);
    });

    it('should save progress to localStorage', () => {
        global.window.SimulationEngine.tick();
        expect(global.localStorage.setItem).toHaveBeenCalledWith('smartstadium_sim_tick', 1);
        expect(global.localStorage.setItem).toHaveBeenCalledWith('smartstadium_sim_phase', 0);
    });

    it('should return correct phase names', () => {
        global.window.SimulationEngine.currentPhase = 0;
        expect(global.window.SimulationEngine.getPhaseName()).toContain("Entry");
        global.window.SimulationEngine.currentPhase = 1;
        expect(global.window.SimulationEngine.getPhaseName()).toContain("Match");
        global.window.SimulationEngine.currentPhase = 2;
        expect(global.window.SimulationEngine.getPhaseName()).toContain("Break");
    });
});
