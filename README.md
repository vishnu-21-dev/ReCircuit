# ReCircuit ♻️

**ReCircuit** is an AI-powered electronics repair parts marketplace connecting buyers with repair shops to reduce e-waste. By leveraging AI for visual recognition, automated grading, and price suggestions, ReCircuit provides a seamless way to list, search, and match spare electronics components.

---

## 🌟 Key Features

- **Buyer & Seller Roles**: Dedicated workflows for buyers searching for parts and shops listing their inventory.
- **AI Visual Recognition**: Autonomously identifies parts from user-uploaded images to extract categories, brands, models, and grades.
- **AI Price Suggestions**: Recommends fair market prices for used/salvaged parts based on component condition and market rates.
- **AI Fake Listing Detection**: Analyzes listings to identify potentially suspicious or fake parts.
- **AI Compatibility Engine**: Suggests cross-generation and cross-chassis compatible models for specific components.
- **Real-Time Matchmaking & Chat**: Connects buyers with sellers instantly, supporting in-app chat using Firebase.
- **Video Verification**: Sellers can upload up to 45 seconds of video for component grading verification.

---

## 🛠️ Tech Stack

**Frontend**
- React 18 & Vite
- Tailwind CSS (Styling)
- React Router v6

**Backend & Integration**
- Node.js & Express.js
- Firebase Admin SDK (Firestore & Authentication)
- Cloudinary (Image & Video Storage)
- Groq/Gemini API (LLM Integration for AI features)

---

## 📋 Prerequisites

Before running the application locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/en) (v16.x or newer)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Firebase project with Firestore and Authentication enabled
- Cloudinary account for media
- Groq/Gemini API keys

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vishnu-21-dev/ReCircuit.git
   cd ReCircuit
   ```

2. **Backend Setup:**
   - Install the root dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file in the root directory based on the following template configuration:
     ```env
     PORT=5000
     GEMINI_KEY=your_gemini_api_key
     GROQ_KEY=your_groq_api_key
     ```
   - Place your Firebase Admin SDK service account credentials in a `serviceAccountKey.json` file inside the root directory.

3. **Frontend Setup:**
   - Navigate to the `frontend` directory:
     ```bash
     cd frontend
     ```
   - Install frontend dependencies:
     ```bash
     npm install
     ```
   - Return to the root directory:
     ```bash
     cd ..
     ```

---

## 🚀 Running the Application

You can use the root `package.json` to concurrently run both the frontend and backend servers.

**Start both Development Servers:**
```bash
npm run dev
```

If you prefer to run them separately:
- **Start Backend API server:**
  ```bash
  npm run server
  ```
- **Start Frontend application:**
  ```bash
  npm run client
  ```

Once initiated, the application will be accessible at:
- **Frontend UI**: `http://localhost:5173` (default Vite port)
- **Backend API**: `http://localhost:5000`

---

## 📂 Project Structure

```text
ReCircuit/
├── api/                  # API route handlers
├── frontend/             # React application source code
├── middleware/           # Express middlewares
├── scripts/              # Python/JS utility scripts for database seeding
├── utils/                # Helper functions for the Node backend
├── firebase.js           # Firebase app initialization file
├── server.js             # Main Express backend server entry point
├── package.json          # Root npm configurations and scripts
└── ...
```

---

*Built for Ideathon 2026 - Giving electronics a second life ♻️*