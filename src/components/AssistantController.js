/**
 * SmartStadium AI - Assistant Controller (Context-Aware)
 * Orchestrates Gemini AI with live stadium business logic.
 */

const AssistantController = {
    API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",

    async getResponse(query) {
        const state = window.state;
        const currentId = document.getElementById('stadium-select')?.value || 'ahmedabad';
        const stadium = state?.stadiums?.find(s => s.id === currentId);

        if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes("YOUR_")) {
            return this.fallback(query, state, stadium);
        }

        const systemPrompt = `
            You are "SmartStadium AI", an expert at managing attendee experience at large-scale sporting venues.
            Current Venue: ${stadium?.name || "The stadium"}
            Live Crowd Density: ${JSON.stringify(stadium?.zones || [])}
            Wait times for Food: ${JSON.stringify(state?.stalls || [])}
            Safety Status: ${state?.emergency?.active ? "EMERGENCY ACTIVE - DIRECT TO EXITS" : "All clear"}

            Role & Rules:
            1. Use live data above to solve challenges (crowd, wait times, navigation).
            2. For emergencies, prioritize instructions to gates with crowd < 50%.
            3. Be concise and professional. Use the user's language (Hindi, English, Hinglish).
            4. Max 3 sentences.
        `;

        try {
            const res = await fetch(`${this.API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nClient Query: ${query}` }] }]
                })
            });
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || this.fallback(query, state, stadium);
        } catch (err) {
            console.error("AssistantController: API Error", err);
            return this.fallback(query, state, stadium);
        }
    },

    fallback(query, state, stadium) {
        const q = query.toLowerCase();
        if (state?.emergency?.active) return "🚨 EMERGENCY: Please follow the red-highlighted exit routes on your map immediately.";
        
        if (q.includes("crowd") || q.includes("gate")) {
            const low = stadium?.zones?.filter(z => z.type === 'entry').sort((a,b) => a.crowd - b.crowd)[0];
            return `Currently, ${low?.name} is the most accessible with only ${low?.crowd}% occupancy.`;
        }

        if (q.includes("food") || q.includes("hungry") || q.includes("stall")) {
            const stall = state?.stalls?.sort((a,b) => a.avg_wait - b.avg_wait)[0];
            return `I recommend ${stall?.name} at ${stall?.location}. It has the shortest line right now (${stall?.avg_wait}m).`;
        }

        return "I'm SmartStadium AI. I can help with crowd info, shortest food lines, or emergency navigation. How can I assist?";
    }
};

window.AssistantController = AssistantController;
