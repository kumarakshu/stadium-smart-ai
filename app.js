/**
 * SmartStadium AI - Unified Controller
 */

let state = null;
let activeTab = 'map';

async function init() {
    // 1. Initial State
    const saved = localStorage.getItem('smartstadium_data');
    if (saved) {
        state = JSON.parse(saved);
    } else {
        const res = await fetch('data/mockData.json');
        state = await res.json();
        saveState();
    }

    // 2. Setup Components
    setupNavigation();
    setupTheme();
    setupSOS();
    StadiumMap.init();
    
    // 3. Listen for simulation updates
    window.addEventListener('simulation_update', (e) => {
        state = e.detail;
        updateUI();
    });

    // 4. Initial Render
    updateUI();
    lucide.createIcons();
}

function saveState() {
    localStorage.setItem('smartstadium_data', JSON.stringify(state));
}

function updateUI() {
    // Update Map Insight
    const insightEl = document.getElementById('live-insight');
    if (insightEl) {
        const id = document.getElementById('stadium-select')?.value || 'ahmedabad';
        const stadium = state.stadiums.find(s => s.id === id);
        const gates = stadium.zones.filter(z => z.type === 'entry').sort((a,b) => a.crowd - b.crowd);
        insightEl.innerText = `${gates[0].name} is currently the least crowded (${gates[0].crowd}%).`;
    }

    // Update Stalls
    if (activeTab === 'stalls') renderStalls();
    
    // Update Staff
    if (activeTab === 'staff') renderStaff();
}

function renderStalls() {
    const container = document.getElementById('stall-container');
    if (!container) return;
    container.innerHTML = '';

    state.stalls.forEach(stall => {
        const card = document.createElement('div');
        card.className = 'stall-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                <h4 style="font-size:1.1rem;">${stall.name}</h4>
                <span class="badge" style="background:${stall.avg_wait < 10 ? 'var(--low)' : 'var(--medium)'}; color:white;">
                    ${stall.avg_wait}m wait
                </span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1.5rem;">Located at: ${stall.location}</p>
            <button class="btn btn-primary" style="width:100%; border-radius:0.5rem;" onclick="joinStall('${stall.id}')">Join Virtual Queue</button>
        `;
        container.appendChild(card);
    });
}

function renderStaff() {
    const container = document.getElementById('staff-controls');
    if (!container) return;
    container.innerHTML = '';

    const id = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = state.stadiums.find(s => s.id === id);

    stadium.zones.forEach(zone => {
        const div = document.createElement('div');
        div.style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding:0.75rem; background:var(--bg-tertiary); border-radius:0.5rem;";
        div.innerHTML = `
            <span style="font-size:0.85rem; font-weight:600;">${zone.name}</span>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.8rem; font-weight:700; min-width:30px;">${zone.crowd}%</span>
                <input type="range" min="0" max="100" value="${zone.crowd}" oninput="updateZone('${id}', '${zone.id}', this.value)" style="width:80px;">
            </div>
        `;
        container.appendChild(div);
    });
}

window.updateZone = (stadiumId, zoneId, val) => {
    const stadium = state.stadiums.find(s => s.id === stadiumId);
    const zone = stadium.zones.find(z => z.id === zoneId);
    zone.crowd = parseInt(val);
    saveState();
    window.dispatchEvent(new CustomEvent('simulation_update', { detail: state }));
}

function setupNavigation() {
    // Stadium Switcher
    const select = document.getElementById('stadium-select');
    select.onchange = (e) => {
        StadiumMap.setStadium(e.target.value, state);
        updateUI();
    };

    // Simulate Location
    document.getElementById('sim-location').onclick = () => {
        StadiumMap.simulateUser(select.value, state);
        alert("Simulated location set at stadium entrance!");
    };

    // Find Washroom
    document.getElementById('find-washroom').onclick = () => {
        const stadium = state.stadiums.find(s => s.id === select.value);
        StadiumMap.drawRouteTo(stadium.amenities[0].coords);
        alert(`Navigating to nearest washroom in ${stadium.name}...`);
    };

    const items = document.querySelectorAll('.menu-item, .nav-item');
    items.forEach(item => {
        item.onclick = () => {
            const nextTab = item.dataset.tab;
            
            // Security for Staff Tab
            if (nextTab === 'staff') {
                const pin = prompt("Enter Staff PIN:");
                if (pin !== '1234') {
                    alert("Unauthorized access!");
                    return;
                }
            }

            activeTab = nextTab;
            
            // UI Switch
            items.forEach(i => i.classList.remove('active'));
            document.querySelectorAll(`[data-tab="${activeTab}"]`).forEach(i => i.classList.add('active'));
            
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`content-${activeTab}`).style.display = activeTab === 'map' ? 'flex' : 'block';
            
            document.getElementById('view-title').innerText = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + " View";
            
            updateUI();
            lucide.createIcons();
        };
    });
}

function setupTheme() {
    const btn = document.getElementById('theme-toggle');
    btn.onclick = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
    };
}

function setupSOS() {
    document.getElementById('sos-btn').onclick = () => {
        if(confirm("Emergency! Send SOS to command center?")) {
            alert("Emergency broadcast sent. Follow instructions on Map.");
            state.emergency = { active: true, message: "EMERGENCY: EVACUATE NOW" };
            saveState();
            window.dispatchEvent(new CustomEvent('simulation_update', { detail: state }));
        }
    }
}

init();
