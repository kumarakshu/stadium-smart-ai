/**
 * SmartStadium AI - Simulator Tests (jsdom compatible)
 */

// CONFIG must be set before requiring the module
global.CONFIG = {
    SIMULATION_AUTO_START: false,
    SIMULATION_INTERVAL: 10000
};

// Mock Web Worker globally
global.Worker = class {
    constructor(path) {
        this.postMessage = jest.fn();
        this.path = path;
    }
};

const { SimulationEngine } = require('../src/engine/simulator');

// --- Helpers ---
let lsGetSpy, lsSetSpy;

describe('Simulation Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Spy on real jsdom localStorage
        lsGetSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
        lsSetSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

        SimulationEngine.currentPhase = 0;
        SimulationEngine.phaseTick = 0;
        SimulationEngine.worker = null;
        window.state = { stadiums: [], stalls: [], emergency: { active: false } };
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('should increment phaseTick on tick()', () => {
        SimulationEngine.worker = new Worker('dummy');
        SimulationEngine.tick();
        expect(SimulationEngine.phaseTick).toBe(1);
    });

    it('should change phase after 12 ticks', () => {
        SimulationEngine.worker = new Worker('dummy');
        SimulationEngine.phaseTick = 12;
        SimulationEngine.tick();
        expect(SimulationEngine.currentPhase).toBe(1);
        expect(SimulationEngine.phaseTick).toBe(0);
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
        window.state = null;
        SimulationEngine.tick();
        expect(SimulationEngine.phaseTick).toBe(0);
    });

    it('should cycle phases correctly (0->1->2->0)', () => {
        SimulationEngine.worker = new Worker('dummy');
        SimulationEngine.currentPhase = 2;
        SimulationEngine.phaseTick = 12;
        SimulationEngine.tick();
        expect(SimulationEngine.currentPhase).toBe(0);
    });

    it('should restore state from localStorage on start if missing', () => {
        window.state = null;
        lsGetSpy.mockImplementation((key) => {
            if (key === 'smartstadium_data') return JSON.stringify({ restored: true });
            return null;
        });
        SimulationEngine.start();
        expect(window.state).toEqual({ restored: true });
    });

    it('should restore phase from localStorage on start()', () => {
        lsGetSpy.mockImplementation((key) => {
            if (key === 'smartstadium_sim_phase') return '2';
            if (key === 'smartstadium_sim_tick') return '5';
            return null;
        });
        SimulationEngine.start();
        expect(SimulationEngine.currentPhase).toBe(2);
        expect(SimulationEngine.phaseTick).toBe(5);
    });

    it('should restore phase with default tick if missing from localStorage on start()', () => {
        lsGetSpy.mockImplementation((key) => {
            if (key === 'smartstadium_sim_phase') return '1';
            return null; 
        });
        SimulationEngine.start();
        expect(SimulationEngine.currentPhase).toBe(1);
        expect(SimulationEngine.phaseTick).toBe(0);
    });

    it('should use default simulation interval if CONFIG.SIMULATION_INTERVAL missing', () => {
        const originalInterval = global.CONFIG.SIMULATION_INTERVAL;
        delete global.CONFIG.SIMULATION_INTERVAL;
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        SimulationEngine.start();
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
        global.CONFIG.SIMULATION_INTERVAL = originalInterval;
    });

    it('should not restore state from localStorage if state already exists', () => {
        const existingState = { stadiums: [], existing: true };
        window.state = existingState;
        lsGetSpy.mockImplementation((key) => {
            if (key === 'smartstadium_data') return JSON.stringify({ overwritten: true });
            return null;
        });
        SimulationEngine.start();
        expect(window.state).toBe(existingState);
    });

    it('should initialize worker and handle onmessage', () => {
        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
        SimulationEngine.worker = null;
        SimulationEngine.start();
        expect(SimulationEngine.worker).not.toBeNull();

        const mockState = { stadiums: [{ test: 1 }] };
        SimulationEngine.worker.onmessage({ data: { state: mockState } });
        expect(window.state).toEqual(mockState);
        expect(lsSetSpy).toHaveBeenCalledWith('smartstadium_data', JSON.stringify(mockState));
        expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should fallback natively if Worker throws exception', () => {
        const originalWorker = global.Worker;
        global.Worker = class { constructor() { throw new Error('CORS issue'); } };
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        SimulationEngine.start();
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(SimulationEngine.worker).toBeNull();
        global.Worker = originalWorker;
    });

    it('should warn if Worker is not supported', () => {
        const originalWorker = global.Worker;
        Object.defineProperty(window, 'Worker', { value: undefined, writable: true, configurable: true });
        global.Worker = undefined;
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        SimulationEngine.start();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Web Workers not supported in this browser.');
        Object.defineProperty(window, 'Worker', { value: originalWorker, writable: true, configurable: true });
        global.Worker = originalWorker;
    });

    it('should restore state from rawData if state is missing in simulator', () => {
        window.state = null;
        lsGetSpy.mockImplementation((key) => {
            if (key === 'smartstadium_data') return JSON.stringify({ raw: true });
            return null;
        });
        SimulationEngine.start();
        expect(window.state).toEqual({ raw: true });
    });
});

describe('Simulation Engine Auto Start', () => {
    it('should auto-start if CONFIG.SIMULATION_AUTO_START is true', () => {
        jest.useFakeTimers();
        global.CONFIG.SIMULATION_AUTO_START = true;

        let loadedEngine;
        jest.isolateModules(() => {
            const mod = require('../src/engine/simulator');
            loadedEngine = mod.SimulationEngine;
        });

        const spyStart = jest.spyOn(loadedEngine, 'start').mockImplementation(() => {});
        jest.advanceTimersByTime(2000);
        expect(spyStart).toHaveBeenCalled();
        jest.clearAllTimers();
        global.CONFIG.SIMULATION_AUTO_START = false;
    });
});
