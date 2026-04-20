/**
 * SmartStadium AI - Assistant Controller Tests (jsdom compatible)
 */

global.CONFIG = { GEMINI_API_KEY: 'REAL_API_KEY' };
global.fetch = jest.fn();

// Mock TranslationService
window.TranslationService = {
    detectLanguage: jest.fn().mockResolvedValue('en'),
    translate: jest.fn().mockImplementation((text) => Promise.resolve(text))
};

// Global Speech Mock
let mockSRStart = jest.fn();
class MockSR {
    constructor() { this.start = mockSRStart; }
}
Object.defineProperty(window, 'SpeechRecognition', { value: MockSR, writable: true, configurable: true });

const { AssistantController } = require('../src/components/AssistantController');

describe('Assistant Controller Full Audit', () => {
    let stadium, state;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSRStart = jest.fn();
        
        // Setup State
        window.state = {
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
        };
        state = window.state;
        stadium = state.stadiums[0];

        // Setup DOM
        jest.spyOn(document, 'getElementById').mockReturnValue({ value: 'ahmedabad' });

        // Setup AI Controller
        AssistantController.voiceEnabled = true;
        global.CONFIG.GEMINI_API_KEY = 'REAL_API_KEY';
        
        // Mock Side Effects
        jest.spyOn(AssistantController, 'speak').mockImplementation(() => {});
        
        // Reset Translation
        window.TranslationService.detectLanguage.mockResolvedValue('en');
        window.TranslationService.translate.mockImplementation(t => Promise.resolve(t));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- Fallback Engine Tests ---
    describe('Fallback Engine', () => {
        it('should return emergency response if emergency is active', () => {
            state.emergency.active = true;
            const res = AssistantController.fallback('where is the food?', state, stadium);
            expect(res).toContain('EMERGENCY');
            state.emergency.active = false;
        });

        it('should return shortest gate for crowd queries', () => {
            const res = AssistantController.fallback('which gate is empty?', state, stadium);
            expect(res).toContain('Gate 1');
        });

        it('should return shortest wait food stall for general food queries', () => {
            const res = AssistantController.fallback('I am hungry', state, stadium);
            expect(res).toContain('Tea Point');
        });

        it('should handle missing stalls in fallback', () => {
            const res = AssistantController.fallback('hungry', {}, stadium);
            expect(res).toContain('Food');
        });

        it('should hit beverage branch with chai', () => {
            const res = AssistantController.fallback('chai please', state, stadium);
            expect(res).toContain('Tea Point');
        });

        it('should handle coffee and water queries', () => {
            expect(AssistantController.fallback('need coffee', state, stadium)).toBeDefined();
            expect(AssistantController.fallback('pani chahiye', state, stadium)).toBeDefined();
        });

        it('should handle medical and parking', () => {
            expect(AssistantController.fallback('medical aid', state, stadium)).toContain('Medical');
            expect(AssistantController.fallback('parking area', state, stadium)).toContain('Parking');
        });

        it('should fallback gracefully for unknown queries', () => {
            const res = AssistantController.fallback('xyz unknown query', state, stadium);
            expect(res).toContain('Assistant');
        });
        
        it('should handle missing stadium zones', () => {
             const res = AssistantController.fallback('crowd info', state, {});
             expect(res).toContain('Map');
        });
    });

    // --- AI Flow Tests ---
    describe('AI Workflow', () => {
        it('should fetch from API successfully', async () => {
            global.fetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: 'API Response' }] } }]
                })
            });
            const res = await AssistantController.getResponse('hello');
            expect(res).toBe('API Response');
            expect(AssistantController.speak).toHaveBeenCalledWith('API Response');
        });

        it('should handle API success but empty candidates', async () => {
            global.fetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({})
            });
            const res = await AssistantController.getResponse('hello');
            expect(res).toContain('Assistant'); // Generic fallback
        });

        it('should handle API error status 500', async () => {
            global.fetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'Internal Error' } })
            });
            const res = await AssistantController.getResponse('hello');
            expect(res).toContain('Assistant');
        });

        it('should use fallback if API_KEY is placeholder', async () => {
            global.CONFIG.GEMINI_API_KEY = 'YOUR_API_KEY';
            const res = await AssistantController.getResponse('hello');
            expect(res).toContain('Assistant');
        });

        it('should handle network error fallback', async () => {
            global.fetch.mockRejectedValue(new Error('Down'));
            const res = await AssistantController.getResponse('hello');
            expect(res).toContain('Assistant');
        });

        it('should translate if language is not English', async () => {
            window.TranslationService.detectLanguage.mockResolvedValue('hi');
            window.TranslationService.translate.mockResolvedValue('नमस्ते');
            global.fetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: 'Hello' }] } }]
                })
            });
            const res = await AssistantController.getResponse('kaise ho?');
            expect(res).toBe('नमस्ते');
        });
        
        it('should handle missing stadium data in prompt', async () => {
             window.state.stadiums = [];
             jest.spyOn(document, 'getElementById').mockReturnValue(null);
             global.fetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: 'No Stadium' }] } }]
                })
            });
            const res = await AssistantController.getResponse('hello');
            expect(res).toBe('No Stadium');
        });
    });

    // --- Voice Edge Cases ---
    describe('Voice Logic', () => {
        it('should handle SpeechRecognition and trigger callbacks', () => {
            let resCb;
            const mockStart = jest.fn();
            const InstanceSR = class {
                constructor() { this.start = mockStart; }
                set onresult(cb) { resCb = cb; }
            };
            // Mutate the global mock slightly for this test
            AssistantController.recognition = new InstanceSR();
            
            const onRes = jest.fn();
            AssistantController.listen(onRes, null, null);
            
            resCb({ results: [[{ transcript: 'test voice' }]] });
            expect(onRes).toHaveBeenCalledWith('test voice');
        });

        it('should hit voice branch when API key missing', async () => {
             global.CONFIG.GEMINI_API_KEY = '';
             AssistantController.voiceEnabled = true;
             await AssistantController.getResponse('hello');
             expect(AssistantController.speak).toHaveBeenCalled();
        });
    });
});
