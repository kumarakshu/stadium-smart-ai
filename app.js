/**
 * SmartStadium AI - Unified Controller (V2 Premium)
 */

let activeTab = 'map';

async function init() {
    console.log('SmartStadium: Initializing Premium App...');
    
    // 1. Initial State Load
    const saved = localStorage.getItem('smartstadium_data');
    if (saved) {
        window.state = JSON.parse(saved);
    } else {
        try {
            const res = await fetch('data/mockData.json');
            window.state = await res.json();
            saveState();
        } catch (err) {
            console.error('Failed to load mock data:', err);
            window.state = { stadiums: [], stalls: [], emergency: { active: false } };
        }
    }

    // 2. Setup Components & Restoration
    setupNavigation();
    setupTheme();
    setupSOS();
    setupStaffControls();
    
    // Restore Session UI
    activeTab = localStorage.getItem('smartstadium_active_tab') || 'map';
    const savedStadium = localStorage.getItem('smartstadium_active_stadium');
    const select = document.getElementById('stadium-select');
    if (savedStadium && select) select.value = savedStadium;

    // Restore Theme
    const savedTheme = localStorage.getItem('smartstadium_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    if (typeof StadiumMap !== 'undefined') {
        StadiumMap.init();
        if (savedStadium) StadiumMap.setStadium(savedStadium, window.state);
    }
    
    syncTabUI();
    
    // 3. Simulation Listeners
    window.addEventListener('simulation_update', (e) => {
        window.state = e.detail;
        updateUI();
    });

    // 4. Initial Render
    updateUI();
    lucide.createIcons();
}

function saveState() {
    if (window.state) localStorage.setItem('smartstadium_data', JSON.stringify(window.state));
}

function updateUI() {
    if (!window.state || !window.state.stadiums) return;

    // Update Floating Insight
    const insightEl = document.getElementById('live-insight');
    if (insightEl) {
        const id = document.getElementById('stadium-select')?.value;
        const stadium = window.state.stadiums.find(s => s.id === id);
        if (stadium) {
            const gates = stadium.zones.filter(z => z.type === 'entry').sort((a,b) => a.crowd - b.crowd);
            if (gates.length > 0) {
                insightEl.innerText = `${gates[0].name} has the shortest queue (${gates[0].crowd}%).`;
            }
            if (window.state.emergency?.active) {
                insightEl.innerHTML = `<span style="color:var(--high)">⚠️ EMERGENCY ACTIVE: Follow Exits</span>`;
            }
        }
    }

    if (activeTab === 'stalls') renderStalls();
    if (activeTab === 'staff') renderStaff();
}

function renderStalls() {
    if (!window.state || !window.state.stalls) return;
    const container = document.getElementById('stall-container');
    if (!container) return;
    container.innerHTML = '';

    window.state.stalls.forEach(stall => {
        const waitPercent = Math.min(100, (stall.avg_wait / 40) * 100);
        const color = stall.avg_wait < 10 ? 'var(--low)' : (stall.avg_wait < 25 ? 'var(--medium)' : 'var(--high)');
        
        const card = document.createElement('div');
        card.className = 'stall-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                   <h4 style="font-size:1.1rem; margin-bottom:2px;">${stall.name}</h4>
                   <p style="font-size:0.75rem; color:var(--text-2);"><i data-lucide="map-pin" style="width:12px; height:12px; vertical-align:middle;"></i> ${stall.location}</p>
                </div>
                <span class="badge" style="background:${color}22; color:${color}; border:1px solid ${color}44;">
                    ${stall.avg_wait}m wait
                </span>
            </div>
            
            <div class="wait-bar-container">
                <div class="wait-bar" style="width:${waitPercent}%; background:${color};"></div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                <span style="font-size:0.7rem; color:var(--text-2); font-weight:600;">Queue: ${stall.queue_length} people</span>
                <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="joinStall('${stall.id}')">Reserve</button>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

function renderStaff() {
    if (!window.state || !window.state.stadiums) return;
    const container = document.getElementById('staff-controls');
    if (!container) return;
    container.innerHTML = '';

    const id = document.getElementById('stadium-select')?.value;
    const stadium = window.state.stadiums.find(s => s.id === id);
    if (!stadium) return;

    stadium.zones.forEach(zone => {
        const statusColor = zone.crowd < 30 ? 'var(--low)' : (zone.crowd < 70 ? 'var(--medium)' : 'var(--high)');
        const div = document.createElement('div');
        div.style = 'margin-bottom:1.25rem; padding:1.25rem; background:var(--bg-3); border-radius:var(--radius-md); border:1px solid var(--border);';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <span style="font-size:0.9rem; font-weight:700;">${zone.name}</span>
                <span style="font-size:0.9rem; font-weight:800; color:${statusColor}">${zone.crowd}%</span>
            </div>
            <input type="range" min="0" max="100" value="${zone.crowd}" 
                oninput="updateZone('${id}', '${zone.id}', this.value)" 
                style="width:100%; accent-color:var(--accent); cursor:pointer;">
        `;
        container.appendChild(div);
    });
}

window.updateZone = (stadiumId, zoneId, val) => {
    if (!window.state) return;
    const stadium = window.state.stadiums.find(s => s.id === stadiumId);
    if (!stadium) return;
    const zone = stadium.zones.find(z => z.id === zoneId);
    if (zone) zone.crowd = parseInt(val);
    saveState();
    window.dispatchEvent(new CustomEvent('simulation_update', { detail: window.state }));
};

function setupNavigation() {
    // Stadium Switch
    const select = document.getElementById('stadium-select');
    if (select) {
        select.onchange = (e) => {
            const sid = e.target.value;
            localStorage.setItem('smartstadium_active_stadium', sid);
            if (typeof StadiumMap !== 'undefined') StadiumMap.setStadium(sid, window.state);
            updateUI();
        };
    }

    const simBtn = document.getElementById('sim-location');
    if (simBtn) {
        simBtn.onclick = () => {
             if (typeof StadiumMap !== 'undefined' && select) StadiumMap.simulateUser(select.value, window.state);
        };
    }

    // Tab Switching (Desktop & Mobile Navs)
    const items = document.querySelectorAll('.menu-item, .nav-item');
    items.forEach(item => {
        item.onclick = () => {
            const nextTab = item.dataset.tab;
            if (nextTab === 'staff') {
                const pin = prompt('Staff Authentication Required (PIN):');
                if (pin !== '1234') { return alert('Unauthorized access!'); }
            }
            activeTab = nextTab;
            localStorage.setItem('smartstadium_active_tab', activeTab);
            syncTabUI();
            updateUI();
        };
    });
}

function syncTabUI() {
    const items = document.querySelectorAll('.menu-item, .nav-item');
    items.forEach(i => i.classList.remove('active'));
    document.querySelectorAll(`[data-tab="${activeTab}"]`).forEach(i => i.classList.add('active'));
    
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const targetContent = document.getElementById(`content-${activeTab}`);
    if (targetContent) {
        targetContent.style.display = activeTab === 'map' ? 'flex' : (activeTab === 'assistant' || activeTab === 'staff' ? 'flex' : 'block');
    }
    const titleEl = document.getElementById('view-title');
    if (titleEl) {
        const iconMap = { 'map': 'map', 'assistant': 'bot', 'stalls': 'utensils', 'staff': 'shield' };
        const iName = iconMap[activeTab] || 'info';
        titleEl.innerHTML = `<i data-lucide="${iName}" style="width: 20px; height: 20px;"></i> ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Overview`;
    }
    lucide.createIcons();
}

function setupTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.onclick = () => {
        const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('smartstadium_theme', next);
        updateThemeIcon(next);
    };
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
        lucide.createIcons();
    }
}

function setupStaffControls() {
    const triggerBtn = document.getElementById('trigger-evac');
    if (triggerBtn) {
        triggerBtn.onclick = () => {
            if(confirm('ALERT: Broadcast stadium-wide evacuation?')) {
                window.state.emergency = { active: true, message: 'EMERGENCY: EVACUATE NOW' };
                saveState();
                window.dispatchEvent(new CustomEvent('simulation_update', { detail: window.state }));
            }
        };
    }

    const clearBtn = document.getElementById('clear-evac');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if(confirm('End emergency mode?')) {
                window.state.emergency = { active: false, message: '' };
                saveState();
                window.dispatchEvent(new CustomEvent('simulation_update', { detail: window.state }));
            }
        };
    }
}

function setupSOS() {
    const btn = document.getElementById('sos-btn');
    if (!btn) return;
    btn.onclick = () => {
        if(confirm('Emergency! Send SOS to command center?')) {
            alert('Emergency broadcast sent. AI is calculating your exit path.');
            if (window.state) {
                window.state.emergency = { active: true, message: 'EMERGENCY: EVACUATE NOW' };
                saveState();
                window.dispatchEvent(new CustomEvent('simulation_update', { detail: window.state }));
            }
        }
    };
}

window.joinStall = () => alert("Spot Reserved! Check the 'AI Assistant' for your turn notifications.");

document.addEventListener('DOMContentLoaded', init);
