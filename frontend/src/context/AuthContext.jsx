import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Try popup first (works when third-party cookies are allowed)
      return await signInWithPopup(auth, provider);
    } catch (err) {
      // If popup fails due to blocked cookies/popups, fall back to redirect
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/internal-error' ||
        err.message?.includes('UNAUTHENTICATED')
      ) {
        console.warn('Popup sign-in failed, falling back to redirect:', err.code);
        return signInWithRedirect(auth, provider);
      }
      throw err;
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    // Handle redirect result (if user was redirected back after Google sign-in)
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in error:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Wait briefly for the auth token to fully propagate
          await user.getIdToken(true);
          const roleDoc = await getDoc(doc(db, 'roles', user.uid));
          const role = roleDoc.exists() ? roleDoc.data().role : 'user';
          setCurrentUser({ ...user, role });
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Still set the user even if role fetch fails
          setCurrentUser({ ...user, role: 'user' });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loginWithEmail,
    loginWithGoogle,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
