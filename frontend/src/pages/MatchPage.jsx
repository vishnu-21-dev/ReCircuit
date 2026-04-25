import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMatchDoc, fetchShopResponseTime, createReview } from '../api'
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
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand bg-brand-50">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

// ── Match Page Component ───────────────────────────────────────────────────

export default function MatchPage() {
  const { id } = useParams()
  const [matchData, setMatchData] = useState(null)
  const [responseTime, setResponseTime] = useState(null)
  const { currentUser } = useAuth()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const match = await getMatchDoc(id);
        setMatchData(match);
        if (match.sellerId) {
          const rt = await fetchShopResponseTime(match.sellerId);
          setResponseTime(rt);
        }
      } catch (err) {
        console.error("Match fetch err:", err);
      }
    }
    load();
  }, [id])

  const steps = [
    { label: 'Requested', status: 'completed' },
    { label: 'Matched', status: 'active' },
    { label: 'In Transit', status: 'pending' },
    { label: 'Completed', status: 'pending' },
  ]

  const handleReviewSubmit = async () => {
    if (!rating || !matchData) return
    try {
      setReviewSubmitting(true)
      setReviewError(null)
      await createReview({
        matchId: id,
        buyerId: currentUser.uid,
        shopId: matchData.sellerId,
        rating,
        comment
      })
      setReviewSubmitted(true)
    } catch (err) {
      if (err.status === 409) {
        setReviewSubmitted(true)
      } else {
        setReviewError(err.message || 'Failed to submit review')
      }
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <NavHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
        
        {/* Top Success Banner */}
        <div className="flex flex-col items-center justify-center p-6 bg-brand-50 border-2 border-brand/20 rounded-2xl animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/30 mb-4 animate-bounce">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900">Match Found!</h1>
          <p className="text-gray-600 mt-2 text-center max-w-md">
            A verified shop has exactly the part you requested. Review the details below to proceed.
          </p>
        </div>

        {/* Two Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-fadeIn" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          
          {/* Left Card: Request Summary */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 border-b border-gray-100 pb-3">Request Summary</h2>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                <span className="text-sm text-gray-500 font-medium">Part</span>
                <span className="text-base font-bold text-gray-900 text-right">{matchData?.partName || matchData?.part || 'Component'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                <span className="text-sm text-gray-500 font-medium">Model</span>
                <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">{matchData?.modelName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                <span className="text-sm text-gray-500 font-medium">Grade</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${
                  matchData?.grade === 'A' ? 'bg-green-50 text-green-700 border-green-200' :
                  matchData?.grade === 'B' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  matchData?.grade === 'C' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  matchData?.grade === 'D' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-brand-50 text-brand border-brand/20'
                }`}>{matchData?.grade ? `Grade ${matchData.grade}` : 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                <span className="text-sm text-gray-500 font-medium">Price</span>
                <span className="text-base font-bold text-gray-900 tracking-tight">Rs. {matchData?.price || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500 font-medium">Status</span>
                <span className="text-sm text-gray-600 font-medium capitalize">{matchData?.status || 'Connected'}</span>
              </div>
            </div>
          </section>

          {/* Right Card: Shop Details */}
          <section className="bg-white border text-left border-brand/30 rounded-2xl p-6 shadow-[0_4px_24px_rgba(22,163,74,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
            <h2 className="text-sm font-bold text-brand uppercase tracking-widest mb-5 border-b border-gray-100 pb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Matched Shop
            </h2>

            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-extrabold text-gray-900 leading-none">{matchData?.sellerName || 'Shop'}</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            </div>

            {responseTime && (
              <div className="mb-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {responseTime.averageResponseHours === null ? "Response time unknown" :
                   responseTime.averageResponseHours < 1 ? "Usually responds in under 1 hour" :
                   responseTime.averageResponseHours <= 6 ? "Usually responds within a few hours" :
                   "Usually responds within a day"}
                </span>
              </div>
            )}

            {matchData?.sellerRating && (
              <div className="flex items-center gap-4 text-sm text-gray-600 font-medium mb-6">
                <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
                  <span className="text-yellow-700 font-bold">{matchData.sellerRating}</span>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{matchData?.sellerTrades || 0} trades</span>
              </div>
            )}

            <div className="flex flex-col gap-3 text-sm text-gray-700 mb-6">
              {matchData?.sellerAddress && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{matchData.sellerAddress}</span>
                </div>
              )}
              {matchData?.sellerPhone && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-semibold text-gray-900">{matchData.sellerPhone}</span>
                </div>
              )}
            </div>

            <a href="#" className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-brand font-bold text-sm border border-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Open in Google Maps
            </a>
          </section>
        </div>

        {/* Status Tracker */}
        <section className="bg-gray-50 border border-gray-100 rounded-2xl p-6 sm:px-10 py-8 animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="relative flex items-center justify-between mx-auto max-w-2xl">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>
            
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 w-[33%] h-1 bg-brand -translate-y-1/2 z-0 rounded-full transition-all duration-1000"></div>

            {steps.map((step, i) => {
              const isCompleted = step.status === 'completed'
              const isActive = step.status === 'active'
              
              return (
                <div key={step.label} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-50 transition-colors
                    ${isCompleted ? 'bg-brand text-white' : ''}
                    ${isActive ? 'bg-brand text-white ring-4 ring-brand/20 shadow-md scale-110' : ''}
                    ${!isCompleted && !isActive ? 'bg-gray-200 text-gray-400' : ''}
                  `}>
                    {isCompleted || isActive ? (
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold absolute top-12 whitespace-nowrap ${isActive ? 'text-brand' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* AI Verification Report */}
        {(matchData?.videoUrl || matchData?.aiPriceSuggestion || matchData?.aiGradeVerifyResult || matchData?.aiFakeCheckResult || matchData?.aiRecognitionResult) && (
          <section className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-5 border-b border-gray-700 pb-3">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-sm font-bold text-green-400 uppercase tracking-widest">AI Verification Report</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Video & Recognition */}
              <div className="space-y-3">
                {matchData?.videoUrl && (
                  <div>
                    <h3 className="text-gray-400 text-xs font-semibold mb-2 uppercase">Grading Video</h3>
                    <video src={matchData.videoUrl} controls className="w-full rounded-lg border border-gray-700 bg-black aspect-video" />
                  </div>
                )}
                
                {matchData?.aiRecognitionResult && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <h3 className="text-gray-400 text-xs font-semibold mb-2 uppercase">Visual Recognition</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Part:</span> <span className="text-white">{matchData.aiRecognitionResult.part}</span></div>
                      {matchData.aiRecognitionResult.grade && (
                        <div className="flex justify-between"><span className="text-gray-500">Detected Grade:</span> <span className="text-green-400 font-bold">{matchData.aiRecognitionResult.grade}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Confidence:</span> <span className="text-gray-300">{matchData.aiRecognitionResult.confidence}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: AI Analysis */}
              <div className="space-y-3">
                {matchData?.aiPriceSuggestion && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <h3 className="text-gray-400 text-xs font-semibold mb-2 uppercase">AI Price Analysis</h3>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-gray-500 text-sm">Listed:</span>
                      <span className="text-white font-bold">Rs. {matchData.price || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-700 pt-2">
                      <span className="text-green-400 text-sm">AI Suggested:</span>
                      <span className="text-green-400 font-bold">Rs. {matchData.aiPriceSuggestion.suggestedPrice || matchData.aiPriceSuggestion.range}</span>
                    </div>
                    {matchData.aiPriceSuggestion.reasoning && (
                      <p className="text-gray-400 text-xs mt-2 italic">{matchData.aiPriceSuggestion.reasoning}</p>
                    )}
                  </div>
                )}

                {matchData?.aiGradeVerifyResult && (
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <h3 className="text-gray-400 text-xs font-semibold mb-2 uppercase">Grade Verification</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${matchData.aiGradeVerifyResult.matchesClaimed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-white text-sm">
                        {matchData.aiGradeVerifyResult.matchesClaimed ? 'Verified' : 'Mismatch'}: {matchData.aiGradeVerifyResult.verifiedGrade}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{matchData.aiGradeVerifyResult.reasoning}</p>
                  </div>
                )}

                {matchData?.aiFakeCheckResult && (
                  <div className={`rounded-lg p-3 border ${matchData.aiFakeCheckResult.isFake ? 'bg-red-900/20 border-red-700' : 'bg-gray-800 border-gray-700'}`}>
                    <h3 className="text-gray-400 text-xs font-semibold mb-2 uppercase">Trust Check</h3>
                    <div className="flex justify-between items-center">
                      <span className={matchData.aiFakeCheckResult.isFake ? 'text-red-400' : 'text-green-400'}>
                        {matchData.aiFakeCheckResult.isFake ? '⚠️ Suspicious' : '✓ Genuine'}
                      </span>
                      <span className="text-gray-400 text-xs">{matchData.aiFakeCheckResult.confidence}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {matchData?.status === 'completed' && currentUser?.uid === matchData?.buyerId && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 border-b border-gray-100 pb-3">
              Rate this Shop
            </h2>
            {reviewSubmitted ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-800 font-bold">Review submitted</p>
                <p className="text-gray-500 text-sm">Thank you for your feedback.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-gray-700">Rating</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How was your experience with this shop?"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all resize-none min-h-[90px]"
                  />
                </div>
                {reviewError && (
                  <p className="text-sm text-red-500">{reviewError}</p>
                )}
                <button
                  type="button"
                  disabled={!rating || reviewSubmitting}
                  onClick={handleReviewSubmit}
                  className={`self-end px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    rating && !reviewSubmitting
                      ? 'bg-brand text-white hover:bg-brand-dark'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pt-4 pb-8 border-t border-gray-100 animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <Link to="/shop" className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:border-brand hover:text-brand transition-colors text-center order-2 sm:order-1 shadow-sm">
            View Other Matches
          </Link>
          <Link to="/" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand hover:bg-brand-dark text-[15px] font-extrabold text-white transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 text-center order-1 sm:order-2">
            Back to Home
          </Link>
        </div>

      </main>
    </div>
  )
}
