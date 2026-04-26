import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { aiSearch, getListings, getShops, createMatch, getCompatibility } from '../api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icons for bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom buyer marker (blue)
const buyerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Custom seller marker (green)
const sellerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// ── Haversine distance (km) ────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
        <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-lg">
          <RecircuitIcon className="w-9 h-9" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Re<span className="text-brand">Circuit</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand bg-brand-50">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

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

function renderTrustBadge(fakeResult) {
  if (!fakeResult) return null;
  const { recommendation, confidence } = fakeResult;
  if (recommendation === 'approve') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-green-100 text-green-800 border-green-300">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        AI Verified
      </span>
    );
  }
  if (recommendation === 'flag') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-yellow-100 text-yellow-800 border-yellow-300">
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        Review Needed
      </span>
    );
  }
  if (recommendation === 'reject') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-red-100 text-red-800 border-red-300">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Suspicious Listing
      </span>
    );
  }
  return null;
}

function renderWarrantyBadge(warranty) {
  if (!warranty || warranty === 'No Warranty') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold border border-gray-200">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        No Warranty
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
      Warranty: {warranty}
    </span>
  );
}

export default function BuyerResultsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState('All')

  // AI Search state
  const [aiQuery, setAiQuery] = useState('')
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiResults, setAiResults] = useState(null)

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return
    try {
      setIsAiSearching(true)
      const data = await aiSearch(aiQuery)
      setAiResults(data)
      console.log('AI response:', data);
    } catch (err) {
      console.error("AI Search returned an error:", err)
      setAiResults({
          results: [],
          extractedIntent: { brand: "", model: "", part: "" },
          aiUsed: false,
          compatibilityUsed: false,
          message: "An error occurred while searching. Please try again or use the filters below."
      })
    } finally {
      setIsAiSearching(false)
    }
  }

  // Buyer geolocation state
  const [buyerLocation, setBuyerLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle') // idle | asking | granted | denied
  const [shopLocations, setShopLocations] = useState({}) // uid -> {lat, lng, shopName, area, city}
  const [compatibilityMap, setCompatibilityMap] = useState({}) // Device model -> [models]

  // Map refs
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Get search params from state
  const searchContext = location.state || { device: 'Device', part: 'Part' }
  const searchTitle = searchContext.part ? `${searchContext.device} ${searchContext.part}` : 'Available Parts'
  const buyerModel = searchContext.model || ''

  // ── Fetch Compatibility ─────────────────────────────
  useEffect(() => {
    const fetchCompat = async () => {
      try {
        const data = await getCompatibility();
        setCompatibilityMap(data || {});
      } catch (err) {
        console.error("Error fetching compatibility:", err);
      }
    };
    fetchCompat();
  }, [])

  // ── Ask for buyer location ──────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      return
    }
    setLocationStatus('asking')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationStatus('granted')
      },
      () => {
        setLocationStatus('denied')
      }
    )
  }, [])

  // ── Fetch listings ──────────────────────────────────
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        const data = await getListings()
        setResults(data)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [])

  // ── Fetch shop locations for listings that don't have embedded lat/lng ──
  useEffect(() => {
    const fetchShopLocations = async () => {
      // Collect unique shopIds that we need to look up
      const needLookup = results
        .map(r => r.shopId || r.sellerId)
        .filter(Boolean)
      const uniqueIds = [...new Set(needLookup)]
      if (uniqueIds.length === 0) return

      try {
        const shopsData = await getShops()
        const locMap = {}
        shopsData.forEach(d => {
          if (d.uid) {
            locMap[d.uid] = { lat: d.lat, lng: d.lng, shopName: d.shopName, area: d.area, city: d.city }
          }
        })
        setShopLocations(locMap)
      } catch (err) {
        console.error('Error fetching shop locations:', err)
      }
    }
    if (results.length > 0) fetchShopLocations()
  }, [results])

  // ── Helper: get lat/lng for a listing ───────────────
  const getSellerCoords = (item) => {
    const shop = shopLocations[item.shopId] || shopLocations[item.sellerId]
    if (shop?.lat && shop?.lng) return { lat: shop.lat, lng: shop.lng }
    return null
  }

  const getSellerLabel = (item) => {
    if (item.shopName) return item.shopName
    const shop = shopLocations[item.shopId] || shopLocations[item.sellerId]
    return shop?.shopName || 'Seller'
  }

  // ── Calculate real distance ─────────────────────────
  const getRealDistance = (item) => {
    if (!buyerLocation) return item.distance || null
    const coords = getSellerCoords(item)
    if (!coords) return item.distance || null
    const km = haversineKm(buyerLocation.lat, buyerLocation.lng, coords.lat, coords.lng)
    return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`
  }

  const getRealDistanceKm = (item) => {
    if (!buyerLocation) return Infinity
    const coords = getSellerCoords(item)
    if (!coords) return Infinity
    return haversineKm(buyerLocation.lat, buyerLocation.lng, coords.lat, coords.lng)
  }

  // ── Compatibility tagging ──────────────────────────
  const compatModels = buyerModel ? (compatibilityMap[buyerModel] || []) : []

  const taggedResults = results.map(item => {
    const isExact = item.model === buyerModel
    const isCompatViaMap = compatModels.includes(item.model)
    const isCompatViaListing = Array.isArray(item.compatibleModels) && item.compatibleModels.includes(buyerModel)
    return {
      ...item,
      isCompatible: !isExact && (isCompatViaMap || isCompatViaListing),
      isMatch: isExact || isCompatViaMap || isCompatViaListing,
    }
  })

  const displayedResults = taggedResults.filter(item => {
    if (buyerModel && !item.isMatch) return false;
    if (filterGrade === 'All') return true;
    return item.grade === filterGrade;
  });

  // Sort by distance if buyer location is available
  const sortedResults = [...displayedResults].sort((a, b) => getRealDistanceKm(a) - getRealDistanceKm(b))

  // ── Leaflet map ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    // Only render map when we have some seller coords or buyer location
    const sellersWithCoords = sortedResults.filter(item => getSellerCoords(item))
    if (sellersWithCoords.length === 0 && !buyerLocation) return

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Determine center
    const center = buyerLocation
      ? [buyerLocation.lat, buyerLocation.lng]
      : getSellerCoords(sellersWithCoords[0])
        ? [getSellerCoords(sellersWithCoords[0]).lat, getSellerCoords(sellersWithCoords[0]).lng]
        : [12.97, 77.59] // fallback Bangalore

    const map = L.map(mapRef.current).setView(center, 12)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Buyer marker
    if (buyerLocation) {
      L.marker([buyerLocation.lat, buyerLocation.lng], { icon: buyerIcon })
        .addTo(map)
        .bindPopup('<strong>📍 Your Location</strong>')
    }

    // Seller markers
    const bounds = []
    if (buyerLocation) bounds.push([buyerLocation.lat, buyerLocation.lng])

    const addedCoords = new Set()
    sellersWithCoords.forEach(item => {
      const coords = getSellerCoords(item)
      if (!coords) return
      const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`
      if (addedCoords.has(key)) return
      addedCoords.add(key)
      bounds.push([coords.lat, coords.lng])
      L.marker([coords.lat, coords.lng], { icon: sellerIcon })
        .addTo(map)
        .bindPopup(`<strong>🏪 ${getSellerLabel(item)}</strong><br/>${item.part || 'Part'} · Rs. ${item.price}`)
    })

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [sortedResults, buyerLocation, shopLocations])

  const handleCreateMatch = async (listingId) => {
    try {
      const listing = results.find(r => r.id === listingId) || {}

      await createMatch({
        requestId: searchContext.requestId || 'req_' + Date.now(),
        listingId,
        buyerId: currentUser.uid,
        sellerId: listing.uid || listing.shopId || listing.sellerId || 'unknown_seller',
        part: listing.part || searchContext.part || 'Component',
        partName: listing.part || searchContext.part || 'Component',
        modelName: listing.model || searchContext.model || 'Unknown',
        grade: listing.grade || null,
        price: listing.price || null,
        status: 'connected',
        // Pass AI data from listing
        videoUrl: listing.videoUrl || null,
        imageUrl: listing.imageUrl || null,
        aiPriceSuggestion: listing.aiPriceSuggestion || null,
        aiGradeVerifyResult: listing.aiGradeVerifyResult || null,
        aiFakeCheckResult: listing.aiFakeCheckResult || null,
        aiRecognitionResult: listing.aiRecognitionResult || null,
      })
      navigate("/matches")
    } catch (error) {
      console.error('Error creating match:', error)
      navigate('/matches')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <NavHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-6">

        {/* AI Search Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="Describe what you need, e.g. my Realme Narzo 60 battery drains fast"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <button 
              onClick={handleAiSearch}
              disabled={isAiSearching || !aiQuery.trim()}
              className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl disabled:opacity-50 transition-colors shrink-0"
            >
              {isAiSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {aiResults && (
            <div className="mt-6 flex flex-col gap-4 animate-fadeIn">
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
                <h3 className="font-bold text-gray-900">
                  Searching for:{' '}
                  <span className="text-brand">
                    {[aiResults.extractedIntent.brand, aiResults.extractedIntent.model, aiResults.extractedIntent.part].filter(Boolean).join(' ')}
                  </span>
                </h3>
                {!aiResults.aiUsed && (
                  <p className="text-xs text-gray-500 font-medium">Showing keyword results (AI unavailable)</p>
                )}
                {aiResults.compatibilityUsed && (
                  <p className="text-xs text-blue-600 font-medium">Some results include compatible models for your device</p>
                )}
              </div>

              {aiResults.results.length === 0 ? (
                <p className="text-sm text-gray-600 py-4 text-center bg-gray-50 rounded-xl border border-gray-100">
                  {aiResults.message || 'No listings found. Try describing your issue differently or use the filters below.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiResults.results.map(item => {
                    const shopName = item.shopName || shopLocations[item.shopId]?.shopName || shopLocations[item.sellerId]?.shopName || 'Seller';
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-xl p-4 hover:border-brand transition-colors bg-gray-50 flex flex-col items-start text-left">
                        <div className="flex justify-between items-start w-full mb-2 gap-2">
                          <h4 className="font-bold text-gray-900 break-words flex-1">{item.part || 'Part'}</h4>
                          <span className="font-black text-brand text-lg shrink-0">Rs. {item.price}</span>
                        </div>
                        <div className="text-sm text-gray-600 flex flex-col gap-1 w-full">
                          <p><span className="font-semibold text-gray-500">Brand:</span> {item.brand || 'N/A'}</p>
                          <p><span className="font-semibold text-gray-500">Model:</span> {item.model || 'N/A'}</p>
                          <p><span className="font-semibold text-gray-500">Grade:</span> {item.grade || 'N/A'}</p>
                          <p><span className="font-semibold text-gray-500">Shop:</span> {shopName}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center my-2">
          <span className="text-sm font-medium text-gray-400 tracking-widest">--- or use filters below ---</span>
        </div>
        
        {/* Header & Search Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link to="/buyer" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Search
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Results for "<span className="text-brand">{searchTitle}</span>"
            </h1>
            <p className="text-sm text-gray-500 mt-2">Found {displayedResults.length} matches{buyerLocation ? ' near you' : ''}.</p>
          </div>

          <div className="flex items-center gap-3">
            <select className="bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg px-4 py-2 focus:ring-brand focus:border-brand shadow-sm cursor-pointer outline-none">
              <option>Sort by: Nearest First</option>
              <option>Sort by: Lowest Price</option>
              <option>Sort by: Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Location Permission Banner */}
        {locationStatus === 'asking' && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">Allow location access</p>
              <p className="text-xs text-blue-600">Please allow location access in your browser to see distances and nearby sellers on the map.</p>
            </div>
          </div>
        )}

        {locationStatus === 'denied' && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Location access denied</p>
              <p className="text-xs text-amber-600">Enable location in your browser settings to see real distances and seller locations on the map.</p>
            </div>
          </div>
        )}

        {locationStatus === 'granted' && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-700">Location enabled — showing real distances and sellers on map</p>
          </div>
        )}

        {/* Map Section */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Seller Locations Near You</h2>
            <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> You</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Sellers</span>
            </div>
          </div>
          <div ref={mapRef} className="w-full h-72 sm:h-80" />
        </div>

        {/* Grade Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-900 p-4 rounded-xl border border-gray-800">
          <span className="text-sm font-semibold text-gray-300">Filter by Grade:</span>
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'A', 'B', 'C', 'D'].map(g => (
              <button
                key={g}
                onClick={() => setFilterGrade(g)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterGrade === g 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Compatibility info text */}
        {buyerModel && (
          <p className="text-gray-400 text-sm italic mt-1">
            Showing exact matches and compatible parts for <strong className="text-gray-300 not-italic">{buyerModel}</strong>
          </p>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 gap-4 mt-2">
          {loading ? (
            <p className="text-center py-12 text-gray-500">Loading results...</p>
          ) : sortedResults.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No results found. Try adjusting your search.</p>
          ) : (
            sortedResults.map((item, index) => {
              const distance = getRealDistance(item)
              const sellerCoords = getSellerCoords(item)
              const sellerLabel = getSellerLabel(item)

              return (
            <div 
              key={item.id} 
              className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center hover:border-brand/40 hover:shadow-md transition-all duration-300 animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              
              <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border border-gray-200 p-2 text-center overflow-hidden">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0V16m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto flex-1">
                {/* Shop Name & Rating */}
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900 leading-none">{sellerLabel}</h3>
                  {item.rating && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-xs border border-yellow-100">
                      <span className="text-yellow-700 font-bold">{item.rating}</span>
                      <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </div>
                  )}
                  {item.trades && <span className="text-xs text-gray-400 font-medium tracking-wide">({item.trades} TRADES)</span>}
                </div>

                {/* Quality, Warranty & Compatibility Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {renderGradeBadge(item.grade)}
                  {item.isCompatible && (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">Compatible Part</span>
                  )}
                  {renderWarrantyBadge(item.warranty)}
                  {renderTrustBadge(item.aiFakeCheckResult)}
                  {item.condition && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold border border-gray-200">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {item.condition}
                    </span>
                  )}
                </div>

                {/* Seller location info */}
                {(() => {
                  const shop = shopLocations[item.shopId] || shopLocations[item.sellerId];
                  if (!shop || (!shop.area && !shop.city)) return null;
                  return (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{[shop.area, shop.city].filter(Boolean).join(', ')}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Price, Distance, & CTA */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 gap-4 sm:gap-2">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-2xl font-black text-gray-900">Rs. {item.price}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {distance ? `${distance} Away` : 'Distance N/A'}
                  </span>
                  {sellerCoords && buyerLocation && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${buyerLocation.lat},${buyerLocation.lng}&destination=${sellerCoords.lat},${sellerCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Get Directions
                    </a>
                  )}
                </div>

                <button 
                  onClick={() => handleCreateMatch(item.id)}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-sm transition-all focus:ring-2 focus:ring-brand focus:ring-offset-2 shrink-0"
                >
                  Request Part
                </button>
              </div>

            </div>
          )})
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400 mt-auto">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
    </div>
  )
}
