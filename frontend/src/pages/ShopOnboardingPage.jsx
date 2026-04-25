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
  const [shopPhotoFile, setShopPhotoFile] = useState(null);
  const [shopPhotoPreview, setShopPhotoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5MB");
      return;
    }
    setErrorMsg("");
    setShopPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setShopPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setShopPhotoFile(null);
    setShopPhotoPreview(null);
  };

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

    let finalShopPhotoUrl = '';
    
    if (shopPhotoFile) {
      try {
        const formData = new FormData();
        formData.append('file', shopPhotoFile);
        formData.append('upload_preset', 'recircuit_chat');

        const res = await fetch('https://api.cloudinary.com/v1_1/dwgo0iak1/image/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
        finalShopPhotoUrl = data.secure_url;
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrorMsg("Failed to upload image. Please try again.");
        setLoading(false);
        return;
      }
    }

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
        shopPhotoUrl: finalShopPhotoUrl,
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
            <label className="text-gray-300 text-sm font-semibold mb-2 block">Shop Photo <span className="text-gray-500 font-normal">(Optional)</span></label>
            {!shopPhotoPreview ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-green-500 bg-green-500/10' : 'border-green-700/50 bg-white/5 hover:bg-white/10'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('shopImageUpload').click()}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <svg className="w-10 h-10 text-gray-400 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div className="text-sm text-gray-300">
                    <span className="font-semibold text-green-400">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  <input
                    id="shopImageUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-green-700/50 bg-black group">
                <img src={shopPhotoPreview} alt="Shop Preview" className="w-full h-48 object-cover opacity-80" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <span className="text-white text-sm font-medium truncate block">{shopPhotoFile?.name}</span>
                  <span className="text-green-400 text-xs pt-1">Ready to upload</span>
                </div>
              </div>
            )}
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
