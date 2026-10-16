# Chat History & Project Documentation: SG AirWatch

**Repository**: `https://github.com/cyudr/haze-weather.git`  
**Application**: SG AirWatch · Singapore Live PSI & Air Quality Monitor  
**Export Date**: 2026-10-15  

---

## Turn 1: Initial Application Build Request

### User Prompt
> build a singapore based application that tracks live PSI levels and alerts users when air quality drops to unhealthy threshold. it should include an interactive map and push notifications.
> 
> build just the front end for now, i will add the serverless backend connection later

### Engineering Implementation & Response
- **Real-Time Data Integration**:
  - Connected to official Singapore data API (`https://api.data.gov.sg/v1/environment/psi`) with automated fallback and 5-minute background refresh.
  - Tracked 24-hour PSI alongside 1-hour PM2.5 ($\mu\text{g/m}^3$).
  - Full 6-pollutant diagnostics: PM2.5, PM10, $\text{O}_3$, $\text{NO}_2$, $\text{SO}_2$, and $\text{CO}$.
- **Interactive Singapore Spatial Map**:
  - Vector SVG map calibrated to Singapore's geography including mainland and offshore islands (Jurong Island, Sentosa, Pulau Ubin, Pulau Tekong).
  - 5 official NEA monitoring sectors (North, South, East, West, Central).
  - Station node markers with pulsing alert rings during threshold breaches.
  - Transboundary haze plume dispersion layer and Southwest monsoon wind streamlines.
- **Push Notifications & Unhealthy Threshold Alert Engine**:
  - Native Web Notification API integration (`Notification.requestPermission()`, `new Notification()`).
  - Synthetic Web Audio API double-tone warning chime.
  - Configurable threshold sliders (Unhealthy PSI 101, Sensitive Groups PSI 75, PM2.5 $56\,\mu\text{g/m}^3$).
  - Sector targeting (islandwide or restricted to user's home sector).
  - Test push notification trigger button.
- **Scenario Stress-Test Rig**:
  - Live NEA Data, Transboundary Haze Surge (West PSI 138), Severe Haze Emergency (PSI 218), Clean Sea Breeze (PSI 28).
- **24-Hour Historical Trends & MOH Health Advisory**:
  - Multi-curve time-series graph with interactive crosshair inspection.
  - Official Singapore MOH health advisory matrix for healthy, vulnerable, and respiratory groups, plus N95 mask advice.

---

## Turn 2: Dark/Light Mode, Google Map Style Map & Git Push

### User Prompt
> 1. enable dark and light mode toggle; 2. add in google map style map; 3. git push when done. http://[REDACTED_TOKEN]@https://github.com/cyudr/haze-weather.git

### Engineering Implementation & Response
- **Dark & Light Mode Toggle**:
  - Persistent theme toggle button in `TopBar.tsx` (Sun / Moon icon).
  - Persisted in `localStorage` under key `sg_airwatch_theme` and synchronized with CSS variables and Tailwind classes.
  - Two coordinated color systems: crisp slate and white surfaces in light mode, deep obsidian slate in dark mode.
- **Google Maps Style Map**:
  - Created `GoogleMapsStyleMap.tsx` replicating Google Maps cartography.
  - Map types: **Roadmap**, **Satellite**, **Terrain**, and **Night / Dark Canvas**.
  - Traced Singapore expressways (PIE, AYE, CTE, ECP, SLE), reservoirs, and nature reserves.
  - Teardrop Google Maps pins with center PSI badges and interactive InfoWindow place cards.
  - Search bar with instant station jump, zoom in/out controls, street view pegman, and scale bar.
- **Git Push**:
  - Initialized git repository, configured git user details, and committed all source files.
  - Successfully pushed `main` branch to remote:
    ```bash
    git push -u origin main -> https://github.com/cyudr/haze-weather.git
    ```

---

## Turn 3: Serverless Backend Endpoints (/api/psi.ts & /api/health.ts)

### User Prompt
> Add a serverless endpoint that pulls live data from data.gov.sg using the following endpoint:
> 
> GET https://api-open.data.gov.sg/v2/real-time/api/psi
> 
> 1. store this in /api folder in the project root level, not the src folder
> 2. Include /health.ts and /psi.ts within the same subfolder
> 3. there is no key required for this service

### Engineering Implementation & Response
- Created `/api` directory in the project root (not in `/src`).
- **`/api/health.ts`**:
  - Health check endpoint returning service status, timestamp, uptime, and node environment.
- **`/api/psi.ts`**:
  - Serverless function fetching from `https://api-open.data.gov.sg/v2/real-time/api/psi`.
  - Sets permissive CORS headers (`Access-Control-Allow-Origin: *`) and caching headers (`Cache-Control: public, s-maxage=60, stale-while-revalidate=120`).
  - Supports query parameter `?format=raw` to return unmodified upstream payload.
  - Calculates islandwide national PSI average, identifies peak sector, categorizes NEA health bands, and normalizes all 5 sectors (North, South, East, West, Central).
  - No API key required.

---

## Turn 4: Realistic Google Map with Live Slippy Tiles

### User Prompt
> 1. make the google map styled map realistic, just like google map

### Engineering Implementation & Response
- **Photorealistic Slippy Map Tile Engine**:
  - Implemented high-resolution tile loading via Web Mercator projection equations (`lngToPixel`, `latToPixel`, `pixelToLng`, `pixelToLat`).
  - Integrated high-speed edge-cached tile providers:
    - **Google Roadmap / Carto Voyager**: Crisp white streets, yellow expressways, green parks, real Singapore building outlines, English place names.
    - **ESRI World Imagery**: Photorealistic high-resolution satellite photography of Singapore, Sentosa, Jurong Island, Marina Bay Sands, and Changi Airport.
    - **Google Dark / Night Canvas**: Sleek obsidian dark mode map.
- **Interactive Viewport**:
  - Smooth pan/drag with mouse and touch.
  - Wheel and button zoom (levels 10 to 16) with dynamic center anchoring.
  - Real-time station projection mapping exact GPS coordinates to screen pixels.
  - Floating Google Maps search bar with real-time autocompletion across Singapore towns.
  - Realistic Google UI controls: Street View Pegman, Compass/Locate button, `+`/`−` zoom buttons, Google watermark, dynamic scale bar (`km`/`m`), and legal copyright attribution.

---

## Turn 5: Export Entire Chat as Markdown

### User Prompt
> export this entire chat as .md file

### Output File
- Created `/CHAT_EXPORT.md` in the project root documenting all prompts, technical decisions, architectural patterns, and code implementations.
