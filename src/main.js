/**
 * SmartStadium AI - Main Entry Point
 * Modern Unified Controller
 */

let activeTab = 'map';

async function initApp() {
    console.log("SmartStadium: Booting System...");
    
    // 1. Initialize State Persistence
    if (window.StateManager) await window.StateManager.init();

    // 2. Setup Shared UI Logic
    setupNavigation();
    setupTheme();
    setupSOS();
    setupStaffControls();
    setupChatbot();
    setupVoiceAssistant();
    
    // Restore Session
    activeTab = localStorage.getItem('smartstadium_active_tab') || 'map';
    const savedStadium = localStorage.getItem('smartstadium_active_stadium');
    const select = document.getElementById('stadium-select');
    if (savedStadium && select) select.value = savedStadium;

    // Load Maps
    if (window.MapController) {
        window.MapController.init();
        if (savedStadium) window.MapController.setStadium(savedStadium, window.state);
    }
    
    syncTabUI();
    
    // 3. Global Update Listener
    window.addEventListener('simulation_update', (e) => {
        window.state = e.detail;
        updateDynamicUI();
    });

    // 4. Initial Render
    updateDynamicUI();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/** UI Synchronization Logic **/
function updateDynamicUI() {
    if (!window.state || !window.state.stadiums) return;

    // Smart Insight Banner & Predictive Analytics
    const insightEl = document.getElementById('live-insight');
    if (insightEl) {
        const id = document.getElementById('stadium-select')?.value;
        const stadium = window.state.stadiums.find(s => s.id === id);
        if (stadium) {
            const gates = stadium.zones.filter(z => z.type === 'entry').sort((a,b) => a.crowd - b.crowd);
            if (window.state.emergency?.active) {
                insightEl.textContent = '';
                const alertSpan = document.createElement('span');
                alertSpan.style.color = '#ef4444';
                alertSpan.style.fontWeight = '800';
                alertSpan.textContent = `🚨 SYSTEM ALERT: Evacuate via ${gates[0].name}`;
                insightEl.appendChild(alertSpan);
            } else if (gates.length > 0) {
                insightEl.innerText = `💡 Proactive Tip: Use ${gates[0].name} for faster entry (${gates[0].crowd}% crowd).`;
                
                // Advanced: Geo-fenced Push Notification Simulation
                const crowdedGates = stadium.zones.filter(z => z.type === 'entry' && z.crowd > 85);
                if (crowdedGates.length > 0 && !window.state.alertSent) {
                    window.state.alertSent = true;
                    if (Notification.permission === "granted") {
                        new Notification("SmartStadium AI Alert", {
                            body: `Predictive Alert: ${crowdedGates[0].name} is reaching maximum capacity. Expect delays.`,
                            icon: 'favicon.png'
                        });
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission();
                    }
                }
            }
        }
    }

    if (activeTab === 'stalls') renderStalls();
    if (activeTab === 'staff') renderStaff();
    if (window.MapController) window.MapController.renderZones(window.state);
}

function renderStalls() {
    const container = document.getElementById('stall-container');
    if (!container || !window.state.stalls) return;
    container.innerHTML = '';
    
    window.state.stalls.forEach(stall => {
        const color = stall.avg_wait < 10 ? '#22c55e' : (stall.avg_wait < 25 ? '#eab308' : '#ef4444');
        const card = document.createElement('div');
        card.className = 'stall-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <div>
                   <h4 style="font-size:1.1rem;">${stall.name}</h4>
                   <p style="font-size:0.75rem; color:var(--text-2);">${stall.location}</p>
                </div>
                <span class="badge" style="background:${color}22; color:${color}; border:1px solid ${color}44;">${stall.avg_wait}m wait</span>
            </div>
            <div class="wait-bar-container"><div class="wait-bar" style="width:${Math.min(100, (stall.avg_wait/40)*100)}%; background:${color};"></div></div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                <span style="font-size:0.7rem; color:var(--text-2);">Queue: ${stall.queue_length}p</span>
                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="joinStall('${stall.id}')">Reserve</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderStaff() {
    const container = document.getElementById('staff-controls');
    if (!container) return;
    const stadium = window.state.stadiums.find(s => s.id === (document.getElementById('stadium-select')?.value));
    if (!stadium) return;
    container.innerHTML = '';

    stadium.zones.forEach(zone => {
        const div = document.createElement('div');
        div.className = 'staff-control-card';
        div.style = "margin-bottom:1rem; padding:1rem; background:var(--bg-3); border-radius:var(--radius-md);";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <span style="font-size:0.85rem; font-weight:700;">${zone.name}</span>
                <span style="font-size:0.85rem;">Crowd: ${zone.crowd}%</span>
            </div>
            <input type="range" min="0" max="100" value="${zone.crowd}" oninput="StateManager.updateZone('${stadium.id}', '${zone.id}', this.value)" style="width:100%; accent-color:var(--accent);">
        `;
        container.appendChild(div);
    });
}

/** Event Listeners & Setups **/
function setupNavigation() {
    document.getElementById('stadium-select').onchange = (e) => {
        localStorage.setItem('smartstadium_active_stadium', e.target.value);
        if (window.MapController) window.MapController.setStadium(e.target.value, window.state);
        updateDynamicUI();
    };

    document.getElementById('sim-location').onclick = () => {
        const stadium = window.state.stadiums.find(s => s.id === document.getElementById('stadium-select').value);
        if (window.MapController) window.MapController.simulateUser({ lat: stadium.coords.lat - 0.001, lng: stadium.coords.lng });
    };

    document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
        item.onclick = () => {
             const target = item.dataset.tab;
             if (target === 'staff') {
                const pin = prompt("Staff PIN:");
                if (pin !== '1234') return alert("Access denied.");
             }
             activeTab = target;
             localStorage.setItem('smartstadium_active_tab', activeTab);
             syncTabUI();
             updateDynamicUI();
        };
    });
}

function syncTabUI() {
    document.querySelectorAll('.menu-item, .nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll(`[data-tab="${activeTab}"]`).forEach(i => i.classList.add('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    const content = document.getElementById(`content-${activeTab}`);
    if (content) content.style.display = (activeTab === 'stalls') ? 'block' : 'flex';
    
    const title = document.getElementById('view-title');
    if (title) title.innerHTML = `<i data-lucide="info"></i> ${activeTab.toUpperCase()} OVERVIEW`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/** 
 * Elite Voice Assistant Setup 
 */
function setupVoiceAssistant() {
    const toggle = document.getElementById('voice-toggle');
    const status = document.getElementById('voice-status');
    const icon = document.getElementById('voice-icon');
    
    // Restore
    const isEnabled = localStorage.getItem('smartstadium_voice') === 'true';
    if (window.AssistantController) window.AssistantController.voiceEnabled = isEnabled;
    if (isEnabled && status) status.style.display = 'block';

    toggle.onclick = () => {
        const next = !window.AssistantController.voiceEnabled;
        window.AssistantController.voiceEnabled = next;
        localStorage.setItem('smartstadium_voice', next);
        
        if (status) status.style.display = next ? 'block' : 'none';
        
        // Haptic feedback simulation (Visual)
        toggle.style.transform = 'scale(0.9)';
        setTimeout(() => toggle.style.transform = 'scale(1)', 100);
    };
}

function setupTheme() {
    const toggle = document.getElementById('theme-toggle');
    toggle.onclick = () => {
        const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('smartstadium_theme', next);
        const icon = document.getElementById('theme-icon');
        icon.setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun');
        lucide.createIcons();
    };
}

function setupSOS() {
    const btn = document.getElementById('sos-btn');
    btn.onclick = () => {
        if (confirm("Emergency SOS?")) {
            window.StateManager.setEmergency(true, "SOS TRIGGERED");
            const stadium = window.state.stadiums.find(s => s.id === document.getElementById('stadium-select').value);
            const exit = stadium.zones.find(z => z.type === 'entry');
            const exitPos = { lat: stadium.coords.lat + (StadiumOffsets[exit.id]?.lat || 0), lng: stadium.coords.lng + (StadiumOffsets[exit.id]?.lng || 0) };
            if (window.MapController) window.MapController.drawEvacuationPath(exitPos);
        }
    };
}

function setupStaffControls() {
    document.getElementById('trigger-evac').onclick = () => {
        if (confirm("Evacuate Stadium?")) window.StateManager.setEmergency(true, "EVACUATE NOW");
    };
    document.getElementById('clear-evac').onclick = () => {
        if (confirm("Clear Emergency?")) window.StateManager.setEmergency(false, "");
    };
}

function setupChatbot() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const messages = document.getElementById('chat-messages');

    if (!input || !sendBtn || !messages) return;

    const handleSend = async (overrideQuery = null) => {
        const query = overrideQuery || input.value.trim();
        if (!query) return;

        // Add user message
        appendMessage('user', query);
        input.value = '';

        // Add thinking indicator with Shimmer Effect
        const thinkingEl = appendMessage('bot', '');
        thinkingEl.classList.add('thinking');

        // Get AI response
        const response = await window.AssistantController.getResponse(query);
        
        // Update thinking indicator with actual response
        if (thinkingEl) {
            thinkingEl.classList.remove('thinking');
            thinkingEl.innerText = response;
        }
        
        messages.scrollTop = messages.scrollHeight;
    };

    const appendMessage = (type, text) => {
        const div = document.createElement('div');
        div.className = `msg msg-${type}`;
        div.setAttribute('tabindex', '0'); // Accessibility
        div.textContent = text; // 100% XSS proof native injection
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    };

    sendBtn.onclick = () => handleSend();
    input.onkeypress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    if (micBtn && window.AssistantController) {
        micBtn.onclick = () => {
            micBtn.style.color = '#ef4444'; // Red to indicate listening
            micBtn.style.borderColor = '#ef4444';
            
            window.AssistantController.listen(
                (transcript) => {
                    input.value = transcript;
                    handleSend(transcript);
                },
                (err) => {
                    console.error("Speech Error:", err);
                    alert("Voice recognition error: " + err);
                },
                () => {
                    // Reset UI
                    micBtn.style.color = 'inherit';
                    micBtn.style.borderColor = 'var(--border)';
                }
            );
        };
    }
}

// Global scope joinStall
window.joinStall = (id) => alert("Reservation confirmed. AI will notify you when your turn is near.");

document.addEventListener('DOMContentLoaded', initApp);
