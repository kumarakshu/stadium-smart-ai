/**
 * SmartStadium AI - Admin Dashboard Logic
 */

let state = null;

async function init() {
    // 1. Load Data via shared state manager
    if (window.StateManager) await window.StateManager.init();
    
    // 2. Setup Interactions
    setupControls();
    setupBroadcasts();
    
    // Listen for Sync
    window.addEventListener('simulation_update', () => {
        refreshUI();
    });

    // 3. Initial Render
    refreshUI();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function refreshUI() {
    if (!window.state) return;
    renderMap();
    updateStats();
    updateIncidentLog();
}

function renderMap() {
    const mapBox = document.getElementById('admin-map-box');
    const svg = `
    <svg viewBox="0 0 160 90" class="stadium-svg">
        <rect x="0" y="0" width="160" height="90" fill="var(--bg-primary)" rx="4" />
        <rect x="50" y="25" width="60" height="40" fill="#15803d" opacity="0.4" />
        
        ${window.state.stadiums[0].zones.map(zone => {
            const color = zone.crowd < 30 ? 'var(--low)' : (zone.crowd < 70 ? 'var(--medium)' : 'var(--high)');
            let path = '';
            if (zone.id === 'north-stand') path = 'M 45 5 L 115 5 L 120 20 L 40 20 Z';
            if (zone.id === 'south-stand') path = 'M 40 70 L 120 70 L 115 85 L 45 85 Z';
            if (zone.id === 'west-stand') path = 'M 5 20 L 35 25 L 35 65 L 5 70 Z';
            if (zone.id === 'east-stand') path = 'M 125 25 L 155 20 L 155 70 L 125 65 Z';
            if (zone.id === 'gate-a') path = 'M 70 0 L 90 0 L 90 4 L 70 4 Z';
            if (zone.id === 'gate-b') path = 'M 70 86 L 90 86 L 90 90 L 70 90 Z';
            if (zone.id === 'food-court') path = 'M 10 75 L 40 75 L 40 85 L 10 85 Z';

            return `<path d="${path}" fill="${color}" opacity="0.8" stroke="white" stroke-width="0.5" />`;
        }).join('')}
    </svg>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    mapBox.textContent = '';
    mapBox.appendChild(doc.documentElement);
}

function setupControls() {
    const container = document.getElementById('zone-controls');
    container.textContent = '';
    
    state.zones.forEach(zone => {
        const row = document.createElement('div');
        row.className = 'control-row';
        
        const nameDiv = document.createElement('div');
        nameDiv.style.fontSize = '0.8rem';
        nameDiv.style.fontWeight = '600';
        nameDiv.textContent = zone.name;

        const valCont = document.createElement('div');
        valCont.style.display = 'flex';
        valCont.style.alignItems = 'center';
        valCont.style.gap = '0.5rem';

        const span = document.createElement('span');
        span.id = `val-${zone.id}`;
        span.style.fontSize = '0.8rem';
        span.style.minWidth = '30px';
        span.textContent = `${zone.crowd}%`;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.value = zone.crowd;
        input.dataset.id = zone.id;
        input.className = 'zone-slider';

        valCont.appendChild(span);
        valCont.appendChild(input);
        row.appendChild(nameDiv);
        row.appendChild(valCont);
        
        container.appendChild(row);
    });

    document.querySelectorAll('.zone-slider').forEach(slider => {
        slider.oninput = (e) => {
            const id = e.target.dataset.id;
            const val = parseInt(e.target.value);
            document.getElementById(`val-${id}`).innerText = `${val}%`;
            
            if (window.StateManager) {
                // Stadium ID handled by StateManager internally in this context
                window.StateManager.updateZone('ahmedabad', id, val);
            }
        };
    });
}

function updateStats() {
    if (!window.state) return;
    const avgWait = Math.round(window.state.stalls.reduce((acc, s) => acc + s.avg_wait, 0) / window.state.stalls.length);
    document.getElementById('stat-wait').innerText = `${avgWait}m`;
    
    const alertCount = window.state.emergency.active ? 1 : 0;
    const alertEl = document.getElementById('stat-alerts');
    alertEl.innerText = alertCount;
    alertEl.style.color = alertCount > 0 ? 'var(--sos)' : 'var(--low)';
}

function updateIncidentLog() {
    const log = document.getElementById('log-list');
    log.textContent = '';
    if (window.state.emergency.active) {
        const wrap = document.createElement('div');
        wrap.style.background = 'rgba(220, 38, 38, 0.1)';
        wrap.style.borderLeft = '3px solid var(--sos)';
        wrap.style.padding = '0.75rem';
        wrap.style.borderRadius = '0.25rem';
        
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.fontWeight = '700';
        header.style.color = 'var(--sos)';
        
        const s1 = document.createElement('span'); s1.textContent = 'ADMIN_BROADCAST';
        const s2 = document.createElement('span'); s2.textContent = 'JUST NOW';
        
        const msg = document.createElement('div');
        msg.style.marginTop = '0.25rem';
        msg.textContent = window.state.emergency.message;
        
        header.appendChild(s1);
        header.appendChild(s2);
        wrap.appendChild(header);
        wrap.appendChild(msg);
        log.appendChild(wrap);
    } else {
        const p = document.createElement('div');
        p.style.color = 'var(--text-secondary)';
        p.style.fontStyle = 'italic';
        p.textContent = 'No active incidents.';
        log.appendChild(p);
    }
}

function setupBroadcasts() {
    document.getElementById('br-evac').onclick = () => {
        if (window.StateManager) window.StateManager.setEmergency(true, 'MANDATORY EVACUATION: Please exit via the nearest gate calmly. Staff are here to assist.');
    };

    document.getElementById('br-clear').onclick = () => {
        if (window.StateManager) window.StateManager.setEmergency(false, '');
    };
}

init();
