import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getShopByUid, getListings, getRequests, deleteListing, updateListing, createMatch } from '../api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand bg-brand-50">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

// ── Dummy Data ─────────────────────────────────────────────────────────────



function renderGradeBadge(grade) {
  const gradeMap = {
    A: { label: 'Grade A · Excellent', bg: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
    B: { label: 'Grade B · Good', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
    C: { label: 'Grade C · Fair', bg: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
    D: { label: 'Grade D · Poor', bg: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  };
  const info = gradeMap[grade];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${info.bg}`}>
      <span className={`w-2 h-2 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ShopPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [matchedIds, setMatchedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const [verifyingShop, setVerifyingShop] = useState(true)
  const [shopStatus, setShopStatus] = useState(null)
  const [shopReason, setShopReason] = useState('')
  const [shopData, setShopData] = useState(null)
  
  const [listings, setListings] = useState([])
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!shopData?.lat || !shopData?.lng) return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    mapInstanceRef.current = L.map(mapRef.current).setView([shopData.lat, shopData.lng], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current)
    L.marker([shopData.lat, shopData.lng])
      .addTo(mapInstanceRef.current)
      .bindPopup(shopData.shopName || 'Shop Location')
      .openPopup()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [shopData])
  const [listingsLoading, setListingsLoading] = useState(true)

  useEffect(() => {
    const verifyShop = async () => {
      if (!currentUser) return;
      try {
        const shopDoc = await getShopByUid(currentUser.uid)
        setShopStatus(shopDoc.status)
        setShopReason(shopDoc.rejectionReason || '')
        setShopData(shopDoc)
      } catch (err) {
        if (err.message === 'Shop not found') {
          navigate('/onboarding')
        } else {
          console.error("Error verifying shop:", err)
        }
      } finally {
        setVerifyingShop(false)
      }
    }
    verifyShop()
  }, [currentUser, navigate])

  useEffect(() => {
    const fetchListings = async () => {
      if (!currentUser) return;
      try {
        setListingsLoading(true)
        const data = await getListings({ sellerId: currentUser.uid })
        setListings(data)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setListingsLoading(false)
      }
    }
    fetchListings()
  }, [currentUser])

  useEffect(() => {
    const fetchRequests = async () => {
      if (!shopData) return;
      try {
        setLoading(true)
        const data = await getRequests()
        
        const filteredData = shopData.categories?.length 
          ? data.filter(req => shopData.categories.includes(req.category))
          : data;
          
        setRequests(filteredData)
      } catch (error) {
        console.error('Error fetching requests:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [shopData])

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await deleteListing(listingId)
      setListings(prev => prev.filter(l => l.id !== listingId))
    } catch (err) {
      console.error('Error deleting listing:', err)
    }
  }

  const handleMarkSold = async (listingId) => {
    try {
      await updateListing(listingId, { status: 'sold' })
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'sold' } : l))
    } catch (err) {
      console.error('Error marking as sold:', err)
    }
  }

  const handleMatch = async (req) => {
    if (!currentUser || !shopData) return
    try {
      await createMatch({
        requestId: req.id,
        listingId: null,
        buyerId: req.buyerId || req.uid || 'unknown_buyer',
        sellerId: currentUser.uid,
        part: req.part || 'Component',
        partName: req.part || 'Component',
        modelName: req.model || req.device || 'Unknown',
        status: 'connected',
      })
      setMatchedIds(prev => new Set(prev).add(req.id))
    } catch (err) {
      console.error('Error creating match:', err)
    }
  }

  if (verifyingShop) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center font-sans">
        <p className="text-gray-400">Verifying shop status...</p>
      </div>
    )
  }

  if (shopStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 flex flex-col items-center justify-center font-sans px-6">
        <p className="text-gray-300 text-center text-xl font-bold mb-2">Your shop is under review. We will notify you once approved.</p>
        <p className="text-gray-500 text-sm">This usually takes 1-2 business days.</p>
      </div>
    )
  }

  if (shopStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 flex flex-col items-center justify-center font-sans px-6">
        <div className="max-w-md w-full text-center">
          <p className="text-red-400 text-xl font-bold mb-2">Your shop application was rejected.</p>
          <p className="text-gray-400 mb-6">{shopReason}</p>
          <button 
            onClick={() => navigate('/onboarding')} 
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors border border-white/20"
          >
            Reapply
          </button>
        </div>
      </div>
    )
  }

  if (shopStatus === 'approved' && !shopData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center font-sans">
        <p className="text-gray-400">Verifying shop status...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <NavHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

        {/* ── Shop Header Section ── */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row flex-wrap gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-900">{shopData?.shopName || 'My Shop'}</h1>
              {/* Verified Badge */}
              {shopData?.status === 'approved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand/20 text-brand text-xs font-bold uppercase tracking-wider">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {shopData?.categories?.map(cat => <span key={cat} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{cat}</span>)}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 p-4 rounded-xl w-full md:w-auto">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{shopData?.area && shopData?.city ? shopData.area + ', ' + shopData.city : 'Address not set'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{shopData?.phone || 'Phone not set'}</span>
            </div>
          </div>

          {shopData?.lat && shopData?.lng && (
            <div ref={mapRef} className="w-full md:w-64 h-40 rounded-xl overflow-hidden border border-gray-200 shrink-0" />
          )}
        </section>

        {/* ── My Listings ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <span className="flex items-center justify-center bg-brand text-white w-7 h-7 rounded-full text-sm font-bold">{listings.length}</span>
            </div>
          </div>

          {listingsLoading ? (
            <p className="text-gray-500 text-sm">Loading listings...</p>
          ) : listings.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center">
              <p className="text-gray-500 mb-4">No listings yet</p>
              <Link to="/sell" className="px-6 py-2 rounded-xl bg-brand font-bold text-white shadow-sm hover:bg-brand-dark transition-colors">Create your first listing</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {listings.map(listing => (
                <div key={listing.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col gap-1 mb-3">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{listing.part}</h3>
                    <p className="text-sm text-gray-500">{listing.model} {listing.brand ? `· ${listing.brand}` : ''}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    {renderGradeBadge(listing.grade)}
                  </div>
                  
                  <span className="text-xl font-black text-gray-900">Rs. {listing.price}</span>
                  
                  <div className="flex justify-end gap-3 mt-4 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => handleMarkSold(listing.id)}
                      disabled={listing.status === 'sold'}
                      className={`px-4 py-2 rounded-lg font-bold text-sm border transition-colors ${
                        listing.status === 'sold'
                          ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      {listing.status === 'sold' ? 'Sold' : 'Mark as Sold'}
                    </button>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="px-4 py-2 rounded-lg font-bold text-sm text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Incoming Requests List ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Incoming Buyer Requests</h2>
              <span className="flex items-center justify-center bg-brand text-white w-7 h-7 rounded-full text-sm font-bold">{requests.length}</span>
            </div>
            
            <Link to="/sell" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark cursor-pointer text-white font-bold rounded-xl text-sm transition-colors shadow-sm focus:ring-2 focus:ring-brand focus:ring-offset-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
              List New Part
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center">
              <p className="text-gray-500">No open buyer requests match your shop categories right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {requests.map(req => {
              const isMatched = matchedIds.has(req.id)

              return (
                <div 
                  key={req.id} 
                  className={`
                    flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 rounded-2xl border transition-all duration-300
                    ${isMatched ? 'bg-brand-50/50 border-brand/20 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'}
                  `}
                >
                  <div className="flex flex-col gap-2">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold whitespace-nowrap">
                        {req.category}
                      </span>
                      {req.grade === 'A' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-300"><span className="w-2 h-2 rounded-full bg-green-500" />Min Grade A</span>}
                      {req.grade === 'B' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300"><span className="w-2 h-2 rounded-full bg-yellow-500" />Min Grade B</span>}
                      {req.grade === 'C' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300"><span className="w-2 h-2 rounded-full bg-orange-500" />Min Grade C</span>}
                      {req.grade === 'D' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-300"><span className="w-2 h-2 rounded-full bg-red-500" />Min Grade D</span>}
                      {req.grade && !['A','B','C','D'].includes(req.grade) && <span className="px-2.5 py-1 bg-brand-50 text-brand rounded-lg text-xs font-bold whitespace-nowrap border border-brand/20">Min Grade {req.grade}</span>}
                    </div>

                    {/* Part & Device */}
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {req.device} {req.part}
                    </h3>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mt-1">
                      <span className="flex items-center gap-1.5 font-bold text-gray-800">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Rs. {req.price}
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {req.distance} km
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {req.time}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="sm:shrink-0 w-full sm:w-auto">
                    {isMatched ? (
                      <button 
                        disabled 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-100 text-brand font-bold text-sm border border-brand/20 cursor-default"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        Matched
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleMatch(req)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-sm transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
                      >
                        I Have This
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400 mt-auto">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
    </div>
  )
}
