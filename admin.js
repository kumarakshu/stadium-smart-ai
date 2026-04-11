/**
 * SmartStadium AI - Admin Dashboard Logic
 */

let state = null;

async function init() {
    // 1. Load Data
    const savedData = localStorage.getItem('smartstadium_data');
    if (savedData) {
        state = JSON.parse(savedData);
    } else {
        const response = await fetch('data/mockData.json');
        state = await response.json();
    }

    // 2. Setup Interactions
    setupControls();
    setupBroadcasts();
    
    // Listen for User SOS
    window.addEventListener('storage', (e) => {
        if (e.key === 'smartstadium_data') {
            state = JSON.parse(e.newValue);
            refreshUI();
        }
    });

    // 3. Initial Render
    refreshUI();
    lucide.createIcons();
}

function saveState() {
    localStorage.setItem('smartstadium_data', JSON.stringify(state));
}

function refreshUI() {
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
        
        ${state.zones.map(zone => {
            const color = zone.crowd < 30 ? 'var(--low)' : (zone.crowd < 70 ? 'var(--medium)' : 'var(--high)');
            let path = "";
            if (zone.id === 'north-stand') path = "M 45 5 L 115 5 L 120 20 L 40 20 Z";
            if (zone.id === 'south-stand') path = "M 40 70 L 120 70 L 115 85 L 45 85 Z";
            if (zone.id === 'west-stand') path = "M 5 20 L 35 25 L 35 65 L 5 70 Z";
            if (zone.id === 'east-stand') path = "M 125 25 L 155 20 L 155 70 L 125 65 Z";
            if (zone.id === 'gate-a') path = "M 70 0 L 90 0 L 90 4 L 70 4 Z";
            if (zone.id === 'gate-b') path = "M 70 86 L 90 86 L 90 90 L 70 90 Z";
            if (zone.id === 'food-court') path = "M 10 75 L 40 75 L 40 85 L 10 85 Z";

            return `<path d="${path}" fill="${color}" opacity="0.8" stroke="white" stroke-width="0.5" />`;
        }).join('')}
    </svg>`;
    mapBox.innerHTML = svg;
}

function setupControls() {
    const container = document.getElementById('zone-controls');
    container.innerHTML = '';
    
    state.zones.forEach(zone => {
        const row = document.createElement('div');
        row.className = 'control-row';
        row.innerHTML = `
            <div style="font-size: 0.8rem; font-weight: 600;">${zone.name}</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span id="val-${zone.id}" style="font-size: 0.8rem; min-width: 30px;">${zone.crowd}%</span>
                <input type="range" min="0" max="100" value="${zone.crowd}" data-id="${zone.id}" class="zone-slider">
            </div>
        `;
        container.appendChild(row);
    });

    document.querySelectorAll('.zone-slider').forEach(slider => {
        slider.oninput = (e) => {
            const id = e.target.dataset.id;
            const val = parseInt(e.target.value);
            document.getElementById(`val-${id}`).innerText = `${val}%`;
            
            const zone = state.zones.find(z => z.id === id);
            zone.crowd = val;
            saveState();
            renderMap();
        };
    });
}

function updateStats() {
    const avgWait = Math.round(state.stalls.reduce((acc, s) => acc + s.avg_wait, 0) / state.stalls.length);
    document.getElementById('stat-wait').innerText = `${avgWait}m`;
    
    const alertCount = state.emergency.active ? 1 : 0;
    const alertEl = document.getElementById('stat-alerts');
    alertEl.innerText = alertCount;
    alertEl.style.color = alertCount > 0 ? 'var(--sos)' : 'var(--low)';
}

function updateIncidentLog() {
    const log = document.getElementById('log-list');
    if (state.emergency.active) {
        log.innerHTML = `
            <div style="background: rgba(220, 38, 38, 0.1); border-left: 3px solid var(--sos); padding: 0.75rem; border-radius: 0.25rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--sos);">
                    <span>${state.emergency.type}</span>
                    <span>JUST NOW</span>
                </div>
                <div style="margin-top: 0.25rem;">${state.emergency.message}</div>
            </div>
        `;
    } else {
        log.innerHTML = `<div style="color: var(--text-secondary); font-style: italic;">No active incidents.</div>`;
    }
}

function setupBroadcasts() {
    document.getElementById('br-evac').onclick = () => {
        state.emergency = {
            active: true,
            type: 'ADMIN_BROADCAST',
            message: "MANDATORY EVACUATION: Please exit via the nearest gate calmly. Staff are here to assist."
        };
        saveState();
        refreshUI();
    };

    document.getElementById('br-clear').onclick = () => {
        state.emergency = {
            active: false,
            type: null,
            message: ""
        };
        saveState();
        refreshUI();
    };
}

init();
