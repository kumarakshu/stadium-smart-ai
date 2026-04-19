/**
 * SmartStadium AI - Unit Tests
 */

// Mock browser environment
global.window = {
    state: { stadiums: [], stalls: [], emergency: { active: false } },
    dispatchEvent: jest.fn()
};

global.localStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(() => null)
};

global.CustomEvent = class CustomEvent {
    constructor(name, options) {
        this.name = name;
        this.detail = options.detail;
    }
};

// Use require() so Istanbul/Jest can track coverage
const { StateManager } = require('../src/engine/state');

describe('SmartStadium StateManager', () => {
    
    beforeEach(() => {
        window.state = {
            stadiums: [
                {
                    id: 'ahmedabad',
                    zones: [
                        { id: 'gate_1', name: 'Gate 1', crowd: 50 }
                    ]
                }
            ],
            stalls: [],
            emergency: { active: false }
        };
        jest.clearAllMocks();
    });

    it('should successfully update a zone crowd value', () => {
        StateManager.updateZone('ahmedabad', 'gate_1', 85);
        expect(window.state.stadiums[0].zones[0].crowd).toBe(85);
    });

    it('should save to localStorage when state is updated', () => {
        StateManager.updateZone('ahmedabad', 'gate_1', 90);
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
            'smartstadium_data', 
            expect.any(String)
        );
    });

    it('should successfully trigger an emergency broadcast', () => {
        StateManager.setEmergency(true, 'EVACUATE');
        expect(window.state.emergency.active).toBe(true);
        expect(window.state.emergency.message).toBe('EVACUATE');
        expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should NOT update crowd if stadium is not found', () => {
        StateManager.updateZone('invalid_stadium', 'gate_1', 10);
        expect(window.state.stadiums[0].zones[0].crowd).toBe(50); // Unchanged
    });

    it('should NOT update crowd if zone is not found', () => {
        StateManager.updateZone('ahmedabad', 'invalid_zone', 99);
        expect(window.state.stadiums[0].zones[0].crowd).toBe(50); // Unchanged
    });

    it('should clear emergency with setEmergency(false)', () => {
        StateManager.setEmergency(false, '');
        expect(window.state.emergency.active).toBe(false);
        expect(window.state.emergency.message).toBe('');
    });

    it('should call broadcast when updating a zone', () => {
        StateManager.updateZone('ahmedabad', 'gate_1', 75);
        expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should restore state from localStorage on init()', async () => {
        const mockSavedState = JSON.stringify({
            stadiums: [{ id: 'wankhede', zones: [] }],
            stalls: [],
            emergency: { active: false }
        });
        global.localStorage.getItem = jest.fn(() => mockSavedState);
        await StateManager.init();
        expect(window.state.stadiums[0].id).toBe('wankhede');
    });
});
