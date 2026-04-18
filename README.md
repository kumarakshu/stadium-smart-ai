# 🏟️ SmartStadium AI
### *Contextual Intelligence for Modern Venue Management*

**SmartStadium AI** is an advanced ecosystem designed to solve the logistical and safety challenges of large-scale sporting venues. By integrating real-time crowd analytics with state-of-the-art AI, it provides a unified command center for stadium operators and a smart digital assistant for attendees.

---

## 🚀 Key Features

- **🧠 Context-Aware AI Assistant**: Powered by Google Gemini, providing attendees with real-time answers about gate occupancy, stall wait times, and safety procedures based on live stadium telemetry.
- **🗺️ Intelligent Safety Routing**: Automated evacuation and navigation paths utilizing the Google Maps Directions API to ensure optimal pedestrian egress during peak periods or emergencies.
- **📊 Real-time Crowd Analytics**: High-precision monitoring of zone density and queue lengths, enabling proactive management of stadium logistics.
- **🛡️ Unified Command Center**: A comprehensive dashboard for stadium staff to monitor live status, broadcast alerts, and manage venue-wide protocols.
- **♿ Inclusive Design**: A premium glassmorphism interface optimized for high accessibility, featuring screen-reader compatibility and intuitive mobile navigation.

---

## 🛠️ Technical Architecture

SmartStadium AI is built on a modular, high-performance stack:

- **AI Engine**: Google Gemini 1.5 Flash (utilizing system instructions for consistent, persona-driven intelligence).
- **Geospatial Processing**: Google Maps Platform (Advanced Markers, Directions Service, and customized vector styling).
- **Cloud Services**: Firebase Analytics for real-time interaction tracking and Firebase Authentication for secure administrative access.
- **Core Logic**: Modern Vanilla JavaScript (ES6+) with a custom reactive state engine.
- **Reliability**: Integrated Jest test suite ensuring 100% stability across core simulation and logic modules.

---

## 📦 Getting Started

### Prerequisites
- Modern web browser (Chrome, Safari, Edge).
- Google Cloud Project with Maps and Gemini APIs enabled.

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/kumarakshu/stadium-smart-ai.git
   ```
2. **Configuration**:
   Add your API keys to `src/data/config.js`:
   ```javascript
   const CONFIG = {
       GEMINI_API_KEY: 'YOUR_GEMINI_KEY',
       GOOGLE_MAPS_API_KEY: 'YOUR_MAPS_KEY'
   };
   ```
3. **Run Locally**:
   Serve the project using any static file server:
   ```bash
   npx serve .
   ```

---

## 📄 License
This project is licensed under the ISC License. Developed with a focus on production-grade safety and attendee experience.

---
*Empowering venues, one stadium at a time.*
