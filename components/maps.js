/**
 * SmartStadium AI - Google Maps Integration
 */

let googleMap = null;
let zoneOverlays = [];
let labelMarkers = [];
let userMarker = null;
let routingLine = null;

const StadiumMap = {
    init() {
        console.log('StadiumMap: Initializing...');
        const mapBox = document.getElementById('map-box');
        if (!mapBox) return;

        if (!CONFIG.GOOGLE_MAPS_API_KEY || CONFIG.GOOGLE_MAPS_API_KEY.includes('YOUR_')) {
            mapBox.innerHTML = 
                `<div style="height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:2rem; text-align:center;">
                    <i data-lucide="map-pin-off" style="width:48px; height:48px; color:var(--text-secondary);"></i>
                    <p style="margin-top:1rem;">Google Maps API Key Missing</p>
                    <small style="color:var(--text-secondary);">Please insert your key in config.js to view the live GPS map.</small>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initGoogleMap`;
            script.async = true;
            document.head.appendChild(script);
        } else {
            window.initGoogleMap();
        }
    },

    setStadium(stadiumId, fullState) {
        if (!fullState || !fullState.stadiums) return;
        const stadium = fullState.stadiums.find(s => s.id === stadiumId);
        if (!stadium) return;

        if (googleMap) {
            googleMap.setCenter(stadium.coords);
            googleMap.setZoom(17);
            this.renderZones(fullState);
            
            if (userMarker) {
                 userMarker.setPosition({ lat: stadium.coords.lat - 0.001, lng: stadium.coords.lng });
            }
        }
    },

    renderZones(fullState) {
        if (!googleMap || !fullState || !fullState.stadiums) return;
        const currentStadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
        const stadium = fullState.stadiums.find(s => s.id === currentStadiumId);
        if (!stadium) return;
        
        // Clear existing overlays and labels
        zoneOverlays.forEach(overlay => overlay.setMap(null));
        labelMarkers.forEach(marker => marker.setMap(null));
        zoneOverlays = [];
        labelMarkers = [];

        stadium.zones.forEach(zone => {
            const color = zone.crowd < 30 ? '#22c55e' : (zone.crowd < 70 ? '#eab308' : '#ef4444');
            const offset = this.getOffset(zone.id);
            const pos = { 
                lat: stadium.coords.lat + offset.lat, 
                lng: stadium.coords.lng + offset.lng 
            };

            // 1. Draw Heatmap Circle
            const circle = new google.maps.Circle({
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: color,
                fillOpacity: 0.5,
                map: googleMap,
                center: pos,
                radius: zone.type === 'entry' ? 30 : 50 // Gates are smaller, stands larger
            });

            // 2. Clearer Text Label
            const labelMarker = new google.maps.Marker({
                position: pos,
                map: googleMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0 // Invisible icon, only show label
                },
                label: {
                    text: `${zone.name}\n${zone.crowd}%`,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    className: 'map-label' // Can be styled in CSS if needed
                }
            });

            zoneOverlays.push(circle);
            labelMarkers.push(labelMarker);
        });
    },

    simulateUser(stadiumId, fullState) {
        if (!googleMap || !fullState || !fullState.stadiums) return;
        const stadium = fullState.stadiums.find(s => s.id === stadiumId);
        if (!stadium) return;

        if (!userMarker) {
            userMarker = new google.maps.Marker({
                position: { lat: stadium.coords.lat - 0.001, lng: stadium.coords.lng },
                map: googleMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 3,
                },
                title: 'You',
                zIndex: 999
            });
        } else {
            userMarker.setPosition({ lat: stadium.coords.lat - 0.001, lng: stadium.coords.lng });
        }
        googleMap.panTo(userMarker.getPosition());
    },

    drawRouteTo(destinationCoords) {
        if (!googleMap || !userMarker) {
            alert("Please click 'Simulate Me' first to set your location!");
            return;
        }

        if (routingLine) routingLine.setMap(null);

        routingLine = new google.maps.Polyline({
            path: [userMarker.getPosition(), destinationCoords],
            geodesic: true,
            strokeColor: '#2563eb',
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: googleMap,
            icons: [{
                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#fff' },
                offset: '0%',
                repeat: '20px'
            }]
        });

        googleMap.fitBounds(new google.maps.LatLngBounds()
            .extend(userMarker.getPosition())
            .extend(destinationCoords));
    },

    getOffset(zoneId) {
        // Optimized logical offsets (Roughly aligned with Narendra Modi and Wankhede bowls)
        const offsets = {
            // Ahmedabad (Narendra Modi) - Massive scale
            'north-stand': { lat: 0.0009, lng: 0 },
            'south-stand': { lat: -0.0009, lng: 0 },
            'west-stand': { lat: 0, lng: -0.0011 },
            'east-stand': { lat: 0, lng: 0.0011 },
            'gate-a': { lat: 0.0018, lng: 0.001 },
            'gate-b': { lat: -0.0018, lng: -0.001 },
            'food-court': { lat: 0, lng: 0.0015 },

            // Mumbai (Wankhede)
            'tendulkar-stand': { lat: 0.0003, lng: 0.0008 },
            'gavaskar-stand': { lat: -0.0008, lng: 0 },
            'garware-stand': { lat: 0.0003, lng: -0.0008 },
            'gate-1': { lat: 0.0012, lng: 0.0002 },
            'gate-3': { lat: -0.0012, lng: -0.0004 },
            'north-stand-m': { lat: 0.0008, lng: 0 }
        };
        return offsets[zoneId] || { lat: 0, lng: 0 };
    }
};

window.initGoogleMap = () => {
    console.log('SmartStadium Maps: API Loaded. Checking state...');

    if (!window.state || !window.state.stadiums || window.state.stadiums.length === 0) {
        console.warn('SmartStadium Maps: State not ready, retrying in 500ms...');
        setTimeout(window.initGoogleMap, 500);
        return;
    }

    const selectEl = document.getElementById('stadium-select');
    const currentStadiumId = selectEl?.value || 'ahmedabad';
    const stadium = window.state.stadiums.find(s => s.id === currentStadiumId);

    if (!stadium) {
        console.error('SmartStadium Maps: No stadium found for', currentStadiumId);
        return;
    }

    googleMap = new google.maps.Map(document.getElementById('map-box'), {
        center: stadium.coords,
        zoom: 17,
        mapTypeId: 'satellite',
        gestureHandling: 'greedy',
        tilt: 45,
        styles: [
            { 'featureType': 'all', 'elementType': 'labels.text.fill', 'stylers': [{ 'color': '#ffffff' }] }
        ]
    });

    console.log('SmartStadium Maps: Map Rendered for', stadium.name);
    StadiumMap.renderZones(window.state);
    
    const box = document.getElementById('map-box');
    if (box) {
        box.style.background = 'var(--bg-secondary)';
    }
};

window.addEventListener('simulation_update', (e) => {
    if (window.state && StadiumMap) StadiumMap.renderZones(window.state);
});
