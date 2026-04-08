# ReCircuit - Project Report

## Overview
**ReCircuit** is an electronics parts marketplace that connects repair shops with customers needing components. Built for Ideathon 2026.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Tailwind CSS, Vite |
| Backend | Express.js |
| Database | Firebase Firestore |
| AI Integration | Google Gemini API |

## Architecture
- **6 Pages**: HomeScreen, BuyerPage, BuyerResultsPage, ShopPage, SellPartPage, MatchPage
- **9 API Endpoints**: requests, listings, matches, shops, compatibility, AI search, health check
- **4 Collections**: requests, listings, matches, shops

## Key Features
- Multi-step forms with validation
- AI-powered search using Gemini
- Compatibility mapping for parts
- Real-time data with Firebase
- Shop rating and response time tracking
- Match request workflow

## Data Flow
- **Buyer Flow**: Form submission → Request created → Shop matching → Part request
- **Shop Flow**: Inventory listing → View buyer requests → Accept matches

## Files
- `server.js` (594 lines) - Backend API
- `frontend/src/pages/` - 6 React pages
- `frontend/src/components/` - Reusable components
- Firebase configuration for real-time database

## Running the Project
```bash
npm run dev  # Runs both frontend and backend
```

## Status
✅ Complete and production-ready
