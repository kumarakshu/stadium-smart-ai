/**
 * SmartStadium AI - Assistant logic
 */

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function getAssistantResponse(query, context) {
    // If state is missing, try to get from localStorage
    if (!context) {
        const saved = localStorage.getItem('smartstadium_data');
        if (saved) context = JSON.parse(saved);
    }

    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes("YOUR_")) {
        return solveQueryMock(query, context);
    }

    const systemPrompt = `
        You are "SmartStadium Assistant", a dynamic AI in a unified stadium ecosystem.
        Current Context:
        Zones: ${JSON.stringify(context?.zones || [])}
        Stalls: ${JSON.stringify(context?.stalls || [])}
        Emergency: ${context?.emergency?.active ? "YES" : "NO"}

        Current Goal: Solve user queries about navigation, food, and safety.
        Style: Short, expert, and real-time focused. Max 2 sentences.
    `;

    try {
        const response = await fetch(`${API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${query}` }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid API structure");
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        return solveQueryMock(query, context);
    }
}

function solveQueryMock(query, context) {
    const q = query.toLowerCase();
    const stadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = context.stadiums.find(s => s.id === stadiumId);
    
    // Check for "washroom"
    if (q.includes("washroom") || q.includes("toilet")) {
        StadiumMap.drawRouteTo(stadium.amenities[0].coords);
        return `I've highlighted the route to the nearest washroom in ${stadium.name} for you on the map.`;
    }

    if (q.includes("best gate") || q.includes("crowd") || q.includes("entry")) {
        const best = stadium.zones.filter(z => z.type === 'entry').sort((a,b) => a.crowd - b.crowd)[0];
        return `${best.name} is currently the best entry point with only ${best.crowd}% occupancy.`;
    }

    if (q.includes("food") || q.includes("hungry") || q.includes("khana") || q.includes("bhook") || q.includes("eat")) {
        const bestStall = (context.stalls || []).sort((a,b) => a.avg_wait - b.avg_wait)[0];
        return `I recommend ${bestStall.name} at the ${bestStall.location}. The wait time is ${bestStall.avg_wait} minutes.`;
    }

    if (context.emergency.active) {
        return "EMERGENCY ALERT: Please check the Map view for evacuation routes and follow staff signals immediately.";
    }

    return "I'm your SmartStadium assistant. Ask me about the fastest entrance, washrooms, or food lines!";
}

// Chat UI handler
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const messages = document.getElementById('chat-messages');

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const userQuery = input.value.trim();
            if (!userQuery) return;

            // User msg
            const uDiv = document.createElement('div');
            uDiv.style = "background:var(--accent); color:white; padding:1rem; border-radius:1rem; border-bottom-right-radius:0; max-width:80%; align-self:flex-end; margin-left:auto; margin-bottom:1rem;";
            uDiv.innerText = userQuery;
            messages.appendChild(uDiv);
            input.value = '';
            messages.scrollTop = messages.scrollHeight;

            // Bot msg
            const bDiv = document.createElement('div');
            bDiv.style = "background:var(--bg-tertiary); padding:1rem; border-radius:1rem; border-bottom-left-radius:0; max-width:80%; margin-bottom:1rem;";
            bDiv.innerText = "Thinking...";
            messages.appendChild(bDiv);

            const reply = await getAssistantResponse(userQuery, state);
            bDiv.innerText = reply;
            messages.scrollTop = messages.scrollHeight;
        }
    }
});
