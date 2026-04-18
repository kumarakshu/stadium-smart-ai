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

// Require the state manager
const fs = require('fs');
const stateCode = fs.readFileSync('./src/engine/state.js', 'utf8');
eval(stateCode);

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
            emergency: { active: false }
        };
        jest.clearAllMocks();
    });

    it('should successfully update a zone crowd value', () => {
        window.StateManager.updateZone('ahmedabad', 'gate_1', 85);
        expect(window.state.stadiums[0].zones[0].crowd).toBe(85);
    });

    it('should save to localStorage when state is updated', () => {
        window.StateManager.updateZone('ahmedabad', 'gate_1', 90);
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
            'smartstadium_data', 
            expect.any(String)
        );
    });

    it('should successfully trigger an emergency broadcast', () => {
        window.StateManager.setEmergency(true, 'EVACUATE');
        expect(window.state.emergency.active).toBe(true);
        expect(window.state.emergency.message).toBe('EVACUATE');
        expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should NOT update crowd if stadium is not found', () => {
        window.StateManager.updateZone('invalid_stadium', 'gate_1', 10);
        expect(window.state.stadiums[0].zones[0].crowd).toBe(50); // Unchanged
    });
});
