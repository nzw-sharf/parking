
import React, { useState, useEffect, useRef } from 'react';
import { ParkingState, ParkingLocation } from './types.ts';
import MapView from './components/MapView.tsx';
import { MapPin, Camera, Clock, History, X, Trash2, Navigation, Info, Loader2, Hash, WifiOff, Database, Map as MapIcon, Edit3 } from 'lucide-react';

const DB_NAME = 'ParkIQ_DB';
const STORE_NAME = 'parking_state';

const App: React.FC = () => {
  const [state, setState] = useState<ParkingState>({
    isParked: false,
    location: null,
    photoUrl: null,
    meterEndTime: null,
    note: '',
    spotDetails: '',
  });

  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [view, setView] = useState<'widget' | 'full' | 'camera'>('widget');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e: any) => {
      const database = e.target.result;
      setDb(database);
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get('current_state');
      getReq.onsuccess = () => {
        if (getReq.result) {
          setState(getReq.result);
          if (getReq.result.isParked) setView('full');
        }
      };
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("GPS Signal Weak", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (db) {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(state, 'current_state');
    }
  }, [state, db]);

  useEffect(() => {
    if (!state.meterEndTime) { setTimeRemaining(''); return; }
    const interval = setInterval(() => {
      const diff = state.meterEndTime! - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.meterEndTime]);

  const handlePark = () => {
    const loc = currentCoords || { lat: 0, lng: 0 }; 
    setState(prev => ({
      ...prev,
      isParked: true,
      location: { ...loc, timestamp: Date.now() }
    }));
    setView('full');
  };

  const handleUnpark = () => {
    if (confirm("End parking session?")) {
      setState({ isParked: false, location: null, photoUrl: null, meterEndTime: null, note: '', spotDetails: '' });
      setView('widget');
    }
  };

  const openCamera = async () => {
    setView('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied.");
      setView('full');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      const aspect = w / h;
      
      canvasRef.current.width = 1080;
      canvasRef.current.height = 1080 / aspect;
      
      ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
      
      setState(prev => ({ ...prev, photoUrl: dataUrl }));
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setView('full');
    }
  };

  if (view === 'camera') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-[100] animate-in fade-in duration-300">
        <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="p-8 pb-12 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
          <button onClick={() => setView('full')} className="text-white bg-white/10 p-4 rounded-full backdrop-blur-lg"><X size={24} /></button>
          <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-white ring-4 ring-indigo-500/50 active:scale-90 transition-transform shadow-2xl" />
          <div className="w-14" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center max-w-md mx-auto relative overflow-hidden bg-slate-50 font-sans">
      
      <div className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 flex justify-center transition-all ${!isOnline ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
        <div className="bg-slate-800/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 shadow-xl border border-white/10">
          <WifiOff size={12} /> LOCAL ENGINE ACTIVE
        </div>
      </div>

      <div className={`w-full relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] overflow-hidden ${state.isParked ? 'h-[90vh] bg-white' : 'h-72 bg-gradient-to-br from-slate-800 to-slate-900'}`}>
        {!state.isParked ? (
          <div className="p-10 flex flex-col h-full text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black tracking-tight">ParkIQ</h1>
                <p className="text-white/50 text-sm font-medium">Smart Utility</p>
              </div>
              <div className="p-3 bg-white/10 rounded-[1.5rem] backdrop-blur-xl border border-white/20">
                <MapPin size={24} className="text-white" />
              </div>
            </div>
            
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-widest px-1">
                <Database size={10} /> Secure Local Disk
              </div>
              <button 
                onClick={handlePark}
                className="w-full bg-white text-slate-900 p-5 rounded-[2rem] flex items-center justify-center gap-3 font-black text-lg active:scale-95 transition-all shadow-xl"
              >
                <Navigation size={22} className="fill-slate-900" /> Save Current Spot
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="h-44 relative shrink-0">
              <MapView currentLocation={currentCoords} parkingLocation={state.location} />
              <div className="absolute top-5 left-5 right-5 flex justify-between pointer-events-none">
                 <div className="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                      PARKED {new Date(state.location?.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
                 <button onClick={handleUnpark} className="bg-white text-red-500 p-3 rounded-full shadow-2xl border border-slate-100 pointer-events-auto active:scale-90 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto bg-white">
              
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-5 rounded-[2.5rem] border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Remaining</span>
                  <div className="text-2xl font-black text-slate-900 tabular-nums">
                    {timeRemaining || '--:--'}
                  </div>
                </div>
                <div className="flex-1 bg-indigo-50 p-5 rounded-[2.5rem] border border-indigo-100">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Location</span>
                  <div className="text-[11px] font-bold text-indigo-900 leading-tight">
                    {currentCoords ? "GPS Active" : "Searching..."}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-[2rem] flex items-center gap-4 border border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <Hash size={20} className="text-slate-400" />
                <input 
                  type="text" 
                  value={state.spotDetails} 
                  onChange={(e) => setState(p => ({...p, spotDetails: e.target.value}))}
                  placeholder="Level, Pillar, or Number"
                  className="w-full bg-transparent text-sm font-bold focus:outline-none text-slate-800 placeholder:text-slate-300"
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-[2rem] flex items-start gap-4 border border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <Edit3 size={20} className="text-slate-400 mt-0.5" />
                <textarea 
                  value={state.note} 
                  onChange={(e) => setState(p => ({...p, note: e.target.value}))}
                  placeholder="Additional notes about your spot..."
                  rows={2}
                  className="w-full bg-transparent text-sm font-medium focus:outline-none text-slate-600 placeholder:text-slate-300 resize-none"
                />
              </div>

              <div className="relative aspect-video bg-slate-100 rounded-[2.5rem] overflow-hidden shrink-0 shadow-inner group border border-slate-100">
                {state.photoUrl ? (
                  <img src={state.photoUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                    <Camera size={32} strokeWidth={1.5} />
                    <p className="text-[10px] font-black tracking-widest">VISUAL RECORD</p>
                  </div>
                )}
                <button 
                  onClick={openCamera} 
                  className="absolute bottom-4 right-4 bg-indigo-600 p-4 rounded-full shadow-2xl active:scale-90 text-white transition-all hover:rotate-6"
                >
                  <Camera size={24} strokeWidth={2.5} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto pt-4 pb-6">
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${state.location?.lat},${state.location?.lng}`)} 
                  className="bg-slate-900 text-white p-5 rounded-[2rem] flex items-center justify-center gap-3 text-xs font-black shadow-xl active:scale-95 transition-all"
                >
                  <Navigation size={18} fill="white" /> NAVIGATE
                </button>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setState(p => ({...p, meterEndTime: Date.now() + 30*60000}))} 
                    className="flex-1 bg-white border-2 border-slate-100 text-slate-800 rounded-[2rem] text-[11px] font-black active:scale-95 transition-all shadow-sm"
                   >
                     +30m
                   </button>
                   <button 
                    onClick={() => setState(p => ({...p, meterEndTime: Date.now() + 60*60000}))} 
                    className="flex-1 bg-white border-2 border-slate-100 text-slate-800 rounded-[2rem] text-[11px] font-black active:scale-95 transition-all shadow-sm"
                   >
                     +1h
                   </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 opacity-30">
        <p className="text-[9px] font-black tracking-[0.2em] text-slate-400">PARKIQ CORE V2.1 • ZERO DATA</p>
        <div className="flex gap-6 text-slate-400">
          <History size={16} />
          <Info size={16} />
        </div>
      </div>
    </div>
  );
};

export default App;
