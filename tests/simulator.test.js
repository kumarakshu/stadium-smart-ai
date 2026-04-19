/**
 * SmartStadium AI - Simulator Tests
 */

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

// Use require() so Istanbul/Jest can track coverage
const { SimulationEngine } = require('../src/engine/simulator');

describe('Simulation Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SimulationEngine.currentPhase = 0;
        SimulationEngine.phaseTick = 0;
        SimulationEngine.worker = { postMessage: jest.fn() };
        global.window.SimulationEngine = SimulationEngine;
        global.window.state = { stadiums: [], stalls: [], emergency: { active: false } };
    });

    it('should increment phaseTick on tick()', () => {
        SimulationEngine.tick();
        expect(SimulationEngine.phaseTick).toBe(1);
    });

    it('should change phase after 12 ticks', () => {
        SimulationEngine.phaseTick = 12;
        SimulationEngine.tick(); // 13th tick changes phase
        expect(SimulationEngine.currentPhase).toBe(1);
        expect(SimulationEngine.phaseTick).toBe(0);
    });

    it('should save progress to localStorage', () => {
        SimulationEngine.tick();
        expect(global.localStorage.setItem).toHaveBeenCalledWith('smartstadium_sim_tick', 1);
        expect(global.localStorage.setItem).toHaveBeenCalledWith('smartstadium_sim_phase', 0);
    });

    it('should return correct phase names', () => {
        SimulationEngine.currentPhase = 0;
        expect(SimulationEngine.getPhaseName()).toContain('Entry');
        SimulationEngine.currentPhase = 1;
        expect(SimulationEngine.getPhaseName()).toContain('Match');
        SimulationEngine.currentPhase = 2;
        expect(SimulationEngine.getPhaseName()).toContain('Break');
    });

    it('should do nothing on tick() without state', () => {
        global.window.state = null;
        SimulationEngine.tick();
        expect(SimulationEngine.phaseTick).toBe(0); // unchanged
    });

    it('should do nothing on tick() without worker', () => {
        SimulationEngine.worker = null;
        SimulationEngine.tick();
        expect(SimulationEngine.phaseTick).toBe(0); // unchanged
    });

    it('should cycle phases correctly (0->1->2->0)', () => {
        SimulationEngine.currentPhase = 2;
        SimulationEngine.phaseTick = 12;
        SimulationEngine.tick();
        expect(SimulationEngine.currentPhase).toBe(0); // wraps around
    });

    it('should restore phase from localStorage on start()', () => {
        global.localStorage.getItem = jest.fn((key) => {
            if (key === 'smartstadium_sim_phase') return '2';
            if (key === 'smartstadium_sim_tick') return '5';
            return null;
        });
        SimulationEngine.worker = { postMessage: jest.fn() };
        SimulationEngine.start();
        expect(SimulationEngine.currentPhase).toBe(2);
        expect(SimulationEngine.phaseTick).toBe(5);
    });

    it('should send postMessage on tick()', () => {
        const mockWorker = { postMessage: jest.fn() };
        SimulationEngine.worker = mockWorker;
        SimulationEngine.tick();
        expect(mockWorker.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ currentPhase: SimulationEngine.currentPhase })
        );
    });
});
