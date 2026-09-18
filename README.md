# CIVIS AI — AI-Powered Smart City Governance Platform

CIVIS AI is a web-based smart city civic grievance platform connecting citizens with municipal administration. It provides real-time complaint reporting with AI vision analysis, GPS location tagging, secure private image storage, social signal aggregation, and role-based municipal administrative governance.

---

## 🚀 Key Features

### 🏛️ Municipality Admin Portal
* **Dashboard & Executive Overview:** Real-time analytics, critical issue counters, resolution trends, and AI-driven municipal intelligence insights.
* **Dedicated Citizen Issues Management:** Comprehensive table for searching, filtering by status/priority/category, assigning field crews, and resolving complaints across Pune City wards.
* **Private Storage Image Inspection:** Secure signed URL generation (`civis-complaint-images`) allowing verified city admins to view citizen-uploaded complaint photos.
* **Social Pulse:** Real-time ingestion and clustering of social media signals (X/Twitter, Instagram, Facebook).
* **Live Smart Map & AI Analytics:** Geographical visualization of active infrastructure reports and predictive maintenance trends.

### 👤 Citizen Portal
* **AI Scan Complaint Reporting:** Live camera scan or file upload with instant AI category classification and severity detection.
* **GPS Location Tagging:** Automatic browser geolocation and OpenStreetMap reverse geocoding.
* **Personal Complaint Tracking:** Real-time resolution progress tracking and status updates.
* **Multilingual Interface:** Supported in English, Hindi, and Marathi.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Tailwind CSS, Material Symbols, DiceBear Avatars
* **Backend & Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
* **Storage:** Supabase Private Storage (`civis-complaint-images`) with temporary signed URLs
* **Serverless Functions:** Vercel API Webhooks for Meta (Instagram/Facebook) & X (Twitter)
* **Hosting:** Vercel Deployment with sub-domain routing (`cleanUrls`)

---

## 📁 Repository Structure

```text
CIVIS-AI/
├── api/
│   └── webhooks/
│       ├── meta.js                      # Instagram & Facebook Graph API Webhook handler
│       └── x.js                         # X (Twitter) Account Activity API Webhook handler
│
├── public/
│   ├── admin/                           # Municipality Admin Portal
│   │   ├── admin_dashboard.html         # Executive Admin Dashboard
│   │   ├── citizen_issues.html          # Dedicated Citizen Issues Management page
│   │   ├── ai_analysis.html             # AI Analytics & Predictive Trends
│   │   ├── smart_map.html               # Live Geographic Incident Map
│   │   ├── social_pulse.html            # Social Media Signal Aggregation
│   │   ├── system_health.html           # Infrastructure System Metrics
│   │   ├── profile.html                 # Admin Settings
│   │   ├── my_complaints.html           # Admin Complaints List
│   │   └── app.js                       # Admin Interactivity & Supabase Client
│   │
│   └── user/                            # Citizen Portal
│       ├── index.html                   # Citizen Home Page
│       ├── my_complaints.html           # Personal Complaints View
│       ├── ai_analysis.html             # AI Scan & Incident Report Generator
│       ├── smart_map.html               # Citizen Map View
│       ├── emergency.html               # Emergency Services Dialer
│       ├── profile.html                 # User Profile & Metadata
│       └── app.js                       # Citizen Interactivity & Supabase Client
│
├── scripts/
│   ├── generate_doc.js                  # Documentation generation utility
│   ├── generate_pptx.py                 # Presentation deck generator
│   ├── take_screenshot_admin.js         # Admin UI screenshot tool
│   └── take_screenshots.js              # Full-platform UI verification tool
│
├── supabase/
│   └── migrations/                      # Project Database & RLS Migration SQL
│       ├── supabase_phase1_migration.sql
│       ├── supabase_phase3a_admin_storage_access.sql
│       ├── supabase_phase3a_issues_image_url.sql
│       └── supabase_phase3a_storage_bucket.sql
│
├── .gitignore                           # Git ignore rules
├── package.json                         # Node dependencies & npm scripts
├── package-lock.json                    # Lockfile
├── vercel.json                          # Vercel deployment routing configuration
└── README.md                            # Project documentation
```

---

## ⚙️ Setup & Local Development

### Prerequisites
* Node.js (v18+)
* npm (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/sarthakghag39-glitch/CIVIS-AI.git
cd CIVIS-AI

# Install development dependencies
npm install

# Start local static server
npm start
```

---

## 🗄️ Database & Supabase Configuration

1. **Authentication & Profiles:**
   * Supabase Auth manages user sign-ups and sign-ins.
   * PostgreSQL trigger `handle_new_user()` auto-creates entries in `public.profiles`.
   * Admin privileges require `profiles.role = 'admin'`.

2. **Database Migrations:**
   Run the SQL scripts located in `supabase/migrations/` in your Supabase SQL Editor:
   * `supabase_phase1_migration.sql`: Auth triggers & profiles RLS policies.
   * `supabase_phase3a_issues_image_url.sql`: Adds `image_url` column to `issues` table.
   * `supabase_phase3a_storage_bucket.sql`: Creates private `civis-complaint-images` bucket.
   * `supabase_phase3a_admin_storage_access.sql`: Configures admin storage signed URL access policy (`public.is_admin()`).

---

## 🚀 Deployment

The project is configured for deployment on **Vercel**:
* `vercel.json` configures the static `public/` output directory, `cleanUrls: true`, and subdomain rewrites for admin (`/admin/index.html`) vs citizen (`/user/index.html`).
* Serverless Webhooks in `api/webhooks/` automatically deploy as Vercel API endpoints.

---

## 🔒 Security Practices

* **No Hardcoded Service Keys:** Private bucket signed URLs are created dynamically client-side using `createSignedUrl` with strict RLS authorization (`public.is_admin() = true`).
* **Private Bucket Enforcement:** `civis-complaint-images` remains private (`public = false`).
* **Role Verification:** Admin authorization strictly checks `profiles.role === 'admin'`.
