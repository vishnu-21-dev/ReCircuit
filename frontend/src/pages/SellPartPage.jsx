import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getShopByUid, createListing, getCompatibility, geminiPriceSuggest, geminiCompatSuggest, visualRecognizePart, detectFakeListing, verifyGrade } from '../api'
import AuthModal from '../components/AuthModal'
import GradingSection from '../components/GradingSection'
import { calculateCompletenessScore } from '../utils/listingScore'

import { BRANDS, MODELS, PARTS, CATEGORIES, getPartsForDevice } from '../utils/deviceData'

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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [verifyingShop, setVerifyingShop] = useState(true)
  const [shopStatus, setShopStatus] = useState(null)
  const [shopReason, setShopReason] = useState('')
  const [shopData, setShopData] = useState(null)

  useEffect(() => {
    const verifyShop = async () => {
      if (!currentUser) {
        setVerifyingShop(false);
        return;
      }
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
  const [suggestedModels, setSuggestedModels] = useState([])  // full AI suggestion list (render source)
  const [compatMode, setCompatMode] = useState(null) // 'manual' | 'suggest' | null
  const [description, setDescription] = useState('')
  const [priceSuggestion, setPriceSuggestion] = useState(null)
  const [priceSuggestionLoading, setPriceSuggestionLoading] = useState(false)
  const [priceSuggestionError, setPriceSuggestionError] = useState(null)
  const [videoBlob, setVideoBlob] = useState(null)

  // Debounce refs for price suggestion API calls
  const priceSuggestionTimeoutRef = useRef(null)
  const pendingGradeRef = useRef(null)
  const fetchPriceSuggestionRef = useRef(null)
  const lastFetchedKeyRef = useRef(null)  // Track last fetched combination to prevent duplicates

  const [compatSuggesting, setCompatSuggesting] = useState(false)
  const [compatSuggestFailed, setCompatSuggestFailed] = useState(false)

  // Visual Recognition & Fake Detection State
  const [recognitionImage, setRecognitionImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recognitionLoading, setRecognitionLoading] = useState(false)
  const [recognitionResult, setRecognitionResult] = useState(null)
  const [fakeCheckResult, setFakeCheckResult] = useState(null)
  const [fakeCheckLoading, setFakeCheckLoading] = useState(false)
  const [gradeVerifyResult, setGradeVerifyResult] = useState(null)
  const [gradeVerifyLoading, setGradeVerifyLoading] = useState(false)

  useEffect(() => { setBrand(''); setModel(''); setPart(''); setCompatibleModels([]); setSuggestedModels([]); setCompatMode(null); setPriceSuggestion(null); lastFetchedKeyRef.current = null }, [category])
  useEffect(() => { setModel(''); setCompatibleModels([]); setSuggestedModels([]); setCompatMode(null); setPriceSuggestion(null); lastFetchedKeyRef.current = null }, [brand])
  useEffect(() => { setCompatibleModels([]); setSuggestedModels([]); setCompatMode(null); setCompatSuggesting(false); setCompatSuggestFailed(false); setPriceSuggestion(null); lastFetchedKeyRef.current = null }, [model])
  useEffect(() => { setPriceSuggestion(null); lastFetchedKeyRef.current = null }, [part])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (priceSuggestionTimeoutRef.current) {
        clearTimeout(priceSuggestionTimeoutRef.current)
      }
    }
  }, [])

  const brandsForCategory = category ? BRANDS[category] || [] : []
  const modelsForBrand = category && brand && MODELS[category]?.[brand] ? MODELS[category][brand] : null
  const partsForCategory = category ? getPartsForDevice(category, model) : []

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

  // Fetch price suggestion - only fetches once per unique combination
  const fetchPriceSuggestion = useCallback(async (gradeValue) => {
    if (!category || !brand || !model || !part || !gradeValue) {
      console.log('Price suggestion skipped - missing fields:', { category, brand, model, part, gradeValue })
      return
    }
    // Create a unique key for this combination
    const fetchKey = `${category}|${brand}|${model}|${part}|${gradeValue}`
    // Skip if we already fetched for this exact combination
    if (lastFetchedKeyRef.current === fetchKey) {
      console.log('Price suggestion already fetched for this combination, skipping')
      return
    }
    try {
      console.log('Fetching price suggestion for:', { category, brand, model, part, grade: gradeValue })
      setPriceSuggestionLoading(true)
      setPriceSuggestionError(null)
      const result = await geminiPriceSuggest({ category, brand, model, part, grade: gradeValue })
      console.log('Price suggestion result:', result)
      setPriceSuggestion(result)
      lastFetchedKeyRef.current = fetchKey  // Mark this combination as fetched
    } catch (err) {
      console.error('Price suggestion failed:', err)
      setPriceSuggestionError(err.message || 'Failed to get price suggestion')
      setPriceSuggestion(null)
    } finally {
      setPriceSuggestionLoading(false)
    }
  }, [category, brand, model, part])

  // Stable debounced function that won't recreate on every render
  const debouncedFetchPriceSuggestion = useCallback((gradeValue) => {
    pendingGradeRef.current = gradeValue
    if (priceSuggestionTimeoutRef.current) {
      clearTimeout(priceSuggestionTimeoutRef.current)
    }
    priceSuggestionTimeoutRef.current = setTimeout(() => {
      const currentGrade = pendingGradeRef.current
      if (currentGrade && fetchPriceSuggestionRef.current) {
        fetchPriceSuggestionRef.current(currentGrade)
      }
    }, 800) // 800ms debounce
  }, []) // Empty deps - this function is now stable

  // Keep the ref updated with the latest function
  useEffect(() => {
    fetchPriceSuggestionRef.current = fetchPriceSuggestion
  }, [fetchPriceSuggestion])

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
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setIsSubmitting(true)
    let uploadedVideoUrl = null;

    if (videoBlob) {
      try {
        const formData = new FormData();
        formData.append('file', videoBlob);
        formData.append('upload_preset', 'recircuit_chat'); // Using the same preset for simplicity

        const res = await fetch('https://api.cloudinary.com/v1_1/dwgo0iak1/video/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          uploadedVideoUrl = data.secure_url;
        } else {
          console.error("Video upload failed:", data);
        }
      } catch (err) {
        console.error("Error uploading video:", err);
      }
    }

    let uploadedImageUrl = null;
    if (recognitionImage) {
      try {
        const formData = new FormData();
        formData.append('file', recognitionImage);
        formData.append('upload_preset', 'recircuit_chat');

        const res = await fetch('https://api.cloudinary.com/v1_1/dwgo0iak1/image/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          uploadedImageUrl = data.secure_url;
        } else {
          console.error("Image upload failed:", data);
        }
      } catch (err) {
        console.error("Error uploading image:", err);
      }
    }

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
        videoUrl: uploadedVideoUrl,
        imageUrl: uploadedImageUrl,
        aiPriceSuggestion: priceSuggestion,
        aiGradeVerifyResult: gradeVerifyResult,
        aiFakeCheckResult: fakeCheckResult,
        aiRecognitionResult: recognitionResult
      })
      setToast(true)
      setTimeout(() => {
        setToast(false)
        navigate('/shop')
      }, 1500)
    } catch (error) {
      console.error('Error adding listing:', error)
      alert("Failed to submit listing. " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Visual Recognition Handler ────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please use an image under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setRecognitionImage(reader.result)
      setRecognitionResult(null)
    }
    reader.onerror = () => {
      alert('Failed to read image file.')
    }
    reader.readAsDataURL(file)
  }

  const handleVisualRecognition = async () => {
    if (!recognitionImage) return
    try {
      setRecognitionLoading(true)
      const base64 = recognitionImage.split(',')[1]

      // Debug logging
      console.log('Sending image for recognition, base64 length:', base64?.length)

      const result = await visualRecognizePart(base64)
      console.log('Recognition result:', result)
      setRecognitionResult(result)

      // Auto-fill form if confidence is high enough
      if (result.confidence === 'High' || result.confidence === 'Medium') {
        if (result.category && CATEGORIES.includes(result.category)) setCategory(result.category)
        if (result.part) setPart(result.part)
        if (result.grade && ['A', 'B', 'C', 'D'].includes(result.grade)) setGrade(result.grade)
        if (result.brand) setBrand(result.brand)
        if (result.model) setModel(result.model)
      }
    } catch (err) {
      console.error('Visual recognition failed:', err)
      console.error('Error details:', err.data || err.message)
      const errorMsg = err.data?.error || err.message || 'Unknown error'
      alert(`Failed to analyze image: ${errorMsg}`)
    } finally {
      setRecognitionLoading(false)
    }
  }

  // ── Grade Verification Handler ──────────────────────────────────────────
  const handleGradeVerify = async () => {
    if (!recognitionImage || !grade) {
      alert('Please upload a photo and select a grade first')
      return
    }
    try {
      setGradeVerifyLoading(true)
      setGradeVerifyResult(null)
      const base64 = recognitionImage.split(',')[1]
      const result = await verifyGrade({
        imageBase64: base64,
        category,
        brand,
        model,
        part,
        claimedGrade: grade
      })
      setGradeVerifyResult(result)
    } catch (err) {
      console.error('Grade verification failed:', err)
      alert('Grade verification failed: ' + (err.message || 'Unknown error'))
    } finally {
      setGradeVerifyLoading(false)
    }
  }

  // ── Fake Detection Handler ────────────────────────────────────────────────
  const handleFakeCheck = async () => {
    if (!part || !brand) {
      alert('Please fill in at least brand and part before checking')
      return
    }
    try {
      setFakeCheckLoading(true)
      const result = await detectFakeListing({
        category,
        brand,
        model,
        part,
        price: parseInt(price) || 0,
        grade,
        description,
        imageBase64: recognitionImage ? recognitionImage.split(',')[1] : null
      })
      setFakeCheckResult(result)
    } catch (err) {
      console.error('Fake detection failed:', err)
    } finally {
      setFakeCheckLoading(false)
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
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Specify the precise part component</h2>
              </div>
              <SelectField id="part" label="Part Name" value={part} onChange={(v) => { setPart(v); setCompatMode(null); setCompatibleModels([]); setSuggestedModels([]); setCompatSuggestFailed(false) }} options={partsForCategory} placeholder="Select a part…" />

              {/* ── Compatible Models Section (part-specific) ── */}
              {part && (
                <div className="mt-1">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Compatible Models for {part}</h3>
                  <p className="text-xs text-gray-500 mb-3">Which other devices use the same <strong>{part}</strong> as {brand} {model}?</p>

                  {/* Mode selection cards */}
                  {!compatMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={async () => {
                          setCompatMode('manual')
                          setCompatSuggestFailed(false)
                          try {
                            setCompatSuggesting(true)
                            const suggested = await geminiCompatSuggest({ category, brand, model, part })
                            setSuggestedModels(suggested || [])
                            setCompatibleModels(suggested || [])  // all selected by default
                          } catch (err) {
                            console.error('compat suggest failed:', err)
                            setCompatSuggestFailed(true)
                            setSuggestedModels([])
                            setCompatibleModels([])
                          } finally {
                            setCompatSuggesting(false)
                          }
                        }}
                        className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-brand hover:shadow-lg hover:shadow-brand/10 transition-all duration-300 cursor-pointer"
                      >
                        <span className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center group-hover:bg-brand transition-colors">
                          <svg className="w-6 h-6 text-brand group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <span className="text-sm font-bold text-gray-900">I know the compatible models</span>
                        <span className="text-xs text-gray-500">Select from AI-suggested matches</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setCompatMode('suggest')
                          setCompatSuggestFailed(false)
                          try {
                            setCompatSuggesting(true)
                            const suggested = await geminiCompatSuggest({ category, brand, model, part })
                            setSuggestedModels(suggested || [])
                            setCompatibleModels(suggested || [])  // all selected by default
                          } catch (err) {
                            console.error('compat suggest failed:', err)
                            setCompatSuggestFailed(true)
                            setSuggestedModels([])
                            setCompatibleModels([])
                          } finally {
                            setCompatSuggesting(false)
                          }
                        }}
                        className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/10 transition-all duration-300 cursor-pointer"
                      >
                        <span className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-400 transition-colors">
                          <svg className="w-6 h-6 text-amber-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </span>
                        <span className="text-sm font-bold text-gray-900">Suggest compatible models</span>
                        <span className="text-xs text-gray-500">AI finds devices with the same {part}</span>
                      </button>
                    </div>
                  )}

                  {/* Manual / Suggest results */}
                  {compatMode && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 mt-2">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {compatMode === 'manual' ? 'Select compatible models' : 'Suggested models'}
                        </span>
                        <button type="button" onClick={() => { setCompatMode(null); setCompatibleModels([]); setSuggestedModels([]) }} className="text-xs font-semibold text-gray-500 hover:text-brand transition-colors">← Change mode</button>
                      </div>
                      {compatSuggesting ? (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold animate-pulse flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Finding devices with the same {part}…
                        </div>
                      ) : compatSuggestFailed || !suggestedModels.length ? (
                        <p className="text-sm text-gray-500 italic text-center p-4">No compatible devices found for this specific {part}. You can skip this step.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {suggestedModels.map((m) => {
                              const isSelected = compatibleModels.includes(m)
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setCompatibleModels(prev => isSelected ? prev.filter(x => x !== m) : [...prev, m])}
                                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${isSelected
                                    ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand/40 hover:bg-brand-50'
                                  }`}
                                >
                                  {m}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 p-2 bg-white/60 rounded-lg">
                            <svg className="w-4 h-4 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Devices where the same <strong>{part}</strong> physically fits (AI-powered by Groq). Deselect any that don't apply.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 -mx-6 sm:-mx-8 px-6 sm:px-8 py-6 rounded-2xl">
                <GradingSection
                  onChange={(g) => {
                    setGrade(g || '')
                    if (g) debouncedFetchPriceSuggestion(g)
                  }}
                  onVideoRecorded={(blob) => setVideoBlob(blob)}
                />
                {!grade && (
                  <p className="text-gray-500 text-sm mt-1">Complete the grading above to submit</p>
                )}
              </div>
              {priceSuggestionLoading && (
                <div className="mt-2 p-5 rounded-2xl border-2 border-brand/20 bg-brand-50 flex items-center justify-center gap-3 animate-pulse">
                  <svg className="animate-spin h-5 w-5 text-brand" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="text-brand font-bold text-sm">Analyzing condition and market value...</span>
                </div>
              )}
              {priceSuggestionError && !priceSuggestionLoading && (
                <div className="mt-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                  <p className="font-bold flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    Price suggestion failed
                  </p>
                  <p className="text-xs text-red-600 mt-1">{priceSuggestionError}</p>
                  <p className="text-xs text-gray-500 mt-2">Please enter a price manually below.</p>
                </div>
              )}
              {priceSuggestion && !priceSuggestionLoading && (
                <div className="mt-2 p-5 rounded-2xl border-2 border-brand/30 bg-gradient-to-br from-brand-50 to-white shadow-[0_4px_20px_-4px_rgba(22,163,74,0.1)] space-y-3">
                  <p className="text-brand font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Price Suggestion
                  </p>
                  <p className="text-gray-900 font-extrabold text-3xl tracking-tight">{priceSuggestion.range}</p>
                  <p className="text-gray-600 text-sm font-medium leading-relaxed">{priceSuggestion.reasoning}</p>
                  {priceSuggestion.marketNote && (
                    <p className="text-gray-500 text-xs italic bg-white/60 p-2 rounded-lg border border-gray-100">{priceSuggestion.marketNote}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPrice(priceSuggestion.suggestedPrice?.toString() || '')}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-bold transition-all duration-200 shadow-md shadow-brand/20 flex items-center gap-2"
                  >
                    <span>Use suggested price</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
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

              {/* AI Photo Upload for Verification */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-sm font-bold text-purple-900">Upload Part Photo for AI Verification</h3>
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Optional</span>
                </div>

                {!recognitionImage ? (
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50/50 transition-colors">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-purple-700 font-medium">Take or upload a photo of the part</span>
                    <span className="text-xs text-purple-500">Required for AI Grade Verification</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <img src={recognitionImage} alt="Part for verification" className="w-full h-40 object-contain rounded-xl bg-gray-100" />
                      <button
                        onClick={() => { setRecognitionImage(null); setRecognitionResult(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {!recognitionResult && (
                      <button
                        onClick={handleVisualRecognition}
                        disabled={recognitionLoading}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {recognitionLoading ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Analyze Photo with AI
                          </>
                        )}
                      </button>
                    )}

                    {recognitionResult && (
                      <div className={`p-3 rounded-xl text-sm ${recognitionResult.confidence === 'High' ? 'bg-green-100 border border-green-200' : recognitionResult.confidence === 'Medium' ? 'bg-yellow-50 border border-yellow-200' : 'bg-orange-50 border border-orange-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-900">Detected: {recognitionResult.part}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            recognitionResult.confidence === 'High' ? 'bg-green-200 text-green-800' :
                            recognitionResult.confidence === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-orange-200 text-orange-800'
                          }`}>{recognitionResult.confidence} confidence</span>
                        </div>
                        {(recognitionResult.category || recognitionResult.brand) && (
                          <p className="text-gray-600 text-xs mb-1">
                            {recognitionResult.category}{recognitionResult.category && recognitionResult.brand ? ' · ' : ''}{recognitionResult.brand}
                            {recognitionResult.model ? ` · ${recognitionResult.model}` : ''}
                          </p>
                        )}
                        {recognitionResult.grade && (
                          <p className="text-gray-600 text-xs">Suggested grade: {recognitionResult.grade}</p>
                        )}
                        {recognitionResult.notes && (
                          <p className="text-gray-500 text-xs mt-2 italic">"{recognitionResult.notes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

              {/* AI Fake Detection */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-bold text-amber-900">AI Listing Verification</h3>
                </div>

                {!fakeCheckResult ? (
                  <button
                    onClick={handleFakeCheck}
                    disabled={fakeCheckLoading || !part || !brand}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {fakeCheckLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Verify Listing with AI
                      </>
                    )}
                  </button>
                ) : (
                  <div className={`p-3 rounded-lg text-sm ${
                    fakeCheckResult.riskLevel === 'High' ? 'bg-red-100 border border-red-200' :
                    fakeCheckResult.riskLevel === 'Medium' ? 'bg-yellow-100 border border-yellow-200' :
                    'bg-green-100 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">Risk Level: {fakeCheckResult.riskLevel}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        fakeCheckResult.riskLevel === 'High' ? 'bg-red-200 text-red-800' :
                        fakeCheckResult.riskLevel === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>Score: {fakeCheckResult.riskScore}/100</span>
                    </div>
                    {fakeCheckResult.issues && fakeCheckResult.issues.length > 0 && (
                      <ul className="text-xs text-gray-700 space-y-1 list-disc pl-4 mb-2">
                        {fakeCheckResult.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-600 italic">{fakeCheckResult.reasoning}</p>
                    <div className="mt-2 pt-2 border-t border-black/5">
                      <span className={`text-xs font-bold ${
                        fakeCheckResult.recommendation === 'approve' ? 'text-green-700' :
                        fakeCheckResult.recommendation === 'reject' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        Recommendation: {fakeCheckResult.recommendation === 'approve' ? 'Ready to post' : fakeCheckResult.recommendation === 'reject' ? 'Review needed' : 'Proceed with caution'}
                      </span>
                    </div>
                    <button
                      onClick={() => setFakeCheckResult(null)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Check again
                    </button>
                  </div>
                )}
              </div>

              {/* AI Grade Verification */}
              {recognitionImage && grade && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <h3 className="text-sm font-bold text-blue-900">AI Grade Verification</h3>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Beta</span>
                  </div>

                  {!gradeVerifyResult ? (
                    <button
                      onClick={handleGradeVerify}
                      disabled={gradeVerifyLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {gradeVerifyLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Verify Grade with AI
                        </>
                      )}
                    </button>
                  ) : (
                    <div className={`p-3 rounded-lg text-sm ${
                      gradeVerifyResult.match ? 'bg-green-100 border border-green-200' :
                      gradeVerifyResult.recommendation === 'downgrade' ? 'bg-yellow-100 border border-yellow-200' :
                      'bg-red-100 border border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">
                          {gradeVerifyResult.match ? 'Grade Verified ✓' : 'Mismatch Detected'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          gradeVerifyResult.confidence === 'High' ? 'bg-green-200 text-green-800' :
                          gradeVerifyResult.confidence === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-orange-200 text-orange-800'
                        }`}>{gradeVerifyResult.confidence} confidence</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <span className="text-gray-500">Claimed Grade:</span>
                        <span className="text-gray-900 font-medium text-right">{grade}</span>
                        <span className="text-gray-500">AI Detected:</span>
                        <span className="text-gray-900 font-medium text-right">{gradeVerifyResult.aiGrade || 'Unknown'}</span>
                      </div>
                      <p className="text-gray-600 text-xs italic mb-2">{gradeVerifyResult.reasoning}</p>
                      <div className="mt-2 pt-2 border-t border-black/5">
                        <span className={`text-xs font-bold ${
                          gradeVerifyResult.recommendation === 'approve' ? 'text-green-700' :
                          gradeVerifyResult.recommendation === 'reject' ? 'text-red-700' :
                          'text-yellow-700'
                        }`}>
                          Recommendation: {gradeVerifyResult.recommendation === 'approve' ? 'Grade matches photo' : gradeVerifyResult.recommendation === 'downgrade' ? `Consider downgrading to ${gradeVerifyResult.aiGrade}` : 'Review photo quality'}
                        </span>
                      </div>
                      <button
                        onClick={() => setGradeVerifyResult(null)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Verify again
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              <button type="button" disabled={!canProceed() || isSubmitting} onClick={handleSubmit}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${canProceed() && !isSubmitting ? 'bg-brand text-white hover:bg-brand-dark shadow-md shadow-brand/25 focus:ring-2 focus:ring-brand focus:ring-offset-2' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
                {isSubmitting ? 'Posting...' : 'List your part'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400 font-medium">Step {step} of 4</p>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
