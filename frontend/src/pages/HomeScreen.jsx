import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

// ── SVG Icons ──────────────────────────────────────────────────────────────

/** Recycling-circuit logo mark */
function RecircuitIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer recycling-arrow triangle, rotated */}
      <path
        d="M24 4L40 32H8L24 4Z"
        stroke="#16a34a"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner circuit nodes */}
      <circle cx="24" cy="18" r="2.5" fill="#16a34a" />
      <circle cx="16" cy="30" r="2.5" fill="#16a34a" />
      <circle cx="32" cy="30" r="2.5" fill="#16a34a" />
      {/* Circuit traces */}
      <line x1="24" y1="18" x2="16" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      <line x1="24" y1="18" x2="32" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      <line x1="16" y1="30" x2="32" y2="30" stroke="#16a34a" strokeWidth="1.5" />
      {/* Recycling arrows on the edges */}
      <polyline
        points="8,32 4,36 12,36"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polyline
        points="40,32 44,36 36,36"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="4" y1="36" x2="44" y2="36" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Buyer / search icon */
function SearchPartIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <circle cx="28" cy="28" r="16" stroke="#16a34a" strokeWidth="3" fill="#f0fdf4" />
      <line x1="40" y1="40" x2="54" y2="54" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
      {/* Circuit board lines inside the lens */}
      <line x1="22" y1="24" x2="34" y2="24" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="28" x2="28" y2="28" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="32" x2="34" y2="32" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2" fill="#16a34a" />
      <circle cx="34" cy="28" r="2" fill="#16a34a" />
      <circle cx="22" cy="32" r="2" fill="#16a34a" />
    </svg>
  )
}

/** Shop / sell icon */
function SellPartIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      {/* PCB board outline */}
      <rect x="8" y="16" width="48" height="36" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
      {/* Component slots */}
      <rect x="16" y="24" width="12" height="8" rx="2" fill="#16a34a" opacity="0.25" stroke="#16a34a" strokeWidth="1.5" />
      <rect x="36" y="24" width="12" height="8" rx="2" fill="#16a34a" opacity="0.25" stroke="#16a34a" strokeWidth="1.5" />
      <rect x="16" y="38" width="32" height="6" rx="2" fill="#16a34a" opacity="0.15" stroke="#16a34a" strokeWidth="1.5" />
      {/* Legs/pins */}
      <line x1="20" y1="16" x2="20" y2="10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="16" x2="28" y2="10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="16" x2="36" y2="10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="16" x2="44" y2="10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      {/* Tag/price badge top-right */}
      <circle cx="52" cy="12" r="7" fill="#16a34a" />
      <text x="52" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    </svg>
  )
}

/** Arrow icon for buttons */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  )
}

// ── Role Card ──────────────────────────────────────────────────────────────

function RoleCard({ id, icon, title, subtitle, description, features, buttonLabel, onClick, accent }) {
  return (
    <article
      id={id}
      onClick={onClick}
      className="
        group relative bg-white border border-gray-200 rounded-2xl p-8
        flex flex-col gap-6 cursor-pointer
        transition-card
        hover:-translate-y-1
        hover:shadow-[0_12px_40px_rgba(22,163,74,0.15)]
        hover:border-brand
        focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2
        select-none
      "
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      role="button"
      aria-label={`${title}: ${subtitle}`}
    >
      {/* Decorative gradient blob */}
      <div
        className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-300 pointer-events-none
          ${accent === 'buyer'
            ? 'bg-gradient-to-br from-brand-50 to-white'
            : 'bg-gradient-to-br from-brand-50 to-white'}
        `}
      />

      {/* Icon */}
      <div className="relative w-16 h-16 shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="relative flex flex-col gap-2 flex-1">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            {subtitle}
          </span>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
            {title}
          </h2>
        </div>
        <p className="text-gray-500 text-sm leading-relaxed">
          {description}
        </p>

        {/* Feature bullets */}
        <ul className="mt-2 space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-brand" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <path d="M8.5 2.5L4 7 1.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA button */}
      <button
        id={`${id}-btn`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="
          relative mt-auto flex items-center justify-center gap-2
          bg-brand hover:bg-brand-dark
          text-white font-semibold text-sm
          px-6 py-3 rounded-xl
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
          w-full
        "
        aria-label={buttonLabel}
      >
        {buttonLabel}
        <ArrowIcon />
      </button>
    </article>
  )
}

// ── Home Screen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Top nav bar ── */}
      <Navbar />

      <main className="flex-1 flex flex-col">

        {/* ── Hero section ── */}
        <section
          id="hero"
          className="relative overflow-hidden bg-white pt-20 pb-16 px-6 text-center"
          aria-labelledby="hero-heading"
        >
          {/* Subtle background grid pattern */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(22,163,74,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Radial glow */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/5 rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-5">

            {/* Badge */}
            <span
              id="hero-badge"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Electronics Parts Marketplace
            </span>

            {/* Logo + wordmark */}
            <div className="flex items-center gap-4 mt-2">
              <RecircuitIcon className="w-20 h-20 drop-shadow-sm" />
              <h1
                id="hero-heading"
                className="text-6xl sm:text-7xl font-extrabold tracking-tighter leading-none text-gray-900"
              >
                Re<span className="text-brand">Circuit</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl font-medium text-gray-500 leading-snug max-w-xl">
              The Parts Marketplace for{' '}
              <span className="text-gray-800 font-semibold">Electronics Repair</span>
            </p>

            {/* Sub-description */}
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              Connecting repair shops and individual buyers with the exact components they need —
              reducing e-waste and giving parts a second life.
            </p>

            {/* Scroll hint */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <span>Choose your role below</span>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 animate-bounce" aria-hidden="true">
                <path fillRule="evenodd" d="M8 2a.75.75 0 01.75.75v8.69l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V2.75A.75.75 0 018 2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── Role cards ── */}
        <section
          id="role-selection"
          className="max-w-5xl mx-auto w-full px-6 pb-24 grid grid-cols-1 md:grid-cols-2 gap-6"
          aria-label="Select your role"
        >
          <RoleCard
            id="buyer-card"
            accent="buyer"
            icon={<SearchPartIcon />}
            subtitle="For Buyers"
            title="I'm a Buyer"
            description="Need a specific component for your repair? Browse listings or post a request and let shops come to you."
            features={[
              'Search parts by name, model or SKU',
              'Post a want-ad if a part isn\'t listed',
              'Compare prices across multiple shops',
              'Verified seller reviews & ratings',
            ]}
            buttonLabel="Browse as a Buyer"
            onClick={() => navigate('/buyer')}
          />

          <RoleCard
            id="shop-card"
            accent="shop"
            icon={<SellPartIcon />}
            subtitle="For Repair Shops"
            title="I'm a Shop"
            description="Have surplus components sitting on your shelves? List them and connect with buyers who need exactly what you have."
            features={[
              'List parts in under 2 minutes',
              'Reach buyers across the country',
              'Manage inventory from a dashboard',
              'Secure payments & shipping tools',
            ]}
            buttonLabel="Start Selling Parts"
            onClick={() => navigate('/shop')}
          />
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <p>© 2026 ReCircuit · Giving electronics a second life ♻️</p>
      </footer>

    </div>
  )
}
