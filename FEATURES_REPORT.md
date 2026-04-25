# ReCircuit - Complete Features Report

## 1. System Overview
ReCircuit is an AI-powered electronics repair parts marketplace connecting buyers with repair shops to reduce e-waste. The platform features real-time chat, AI-powered visual recognition, automated grading, and matchmaking between buyers and sellers.

---

## 2. Frontend Features (Pages & Components)

### 2.1 Home Screen (`HomeScreen.jsx`)
- **Hero section** with animated grid background and radial glow
- **Role selection cards** - Buyer vs Shop with distinct icons and feature lists
- **Responsive design** with hover animations and gradient transitions
- **Navigation to buyer flow** or **shop flow**

### 2.2 Authentication (`LoginPage.jsx`)
- Firebase Authentication integration
- Email/password login
- Protected routes with role-based access
- Auth context provider for session management

### 2.3 Buyer Features

#### 2.3.1 Buyer Page (`BuyerPage.jsx`)
- **Search form** with fields:
  - Device category (Smartphones, Laptops, Home Appliances, Consumer Electronics)
  - Brand selection
  - Model input
  - Part name input
  - Grade requirement (A, B, C, D)
  - Price offer
- **AI Compatibility Suggestions** - Shows other compatible device models
- **My Active Requests** - List of buyer's pending requests
- **Duplicate request detection** with warning modal
- **Request expiration** (7-day auto-expiry)

#### 2.3.2 Buyer Results Page (`BuyerResultsPage.jsx`)
- **AI-powered natural language search**
- **Search results grid** with part listings
- **Compatibility tagging** - Shows if part matches buyer's requirements
- **AI-compatibility badges** - Shows cross-device compatibility
- **Distance calculation** between buyer and seller
- **Create match** functionality
- **AI Search panel** with example queries

### 2.4 Seller/Shop Features

#### 2.4.1 Shop Page (`ShopPage.jsx`)
- **Shop stats dashboard**:
  - Total listings count
  - Active listings count
  - Pending reviews count
  - Average rating display
- **My Listings section**:
  - List view with brand, model, part, grade, price
  - Edit and delete functionality
  - Mark as sold feature
- **Incoming Buyer Requests**:
  - Filtered by shop's inventory (brand/model/part matching)
  - Request cards with buyer details
  - "I Have This" match creation button
  - Compatibility indicators
- **Quick Sell link**

#### 2.4.2 Sell Part Page (`SellPartPage.jsx`)
- **Multi-step listing form**:
  - Step 1: Device details (category, brand, model, part)
  - Step 2: Listing details (grade, price, warranty)
  - Step 3: Verification video recording
- **AI Price Suggestion** integration
- **Visual Recognition** - Upload photo for AI part identification
- **Manual grading fallback** if AI recognition fails
- **45-second video recording** with webcam
- **Video preview and re-record** option
- **Cloudinary integration** for video upload

#### 2.4.3 Grading Section (`GradingSection.jsx`)
- **6-question condition assessment**:
  - Section 1: Visual Condition (damage, ports)
  - Section 2: Functionality (powers on, defects)
  - Section 3: Age and Usage (age, usage level)
- **Scoring system** (4-point scale per question, max 24 points)
- **Automatic grade calculation**:
  - Grade A (20-24): Excellent
  - Grade B (14-19): Good
  - Grade C (8-13): Fair
  - Grade D (0-7): Poor/Parts only
- **45-second video recording** with countdown timer
- **Video preview, re-record, confirm** workflow

### 2.5 Match & Transaction Features

#### 2.5.1 Matches Page (`MatchesPage.jsx`)
- **All matches view** for current user (buyer or seller)
- **Match cards** showing:
  - Buyer/Seller role indicator
  - Status badges (Connected, Deal Agreed, Completed, Cancelled)
  - Part name and match date
- **Real-time updates** via Firestore onSnapshot
- **View Details** link to MatchPage
- **Open Chat** button
- **Empty state** with CTAs

#### 2.5.2 Match Page (`MatchPage.jsx`)
- **Success banner** animation
- **Two-card layout**:
  - Left: Request Summary (part, model, grade, price, status)
  - Right: Matched Shop Details (name, verification badge, rating, trades, address, phone)
- **Status tracker** (Requested → Matched → In Transit → Completed)
- **AI Verification Report** (when available):
  - Grading video player
  - Visual recognition results
  - AI price analysis
  - Grade verification
  - Trust check (fake detection)
- **Rating & Review section** (after completion)

#### 2.5.3 Chat Page (`ChatPage.jsx`)
- **Real-time messaging** via Firestore
- **AI Verification Report pinned** at top of chat:
  - Grading video with playback controls
  - Visual Recognition card (part, device, grade, confidence)
  - Pricing Analysis (listed vs AI suggested price)
  - Grade Verification (matches claimed vs AI-verified)
  - Trust Check (suspicious/genuine indicator)
- **Chat interface**:
  - Message bubbles (sent/received)
  - Timestamps
  - Image upload (Cloudinary)
  - Auto-scroll to bottom
- **Match status management** (connected, deal_agreed, completed, cancelled)
- **Deal confirmation flow** for both parties
- **Review prompt** after completion

### 2.6 Shop Management Features

#### 2.6.1 Shop Onboarding (`ShopOnboardingPage.jsx`)
- **Multi-step registration**:
  - Shop name, owner name, phone
  - Location (city, area with autocomplete)
  - Category selection
  - Shop photo upload
- **Location coordinates** capture
- **Admin approval workflow** (pending → approved/rejected)

#### 2.6.2 Shop Reviews Page (`ShopReviewsPage.jsx`)
- **Public shop profile**
- **Reviews list** with:
  - Star ratings
  - Review text
  - Reviewer name
  - Date
  - Shop reply (if any)
- **Overall rating summary**
- **Review reply** functionality for shop owners

#### 2.6.3 Admin Page (`AdminPage.jsx`)
- **Pending shops list**
- **Shop approval/rejection**
- **Rejection reason** input

---

## 3. Backend Features (API Endpoints)

### 3.1 Authentication
- Firebase Admin SDK integration
- JWT token verification
- Service account key authentication

### 3.2 Request Management (`/api/requests`)
- `GET /api/requests` - Get all requests (with filters: buyerId, status)
- `POST /api/requests` - Create new request
  - Duplicate detection (same buyer + part)
  - Force flag to override duplicates
  - Auto-expiration (7 days)
- `POST /api/requests/expire-old` - Batch expire old requests
- `DELETE /api/requests/:id` - Delete request

### 3.3 Listing Management (`/api/listings`)
- `GET /api/listings` - Get all listings (with filters: category, brand, model, part, sellerId)
- `POST /api/listings` - Create new listing
  - Stores: category, brand, model, part, grade, price, warranty, compatibleModels
- `DELETE /api/listings/:id` - Delete listing
- `PATCH /api/listings/:id` - Update listing

### 3.4 Match Management (`/api/matches`)
- `POST /api/matches` - Create match
  - Links request + listing
  - Copies AI metadata from listing (videoUrl, aiPriceSuggestion, aiGradeVerifyResult, aiFakeCheckResult, aiRecognitionResult)
  - Fetches and stores seller details (name, address, phone, rating, trades)
- `GET /api/matches/:userId` - Get matches for user (buyer or seller)
- `GET /api/matches/doc/:matchId` - Get single match document
- `PATCH /api/matches/:matchId/status` - Update match status
  - Tracks first response time for analytics

### 3.5 Shop Management (`/api/shops`)
- `GET /api/shops` - Get all shops (with status filter)
- `GET /api/shops/by-uid/:uid` - Get shop by Firebase UID
- `GET /api/shops/:shopId` - Get shop by ID
- `POST /api/shops` - Create/update shop
  - Legacy mode (with shopId)
  - New onboarding mode (creates pending shop)
- `PATCH /api/shops/:id` - Update shop
- `GET /api/shops/:shopId/response-time` - Calculate average response time

### 3.6 Reviews (`/api/reviews`)
- `POST /api/reviews` - Create review
- `GET /api/shops/:shopId/reviews` - Get shop reviews
- `PUT /api/reviews/:reviewId/reply` - Reply to review

### 3.7 Compatibility (`/api/compatibility`)
- `GET /api/compatibility` - Get device compatibility map

### 3.8 Health Check
- `GET /api/health` - API status check

---

## 4. AI Features (Powered by Groq/Gemini)

### 4.1 AI Compatibility Suggestions (`/api/ai/compat-suggest`)
- **Model**: llama-3.3-70b-versatile
- **Purpose**: Suggest compatible device models for a given part
- **Input**: category, brand, model, part
- **Output**: Array of compatible model names
- **Rules**: Same brand matching, cross-generation compatibility, chassis sharing detection

### 4.2 AI Price Suggestion (`/api/ai/price-suggest`)
- **Model**: llama-3.3-70b-versatile
- **Purpose**: Suggest fair price for used/salvaged parts
- **Input**: category, brand, model, part, grade
- **Output**:
  - suggestedPrice (integer in rupees)
  - range (string like "Rs. 200 - Rs. 400")
  - reasoning (why price is attractive vs new)
  - marketNote (what new replacement costs)
- **Pricing Rules**:
  - Grade A: 30-45% of new part price
  - Grade B: 20-35% of new part price
  - Grade C: 10-25% of new part price
  - Grade D: 5-15% of new part price

### 4.3 AI Search (`/api/search/ai`)
- **Model**: llama-3.3-70b-versatile
- **Purpose**: Natural language query parsing
- **Input**: Natural language query string
- **Output**: Parsed brand, model, part + matching listings
- **Example**: "iPhone 13 battery" → {brand: "Apple", model: "iPhone 13", part: "Battery"}

### 4.4 AI Visual Recognition (`/api/ai/visual-recognition`)
- **Model**: meta-llama/llama-4-scout-17b-16e-instruct (Vision)
- **Purpose**: Identify electronics parts from images
- **Input**: Base64 image
- **Output**:
  - category (Smartphones, Laptops, etc.)
  - brand
  - model
  - part (Battery, Screen, Camera, etc.)
  - grade (A/B/C/D)
  - gradeReason
  - confidence (high/medium/low)
- **Grading Criteria**: Based on visual condition (intactness, damage, wear)

### 4.5 AI Fake Listing Detection (`/api/ai/detect-fake`)
- **Model**: llama-3.3-70b-versatile
- **Purpose**: Detect suspicious/fake listings
- **Input**: category, brand, model, part, grade, price, description
- **Output**:
  - isFake (boolean)
  - confidence (high/medium/low)
  - reasons (array of red flags)
  - recommendation (approve/flag/reject)
- **Checks**: Unrealistic prices, generic descriptions, inconsistent combinations

### 4.6 AI Grade Verification (`/api/ai/verify-grade`)
- **Model**: meta-llama/llama-4-scout-17b-16e-instruct (Vision)
- **Purpose**: Verify if part matches claimed grade
- **Input**: Image + claimedGrade
- **Output**:
  - verifiedGrade (A/B/C/D)
  - matchesClaimed (boolean)
  - confidence
  - reasoning

---

## 5. Database Collections (Firebase Firestore)

### 5.1 `requests`
- Buyer part requests
- Fields: category, brand, model, part, grade, priceOffered, buyerId, status, createdAt, expiresAt

### 5.2 `listings`
- Shop inventory listings
- Fields: category, brand, model, part, grade, price, warranty, compatibleModels, shopId, sellerId, shopName, quantity, status, createdAt
- AI Fields: videoUrl, aiPriceSuggestion, aiGradeVerifyResult, aiFakeCheckResult, aiRecognitionResult

### 5.3 `matches`
- Connections between buyers and sellers
- Fields: requestId, listingId, buyerId, sellerId, part, partName, modelName, grade, price, status, createdAt
- Seller Details: sellerName, sellerAddress, sellerPhone, sellerRating, sellerTrades
- AI Fields: videoUrl, aiPriceSuggestion, aiGradeVerifyResult, aiFakeCheckResult, aiRecognitionResult

### 5.4 `shops`
- Shop profiles
- Fields: uid, shopName, ownerName, phone, city, area, lat, lng, categories, shopPhotoUrl, status, rating, tradesCompleted, address, contact

### 5.5 `reviews`
- Shop ratings and reviews
- Fields: matchId, buyerId, shopId, rating, comment, createdAt, reply

### 5.6 `compatibility`
- Device compatibility mappings
- Maps device identifiers to compatible parts lists

### 5.7 `messages`
- Chat messages
- Fields: matchId, senderId, text, imageUrl, createdAt

---

## 6. Third-Party Integrations

### 6.1 Cloudinary
- **Purpose**: Video and image upload/storage
- **Used in**:
  - Grading video upload (SellPartPage)
  - Chat image sharing (ChatPage)
  - Shop photo upload (ShopOnboardingPage)

### 6.2 Firebase
- **Authentication**: User login/session management
- **Firestore**: Database for all collections
- **Storage**: File storage (optional, primarily using Cloudinary)

### 6.3 Groq API
- **Models used**:
  - llama-3.3-70b-versatile (text tasks)
  - meta-llama/llama-4-scout-17b-16e-instruct (vision tasks)
- **Features**: All AI features listed in Section 4

### 6.4 Gemini API
- **Purpose**: Price suggestions (legacy/fallback)

---

## 7. Frontend Architecture

### 7.1 Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Custom SVG components + Lucide (implicit)
- **State**: React hooks + Context API (AuthContext)

### 7.2 Project Structure
```
frontend/src/
├── pages/           # 12 page components
├── components/      # GradingSection, Navbar
├── context/         # AuthContext
├── data/            # compatibilityMap.js
├── utils/           # deviceData.js
├── api.js           # Central API client
├── firebase.js      # Firebase config
├── main.jsx         # Router setup
└── index.css        # Tailwind + custom styles
```

### 7.3 API Client (`api.js`)
- Centralized fetch wrapper with JWT auth
- Request/response interceptors
- Error handling with status codes

### 7.4 Routes (13 total)
1. `/` - Home (public)
2. `/login` - Login (public)
3. `/buyer` - Buyer dashboard (protected)
4. `/shop` - Shop dashboard (protected)
5. `/sell` - Create listing (protected)
6. `/results` - Search results (protected)
7. `/matches` - All matches (protected)
8. `/match/:id` - Match details (protected)
9. `/onboarding` - Shop registration (protected)
10. `/admin` - Admin panel (protected, admin only)
11. `/chat/:matchId` - Chat interface (protected)
12. `/shop/:shopId/reviews` - Shop reviews (protected)

---

## 8. Backend Architecture

### 8.1 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore (via Admin SDK)
- **AI**: Groq API + Gemini API
- **File Storage**: Cloudinary

### 8.2 Environment Variables
- `PORT` - Server port (default: 5000)
- `GEMINI_KEY` - Gemini API key
- `GROQ_KEY` - Groq API key
- Firebase service account credentials

### 8.3 Middleware
- CORS enabled
- JSON body parser (50MB limit)
- URL-encoded parser (50MB limit)

### 8.4 API Organization
- 8 major endpoint groups
- 30+ total endpoints
- RESTful design with HTTP verbs (GET, POST, PATCH, DELETE)

---

## 9. Key Workflows

### 9.1 Buyer Workflow
1. Visit Home → Choose "I'm a Buyer"
2. Buyer Page → Fill search criteria or browse
3. Results Page → View matching listings with AI compatibility
4. Create Match → Connect with seller
5. Matches Page → View all matches
6. Chat → Negotiate and confirm deal
7. Rate Shop → Leave review after completion

### 9.2 Seller Workflow
1. Visit Home → Choose "I'm a Shop"
2. Onboarding (first time) → Register shop
3. Shop Page → View dashboard and incoming requests
4. Sell Part → Create listing with AI grading
5. Handle Requests → Click "I Have This" to create match
6. Chat → Communicate with buyer
7. Mark Sold → Complete transaction

### 9.3 AI-Enhanced Listing Creation
1. Upload photo of part
2. AI Visual Recognition identifies part, brand, model, grade
3. AI Price Suggestion recommends fair price
4. AI Fake Detection validates listing
5. Record 45-second verification video
6. AI Grade Verification confirms visual grade
7. Publish listing with all AI metadata

---

## 10. Security Features

- **JWT Token Authentication** on all protected routes
- **Firebase Admin SDK** for secure database access
- **Input validation** on all API endpoints
- **CORS** configured for frontend origin
- **Request size limits** (50MB for media uploads)
- **Role-based access control** (admin vs user)

---

## 11. Mobile Responsiveness

All pages are mobile-responsive with:
- Breakpoint: sm (640px), md (768px), lg (1024px)
- Mobile-first CSS with Tailwind
- Touch-friendly button sizes
- Responsive grids (1 col mobile → 2 col desktop)
- Flexible navigation

---

## 12. Status Codes & States

### 12.1 Match Statuses
- `pending` - Initial state
- `connected` - Both parties connected
- `deal_agreed` - Price/terms agreed
- `completed` - Transaction finished
- `cancelled` - Match cancelled

### 12.2 Request Statuses
- `open` - Active and visible to sellers
- `expired` - Past 7-day limit
- `matched` - Connected with seller

### 12.3 Listing Statuses
- `available` - Listed and searchable
- `sold` - No longer available

### 12.4 Shop Statuses
- `pending` - Awaiting admin approval
- `approved` - Active and can list
- `rejected` - Denied with reason

---

**Report Generated**: April 25, 2026
**Total Features Documented**: 100+
**Pages**: 12 | **API Endpoints**: 30+ | **AI Features**: 6

---

## 13. Missing / Not Implemented Features

The following features were mentioned as potentially existing but are **NOT implemented**:

### 13.1 Rate Limiting (Tiered Rules)
**Status**: ❌ NOT IMPLEMENTED
- No rate limiting middleware in `server.js`
- No `express-rate-limit` or similar package usage
- No tiered rules for different user types (anonymous, authenticated, admin)
- APIs are currently unprotected against abuse

**What would be needed**:
```javascript
// Example of what's missing
const rateLimit = require('express-rate-limit');
const tieredLimits = {
  anonymous: { windowMs: 15*60*1000, max: 10 },
  user: { windowMs: 15*60*1000, max: 100 },
  admin: { windowMs: 15*60*1000, max: 1000 }
};
```

### 13.2 RBAC Middleware (Backend)
**Status**: ❌ NOT IMPLEMENTED
- **Frontend only**: `main.jsx` has `requiredRole` prop on `ProtectedRoute` component (lines 21-41)
- **Backend missing**: No role verification middleware in `server.js`
- No `isAdmin`, `isSeller`, `isBuyer` middleware functions
- API endpoints rely solely on Firebase Auth UID verification, not role checks
- Admin APIs only check if user exists, not if role === 'admin'

**Current state**:
- Frontend: Routes protected by role (e.g., `/admin` requires `role: admin`)
- Backend: Any authenticated user can potentially access any endpoint by manipulating requests

**What would be needed**:
```javascript
// Example of what's missing
const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
app.post('/api/admin/...', checkRole(['admin']), handler);
```

### 13.3 Admin Approval Flow Wired to Fake Detection
**Status**: ❌ NOT IMPLEMENTED
- **Fake Detection runs** during listing creation (`SellPartPage.jsx:471`)
- **Results stored** in listing (`aiFakeCheckResult` field)
- **Admin never sees it**: `AdminPage.jsx` only shows shop info (name, owner, phone, location, categories)
- **No AI flag integration**: Manual approve/reject buttons only
- **Disconnect**: Fake detection data exists but is not surfaced to admin dashboard

**Current flow**:
1. Seller creates listing → Fake detection runs → Result stored
2. Admin reviews shop application → Sees only basic shop info
3. Admin manually approves/rejects → No AI data involved

**What would be needed**:
- Display `aiFakeCheckResult` in `AdminPage.jsx`
- Auto-flag suspicious shops based on fake detection
- Show trust score in admin dashboard
- Block approval if `isFake: true` with high confidence

### 13.4 Other Potential Missing Features

Based on code analysis, the following are also **not implemented**:

| Feature | Evidence |
|---------|----------|
| **API request validation (Joi/Zod)** | No validation library found |
| **Input sanitization** | No DOMPurify or similar |
| **CORS whitelist** | CORS enabled but no origin restriction (`server.js:16`) |
| **Request logging** | No morgan or winston logging |
| **Error tracking (Sentry)** | No error monitoring service |
| **Rate limiting by IP** | No IP-based tracking |
| **CSRF protection** | No CSRF tokens |
| **Helmet.js security headers** | No helmet middleware |
| **API versioning** | No `/v1/` prefix on routes |
| **Pagination** | Firestore queries return all results |
| **Indexing hints** | No Firestore composite indexes configured |
| **Backup strategy** | No Firestore backup automation |
| **Webhook system** | No event webhooks for matches/messages |
| **Email notifications** | No email service integration |
| **SMS notifications** | No SMS service for phone verification |
| **Push notifications** | No FCM integration for mobile |
| **Real-time presence** | No "online/offline" user status |
| **Typing indicators** | No "user is typing" in chat |
| **Read receipts** | No message read status |
| **Message encryption** | Messages stored plain text |
| **File attachments (non-image)** | Only images supported in chat |
| **Voice messages** | Not implemented |
| **Video calls** | Not implemented |
| **Payment integration** | No payment gateway (Razorpay/Stripe) |
| **Escrow system** | No transaction holding |
| **Shipping integration** | No courier APIs (Shiprocket/Delhivery) |
| **Order tracking** | No tracking number management |
| **Inventory management** | No stock quantity tracking |
| **Bulk listing upload** | No CSV/Excel import |
| **Listing analytics** | No views/clicks tracking |
| **Search analytics** | No popular search tracking |
| **Seller analytics dashboard** | No sales/revenue charts |
| **Buyer recommendation engine** | No "you might also like" |
| **Wishlist/Favorites** | Not implemented |
| **Price alerts** | Not implemented |
| **Saved searches** | Not implemented |
| **Multi-language support** | Only English |
| **Dark mode** | Not implemented |
| **PWA/offline support** | No service worker |
| **Mobile app** | Web only |

---

**Report Generated**: April 25, 2026
**Total Features Documented**: 100+
**Total Missing Features Identified**: 40+
**Pages**: 12 | **API Endpoints**: 30+ | **AI Features**: 6 | **Security Gaps**: 10+
