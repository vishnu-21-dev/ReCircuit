import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRequests, createRequest, deleteRequest } from '../api'

// ── Data Maps ──────────────────────────────────────────────────────────────

const categoryData = {
  Smartphones: {
    Samsung: ["Galaxy S24", "Galaxy S23", "Galaxy S22", "Galaxy A54", "Galaxy A34", "Galaxy A14", "Galaxy M34", "Galaxy M14", "Galaxy F54", "Galaxy S21 FE"],
    Apple: ["iPhone 15", "iPhone 15 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 13", "iPhone 13 Pro", "iPhone 12", "iPhone 11", "iPhone SE 3rd Gen", "iPhone XR"],
    OnePlus: ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "OnePlus Nord CE 3", "OnePlus Nord 2T", "OnePlus 10 Pro", "OnePlus 10T", "OnePlus 9 Pro", "OnePlus Nord CE 2"],
    Xiaomi: ["Redmi Note 13 Pro", "Redmi Note 13", "Redmi Note 12 Pro", "Redmi Note 12", "Redmi 13C", "Poco X6 Pro", "Poco X6", "Poco M6 Pro", "Mi 11X Pro"],
    Realme: ["Realme 12 Pro", "Realme 12", "Realme Narzo 60 Pro", "Realme Narzo 60", "Realme 11 Pro", "Realme C67", "Realme C55", "Realme GT 5"],
    Vivo: ["Vivo V30 Pro", "Vivo V30", "Vivo V29 Pro", "Vivo V27 Pro", "Vivo Y100", "Vivo Y56", "Vivo T2 Pro", "Vivo X90 Pro"],
    Oppo: ["Oppo Reno 11 Pro", "Oppo Reno 11", "Oppo Reno 10 Pro", "Oppo F25 Pro", "Oppo F23", "Oppo A79", "Oppo A58"],
    Motorola: ["Moto G84", "Moto G54", "Moto G34", "Moto Edge 40 Pro", "Moto Edge 40", "Moto G73", "Moto G53"],
    Nokia: ["Nokia G42", "Nokia G21", "Nokia C32", "Nokia C22", "Nokia X30", "Nokia G60"],
    iQOO: ["iQOO 12", "iQOO 11", "iQOO Neo 9 Pro", "iQOO Neo 7 Pro", "iQOO Z9", "iQOO Z7 Pro"]
  },
  Laptops: {
    Lenovo: ["ThinkPad X1 Carbon", "ThinkPad E14", "IdeaPad Slim 5", "IdeaPad Slim 3", "LOQ 15", "Legion 5 Pro", "Legion 5i", "Yoga 7i", "IdeaPad Gaming 3"],
    Dell: ["XPS 13", "XPS 15", "Inspiron 15 3520", "Inspiron 14", "Vostro 15", "Latitude 5540", "G15 Gaming", "Alienware m16"],
    HP: ["Pavilion 15", "Envy x360", "Spectre x360", "Omen 16", "EliteBook 840", "ProBook 450", "HP 15s", "Victus 16"],
    Asus: ["ZenBook 14", "VivoBook 15", "ROG Strix G15", "ROG Zephyrus G14", "TUF Gaming A15", "TUF Gaming F15", "ExpertBook B1"],
    Acer: ["Aspire 5", "Aspire 7", "Swift 3", "Predator Helios 300", "Predator Helios Neo", "Nitro 5", "Nitro V"],
    Apple: ["MacBook Air M1", "MacBook Air M2", "MacBook Air M3", "MacBook Pro 14 M3", "MacBook Pro 16 M3", "MacBook Pro M2"],
    MSI: ["MSI Thin GF63", "MSI Katana 15", "MSI Raider GE78", "MSI Stealth 16", "MSI Modern 14"],
    Samsung: ["Galaxy Book3 Pro", "Galaxy Book3 360", "Galaxy Book3 Ultra", "Galaxy Book2 Pro"],
    Microsoft: ["Surface Laptop 5", "Surface Laptop Studio 2", "Surface Pro 9", "Surface Pro 10"]
  },
  "Home Appliances": {
    Samsung: ["Front Load WM 7kg", "Front Load WM 8kg", "Top Load WM 6.5kg", "French Door Fridge", "Double Door Fridge 253L", "Single Door Fridge 192L", "1.5 Ton Split AC", "2 Ton Split AC"],
    LG: ["Front Load WM 8kg", "Top Load WM 7kg", "Side by Side Fridge", "Double Door Fridge 260L", "1 Ton Inverter AC", "1.5 Ton Inverter AC", "Microwave 28L"],
    Whirlpool: ["Top Load WM 6.5kg", "Top Load WM 7.5kg", "Double Door Fridge 235L", "Single Door Fridge 184L", "1.5 Ton Inverter AC"],
    Voltas: ["1 Ton Split AC", "1.5 Ton Split AC", "2 Ton Split AC", "1.5 Ton Window AC"],
    Daikin: ["1 Ton Split AC", "1.5 Ton Split AC", "2 Ton Split AC", "1.5 Ton Inverter AC"],
    Bosch: ["Front Load WM 7kg", "Front Load WM 8kg", "Dishwasher 13 Place", "Built-in Oven 60cm"],
    Haier: ["Top Load WM 6kg", "Double Door Fridge 258L", "1.5 Ton Split AC", "Deep Freezer 200L"],
    Godrej: ["Single Door Fridge 190L", "Double Door Fridge 236L", "Top Load WM 6.5kg", "1.5 Ton Split AC"],
    Panasonic: ["1.5 Ton Inverter AC", "Double Door Fridge 250L", "Microwave 27L", "Front Load WM 7kg"]
  },
  "Consumer Electronics": {
    Samsung: ['QLED TV 55"', 'OLED TV 65"', 'Crystal 4K TV 43"', 'The Frame TV 50"', "Soundbar HW-Q600C"],
    LG: ['OLED C3 55"', 'OLED C3 65"', 'NanoCell TV 55"', 'UHD TV 43"', "Soundbar S90QY"],
    Sony: ['Bravia XR A80L OLED', 'Bravia X90L 55"', 'Bravia X75L 43"', "HT-A7000 Soundbar", "WH-1000XM5 Headphones", "PlayStation 5"],
    OnePlus: ["TV 55 Y1S Pro", "TV 65 Q2 Pro", "TV 43 Y1S"],
    Mi: ['TV 5X 55"', 'TV A Pro 43"', 'TV 4X 65"', 'Smart TV 4A 32"'],
    Boat: ["Airdopes 141", "Airdopes 191G", "Rockerz 255 Pro", "Nirvana Ion", "Wave Flex"],
    JBL: ["Flip 6", "Charge 5", "Xtreme 3", "Tune 770NC", "Quantum 100"],
    Apple: ["AirPods Pro 2nd Gen", "AirPods 3rd Gen", "HomePod Mini", "Apple TV 4K"],
    Canon: ["EOS R50", "EOS R10", "EOS 1500D", "PowerShot G7X Mark III"],
    Nikon: ["Z30", "Z50", "D3500", "Coolpix P950"]
  }
}

// Derive BRANDS and MODELS from categoryData so existing logic is unchanged
const BRANDS = Object.fromEntries(
  Object.entries(categoryData).map(([cat, brands]) => [cat, Object.keys(brands)])
)
const MODELS = categoryData

const PARTS = {
  Smartphones: ['Battery', 'Screen', 'Camera Module', 'Charging Port', 'Motherboard', 'Speaker', 'Microphone', 'Back Panel', 'Power Button', 'Earpiece'],
  Laptops: ['Battery', 'Screen', 'Keyboard', 'Trackpad', 'RAM', 'SSD/HDD', 'Charging Port', 'Cooling Fan', 'Motherboard', 'Hinge'],
  'Home Appliances': ['Motor', 'Control Board', 'Door Seal', 'Compressor', 'Thermostat', 'Pump', 'Drum', 'Water Inlet Valve', 'Heating Element', 'Condenser Coil', 'Blower Fan', 'Magnetron', 'Inverter Board', 'Water Filter Component', 'Drain Pump', 'Ice Maker Module'],
  'Consumer Electronics': ['Screen Panel', 'Mainboard', 'Power Board', 'Backlight', 'Speaker', 'HDMI Port', 'Remote Sensor', 'T-Con Board', 'Wi-Fi Module', 'Antenna', 'Bluetooth Chip', 'Amplifier Board', 'Subwoofer Driver', 'Lens Assembly', 'Cooling Fan', 'Optical Drive Lens'],
}

const GRADES = [
  { value: 'A', label: 'Grade A – Excellent', desc: '90%+ condition, under 6 months old' },
  { value: 'B', label: 'Grade B – Good', desc: '70-90% condition, minor wear' },
  { value: 'C', label: 'Grade C – Fair', desc: '50-70% condition, needs minor repair' },
  { value: 'D', label: 'Grade D – Parts Only', desc: 'Below 50%, heavy damage' },
]

const CATEGORIES = Object.keys(BRANDS)

// ── Shared Nav Header (matches HomeScreen) ─────────────────────────────────

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
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand bg-brand-50">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

// ── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, show }) {
  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border transition-all duration-300
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
        bg-brand-50 border-brand/30 text-brand`}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  )
}

// ── Step Progress Indicator ────────────────────────────────────────────────

const STEP_LABELS = ['Device', 'Brand & Model', 'Part Needed', 'Budget']

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-10">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        return (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0
                  ${isDone ? 'bg-brand text-white' : ''}
                  ${isActive ? 'bg-brand text-white ring-4 ring-brand/20 scale-110' : ''}
                  ${!isActive && !isDone ? 'bg-gray-100 text-gray-400' : ''}
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                  </svg>
                ) : stepNum}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${isActive || isDone ? 'text-brand' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300 ${isDone ? 'bg-brand' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Reusable Form Controls ─────────────────────────────────────────────────

function SelectField({ id, label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200
            hover:border-gray-300 cursor-pointer"
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lbl = typeof opt === 'string' ? opt : opt.label
            return <option key={val} value={val}>{lbl}</option>
          })}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}

function TextField({ id, label, value, onChange, placeholder, prefix }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-sm font-semibold text-gray-500 pointer-events-none">{prefix}</span>
        )}
        <input
          id={id}
          type={prefix ? 'number' : 'text'}
          min={prefix ? 0 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-gray-200 rounded-xl py-3 text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200
            hover:border-gray-300 ${prefix ? 'pl-12 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  )
}

// ── Grade Card ─────────────────────────────────────────────────────────────

function GradeSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">Minimum Acceptable Grade</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GRADES.map((g) => {
          const isSelected = value === g.value
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange(g.value)}
              className={`text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? 'border-brand bg-brand-50 ring-2 ring-brand/20'
                  : 'border-gray-200 bg-white hover:border-gray-300'}
              `}
            >
              <p className={`text-sm font-bold ${isSelected ? 'text-brand' : 'text-gray-800'}`}>{g.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BuyerPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [step, setStep] = useState(1)

  // Form state
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [part, setPart] = useState('')
  const [grade, setGrade] = useState('')
  const [price, setPrice] = useState('')
  const [toast, setToast] = useState(false)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  const [myRequests, setMyRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    const fetchRequests = async () => {
      try {
        const data = await getRequests({ buyerUid: currentUser.uid })
        setMyRequests(data)
      } catch (err) {
        console.error('Error fetching requests:', err)
      } finally {
        setRequestsLoading(false)
      }
    }
    fetchRequests()
  }, [currentUser])

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return
    try {
      await deleteRequest(requestId)
      setMyRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error('Error canceling request:', err)
    }
  }

  // Reset dependent fields when parent changes
  useEffect(() => { setBrand(''); setModel(''); setPart('') }, [category])
  useEffect(() => { setModel('') }, [brand])
  useEffect(() => { setShowDuplicateWarning(false) }, [category, brand, model, part, grade, price])

  // Derived data
  const brandsForCategory = category ? BRANDS[category] || [] : []
  const modelsForBrand = category && brand && MODELS[category]?.[brand] ? MODELS[category][brand] : null // null → free text
  const partsForCategory = category ? PARTS[category] || [] : []

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 1: return !!category
      case 2: return !!brand && !!model
      case 3: return !!part && !!grade
      case 4: return true
      default: return false
    }
  }

  const handleSubmit = async (force = false) => {
    if (!force) setShowDuplicateWarning(false)
    try {
      const result = await createRequest({
        category,
        brand,
        model,
        part,
        grade,
        priceOffered: price ? parseInt(price) : null,
        force,
      })
      setToast(true)
      setMyRequests(prev => [{ id: result.id, category, brand, model, part, grade, priceOffered: price ? parseInt(price) : null, status: 'open', buyerUid: currentUser.uid, expiresAt: result.expiresAt }, ...prev])
      setTimeout(() => {
        setToast(false)
        navigate('/results', { state: { device: brand + ' ' + (model || ''), part: part, model: model, requestId: result.id } })
      }, 1500)
    } catch (error) {
      setToast(false)
      if (error.status === 409 || error.message === 'Duplicate request' || error.message.includes('409')) {
        setShowDuplicateWarning(true)
      } else {
        console.error('Error submitting request:', error)
        alert(error?.data?.error || error?.message || 'Failed to submit request')
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavHeader />
      <Toast message="Request Posted Successfully" show={toast} />

      <main className="flex-1 flex flex-col items-center px-6 py-10">

        {/* Page title */}
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-widest mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="3" /></svg>
            Buyer Request
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">
            Find Your <span className="text-brand">Part</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Tell us what you need and we'll match you with the right sellers.</p>
        </div>

        {/* Step progress */}
        <div className="w-full max-w-xl mt-8">
          <StepIndicator currentStep={step} />
        </div>

        {!requestsLoading && myRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 w-full max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Your Open Requests</h2>
              <span className="bg-brand-50 text-brand text-xs font-bold px-2 py-0.5 rounded-full">
                {myRequests.length}
              </span>
            </div>
            <div className="flex flex-col">
              {myRequests.map(req => {
                let isExpired = req.status === 'expired';
                let daysLeft = 0;
                let hoursLeft = 0;
                if (!isExpired && req.expiresAt) {
                  let expDate;
                  if (req.expiresAt._seconds) {
                    expDate = new Date(req.expiresAt._seconds * 1000);
                  } else {
                    expDate = new Date(req.expiresAt);
                  }
                  const diff = expDate.getTime() - Date.now();
                  if (diff <= 0) {
                    isExpired = true;
                  } else {
                    daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
                    hoursLeft = Math.floor(diff / (1000 * 60 * 60));
                  }
                }

                return (
                  <div key={req.id} className={`flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${isExpired ? 'opacity-50 grayscale bg-gray-50' : 'hover:bg-gray-50/50'}`}>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">{req.part} for {req.brand} {req.model}</h3>
                        {isExpired ? (
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2">Expired</span>
                        ) : req.expiresAt ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2 ${hoursLeft < 24 ? 'text-orange-600 bg-orange-100' : 'text-blue-600 bg-blue-100'}`}>
                            {hoursLeft < 24 ? 'Expires today' : `Expires in ${daysLeft} days`}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">{req.category}</span>
                        {req.priceOffered && (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Rs. {req.priceOffered}</span>
                        )}
                      </div>
                    </div>
                    {!isExpired && (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="shrink-0 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">

          {/* ─── Step 1: Category ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">What type of device?</h2>
                <p className="text-sm text-gray-500 mt-1">Select the category of the device you need a part for.</p>
              </div>
              <SelectField
                id="category"
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
                placeholder="Select a category…"
              />
            </div>
          )}

          {/* ─── Step 2: Brand & Model ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Which brand & model?</h2>
                <p className="text-sm text-gray-500 mt-1">Help us narrow down the exact device.</p>
              </div>
              <SelectField
                id="brand"
                label="Brand"
                value={brand}
                onChange={setBrand}
                options={brandsForCategory}
                placeholder="Select a brand…"
              />
              {brand && (
                modelsForBrand ? (
                  <SelectField
                    id="model"
                    label="Model"
                    value={model}
                    onChange={setModel}
                    options={modelsForBrand}
                    placeholder="Select a model…"
                  />
                ) : (
                  <TextField
                    id="model"
                    label="Model"
                    value={model}
                    onChange={setModel}
                    placeholder="e.g. Note 12 Pro, Galaxy Tab S9…"
                  />
                )
              )}
            </div>
          )}

          {/* ─── Step 3: Part & Grade ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Which part do you need?</h2>
                <p className="text-sm text-gray-500 mt-1">Select the component and minimum quality grade.</p>
              </div>
              <SelectField
                id="part"
                label="Part"
                value={part}
                onChange={setPart}
                options={partsForCategory}
                placeholder="Select a part…"
              />
              <GradeSelector value={grade} onChange={setGrade} />
            </div>
          )}

          {/* ─── Step 4: Price ─── */}
          {step === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Set your budget (Optional)</h2>
                <p className="text-sm text-gray-500 mt-1">What's the maximum you're willing to pay?</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Request Summary</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <span className="text-gray-500">Category</span><span className="text-gray-900 font-medium">{category}</span>
                  <span className="text-gray-500">Brand</span><span className="text-gray-900 font-medium">{brand}</span>
                  <span className="text-gray-500">Model</span><span className="text-gray-900 font-medium">{model}</span>
                  <span className="text-gray-500">Part</span><span className="text-gray-900 font-medium">{part}</span>
                  <span className="text-gray-500">Min Grade</span><span className="text-gray-900 font-medium">{GRADES.find(g => g.value === grade)?.label || '—'}</span>
                </div>
              </div>

              <TextField
                id="price"
                label="Maximum Price"
                value={price}
                onChange={setPrice}
                placeholder="500"
                prefix="Rs."
              />
            </div>
          )}

          {/* ─── Navigation Buttons ─── */}
          {showDuplicateWarning ? (
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4 animate-fadeIn">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm font-semibold text-orange-800">You already have an active request for {part ? <span className="font-bold">"{part}"</span> : 'this part'}. Do you want to submit anyway?</p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowDuplicateWarning(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" onClick={() => handleSubmit(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all">Submit anyway</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 01-1.06 0L8 7.06 5.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06z" clipRule="evenodd" />
                  </svg>
                  Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  type="button"
                  disabled={!canProceed()}
                  onClick={() => setStep((s) => s + 1)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                    ${canProceed()
                      ? 'bg-brand text-white hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  Continue
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canProceed()}
                  onClick={() => handleSubmit(false)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200
                    ${canProceed()
                      ? 'bg-brand text-white hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 shadow-md shadow-brand/25'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 1a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5h-5.5a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 018 1z" />
                  </svg>
                  Submit Request
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step counter text */}
        <p className="mt-4 text-xs text-gray-400 font-medium">Step {step} of 4</p>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
    </div>
  )
}
