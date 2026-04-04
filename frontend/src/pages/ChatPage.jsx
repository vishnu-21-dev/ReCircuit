import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getMatchDoc, updateMatchStatus } from '../api';

function containsPersonalInfo(text) {
  const stripped = text.replace(/[\s\-().]/g, '')
  
  const patterns = [
    /[6-9]\d{9}/,
    /\d{10,}/,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    /@[a-zA-Z0-9._]{3,}/,
    /[a-zA-Z0-9]+@(okaxis|oksbi|okhdfcbank|okicici|ybl|ibl|axl|upi)/i,
    /wame/i,
    /tme/i,
    /(whatsapp|telegram|instagram|snapchat|signal)/i
  ]

  return patterns.some(p => p.test(stripped)) || patterns.some(p => p.test(text))
}

export default function ChatPage() {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  
  const [matchData, setMatchData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [moderationError, setModerationError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const messagesEndRef = useRef(null);

  const isBuyer = currentUser && matchData ? matchData.buyerId === currentUser.uid : false;
  const isSeller = currentUser && matchData ? matchData.buyerId !== currentUser.uid : false;

  const handleUpdateStatus = async (newStatus) => {
    if (!matchId || isUpdating) return;
    try {
      setIsUpdating(true);
      await updateMatchStatus(matchId, newStatus);
      setMatchData(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be under 5MB");
      return;
    }
    setImageError("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };
  
  const cancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
  };

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load match data
  useEffect(() => {
    async function fetchMatch() {
      if (!matchId) return;
      
      try {
        const data = await getMatchDoc(matchId);
        setMatchData(data);
      } catch (error) {
        console.error("Error fetching match data:", error);
      }
    }
    fetchMatch();
  }, [matchId]);

  // Listen to messages
  useEffect(() => {
    if (!matchId) return;
    
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [matchId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile) || !currentUser || isUploading) return;

    if (newMessage && containsPersonalInfo(newMessage)) {
      setModerationError("Sharing personal contact details is not allowed on ReCircuit. Use this chat to coordinate your transaction.");
      setTimeout(() => setModerationError(""), 4000);
      return;
    }
    setModerationError("");
    setImageError("");

    let imageUrl = null;
    if (imageFile) {
      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', 'recircuit_chat');

        const res = await fetch('https://api.cloudinary.com/v1_1/dwgo0iak1/image/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
        imageUrl = data.secure_url;
      } catch (error) {
        console.error("Error uploading image:", error);
        setImageError("Failed to upload image.");
        setIsUploading(false);
        return;
      }
    }

    try {
      setIsUploading(true);
      const messagesRef = collection(db, 'matches', matchId, 'messages');
      const msgObj = {
        text: newMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "User",
        createdAt: new Date()
      };
      if (imageUrl) {
        msgObj.imageUrl = imageUrl;
      }
      await addDoc(messagesRef, msgObj);
      setNewMessage("");
      cancelImage();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!matchData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 flex items-center justify-center text-white">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-950 via-green-950 to-gray-900 min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="p-4 border-b border-white/10 bg-black/20">
        <h1 className="text-green-400 font-bold text-xl">
          Chat about {matchData.partName || matchData.part || 'Component'} {matchData.modelName ? `- ${matchData.modelName}` : ''}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Match ID: {matchId}</p>
      </div>

      {/* Status Bar */}
      {(() => {
        const currentStatus = matchData.status === 'pending' || !matchData.status ? 'connected' : matchData.status;
        const steps = ['connected', 'deal_agreed', 'completed'];

        if (currentStatus === 'cancelled') {
          return (
            <div className="bg-black/20 border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <span className="text-red-400 font-bold text-sm">Sale Cancelled</span>
            </div>
          );
        }

        const getStepColor = (stepIndex) => {
          const currentIndex = steps.indexOf(currentStatus) !== -1 ? steps.indexOf(currentStatus) : 0;
          return stepIndex <= currentIndex ? 'text-green-400' : 'text-gray-500';
        };

        return (
          <div className="bg-black/20 border-b border-white/10 px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <span className={getStepColor(0)}>Connected</span>
              <span className="text-gray-600">→</span>
              <span className={getStepColor(1)}>Deal Agreed</span>
              <span className="text-gray-600">→</span>
              <span className={getStepColor(2)}>Completed</span>
            </div>
            
            <div className="flex items-center gap-3">
              {currentStatus === 'connected' && isSeller && (
                <button
                  onClick={() => handleUpdateStatus('deal_agreed')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  Mark Deal Agreed
                </button>
              )}
              {currentStatus === 'deal_agreed' && !isBuyer && (
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  Mark Completed
                </button>
              )}
              {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={isUpdating}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 px-3 py-1.5 rounded text-xs gap-1 border border-red-500/30 hover:bg-red-500/10 transition-colors font-bold"
                >
                  Cancel Deal
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Message area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser?.uid;
          
          // Format timestamp. Firestore 'createdAt' might be a Firebase Timestamp object,
          // or a native JS Date depending on how it was saved and if it's a local/optimistic update.
          let timeString = "";
          if (msg.createdAt) {
            const dateObj = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
            timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-400 mb-1 px-1">{msg.senderName}</span>
              <div className={`px-4 py-2 max-w-xs ${isMine ? 'bg-green-700 text-white rounded-2xl rounded-tr-sm ml-auto' : 'bg-white/10 text-gray-200 rounded-2xl rounded-tl-sm'}`}>
                {msg.text}
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Chat attachment" 
                    className={`max-w-[200px] w-full rounded-lg cursor-pointer ${msg.text ? 'mt-2' : ''}`}
                    onClick={() => window.open(msg.imageUrl, '_blank')}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1 px-1">{timeString}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom input bar */}
      <div className="p-4 bg-black/20 border-t border-white/10 flex flex-col items-center w-full">
        <div className="w-full max-w-4xl">
          {moderationError && (
            <p className="text-red-400 text-xs pb-2">Sharing personal contact details is not allowed on ReCircuit. Use this chat to coordinate your transaction.</p>
          )}
          {imageError && (
            <p className="text-red-400 text-xs pb-2">{imageError}</p>
          )}

          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-16 rounded object-cover border border-gray-600" />
              <button 
                type="button" 
                onClick={cancelImage}
                className="absolute -top-2 -right-2 bg-gray-500 hover:bg-gray-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none cursor-pointer"
              >
                X
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex w-full items-center">
            <label className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs px-3 py-2 rounded-full cursor-pointer transition-colors mr-2 flex items-center">
              [IMG]
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageSelect}
                disabled={isUploading}
              />
            </label>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isUploading}
              className="bg-white/10 border border-green-700/50 text-white placeholder-gray-500 rounded-full px-5 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isUploading}
              className="shrink-0 bg-green-600 hover:bg-green-500 text-white rounded-full px-5 py-2 ml-2 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
