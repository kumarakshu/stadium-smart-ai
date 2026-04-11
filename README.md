# 🏟️ SmartStadium AI: Unified Intelligent Ecosystem

**Submission for Google Antigravity Challenge**

---

## 🎯 Project Vision
SmartStadium AI is a unified platform designed to transform the physical event experience. By merging attendee services and venue management into a single, real-time "Digital Twin" ecosystem, we solve the common stressors of large-scale sporting events: crowd congestion, wait times, and safety coordination.

## 🏗️ Chosen Vertical: Event Intelligence & Navigation
We focused on the **Stadium Persona**, acting as a real-time assistant for both fans and staff.

## 🧠 Approach and Logic

### 1. The Unified Core
Unlike traditional siloed apps, SmartStadium AI uses a **Unified State Model**. Whether you are a fan looking for a burger or a staff member monitoring Gate A, the data comes from the same live source. We implemented a single-page architecture that toggles between "Guest" and "Staff" views.

### 2. Google AI Studio (Gemini) Integration
The assistant isn't just a chatbot; it's a **Context-Aware Assistant**. 
- **Logic**: Every user query is bundled with the current "Stadium State" (crowd levels at gates, wait times at stalls).
- **Outcome**: When a user asks "Where should I go?", Gemini analyzes the live data to recommend the specific gate with the lowest density.

### 3. Google Maps Intelligence
We replaced generic maps with a **Google Maps JS API** implementation.
- **Dynamic Overlays**: We use coordinate-based polygon logic to overlay colored heatmaps directly on top of the stadium structure.
- **Real-Time Visualization**: As crowd data changes, the map zones automatically shift colors (Green to Red).

### 4. Real-Time Simulation Engine (`simulator.js`)
To demonstrate "Live" functionality without a complex backend, we built a background engine that fluctuates stadium data every 15 seconds. This creates a living UI where queue lengths and heatmaps change as you watch.

## 🛠️ Tech Stack
- **Core**: HTML5, CSS3 (Custom Properties), Vanilla JavaScript.
- **AI**: Google Gemini (1.5 Flash).
- **Navigation**: Google Maps JS SDK.
- **Visuals**: Lucide Icons.
- **Size**: Optimized to be **< 500KB**, exceeding competition efficiency requirements.

## 🚀 How It Works
1.  **Configure**: Add your Google Maps and Gemini API keys to `data/config.js`.
2.  **Live View**: Open `index.html`. The map initializes at Narendra Modi Stadium.
3.  **Simulation**: The background engine initiates automatic crowd fluctuations.
4.  **Assistant**: Use the "AI Assistant" tab to ask context-aware questions.
5.  **Staff Control**: Switch to the "StaffHub" tab to manually override crowd data and observe the change on the map instantly.

## 📋 Assumptions & Constraints
- **CORS**: This app uses `fetch` for the initial state. For local testing, run via a simple server (e.g., `Live Server` or `python -m http.server`).
- **Map Accuracy**: For the demo, zone overlays are calculated relative to the stadium's central GPS coordinates.
- **Security**: API keys are stored in `config.js`. For production, these should be handled via a proxy server to prevent leakage in public repos.

---
*Built with Google Antigravity & AI Studio.*
