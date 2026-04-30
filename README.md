# ReCircuit

A hyperlocal B2B/B2C marketplace for electronics repair parts, connecting buyers with verified repair shops in Bengaluru. Demand-first model: buyers post requests, nearby shops respond with availability, ReCircuit facilitates the match.

---

## The Problem

Bengaluru's electronics repair sector is unorganized. Shops struggle to source stripped components, buyers have no reliable way to find used parts, and functional electronics become waste because individual components cannot be located quickly.

---

## How It Works

**Buyers** post a request for a specific part. Nearby verified shops respond if they have it in stock.

**Sellers** list stripped components with AI-assisted grading and pricing, then respond to buyer requests in real time.

---

## Features

**AI-powered listing**
- Visual recognition identifies part category, brand, and model from uploaded images
- Automated grading based on component condition
- Price recommendations calibrated to used/salvaged market rates
- Fake listing detection flags suspicious entries before they go live

**Verification**
- Sellers record up to 45 seconds of video per listing confirming component condition
- Buyers can view all uploaded images and video before committing to a match

**Matchmaking**
- Buyer requests matched against nearby shop inventory using geolocation
- Sellers listing a part are automatically surfaced when a matching buyer request comes in
- Real-time in-app chat after a match, with AI-generated component details pinned to the conversation

**Compatibility Engine**
- Suggests cross-generation and cross-chassis compatible models when an exact part is unavailable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Maps | Leaflet.js, OpenStreetMap |
| Backend | Node.js, Express.js |
| Database / Auth | Firebase Firestore, Firebase Authentication |
| Media | Cloudinary |
| AI | Gemini API, Groq API |

---

## Note on Access

This repository is public for evaluation purposes only. Cloning, forking, or reuse of this code is not permitted. All rights reserved.