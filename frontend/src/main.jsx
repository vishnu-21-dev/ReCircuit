import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import AuthProvider, { useAuth } from './context/AuthContext'

import HomeScreen from './pages/HomeScreen'
import BuyerPage from './pages/BuyerPage'
import ShopPage from './pages/ShopPage'
import MatchesPage from './pages/MatchesPage'
import MatchPage from './pages/MatchPage'
import BuyerResultsPage from './pages/BuyerResultsPage'
import SellPartPage from './pages/SellPartPage'
import LoginPage from './pages/LoginPage'
import ShopOnboardingPage from './pages/ShopOnboardingPage'
import AdminPage from './pages/AdminPage'
import ChatPage from './pages/ChatPage'
import ShopReviewsPage from './pages/ShopReviewsPage'

// ProtectedRoute component ensures user is authenticated before viewing a page
function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && currentUser.uid !== 'EFm0bTKNdgMmPXrcNOkThCp2Pnj1') {
    return <Navigate to="/" replace />;
  }

  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomeScreen />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Unprotected Routes for now, check auth inside if needed */}
          <Route path="/buyer" element={<BuyerPage />} />
          <Route path="/sell" element={<SellPartPage />} />

          {/* Protected Routes */}
          <Route
            path="/shop"
            element={
              <ProtectedRoute>
                <ShopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <BuyerResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/match/:id"
            element={
              <ProtectedRoute>
                <MatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <ShopOnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:matchId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop/:shopId/reviews"
            element={
              <ProtectedRoute>
                <ShopReviewsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
