/**
 * SmartStadium AI - Assistant logic
 */

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function getAssistantResponse(query, context) {
    if (!context) context = window.state;
    if (!context) {
        const saved = localStorage.getItem('smartstadium_data');
        context = saved ? JSON.parse(saved) : null;
    }

    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.trim() === '' || CONFIG.GEMINI_API_KEY.includes('YOUR_')) {
        console.warn('Chatbot: Gemini API Key missing or placeholder. Using Mock Engine.');
        return solveQueryMock(query, context);
    }

    const currentStadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = context?.stadiums?.find(s => s.id === currentStadiumId);

    const systemPrompt = `
        You are "SmartStadium Assistant", a dynamic AI in a unified stadium ecosystem.
        Current Venue: ${stadium?.name || 'The stadium'}
        Live Data (Zones/Crowd): ${JSON.stringify(stadium?.zones || [])}
        Live Data (Food Stalls): ${JSON.stringify(context?.stalls || [])}
        Emergency Status: ${context?.emergency?.active ? 'ACTIVE EMERGENCY - EVACUATE' : 'Normal Operations'}

        Rules:
        1. Always respond in the language or dialect used by the user (English, Hindi, Hinglish, etc.).
        2. Solve queries about navigation (gates), food (wait times), and safety using the Live Data provided.
        3. Keep it short, expert, and helpful. Max 2-3 sentences.
    `;

    try {
        const response = await fetch(`${API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\nUser Query: ${query}` }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Gemini API Error details:', data.error);
            return solveQueryMock(query, context);
        }

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid API response structure');
        }
    } catch (e) {
        console.error('Gemini API Connection Error:', e);
        return solveQueryMock(query, context);
    }
}

function solveQueryMock(query, context) {
    if (!context || !context.stadiums) {
        return "I'm having trouble accessing the stadium state right now. Please try again.";
    }

    const q = query.toLowerCase();
    const stadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = context.stadiums.find(s => s.id === stadiumId);
    if (!stadium) return 'Stadium configuration missing.';

    // 1. Check for Emergency FIRST but only if no other keywords found later
    let emergencyAlert = context?.emergency?.active ? '🚨 [EMERGENCY ALERT] Please follow evacuation routes on the map immediately.' : '';

    // 2. Keyword Responses
    if (q.includes('washroom') || q.includes('toilet') || q.includes('bathroom') || q.includes('sandaas')) {
        if (stadium.amenities && stadium.amenities.length > 0) {
            StadiumMap.drawRouteTo(stadium.amenities[0].coords);
            return `${emergencyAlert} I've highlighted the route to the nearest washroom in ${stadium.name} for you on the map.`;
        }
    }

    if (q.includes('gate') || q.includes('entry') || q.includes('khali') || q.includes('empty') || q.includes('crowd')) {
        const entryZones = (stadium.zones || []).filter(z => z.type === 'entry');
        if (entryZones.length > 0) {
            const best = entryZones.sort((a,b) => a.crowd - b.crowd)[0];
            return `${emergencyAlert} ${best.name} is currently the best gate to use with only ${best.crowd}% occupancy.`;
        }
    }

    if (q.includes('food') || q.includes('hungry') || q.includes('khana') || q.includes('bhook') || q.includes('eat') || q.includes('stall') || q.includes('pani')) {
        const stall = (context.stalls || []).sort((a,b) => a.avg_wait - b.avg_wait)[0];
        if (stall) {
            return `${emergencyAlert} I recommend ${stall.name} (${stall.location}). Current wait is approximately ${stall.avg_wait} minutes.`;
        }
    }

    // 3. Fallbacks
    if (context?.emergency?.active) {
        return '🚨 EMERGENCY MODE ACTIVE: Please follow the evacuation routes highlighted on your map. For help with exits or food, just ask!';
    }

    if (q.includes('hii') || q.includes('hello') || q.includes('hey')) {
        return "Hello! I'm your SmartStadium assistant. How can I help you navigate the venue today?";
    }

    return "I'm your SmartStadium assistant. I can help with gate crowd status, bathroom locations, or find the shortest food lines!";
}

// Chat UI handler
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    async function handleSend() {
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;

        // 1. User Msg
        const uDiv = document.createElement('div');
        uDiv.className = 'msg msg-user';
        uDiv.innerText = userQuery;
        messages.appendChild(uDiv);
        chatInput.value = '';
        messages.scrollTop = messages.scrollHeight;

        // 2. Bot Msg (Thinking)
        const bDiv = document.createElement('div');
        bDiv.className = 'msg msg-bot';
        bDiv.innerText = 'Thinking...';
        messages.appendChild(bDiv);
        messages.scrollTop = messages.scrollHeight;

        const reply = await getAssistantResponse(userQuery, window.state);
        bDiv.innerText = reply;
        messages.scrollTop = messages.scrollHeight;
    }

    if (sendBtn) sendBtn.onclick = handleSend;
    if (chatInput) {
        chatInput.onkeypress = (e) => { e.key === 'Enter' && handleSend(); };
    }
});
