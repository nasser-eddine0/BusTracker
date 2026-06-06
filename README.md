# 🚌 BusTracker

> **Intelligent Real-Time School Transport Tracking Web Application**  
> An elegant, real-time tracking system designed to bridge the communication gap between school administrations, bus drivers, and parents.

---

## 🌟 Key Features

### 👑 Administrator Dashboard
* **Dynamic Fleet Management:** Full CRUD operations for buses, routes, and drivers.
* **Bulk Onboarding:** Seamless student data import via Excel sheets with automated parent account generation.
* **Cost-Free Communication:** Automated WhatsApp credentials distribution (using public APIs) to parents and drivers.
* **Global Monitoring:** Live map supervising all active buses and their routes.

### 🚍 Driver Interface (Mobile-First)
* **Digital Attendance:** Electronic check-in list to track students' statuses (`waiting`, `ready`, `mounted`, `absent`, `dropped`).
* **Telemetry Streaming:** Auto-streaming of GPS coordinates every 5 seconds.
* **Nudge Alerts:** One-tap alert triggers to notify parents of late students without unsafe phone usage while driving.

### 👨‍👩‍👧 Parent Portal (Mobile-First)
* **Real-Time Map Tracking:** Live location tracking of the school bus on interactive maps.
* **Smart Proximity Notifications:** Automated notifications triggered at critical distance thresholds (2000m and 50m) using the Haversine formula.
* **Absence Declaration:** Log absences in advance to instantly sync with the driver's checklist.
* **Linguistic Flexibility:** Fully localized in French and Arabic, supporting automatic LTR/RTL layout switching.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Laravel 12, Laravel Sanctum, PHP |
| **Frontend UI** | React 19, Vite 8, Vanilla CSS / Tailwind CSS |
| **Real-time & Maps** | Firebase Realtime Database, Leaflet.js |
| **Database** | MySQL |
| **Localization** | i18n (French & Arabic with RTL support) |

---

## 📁 Repository Structure

* `bus-backend/` - Laravel API server and database migrations.
* `bus-frontend/` - React SPA frontend application.
* `database.rules.json` - Security rules for Firebase Realtime Database.
* `scripts/` - Helper scripts.

---

## 🚀 Setup & Installation

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd bus-backend
   ```
2. Install dependencies:
   ```bash
   composer install
   npm install
   ```
3. Copy environment config and update database credentials:
   ```bash
   cp .env.example .env
   ```
4. Run migrations:
   ```bash
   php artisan migrate
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd bus-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🔒 License
This project is developed for educational and training purposes under the CMC (Cité des Métiers et des Competences) curriculum.
