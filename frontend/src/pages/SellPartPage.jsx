import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getShopByUid, createListing, getCompatibility, geminiPriceSuggest, geminiCompatSuggest } from '../api'
import GradingSection from '../components/GradingSection'
import { calculateCompletenessScore } from '../utils/listingScore'
import compatibilityMap from '../data/compatibilityMap'

// ── Data Maps ──────────────────────────────────────────────────────────────

const MODELS = {
  Smartphones: {
    Samsung: ['S22', 'S23', 'S24', 'A53', 'A54', 'M31', 'Z Fold 5', 'Z Flip 5'],
    Apple: ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'],
    OnePlus: ['9', '9R', '10 Pro', '11', '12', 'Nord CE', 'Nord 2'],
    Realme: ['GT Neo', 'Narzo 50', '9 Pro'],
    Xiaomi: ['Redmi Note 12', '13 Pro', 'Poco X5'],
    Oppo: ['Reno 8', 'F21 Pro', 'Find X5'],
    Vivo: ['V27', 'X90', 'Y100']
  },
  Laptops: {
    Lenovo: ['LOQ', 'IdeaPad 3', 'ThinkPad E14', 'Legion 5'],
    Dell: ['XPS 13', 'XPS 15', 'Inspiron 15', 'Latitude 5420', 'Alienware m15'],
    HP: ['Pavilion', 'Envy 13', 'Spectre x360', 'Omen 15'],
    Asus: ['ROG Zephyrus', 'TUF Dash', 'ZenBook 14', 'VivoBook'],
    Acer: ['Nitro 5', 'Predator Helios', 'Swift 3', 'Aspire 5'],
    Apple: ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro M2', 'MacBook Pro M3']
  },
  'Home Appliances': {
    LG: ['Air Conditioner', 'Refrigerator', 'Washing Machine', 'Microwave Oven', 'Dishwasher', 'Water Purifier'],
    Samsung: ['Air Conditioner', 'Refrigerator', 'Washing Machine', 'Microwave Oven', 'Dishwasher', 'Water Purifier'],
    Whirlpool: ['Air Conditioner', 'Refrigerator', 'Washing Machine', 'Microwave Oven'],
    Bosch: ['Refrigerator', 'Washing Machine', 'Microwave Oven', 'Dishwasher'],
    IFB: ['Air Conditioner', 'Washing Machine', 'Microwave Oven', 'Dishwasher'],
    Godrej: ['Air Conditioner', 'Refrigerator', 'Washing Machine'],
    Panasonic: ['Air Conditioner', 'Refrigerator', 'Washing Machine'],
    Haier: ['Air Conditioner', 'Refrigerator', 'Washing Machine'],
    Voltas: ['Air Conditioner', 'Refrigerator', 'Air Cooler', 'Water Purifier'],
    'Blue Star': ['Air Conditioner', 'Refrigerator', 'Air Cooler', 'Water Purifier']
  },
  'Consumer Electronics': {
    Sony: ['Television (TV)', 'Soundbar / Home Theater', 'Gaming Console', 'Digital Camera'],
    LG: ['Television (TV)', 'Soundbar / Home Theater', 'Projector'],
    Samsung: ['Television (TV)', 'Soundbar / Home Theater', 'Projector'],
    Mi: ['Television (TV)', 'Soundbar / Home Theater', 'Smart Speaker'],
    TCL: ['Television (TV)', 'Soundbar / Home Theater'],
    Hisense: ['Television (TV)', 'Soundbar / Home Theater', 'Projector'],
    Philips: ['Television (TV)', 'Soundbar / Home Theater', 'Smart Lighting'],
    JBL: ['Soundbar / Home Theater', 'Portable Speaker', 'Smart Speaker'],
    Bose: ['Soundbar / Home Theater', 'Headphones', 'Smart Speaker']
  }
}

const BRANDS = {
  Smartphones: Object.keys(MODELS.Smartphones),
  Laptops: Object.keys(MODELS.Laptops),
  'Home Appliances': Object.keys(MODELS['Home Appliances']),
  'Consumer Electronics': Object.keys(MODELS['Consumer Electronics']),
}

const PARTS = {
  Smartphones: ['Battery', 'Screen', 'Camera Module', 'Charging Port', 'Motherboard', 'Speaker', 'Microphone', 'Back Panel', 'Power Button', 'Earpiece'],
  Laptops: ['Battery', 'Screen', 'Keyboard', 'Trackpad', 'RAM', 'SSD/HDD', 'Charging Port', 'Cooling Fan', 'Motherboard', 'Hinge'],
  'Home Appliances': ['Motor', 'Control Board', 'Door Seal', 'Compressor', 'Thermostat', 'Pump', 'Drum', 'Water Inlet Valve', 'Heating Element', 'Condenser Coil', 'Blower Fan', 'Magnetron', 'Inverter Board', 'Water Filter Component', 'Drain Pump', 'Ice Maker Module'],
  'Consumer Electronics': ['Screen Panel', 'Mainboard', 'Power Board', 'Backlight', 'Speaker', 'HDMI Port', 'Remote Sensor', 'T-Con Board', 'Wi-Fi Module', 'Antenna', 'Bluetooth Chip', 'Amplifier Board', 'Subwoofer Driver', 'Lens Assembly', 'Cooling Fan', 'Optical Drive Lens'],
}



const CATEGORIES = Object.keys(BRANDS)

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
        <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-lg">
          <RecircuitIcon className="w-9 h-9" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Re<span className="text-brand">Circuit</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-bold text-brand bg-brand-50">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

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

const STEP_LABELS = ['Device', 'Brand & Model', 'Condition', 'Pricing']

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-10">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        return (
          <div key={label} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0
                  ${isDone ? 'bg-brand text-white' : ''}
                  ${isActive ? 'bg-brand text-white ring-4 ring-brand/20 scale-110' : ''}
                  ${!isActive && !isDone ? 'bg-gray-100 text-gray-400' : ''}
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" /></svg>
                ) : stepNum}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${isActive || isDone ? 'text-brand' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300 ${isDone ? 'bg-brand' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SelectField({ id, label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <select
          id={id} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 hover:border-gray-300 cursor-pointer"
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lbl = typeof opt === 'string' ? opt : opt.label
            return <option key={val} value={val}>{lbl}</option>
          })}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
      </div>
    </div>
  )
}

function TextField({ id, label, value, onChange, placeholder, prefix, type = 'text', min }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-4 text-sm font-semibold text-gray-500 pointer-events-none">{prefix}</span>}
        <input
          id={id} type={type} min={min} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full bg-white border border-gray-200 rounded-xl py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 hover:border-gray-300 ${prefix ? 'pl-12 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  )
}

export default function SellPartPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [step, setStep] = useState(1)
  const [toast, setToast] = useState(false)
  const [verifyingShop, setVerifyingShop] = useState(true)
  const [shopStatus, setShopStatus] = useState(null)
  const [shopReason, setShopReason] = useState('')
  const [shopData, setShopData] = useState(null)

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

  // Form State
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [part, setPart] = useState('')
  const [grade, setGrade] = useState('')
  const [price, setPrice] = useState('')
  const [warranty, setWarranty] = useState('')
  const [compatibleModels, setCompatibleModels] = useState([])
  const [compatMode, setCompatMode] = useState(null) // 'manual' | 'suggest' | null
  const [description, setDescription] = useState('')
  const [priceSuggestion, setPriceSuggestion] = useState(null)
  const [priceSuggestionLoading, setPriceSuggestionLoading] = useState(false)
  const [priceSuggestionError, setPriceSuggestionError] = useState(null)
  const [videoBlob, setVideoBlob] = useState(null)
  const [compatSuggesting, setCompatSuggesting] = useState(false)
  const [compatSuggestFailed, setCompatSuggestFailed] = useState(false)

  useEffect(() => { setBrand(''); setModel(''); setPart(''); setCompatibleModels([]); setCompatMode(null) }, [category])
  useEffect(() => { setModel(''); setCompatibleModels([]); setCompatMode(null) }, [brand])
  useEffect(() => { setCompatibleModels([]); setCompatMode(null); setCompatSuggesting(false); setCompatSuggestFailed(false) }, [model])

  const brandsForCategory = category ? BRANDS[category] || [] : []
  const modelsForBrand = category && brand && MODELS[category]?.[brand] ? MODELS[category][brand] : null
  const partsForCategory = category ? PARTS[category] || [] : []

  const canProceed = () => {
    switch (step) {
      case 1: return !!category
      case 2: return !!brand && !!model
      case 3: return !!part && !!grade && !!warranty
      case 4: return !!price && Number(price) > 0
      default: return false
    }
  }

  const { score, missing } = calculateCompletenessScore({
    partName: part,
    description,
    price,
    condition: grade,
    compatibleModels
  })

  let progressColor = 'bg-red-500'
  if (score >= 80) progressColor = 'bg-green-500'
  else if (score >= 40) progressColor = 'bg-yellow-500'

  const fetchPriceSuggestion = async (gradeValue) => {
    if (!category || !brand || !model || !part || !gradeValue) {
      console.log('Price suggestion skipped - missing fields:', { category, brand, model, part, gradeValue })
      return
    }
    try {
      console.log('Fetching price suggestion for:', { category, brand, model, part, grade: gradeValue })
      setPriceSuggestionLoading(true)
      setPriceSuggestionError(null)
      const result = await geminiPriceSuggest({ category, brand, model, part, grade: gradeValue })
      console.log('Price suggestion result:', result)
      setPriceSuggestion(result)
    } catch (err) {
      console.error('Price suggestion failed:', err)
      setPriceSuggestionError(err.message || 'Failed to get price suggestion')
      setPriceSuggestion(null)
    } finally {
      setPriceSuggestionLoading(false)
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

  const handleSubmit = async () => {
    setToast(true)
    try {
      await createListing({
        category,
        brand,
        model,
        part,
        grade,
        price: parseInt(price),
        warranty,
        compatibleModels,
        shopId: currentUser.uid,
        sellerId: currentUser.uid,
        shopName: shopData?.shopName || '',
        quantity: 1,
      })
      setTimeout(() => {
        setToast(false)
        navigate('/shop')
      }, 1500)
    } catch (error) {
      console.error('Error adding listing:', error)
      setToast(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavHeader />
      <Toast message="Part Added to Inventory Successfully!" show={toast} />

      <main className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-widest mb-4">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            List a Part to Sell
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">
            Add to your <span className="text-brand">Inventory</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Upload a new component so buyers can find exactly what they're looking for.</p>
        </div>

        <div className="w-full max-w-xl mt-8">
          <StepIndicator currentStep={step} />
        </div>

        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">

          {step === 1 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">What category does the part belong to?</h2>
                <p className="text-sm text-gray-500 mt-1">Select the umbrella category to organize your listing.</p>
              </div>
              <SelectField id="category" label="Category" value={category} onChange={setCategory} options={CATEGORIES} placeholder="Select a category…" />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Which brand & model is it compatible with?</h2>
              </div>
              <SelectField id="brand" label="Brand" value={brand} onChange={setBrand} options={brandsForCategory} placeholder="Select a brand…" />
              {brand && (
                modelsForBrand ? (
                  <SelectField id="model" label="Model" value={model} onChange={setModel} options={modelsForBrand} placeholder="Select a model…" />
                ) : (
                  <TextField id="model" label="Model" value={model} onChange={setModel} placeholder="e.g. Note 12 Pro, Galaxy Tab S9…" />
                )
              )}

              {/* ── Compatible Models Section ── */}
              {model && (
                <div className="mt-2">
                  <h3 className="text-green-400 font-semibold text-lg mb-2">Compatible Models</h3>

                  {/* Mode selection cards */}
                  {!compatMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card 1: Manual */}
                      <button
                        type="button"
                        onClick={() => setCompatMode('manual')}
                        className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-green-700/30 bg-gradient-to-br from-green-950/60 to-gray-900/60 backdrop-blur-md hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/20 transition-all duration-300 cursor-pointer"
                      >
                        <span className="w-11 h-11 rounded-full bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <span className="text-sm font-bold text-gray-200 group-hover:text-white">I know the compatible models</span>
                        <span className="text-xs text-gray-500">Manually select from known matches</span>
                      </button>

                      {/* Card 2: Suggest */}
                      <button
                        type="button"
                        onClick={async () => {
                          setCompatMode('suggest')
                          setCompatSuggestFailed(false)
                          if (compatibilityMap[model] && compatibilityMap[model].length > 0) {
                            setCompatibleModels([...compatibilityMap[model]])
                          } else {
                            try {
                              setCompatSuggesting(true)
                              const suggested = await geminiCompatSuggest({ category, brand, model })
                              setCompatibleModels(suggested || [])
                            } catch (err) {
                              console.error('compat suggest failed:', err)
                              setCompatSuggestFailed(true)
                              setCompatibleModels([])
                            } finally {
                              setCompatSuggesting(false)
                            }
                          }
                        }}
                        className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-green-700/30 bg-gradient-to-br from-green-950/60 to-gray-900/60 backdrop-blur-md hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/20 transition-all duration-300 cursor-pointer"
                      >
                        <span className="w-11 h-11 rounded-full bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </span>
                        <span className="text-sm font-bold text-gray-200 group-hover:text-white">Suggest compatible models for me</span>
                        <span className="text-xs text-gray-500">Auto-fill from our compatibility data</span>
                      </button>
                    </div>
                  )}

                  {/* Manual mode: toggle buttons */}
                  {compatMode === 'manual' && (
                    <div className="rounded-2xl border border-green-700/30 bg-gradient-to-br from-green-950/40 to-gray-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Select compatible models</span>
                        <button type="button" onClick={() => { setCompatMode(null); setCompatibleModels([]) }} className="text-xs text-gray-500 hover:text-green-400 transition-colors">← Change mode</button>
                      </div>
                      {compatibilityMap[model] && compatibilityMap[model].length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {compatibilityMap[model].map((m) => {
                            const isSelected = compatibleModels.includes(m)
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setCompatibleModels(prev => isSelected ? prev.filter(x => x !== m) : [...prev, m])}
                                className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${isSelected
                                    ? 'bg-green-600 text-white border-green-500 shadow-md shadow-green-900/30'
                                    : 'bg-white/10 text-gray-300 border-white/10 hover:border-green-500/40 hover:bg-white/15'
                                  }`}
                              >
                                {m}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No compatibility data available for this model. You can skip this.</p>
                      )}
                    </div>
                  )}

                  {/* Suggest mode: auto-filled toggle buttons */}
                  {compatMode === 'suggest' && (
                    <div className="rounded-2xl border border-green-700/30 bg-gradient-to-br from-green-950/40 to-gray-900/50 backdrop-blur-md p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Suggested models</span>
                        <button type="button" onClick={() => { setCompatMode(null); setCompatibleModels([]) }} className="text-xs text-gray-500 hover:text-green-400 transition-colors">← Change mode</button>
                      </div>
                      {compatSuggesting ? (
                        <div className="mt-2 p-4 rounded-xl border border-amber-700/30 bg-amber-950/30 text-amber-400 text-sm font-medium animate-pulse">
                          Getting compatibility suggestions...
                        </div>
                      ) : compatSuggestFailed || (!compatibilityMap[model]?.length && !compatibleModels.length) ? (
                        <p className="text-sm text-gray-500 italic">No compatibility data available for this model. You can skip this.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {compatibleModels.map((m) => {
                              const isSelected = compatibleModels.includes(m)
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setCompatibleModels(prev => isSelected ? prev.filter(x => x !== m) : [...prev, m])}
                                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${isSelected
                                    ? 'bg-green-600 text-white border-green-500 shadow-md shadow-green-900/30'
                                    : 'bg-white/10 text-gray-300 border-white/10 hover:border-green-500/40 hover:bg-white/15'
                                  }`}
                                >
                                  {m}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            These are AI-suggested compatible models. You can deselect any.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Specify the precise part component</h2>
              </div>
              <SelectField id="part" label="Part Name" value={part} onChange={setPart} options={partsForCategory} placeholder="Select a part…" />
              <div className="flex flex-col gap-2 -mx-6 sm:-mx-8 px-6 sm:px-8 py-6 bg-gray-900 rounded-2xl">
                <h3 className="text-green-400 font-semibold text-lg">Part Condition Grading</h3>
                <GradingSection
                  onChange={(g) => {
                    setGrade(g || '')
                    if (g) fetchPriceSuggestion(g)
                  }}
                  onVideoRecorded={(blob) => setVideoBlob(blob)}
                />
                {!grade && (
                  <p className="text-gray-500 text-sm mt-1">Complete the grading above to submit</p>
                )}
              </div>
              {priceSuggestionLoading && (
                <div className="mt-4 p-4 rounded-xl border border-green-700/30 bg-green-950/30 text-green-400 text-sm font-medium animate-pulse">
                  Getting price suggestion...
                </div>
              )}
              {priceSuggestionError && !priceSuggestionLoading && (
                <div className="mt-4 p-4 rounded-xl border border-red-700/30 bg-red-950/30 text-red-400 text-sm">
                  <p className="font-semibold">Price suggestion failed</p>
                  <p className="text-xs text-red-300 mt-1">{priceSuggestionError}</p>
                  <p className="text-xs text-gray-400 mt-2">Please enter a price manually or try again.</p>
                </div>
              )}
              {priceSuggestion && !priceSuggestionLoading && (
                <div className="mt-4 p-4 rounded-xl border border-green-700/30 bg-green-950/30 space-y-2">
                  <p className="text-green-400 font-semibold text-sm uppercase tracking-widest">AI Price Suggestion</p>
                  <p className="text-white font-bold text-xl">{priceSuggestion.range}</p>
                  <p className="text-gray-400 text-sm">{priceSuggestion.reasoning}</p>
                  {priceSuggestion.marketNote && (
                    <p className="text-gray-500 text-xs italic">{priceSuggestion.marketNote}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPrice(priceSuggestion.suggestedPrice?.toString() || '')}
                    className="mt-2 px-4 py-2 rounded-lg bg-green-600/80 hover:bg-green-600 text-white text-sm font-semibold transition-colors border border-green-500/50"
                  >
                    Use suggested price
                  </button>
                </div>
              )}
              <SelectField
                id="warranty" label="Warranty" value={warranty} onChange={setWarranty}
                options={['No Warranty', '1 Month', '3 Months', '6 Months', '1 Year']} placeholder="Select warranty duration..."
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="description" className="text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the part condition, history, or specific characteristics..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200 hover:border-gray-300 min-h-[100px] resize-y"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pricing Information</h2>
                <p className="text-sm text-gray-500 mt-1">Set a competitive price to sell faster.</p>
              </div>

              <div className="bg-brand-50 rounded-xl p-4 border border-brand/20">
                <p className="text-xs font-semibold text-brand uppercase tracking-widest mb-3 border-b border-brand/10 pb-2">Listing Summary</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <span className="text-gray-500 font-medium">Device</span><span className="text-gray-900 font-bold text-right">{brand} {model}</span>
                  <span className="text-gray-500 font-medium">Part</span><span className="text-gray-900 font-bold text-right">{part}</span>
                  <span className="text-gray-500 font-medium">Quality</span>
                  <span className="text-right">
                    {grade === 'A' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-300"><span className="w-2 h-2 rounded-full bg-green-500" />Grade A · Excellent</span>}
                    {grade === 'B' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300"><span className="w-2 h-2 rounded-full bg-yellow-500" />Grade B · Good</span>}
                    {grade === 'C' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300"><span className="w-2 h-2 rounded-full bg-orange-500" />Grade C · Fair</span>}
                    {grade === 'D' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-300"><span className="w-2 h-2 rounded-full bg-red-500" />Grade D · Poor</span>}
                  </span>
                  <span className="text-gray-500 font-medium">Warranty</span>
                  <span className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      {warranty}
                    </span>
                  </span>
                </div>
              </div>

              <TextField id="price" type="number" min="1" label="Selling Price" value={price} onChange={setPrice} placeholder="999" prefix="Rs." />
            </div>
          )}

          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-800">Listing strength</span>
              <span className="text-sm font-bold text-gray-500">{score}/100</span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className={`h-full transition-all duration-500 ease-out ${progressColor}`} style={{ width: `${score}%` }}></div>
            </div>
            {missing.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-4">
                {missing.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M11.78 9.78a.75.75 0 01-1.06 0L8 7.06 5.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06z" clipRule="evenodd" /></svg>
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button type="button" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${canProceed() ? 'bg-brand text-white hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Continue
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
              </button>
            ) : (
              <button type="button" disabled={!canProceed()} onClick={handleSubmit}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${canProceed() ? 'bg-brand text-white hover:bg-brand-dark shadow-md shadow-brand/25 focus:ring-2 focus:ring-brand focus:ring-offset-2' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Post Listing
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400 font-medium">Step {step} of 4</p>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
    </div>
  )
}
