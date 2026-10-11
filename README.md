# AURAQ — Autonomous Sales Platform for Nocturnal Boutiques

> **"Midnight, red, and a shop that never closes."**  
> AI sales agent on Telegram for Instagram small businesses and boutique labels. Captures buyer inquiries, verifies stock variants per size/colour, and holds orders for merchant signature.

---

## Architecture & Directory Structure

```text
ai-agent-platform/
├── backend/                  # Node.js + Express API Services
│   ├── db/
│   │   └── store.ts          # Boutique catalog, orders, and transcripts database
│   ├── routes/
│   │   └── api.ts            # REST endpoints (auth, products, orders, faqs, chats)
│   ├── server.ts             # Standalone backend server entry point
│   └── package.json          # Backend-specific dependencies and scripts
│
├── frontend/                 # High-Fidelity Client Application (HTML, CSS, Vanilla JS)
│   ├── css/
│   │   ├── style.css         # Oxblood tokens, Fraunces/Manrope fonts, glassmorphism
│   │   └── landing.css       # 5-layer parallax, CSS phone mockup, 3D tilt stage
│   ├── js/
│   │   ├── config.js         # Client constants & USE_MOCK flag
│   │   ├── api.js            # Unified API contract client
│   │   ├── auth.js           # Authentication & session state
│   │   ├── landing.js        # GSAP ScrollTrigger kinetic typography & phone simulation
│   │   ├── setup.js          # Onboarding wizard & in-page procedural canvas QR generator
│   │   └── dashboard.js      # Merchant console, Chart.js analytics & order workflows
│   ├── index.html            # Parallax scroll narrative landing page
│   ├── signup.html           # Cinematic split-screen merchant registration
│   ├── login.html            # Merchant console login
│   ├── setup.html            # 3-step store onboarding wizard
│   └── dashboard.html        # Merchant command console
│
├── server.ts                 # Unified full-stack server (Express API + Vite Frontend)
├── vite.config.ts            # Vite configuration routing to ./frontend
├── package.json              # Platform dependencies and scripts
└── README.md
```

---

## Quickstart in VS Code

### 1. Clone or Open in VS Code
```bash
git clone <your-github-repo-url> ai-agent-platform
cd ai-agent-platform
code .
```

### 2. Run Unified Full-Stack Platform
Run both the backend API and frontend together:
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## Standalone Options

### Frontend-Only with Live Server
Because the frontend is built with pure HTML, CSS, and vanilla JS (with CDN-loaded GSAP and Chart.js), you can run it completely standalone:
1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `frontend/index.html` $\rightarrow$ **Open with Live Server**.
*(Note: `frontend/js/config.js` has `USE_MOCK = true` by default, so it runs with complete offline mock data and simulated latencies).*

### Backend Standalone
To run just the API server independently:
```bash
cd backend
npm install
npm run dev
```
The API will be available at `http://localhost:5000/api`.

---

## Pushing to GitHub

To commit this clean `backend/` and `frontend/` structure to your GitHub repository:

```bash
git init
git add .
git commit -m "feat: restructure into backend/ and frontend/ architecture for AURAQ platform"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-agent-platform.git
git push -u origin main
```
