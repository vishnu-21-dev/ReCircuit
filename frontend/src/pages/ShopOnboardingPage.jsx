import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createShop } from '../api';

const REPAIR_CATEGORIES = [
  'Mobile Phones', 'Laptops', 'Tablets', 'TVs', 'ACs', 
  'Refrigerators', 'Washing Machines', 'Other Electronics'
];

export default function ShopOnboardingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [categories, setCategories] = useState([]);
  const [shopPhotoUrl, setShopPhotoUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocating(false)
      },
      (error) => {
        setErrorMsg('Could not get location. Please allow location access and try again.')
        setLocating(false)
      }
    )
  }

  const toggleCategory = (cat) => {
    setCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if required fields are filled
    const isFormValid = shopName.trim() && ownerName.trim() && phone.trim() && city.trim() && area.trim();
    
    if (!isFormValid) {
      setErrorMsg("Please fill all required fields");
      return;
    }
    
    setErrorMsg('');
    setLoading(true);

    try {
      await createShop({
        uid: currentUser.uid,
        shopName,
        ownerName,
        phone,
        city,
        area,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        categories,
        shopPhotoUrl,
      });
      navigate('/shop');
    } catch (err) {
      console.error(err);
      setErrorMsg("Error registering shop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="bg-white/5 backdrop-blur-md border border-green-800/40 rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <h1 className="text-green-400 font-bold text-2xl mb-6">Register Your Shop</h1>
        
        {errorMsg && (
          <div className="text-red-400 text-sm mb-4 font-medium">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-300 text-sm font-semibold mb-1 block">Shop Name *</label>
            <input 
              type="text" 
              value={shopName} 
              onChange={e => setShopName(e.target.value)} 
              className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
            />
          </div>
          
          <div>
            <label className="text-gray-300 text-sm font-semibold mb-1 block">Owner Name *</label>
            <input 
              type="text" 
              value={ownerName} 
              onChange={e => setOwnerName(e.target.value)} 
              className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-semibold mb-1 block">Phone Number *</label>
            <input 
              type="text" 
              placeholder="+91 XXXXX XXXXX"
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-gray-300 text-sm font-semibold mb-1 block">City *</label>
              <input 
                type="text" 
                value={city} 
                onChange={e => setCity(e.target.value)} 
                className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-gray-300 text-sm font-semibold mb-1 block">Area / Locality *</label>
              <input 
                type="text" 
                placeholder="e.g. Koramangala, HSR Layout"
                value={area} 
                onChange={e => setArea(e.target.value)} 
                className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="bg-white/10 border border-green-700/50 text-white rounded-lg px-4 py-2 w-full"
            >
              {locating ? 'Getting your location...' : 'Detect My Location'}
            </button>
            {coords ? (
              <p className="text-green-400 text-xs mt-1">Location captured: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
            ) : (
              <p className="text-gray-500 text-xs mt-1">Used to show your shop on the map for buyers</p>
            )}
          </div>

          <div>
            <label className="text-gray-300 text-sm font-semibold mb-2 block">Repair Categories</label>
            <div className="flex flex-wrap gap-2">
              {REPAIR_CATEGORIES.map(cat => {
                const isSelected = categories.includes(cat);
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors border border-transparent ${
                      isSelected 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-semibold mb-1 block">Shop Photo URL <span className="text-gray-500 font-normal">(Optional)</span></label>
            <input 
              type="text" 
              placeholder="https://example.com/your-shop-front.jpg"
              value={shopPhotoUrl} 
              onChange={e => setShopPhotoUrl(e.target.value)} 
              className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`font-semibold rounded-lg px-6 py-2 transition-colors w-full mt-4 flex items-center justify-center gap-2 ${
               loading ? 'bg-green-800 text-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
