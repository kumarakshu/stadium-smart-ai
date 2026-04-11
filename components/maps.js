/**
 * SmartStadium AI - Google Maps Integration
 */

let googleMap = null;
let zoneOverlays = [];
let userMarker = null;
let routingLine = null;

const StadiumMap = {
    init() {
        if (!CONFIG.GOOGLE_MAPS_API_KEY || CONFIG.GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
            document.getElementById('map-box').innerHTML = 
                `<div style="height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:2rem; text-align:center;">
                    <i data-lucide="map-pin-off" style="width:48px; height:48px; color:var(--text-secondary);"></i>
                    <p style="margin-top:1rem;">Google Maps API Key Missing</p>
                    <small style="color:var(--text-secondary);">Please insert your key in config.js to view the live GPS map.</small>
                </div>`;
            lucide.createIcons();
            return;
        }

        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initGoogleMap`;
            script.async = true;
            document.head.appendChild(script);
        } else {
            initGoogleMap();
        }
    },

    setStadium(stadiumId, fullState) {
        const stadium = fullState.stadiums.find(s => s.id === stadiumId);
        if (!stadium) return;

        if (googleMap) {
            googleMap.setCenter(stadium.coords);
            googleMap.setZoom(17);
            this.renderZones(fullState);
        }
    },

    renderZones(fullState) {
        if (!googleMap) return;
        const currentStadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
        const stadium = fullState.stadiums.find(s => s.id === currentStadiumId);
        
        // Clear existing overlays
        zoneOverlays.forEach(overlay => overlay.setMap(null));
        zoneOverlays = [];

        stadium.zones.forEach(zone => {
            const color = zone.crowd < 30 ? '#22c55e' : (zone.crowd < 70 ? '#eab308' : '#ef4444');
            const offset = this.getOffset(zone.id);
            const circle = new google.maps.Circle({
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: color,
                fillOpacity: 0.45,
                map: googleMap,
                center: { 
                    lat: stadium.coords.lat + offset.lat, 
                    lng: stadium.coords.lng + offset.lng 
                },
                radius: 40
            });

            zoneOverlays.push(circle);
        });
    },

    simulateUser(stadiumId, fullState) {
        const stadium = fullState.stadiums.find(s => s.id === stadiumId);
        if (!userMarker) {
            userMarker = new google.maps.Marker({
                position: { lat: stadium.coords.lat - 0.001, lng: stadium.coords.lng },
                map: googleMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#2563eb",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                },
                title: "You"
            });
        }
        googleMap.panTo(userMarker.getPosition());
    },

    drawRouteTo(destinationCoords) {
        if (!userMarker) {
            alert("Please click 'Simulate Me' first to set your location!");
            return;
        }

        if (routingLine) routingLine.setMap(null);

        routingLine = new google.maps.Polyline({
            path: [userMarker.getPosition(), destinationCoords],
            geodesic: true,
            strokeColor: "#2563eb",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: googleMap
        });

        // Add dash animation effect simulation
        let count = 0;
        const interval = setInterval(() => {
            count = (count + 1) % 200;
            const icons = routingLine.get('icons');
            if (icons) {
                icons[0].offset = count / 2 + '%';
                routingLine.set('icons', icons);
            }
        }, 20);
        
        googleMap.fitBounds(new google.maps.LatLngBounds()
            .extend(userMarker.getPosition())
            .extend(destinationCoords));
    },

    getOffset(zoneId) {
        const offsets = {
            'north-stand': { lat: 0.0008, lng: 0 },
            'south-stand': { lat: -0.0008, lng: 0 },
            'west-stand': { lat: 0, lng: -0.001 },
            'east-stand': { lat: 0, lng: 0.001 },
            'tendulkar-stand': { lat: 0, lng: 0.0011 },
            'gavaskar-stand': { lat: -0.0009, lng: 0 },
            'garware-stand': { lat: 0, lng: -0.0011 },
            'gate-a': { lat: 0.0012, lng: 0.0004 },
            'gate-b': { lat: -0.0012, lng: -0.0004 },
            'gate-1': { lat: 0.0012, lng: 0 },
            'gate-3': { lat: 0, lng: -0.0013 },
            'food-court': { lat: 0, lng: 0 }
        };
        return offsets[zoneId] || { lat: 0, lng: 0 };
    }
};

window.initGoogleMap = () => {
    const currentStadiumId = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = state.stadiums.find(s => s.id === currentStadiumId);

    googleMap = new google.maps.Map(document.getElementById('map-box'), {
        center: stadium.coords,
        zoom: 17,
        mapTypeId: 'satellite', // Better for stadium context
        styles: [
            { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#ffffff" }] }
        ]
    });

    StadiumMap.renderZones(state);
};

window.addEventListener('simulation_update', (e) => {
    StadiumMap.renderZones(e.detail);
});
