/**
 * SmartStadium AI - Assistant Controller Tests
 */
const fs = require('fs');

// Mock environment
global.window = {
    state: {
        stadiums: [{
            id: 'ahmedabad',
            name: 'Narendra Modi Stadium',
            zones: [
                { id: 'gate_1', name: 'Gate 1', type: 'entry', crowd: 10 },
                { id: 'gate_2', name: 'Gate 2', type: 'entry', crowd: 90 }
            ]
        }],
        stalls: [
            { id: 'c1', name: 'Tea Point', location: 'East Stand', avg_wait: 5 },
            { id: 'f1', name: 'Pizza Hut', location: 'West Stand', avg_wait: 20 }
        ],
        emergency: { active: false }
    }
};

// Require the assistant component
const assistantCode = fs.readFileSync('./src/components/AssistantController.js', 'utf8');
eval(assistantCode);

describe('Assistant Controller Fallbacks', () => {
    let stadium, state;
    beforeEach(() => {
        state = global.window.state;
        stadium = state.stadiums[0];
    });

    it('should return emergency response if emergency is active', () => {
        state.emergency.active = true;
        const res = global.window.AssistantController.fallback('where is the food?', state, stadium);
        expect(res).toContain('EMERGENCY');
        state.emergency.active = false;
    });

    it('should return shortest gate for crowd queries', () => {
        const res = global.window.AssistantController.fallback('which gate is empty?', state, stadium);
        expect(res).toContain('Gate 1'); // Because Gate 1 has crowd=10
        expect(res).not.toContain('Gate 2');
    });

    it('should return shortest wait food stall for general food queries', () => {
        const res = global.window.AssistantController.fallback('I am hungry', state, stadium);
        expect(res).toContain('Tea Point'); // Because wait is 5
    });

    it('should return tea stall explicitly for chai queries', () => {
        const res = global.window.AssistantController.fallback('need tea', state, stadium);
        expect(res).toContain('Tea Point');
    });

    it('should identify washroom intents', () => {
        const res = global.window.AssistantController.fallback('where is the washroom?', state, stadium);
        expect(res).toContain('Washrooms are located');
    });

    it('should fallback gracefully for unknown queries', () => {
        const res = global.window.AssistantController.fallback('random random random', state, stadium);
        expect(res).toContain('I am your SmartStadium Assistant');
    });
});
