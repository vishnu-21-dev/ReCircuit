import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getShops, updateShop } from '../api';
export default function AdminPage() {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingShops = async () => {
    try {
      setLoading(true);
      const shopsData = await getShops({ status: 'pending' });
      setShops(shopsData);
    } catch (err) {
      console.error("Error fetching shops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchPendingShops();
    }
  }, [currentUser]);


  const handleApprove = async (shopId) => {
    try {
      await updateShop(shopId, { status: 'approved' });
      fetchPendingShops();
    } catch (err) {
      console.error("Error approving shop:", err);
    }
  };

  const handleReject = async (shopId) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return; // User cancelled prompt

    try {
      await updateShop(shopId, {
        status: 'rejected',
        rejectionReason: reason
      });
      fetchPendingShops();
    } catch (err) {
      console.error("Error rejecting shop:", err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 min-h-screen p-6 sm:p-12 font-sans text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-400 mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Review incoming shop registrations</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg border border-green-800/40 backdrop-blur-md">
            <span className="text-green-500 font-semibold">{shops.length}</span> Pending
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading shops...</div>
        ) : shops.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-lg">No pending shop applications</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div key={shop.id} className="bg-white/5 backdrop-blur-md border border-green-800/40 rounded-2xl p-5 shadow-xl flex flex-col hover:border-green-600/50 transition-colors">
                {shop.shopPhotoUrl ? (
                  <img src={shop.shopPhotoUrl} alt={`${shop.shopName} exterior`} className="w-full h-40 object-cover rounded-xl mb-4 shadow-sm" />
                ) : (
                  <div className="w-full h-40 bg-white/5 border border-white/10 rounded-xl mb-4 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0V16m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-white truncate pr-2">{shop.shopName}</h2>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap uppercase tracking-wider">
                    Pending Review
                  </span>
                </div>

                <div className="space-y-1.5 mb-4 text-sm mt-2">
                  <p className="flex items-center text-gray-300">
                    <span className="w-16 font-semibold text-gray-500">Owner:</span> {shop.ownerName}
                  </p>
                  <p className="flex items-center text-gray-300">
                    <span className="w-16 font-semibold text-gray-500">Phone:</span> {shop.phone}
                  </p>
                  <p className="flex items-center text-gray-300">
                    <span className="w-16 font-semibold text-gray-500">Locality:</span> {shop.area}, {shop.city}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {(shop.categories || []).map((cat, idx) => (
                    <span key={idx} className="bg-white/10 text-gray-300 px-2 py-0.5 rounded text-[11px] font-medium border border-white/5">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-3">
                  <button
                    onClick={() => handleReject(shop.id)}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded-lg text-sm font-semibold transition-colors border border-white/10"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(shop.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-green-900/50 transition-colors"
                  >
                    Approve
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
