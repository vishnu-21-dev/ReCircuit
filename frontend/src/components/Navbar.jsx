import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function RecircuitIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 4L40 32H8L24 4Z" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="18" r="2.5" fill="#16a34a" />
      <circle cx="16" cy="30" r="2.5" fill="#16a34a" />
      <circle cx="32" cy="30" r="2.5" fill="#16a34a" />
      <line x1="24" y1="18" x2="16" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      <line x1="24" y1="18" x2="32" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      <line x1="16" y1="30" x2="32" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      <polyline points="8,32 4,36 12,36" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="40,32 44,36 36,36" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="4" y1="36" x2="44" y2="36" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [newMatchCount, setNewMatchCount] = useState(0)

  useEffect(() => {
    if (!currentUser) {
      setNewMatchCount(0)
      return
    }

    const matchesMap = new Map()

    const updateCount = () => {
      let count = 0
      matchesMap.forEach(match => {
        if (match.status === 'connected') {
          count++
        }
      })
      setNewMatchCount(count)
    }

    const qBuyer = query(
      collection(db, 'matches'),
      where('buyerId', '==', currentUser.uid)
    )

    const unsubscribeBuyer = onSnapshot(qBuyer, (snapshot) => {
      snapshot.docs.forEach(doc => {
        matchesMap.set(doc.id, doc.data())
      })
      updateCount()
    })

    const qSeller = query(
      collection(db, 'matches'),
      where('sellerId', '==', currentUser.uid)
    )

    const unsubscribeSeller = onSnapshot(qSeller, (snapshot) => {
      snapshot.docs.forEach(doc => {
        matchesMap.set(doc.id, doc.data())
      })
      updateCount()
    })

    return () => {
      unsubscribeBuyer()
      unsubscribeSeller()
    }
  }, [currentUser])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-lg" aria-label="ReCircuit home">
          <RecircuitIcon className="w-9 h-9" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Re<span className="text-brand">Circuit</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1" aria-label="Site navigation">
          {currentUser ? (
            <>
              <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Find Parts</Link>
              <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Sell Parts</Link>
              <Link to="/matches" className="relative px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">
                Matches
                {newMatchCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {newMatchCount > 9 ? '9+' : newMatchCount}
                  </span>
                )}
              </Link>
              <Link to="/onboarding" className="border border-green-600 text-green-400 hover:bg-green-900/40 rounded-lg px-3 py-1 text-sm transition-colors">Register Shop</Link>
              <button onClick={handleLogout} className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Login</Link>
              <Link to="/login" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
