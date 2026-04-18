/**
 * SmartStadium AI - Map Controller (Advanced V3)
 * Handles Google Maps initialization, Advanced Markers, and Evacuation Routing.
 */

let googleMap = null;
let zoneOverlays = [];
let labelMarkers = [];
let userMarker = null;
let routingLine = null;
let directionsService = null;
let directionsRenderer = null;

const MapController = {
    async init() {
        const mapBox = document.getElementById('map-box');
        if (!mapBox) return;

        if (!CONFIG.GOOGLE_MAPS_API_KEY || CONFIG.GOOGLE_MAPS_API_KEY.includes("YOUR_")) {
            mapBox.innerHTML = `<p style="padding:2rem; text-align:center;">API Key Required</p>`;
            return;
        }

        // Initialize Google Maps with Advanced Markers library
        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMapController&libraries=marker,geometry&loading=async`;
            script.async = true;
            document.head.appendChild(script);
        } else {
            window.initMapController();
        }
    },

    setStadium(stadiumId, fullState) {
        if (!fullState || !fullState.stadiums) return;
        const stadium = fullState.stadiums.find(s => s.id === stadiumId);
        if (!stadium || !googleMap) return;

        googleMap.setCenter(stadium.coords);
        this.renderZones(fullState);
    },

    renderZones(fullState) {
        if (!googleMap || !fullState?.stadiums) return;
        const currentId = document.getElementById('stadium-select')?.value || 'ahmedabad';
        const stadium = fullState.stadiums.find(s => s.id === currentId);
        if (!stadium) return;

        // Clear existing
        zoneOverlays.forEach(o => o.setMap(null));
        labelMarkers.forEach(m => m.setMap(null));
        zoneOverlays = [];
        labelMarkers = [];

        stadium.zones.forEach(zone => {
            const color = zone.crowd < 30 ? '#22c55e' : (zone.crowd < 70 ? '#eab308' : '#ef4444');
            const pos = { 
                lat: stadium.coords.lat + (StadiumOffsets[zone.id]?.lat || 0), 
                lng: stadium.coords.lng + (StadiumOffsets[zone.id]?.lng || 0) 
            };

            // 1. Heatmap Circle
            const circle = new google.maps.Circle({
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.8,
                fillColor: color,
                fillOpacity: 0.5,
                map: googleMap,
                center: pos,
                radius: zone.type === 'entry' ? 30 : 60
            });

            // 2. Advanced Marker (Better Performance & High Quality)
            const labelDiv = document.createElement('div');
            labelDiv.className = 'map-label-v2';
            labelDiv.innerHTML = `<div style="background:${color}; padding:4px 8px; border-radius:4px; font-weight:800; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-size:10px;">${zone.name}<br>${zone.crowd}%</div>`;
            
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: googleMap,
                position: pos,
                content: labelDiv,
                title: zone.name
            });

            zoneOverlays.push(circle);
            labelMarkers.push(marker);
        });
    },

    simulateUser(coords) {
        if (!googleMap) return;
        if (!userMarker) {
             const userPin = document.createElement('div');
             userPin.innerHTML = `<div style="width:20px; height:20px; background:#2563eb; border:3px solid white; border-radius:50%; box-shadow:0 0 15px #2563eb;"></div>`;
             userMarker = new google.maps.marker.AdvancedMarkerElement({
                 map: googleMap,
                 position: coords,
                 content: userPin,
                 title: "You are here"
             });
        } else {
            userMarker.position = coords;
        }
        googleMap.panTo(coords);
    },

    drawEvacuationPath(dest) {
        if (!googleMap || !userMarker) return;
        if (routingLine) routingLine.setMap(null);
        if (directionsRenderer) directionsRenderer.setDirections({ routes: [] });

        if (!directionsService) {
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: googleMap,
                suppressMarkers: true,
                polylineOptions: { strokeColor: "#ef4444", strokeWeight: 5 }
            });
        }

        const request = {
            origin: userMarker.position,
            destination: dest,
            travelMode: google.maps.TravelMode.WALKING
        };

        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
            } else {
                // Fallback to straight Polyline if routing fails inside uncharted stadium zones
                console.warn("Walking route not found, falling back to direct line.", status);
                routingLine = new google.maps.Polyline({
                    path: [userMarker.position, dest],
                    strokeColor: "#ef4444",
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                    map: googleMap,
                    icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '0%', repeat: '20px' }]
                });
            }
        });
        
        // Pulse effect for emergency
        let count = 0;
        const interval = setInterval(() => {
            if (!window.state?.emergency?.active) {
                clearInterval(interval);
                if (routingLine) routingLine.setMap(null);
                if (directionsRenderer) directionsRenderer.setDirections({ routes: [] });
                return;
            }
            count = (count + 1) % 2;
            if (routingLine) routingLine.setOptions({ strokeOpacity: count === 0 ? 0.3 : 0.8 });
            if (directionsRenderer) directionsRenderer.setOptions({ polylineOptions: { strokeOpacity: count === 0 ? 0.3 : 0.8, strokeColor: "#ef4444", strokeWeight: 5 } });
        }, 500);
    }
};

// Offset data moved here for cleaner logic
const StadiumOffsets = {
    'north-stand': { lat: 0.0009, lng: 0 },
    'south-stand': { lat: -0.0009, lng: 0 },
    'west-stand': { lat: 0, lng: -0.0011 },
    'east-stand': { lat: 0, lng: 0.0011 },
    'gate-a': { lat: 0.0018, lng: 0.001 },
    'gate-b': { lat: -0.0018, lng: -0.001 },
    'food-court': { lat: 0, lng: 0.0015 },
    'tendulkar-stand': { lat: 0.0003, lng: 0.0008 },
    'gavaskar-stand': { lat: -0.0008, lng: 0 },
    'garware-stand': { lat: 0.0003, lng: -0.0008 },
    'gate-1': { lat: 0.0012, lng: 0.0002 },
    'gate-3': { lat: -0.0012, lng: -0.0004 },
    'north-stand-m': { lat: 0.0008, lng: 0 }
};

window.initMapController = () => {
    if (!window.state || !window.state.stadiums) return;
    const currentId = document.getElementById('stadium-select')?.value || 'ahmedabad';
    const stadium = window.state.stadiums.find(s => s.id === currentId);

    googleMap = new google.maps.Map(document.getElementById('map-box'), {
        center: stadium.coords,
        zoom: 17,
        mapId: 'SMART_STADIUM_MAP', // Required for Advanced Markers
        mapTypeId: 'satellite',
        tilt: 45
    });

    MapController.renderZones(window.state);
};

window.MapController = MapController;
