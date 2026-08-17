# CIVIS AI — AI-Powered Public Safety & Smart City Intelligence Platform

CIVIS AI is a comprehensive, production-ready smart city coordination platform that bridges the gap between crowdsourced public signals, citizen reports, and municipal authorities. By leveraging AI-style intelligence, duplicate incident clustering, live geolocation tracking, and database-backed sync flows, CIVIS AI empowers city administrations to respond to infrastructure and safety hazards faster and more efficiently.

Deployed Production URL: [https://civis-ai-ruddy.vercel.app/](https://civis-ai-ruddy.vercel.app/)

---

## 🚀 Key Features

### 1. Citizen Portal (`public/user/`)
*   **Smart Landing Hub**: User-friendly portal to check neighborhood status, report local issues, and track active resolution metrics.
*   **Dynamic Emergency Services**: Provides one-touch access to ambulance, police, and fire dispatch. Automatically retrieves the citizen's live physical address using the **HTML5 Geolocation API** and OpenStreetMap's **Nominatim Reverse-Geocoding API**.
*   **Complaints Dashboard**: Allows citizens to submit tickets (with camera uploads) and track their resolution progress (0-100%) in real-time.

### 2. Admin Portal (`public/admin/`)
*   **Live Metrics Dashboard**: Real-time stats cards (Total, Critical, Resolved, Pending) and issue category progress bars queried dynamically from Supabase.
*   **Interactive Live Map**: Leaflet map plotting active complaints and social incidents, supporting direct category filters and coordinates-based query parameter focusing.
*   **Multi-Column Search**: Text search matching typed inputs against titles, locations, statuses, and reporter names/emails.
*   **AI Analytics Portal**: Displays ward-based issue vulnerability densities, weather vulnerability forecasts, and ML auto-routing performance indexes.
*   **System Health Dashboard**: Displays CPU load (event loop lag), RAM footprint (via browser performance memory API), live Supabase network query latencies, active system logs terminal, and a live database-backed directory of logged-in members.

### 3. CIVIS Social Pulse ("Hear what the city is saying.")
A central intelligence module designed to parse noisy social signals (X, Instagram, Facebook, News) and convert them into structured complaints:
*   **Duplicate Clustering ("One Incident. Many Signals.")**: Clusters multiple duplicate posts referring to the same location/incident into a single verified report, preventing municipal resource duplication.
*   **AI Analysis Drawer**: Sliding panel showing text classification category, GPS coordinates, sentiment polarity, and recommended routing department.
*   **Real-time Simulator**: Allows mock signal ingestion, updating KPIs, and updating map popups on the fly.
*   **Supabase Direct Convert**: Clicking "Create Complaint" executes a real insert into Supabase `issues` and writes a unique, database-synced `complaint_id` (`CIV-2026-XXXXX`).

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: Vanilla HTML5, CSS3, Tailwind CSS (Design Tokens, fluid responsiveness, class-based dark mode).
*   **Mapping**: LeafletJS (custom popups, coordinate fly-to, colored legends).
*   **Backend / Database**: Supabase (PostgreSQL, Realtime APIs, Row Level Security policies).
*   **Third-party APIs**: OpenStreetMap Nominatim reverse-geocoder (SSL-compliant).
*   **Integrations**: Google Sheets Sync via custom Google Apps Script.

---

## 💾 Database Schema Setup

To initialize the required tables in your Supabase project, execute the following SQL scripts in your **Supabase SQL Editor**:

### Table 1: `issues` (Civic Tickets)
```sql
CREATE TABLE IF NOT EXISTS public.issues (
    id SERIAL PRIMARY KEY,
    complaint_id TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Assigned',
    progress INTEGER DEFAULT 10,
    criticality TEXT NOT NULL DEFAULT 'Moderate',
    description TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    reported_by TEXT DEFAULT 'Anonymous',
    reported_by_email TEXT DEFAULT 'N/A',
    reported_by_phone TEXT DEFAULT 'N/A',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS & Policies
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.issues FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert" ON public.issues FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.issues FOR UPDATE TO public USING (true);
```

### Table 2: `social_signals` (Social Pulse)
```sql
CREATE TABLE IF NOT EXISTS public.social_signals (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    timestamp TEXT NOT NULL,
    content TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    severity TEXT NOT NULL,
    ai_confidence INTEGER NOT NULL,
    sentiment TEXT NOT NULL,
    supporting_signals INTEGER DEFAULT 0,
    cluster_id TEXT,
    status TEXT NOT NULL,
    department TEXT,
    recommended_action TEXT,
    engagement INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS & Policies
ALTER TABLE public.social_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.social_signals FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert" ON public.social_signals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.social_signals FOR UPDATE TO public USING (true);
```

---

## 📊 Google Sheets Sync Setup

To sync your database tables with Google Sheets (with columns like `complaint_id` automatically mapped):

1. Open your **Google Sheet**, and navigate to **Extensions > Apps Script**.
2. Paste the script located in [`google_sheets_sync_guide.md`](./google_sheets_sync_guide.md) (or Apps Script editor file).
3. Save the project and click **Run** on the `importExistingSupabaseData` function dropdown.
4. Add a time-driven trigger to run the sync automatically every 15-60 minutes.

---

## 💻 Local Setup & Development

1. Clone the repository:
   ```bash
   git clone https://github.com/sarthakghag39-glitch/CIVIS-AI.git
   cd CIVIS-AI
   ```
2. Install local development dependencies:
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
4. Access the web portals:
   *   **Citizen Portal**: `http://localhost:3000/index.html`
   *   **Admin Portal**: `http://localhost:3000/admin_dashboard.html`
