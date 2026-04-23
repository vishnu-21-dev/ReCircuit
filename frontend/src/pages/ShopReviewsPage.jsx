import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getShopReviews, replyToReview } from '../api'

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
          <Link to="/buyer" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-brand hover:bg-brand-50 transition-colors">Find Parts</Link>
          <Link to="/shop" className="px-4 py-1.5 rounded-full text-sm font-semibold text-brand bg-brand-50">Sell Parts</Link>
          <Link to="/" className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors">Get Started</Link>
        </nav>
      </div>
    </header>
  )
}

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function ShopReviewsPage() {
  const { shopId } = useParams()
  const { currentUser } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState({})
  const [replySubmitting, setReplySubmitting] = useState({})
  const [replySubmitted, setReplySubmitted] = useState({})

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getShopReviews(shopId)
        setReviews(data)
      } catch (err) {
        console.error('Error fetching reviews:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [shopId])

  const handleReply = async (reviewId) => {
    const text = replyText[reviewId]
    if (!text?.trim()) return
    try {
      setReplySubmitting(prev => ({ ...prev, [reviewId]: true }))
      await replyToReview(reviewId, text)
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: text } : r))
      setReplySubmitted(prev => ({ ...prev, [reviewId]: true }))
    } catch (err) {
      console.error('Reply failed:', err)
    } finally {
      setReplySubmitting(prev => ({ ...prev, [reviewId]: false }))
    }
  }

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <NavHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <Link to="/shop" className="text-sm text-brand font-semibold hover:underline">
              ← Back to Shop
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Customer Reviews</h1>
          </div>
          {avgRating && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-3xl font-black text-gray-900">{avgRating}</span>
              <StarDisplay rating={Math.round(avgRating)} />
              <span className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-gray-500">No reviews yet. Reviews appear after completed deals.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => {
              const isSeller = currentUser?.uid === shopId
              return (
                <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <StarDisplay rating={review.rating} />
                    <span className="text-xs text-gray-400">
                      {review.createdAt?.toDate
                        ? review.createdAt.toDate().toLocaleDateString('en-IN')
                        : new Date(review.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  )}

                  {review.reply && (
                    <div className="bg-brand-50 border border-brand/20 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-brand mb-1">Shop replied</p>
                      <p className="text-sm text-gray-700">{review.reply}</p>
                    </div>
                  )}

                  {isSeller && !review.reply && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                      <textarea
                        value={replyText[review.id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-none min-h-[70px]"
                      />
                      <button
                        type="button"
                        disabled={!replyText[review.id]?.trim() || replySubmitting[review.id]}
                        onClick={() => handleReply(review.id)}
                        className={`self-end px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                          replyText[review.id]?.trim() && !replySubmitting[review.id]
                            ? 'bg-brand text-white hover:bg-brand-dark'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {replySubmitting[review.id] ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400 mt-auto">
        <p>© 2026 ReCircuit · Giving electronics a second life</p>
      </footer>
    </div>
  )
}
