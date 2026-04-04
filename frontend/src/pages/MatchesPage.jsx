import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

// ── Shared Nav Header ──────────────────────────────────────────────────────

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

function NavHeader() {
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
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

function MatchCard({ match, currentUser }) {
  const navigate = useNavigate()

  const isBuyer = match.buyerId === currentUser.uid

  // Status mapping
  const activeStatus = match.status || 'connected'
  let statusClasses = { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: 'Connected', border: 'border-l-green-800' }
  
  if (activeStatus === 'deal_agreed') {
    statusClasses = { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Deal Agreed', border: 'border-l-amber-500' }
  } else if (activeStatus === 'completed') {
    statusClasses = { bg: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Completed', border: 'border-l-green-500' }
  } else if (activeStatus === 'cancelled') {
    statusClasses = { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Cancelled', border: 'border-l-red-500' }
  }

  return (
    <div className={`relative group bg-white border border-gray-200 border-l-4 ${statusClasses.border} rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-r-brand/30 hover:border-t-brand/30 hover:border-b-brand/30 transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isBuyer ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
          }`}>
            {isBuyer ? 'You are buying' : 'You are selling'}
          </span>
        </div>
        <div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest ${statusClasses.bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusClasses.dot}`} />
            {statusClasses.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-extrabold text-gray-900 truncate">
          {match.part || 'Component'}
        </h3>
        <p className="text-sm font-medium text-gray-400">
          {match.createdAt ? new Date(match.createdAt).toLocaleDateString() : 'Date unavailable'}
        </p>
      </div>

      <Link to={`/match/${match.id}`} className="inline-flex items-center justify-center w-full gap-2 px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-600 group-hover:bg-brand-50 group-hover:text-brand group-hover:border-brand/30 transition-colors">
        View Details
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
      
      <button 
        onClick={() => navigate(`/chat/${match.id}`)}
        className="bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg px-4 py-2 transition-colors w-full mt-3 flex items-center justify-center gap-2"
      >
        Open Chat
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const { currentUser } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const matchesRef = collection(db, 'matches')
    const qBuyer = query(matchesRef, where('buyerId', '==', currentUser.uid))
    const qSeller = query(matchesRef, where('sellerId', '==', currentUser.uid))

    let buyerMatched = new Map()
    let sellerMatched = new Map()

    const updateMatches = () => {
      const merged = new Map([...buyerMatched, ...sellerMatched])
      const allMatches = Array.from(merged.values()).sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
      setMatches(allMatches)
      setLoading(false)
    }

    const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          buyerMatched.delete(change.doc.id)
        } else {
          buyerMatched.set(change.doc.id, { id: change.doc.id, ...change.doc.data() })
        }
      })
      updateMatches()
    }, (err) => { console.error('Buyer matches error', err); setLoading(false); })

    const unsubSeller = onSnapshot(qSeller, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          sellerMatched.delete(change.doc.id)
        } else {
          sellerMatched.set(change.doc.id, { id: change.doc.id, ...change.doc.data() })
        }
      })
      updateMatches()
    }, (err) => { console.error('Seller matches error', err); setLoading(false); })

    return () => {
      unsubBuyer()
      unsubSeller()
    }
  }, [currentUser])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <NavHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col items-center">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">
            Your <span className="text-brand">Matches</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto">
            View the progress of your matched requests and inventory sales here.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-brand/30 border-t-brand rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-semibold text-gray-400">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-gray-300 w-full max-w-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">No matches found</h3>
            <p className="text-gray-500 text-sm max-w-sm mt-2">
              You don't have any active matches yet. Try requesting a part or listing an item to get started!
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/buyer" className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand transition-colors">
                Request a Part
              </Link>
              <Link to="/shop" className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold shadow-md hover:bg-brand-dark transition-colors">
                List a Part
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl grid gap-4 grid-cols-1 md:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} currentUser={currentUser} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
    </div>
  )
}
