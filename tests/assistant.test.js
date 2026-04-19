/**
 * SmartStadium AI - Assistant Controller Tests
 */

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

global.CONFIG = { GEMINI_API_KEY: '' };
global.document = { getElementById: () => null };

// Use require() so Istanbul/Jest can track coverage
const { AssistantController } = require('../src/components/AssistantController');

describe('Assistant Controller Fallbacks', () => {
    let stadium, state;
    beforeEach(() => {
        state = global.window.state;
        stadium = state.stadiums[0];
        state.emergency.active = false;
    });

    it('should return emergency response if emergency is active', () => {
        state.emergency.active = true;
        const res = AssistantController.fallback('where is the food?', state, stadium);
        expect(res).toContain('EMERGENCY');
    });

    it('should return shortest gate for crowd queries', () => {
        const res = AssistantController.fallback('which gate is empty?', state, stadium);
        expect(res).toContain('Gate 1'); // Because Gate 1 has crowd=10
        expect(res).not.toContain('Gate 2');
    });

    it('should return shortest wait food stall for general food queries', () => {
        const res = AssistantController.fallback('I am hungry', state, stadium);
        expect(res).toContain('Tea Point'); // Because wait is 5
    });

    it('should return tea stall explicitly for chai queries', () => {
        const res = AssistantController.fallback('need tea', state, stadium);
        expect(res).toContain('Tea Point');
    });

    it('should identify washroom intents', () => {
        const res = AssistantController.fallback('where is the washroom?', state, stadium);
        expect(res).toContain('Washrooms are located');
    });

    it('should fallback gracefully for unknown queries', () => {
        const res = AssistantController.fallback('random random random', state, stadium);
        expect(res).toContain('I am your SmartStadium Assistant');
    });

    it('should handle medical queries', () => {
        const res = AssistantController.fallback('I need a doctor', state, stadium);
        expect(res).toContain('Medical assistance');
    });

    it('should handle parking queries', () => {
        const res = AssistantController.fallback('where can I park my car?', state, stadium);
        expect(res).toContain('Parking');
    });

    it('should handle exit queries in Hindi (bahar)', () => {
        const res = AssistantController.fallback('main bahar jaana chahta hun', state, stadium);
        expect(res).toContain('Gate 1');
    });

    it('should handle coffee query as a beverage intent', () => {
        const res = AssistantController.fallback('I want coffee', state, stadium);
        // Tea Point matches because it has "tea"
        expect(res).toBeDefined();
    });

    it('should handle water queries', () => {
        const res = AssistantController.fallback('I need pani', state, stadium);
        expect(res).toBeDefined();
    });

    it('should handle crowd/entry query with no stalls info', () => {
        const res = AssistantController.fallback('is there a crowd at gate', state, stadium);
        expect(res).toContain('Gate 1');
    });

    it('should handle fallback when no stadium provided', () => {
        const res = AssistantController.fallback('which gate', state, null);
        expect(res).toBeDefined();
    });
});
