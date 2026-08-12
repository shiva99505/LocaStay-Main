import React, { useState } from "react";
import MapView from "./MapView";
import { Property, BookingRequest, User } from "../types";
import { 
  ArrowLeft, MapPin, ShieldCheck, Sparkles, Navigation, Sofa, Wifi, Zap, 
  Car, Wind, Droplets, Phone, Calendar, Flag, Shield, Landmark, Map, 
  ChevronLeft, ChevronRight, Check, X, AlertTriangle, MessageSquare, AlertCircle,
  Heart, Lock, KeyRound
} from "lucide-react";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface PropertyDetailProps {
  property: Property;
  currentUser?: User | null;
  isUnlocked: boolean;
  onBack: () => void;
  onUnlock: () => void;
  onRequestBooking?: () => void;
  bookingStatus?: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function PropertyDetail({
  property,
  currentUser,
  isUnlocked,
  onBack,
  onUnlock,
  onRequestBooking,
  bookingStatus,
  showToast
}: PropertyDetailProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Saved Location States and Effect
  const [isSaved, setIsSaved] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  React.useEffect(() => {
    if (!currentUser || !property) return;
    const fetchSavedState = async () => {
      const savedId = `saved_${currentUser.uid}_${property.propertyId}`;
      const cacheKey = `locastay_saved_pins_cache_${currentUser.uid}`;
      
      // 1. Check local cache first for fast response
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const list = JSON.parse(cached) as any[];
          if (list.some((p) => p.id === savedId || p.propertyId === property.propertyId)) {
            setIsSaved(true);
          }
        }
      } catch (e) {
        console.warn("Local cache check error:", e);
      }

      // 2. Query Firestore
      try {
        const docRef = doc(db, "savedLocations", savedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsSaved(true);
        } else {
          setIsSaved(false);
        }
      } catch (err) {
        console.warn("Error checking saved state in Firestore:", err);
      }
    };
    fetchSavedState();
  }, [currentUser, property]);

  const handleToggleSave = async () => {
    if (!currentUser) {
      if (showToast) {
        showToast("Kripya log in karein location save karne ke liye.", "info");
      } else {
        alert("Kripya log in karein location save karne ke liye.");
      }
      return;
    }
    setSavingLocation(true);
    const savedId = `saved_${currentUser.uid}_${property.propertyId}`;
    const docRef = doc(db, "savedLocations", savedId);
    const cacheKey = `locastay_saved_pins_cache_${currentUser.uid}`;

    try {
      if (isSaved) {
        // Unsave from Firestore
        try {
          await deleteDoc(docRef);
        } catch (fErr) {
          console.warn("Firestore delete savedLocation failed, updating local state:", fErr);
        }
        setIsSaved(false);

        // Remove from cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const list = JSON.parse(cached) as any[];
            const updated = list.filter((p) => p.id !== savedId && p.propertyId !== property.propertyId);
            localStorage.setItem(cacheKey, JSON.stringify(updated));
          } catch (e) {
            console.error("Cache update error:", e);
          }
        }
        if (showToast) {
          showToast("Location Pin removed from 'My Locations'", "info");
        }
      } else {
        // Save
        const firstPhoto = property.photos && property.photos.length > 0 ? property.photos[0] : "";
        const savedDoc = {
          id: savedId,
          tenantId: currentUser.uid,
          propertyId: property.propertyId,
          title: property.title,
          address: property.address,
          city: property.city,
          latitude: property.latitude || 25.4484,
          longitude: property.longitude || 78.5685,
          rentAmount: property.rentAmount,
          photoUrl: firstPhoto,
          savedAt: new Date().toISOString()
        };

        try {
          await setDoc(docRef, savedDoc);
        } catch (fErr) {
          console.warn("Firestore setDoc savedLocation failed, falling back to local cache:", fErr);
        }

        setIsSaved(true);

        // Save to cache
        const cached = localStorage.getItem(cacheKey);
        let list = [];
        if (cached) {
          try {
            list = JSON.parse(cached);
          } catch (e) {
            console.error("Cache parsing error:", e);
          }
        }
        list = [savedDoc, ...list.filter((p: any) => p.id !== savedId && p.propertyId !== property.propertyId)];
        localStorage.setItem(cacheKey, JSON.stringify(list));

        if (showToast) {
          showToast("📍 Location pin saved to 'My Locations'!", "success");
        }
      }
    } catch (err) {
      console.error("Error toggling location save:", err);
      if (showToast) {
        showToast("Location save karne mein issue aaya. Check connection.", "error");
      }
    } finally {
      setSavingLocation(false);
    }
  };

  const photosList = property.photos && property.photos.length > 0 
    ? property.photos 
    : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"];

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev + 1) % photosList.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
  };

  // Predefined lists of standard amenities to check
  const standardAmenities = [
    { name: "Wifi", label: "WiFi", icon: <Wifi className="w-4 h-4" /> },
    { name: "Water Supply", label: "24/7 Water", icon: <Droplets className="w-4 h-4" /> },
    { name: "Electricity", label: "Electricity Backup", icon: <Zap className="w-4 h-4" /> },
    { name: "Parking", label: "Parking Space", icon: <Car className="w-4 h-4" /> },
    { name: "Furnished", label: "Fully Furnished", icon: <Sofa className="w-4 h-4" /> },
    { name: "AC", label: "Air Conditioning", icon: <Wind className="w-4 h-4" /> }
  ];

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason || !currentUser) return;
    setIsReporting(true);
    try {
      const reportId = `rep_${Math.random().toString(36).substring(2, 10)}`;
      const reportDoc = {
        reportId,
        propertyId: property.propertyId,
        propertyTitle: property.title,
        reporterId: currentUser.uid,
        reporterName: currentUser.name,
        reason: reportReason,
        details: reportDetails,
        status: "pending_review",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "reports", reportId), reportDoc);
      setReportSuccess(true);
    } catch (err) {
      console.error("Error submitting listing report:", err);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 relative" id={`property-detail-page-${property.propertyId}`}>
      {/* Back Button and Navigation Title */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="flex items-center text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white px-3.5 py-2 rounded-2xl border border-slate-100 shadow-xs gap-1.5 transition-all"
          id="detail-back-btn"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" /> Wapas Jayein
        </button>
        <span className="text-xs font-semibold text-slate-400 font-mono">Property Code: {property.propertyId}</span>
      </div>

      {/* Main Image Viewport & Slider Carousel */}
      <div 
        onClick={() => setIsFullscreenOpen(true)}
        className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-slate-900 shadow-sm border border-slate-100 group cursor-zoom-in"
        id="image-carousel-viewport"
      >
        <img
          src={photosList[activePhotoIndex]}
          alt={property.title}
          className="w-full h-full object-cover select-none"
          referrerPolicy="no-referrer"
        />

        {/* Swipe overlay indicators */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6 flex justify-between items-end pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-xs text-white font-mono font-bold tracking-wide">
            {activePhotoIndex + 1} / {photosList.length}
          </div>
          <span className="text-[11px] text-white/90 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full font-bold">
            Tap to view full photo
          </span>
        </div>

        {/* Carousel buttons */}
        {photosList.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg hover:scale-105 transition-all outline-none"
              title="Pichli Photo"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg hover:scale-105 transition-all outline-none"
              title="Agli Photo"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </>
        )}
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {isFullscreenOpen && (
        <div 
          onClick={() => setIsFullscreenOpen(false)}
          className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-4 cursor-zoom-out"
          id="fullscreen-photo-viewer"
        >
          <div className="flex justify-between items-center text-white p-2">
            <span className="text-xs font-bold tracking-widest font-mono">GALLERY VIEW</span>
            <button className="text-white hover:text-red-400 font-bold text-xs p-2">
              CLOSE (X)
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <img 
              src={photosList[activePhotoIndex]} 
              alt="" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center text-slate-400 text-xs py-4 font-mono">
            {activePhotoIndex + 1} of {photosList.length} photos available
          </div>
        </div>
      )}

      {/* Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Columns: Title, details, amenities,landmarks */}
        <div className="md:col-span-2 space-y-6">
          {/* Header Info Block */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {property.type}
              </span>
              {property.isFeatured && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" /> Featured Listing
                </span>
              )}
              {property.isVerified && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Listing
                </span>
              )}
            </div>

            <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">{property.title}</h1>

            <div className="flex items-start text-slate-500 text-xs gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{property.address}, {property.city}, {property.state} - {property.pincode}</span>
            </div>
          </div>

          {/* Description Block */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">About This Property (Ghar ke Baare Me)</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
              {property.description || "Iss property ke liye koi specific details nahi dali gayi hain. Lekin yeh bilkul ready-to-move hai aur landlord aapse direct coordinate karenge."}
            </p>
          </div>

          {/* Amenities Grid Highlight vs Greyed Out */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Amenities (Suvidhayein)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5" id="amenities-highlights-grid">
              {standardAmenities.map((amenity) => {
                const isAvailable = property.amenities.some(
                  (a) => a.toLowerCase().replace(/\s/g, "") === amenity.name.toLowerCase().replace(/\s/g, "")
                );
                return (
                  <div
                    key={amenity.name}
                    className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      isAvailable
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800 font-bold"
                        : "bg-slate-50/50 border-slate-100 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-200/50 text-slate-400"}`}>
                      {amenity.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs">{amenity.label}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">
                        {isAvailable ? "Available" : "Not Provided"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Landmarks Section */}
          {property.distanceFromLandmarks && property.distanceFromLandmarks.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-emerald-600" /> Nearby Landmarks (Paas ki Jagah)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="landmarks-list">
                {property.distanceFromLandmarks.map((landmark, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-700 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <span className="flex items-center gap-1.5 truncate">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{landmark.name}</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg font-mono font-bold shrink-0">{landmark.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Map Preview with Lock Overlay */}
          {(() => {
            const hasMapAccess = isUnlocked || currentUser?.role === "landlord" || currentUser?.role === "admin";
            return (
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs" id="property-map-container">
                <div className={!hasMapAccess ? "filter blur-md opacity-40 pointer-events-none select-none transition-all duration-300" : ""}>
                  <MapView
                    latitude={property.latitude || 25.4484}
                    longitude={property.longitude || 78.5685}
                    title={property.title}
                  />
                </div>

                {!hasMapAccess && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl border border-slate-200/60 shadow-lg animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-3 shadow-sm">
                      <Lock className="w-7 h-7 text-amber-600" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                      Map & Exact Location Locked
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 max-w-sm mt-1.5 mb-4 leading-relaxed">
                      Is property ka exact GPS map aur location lock hai. Jab aap payment (₹10 token unlock) karenge tabhi is specific property ka live map access kar sakte hain.
                    </p>
                    <button
                      onClick={onUnlock}
                      className="px-6 py-3 bg-[#1F6F54] hover:bg-[#185842] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                      id="unlock-map-btn"
                    >
                      <KeyRound className="w-4 h-4" /> Unlock Exact Location & Map (Pay ₹10)
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Unobtrusive Report Listing Flag */}
          <div className="pt-2 text-center">
            {!showReportForm ? (
              <button
                onClick={() => setShowReportForm(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 mx-auto transition-colors"
                id="report-listing-trigger"
              >
                <Flag className="w-3 h-3" /> Report this listing (Kuch galat hai toh batayein)
              </button>
            ) : (
              <div className="bg-red-50/50 border border-red-100 rounded-3xl p-5 text-left space-y-3 animate-fade-in" id="report-listing-form">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Report Suspicious Listing
                  </span>
                  <button onClick={() => setShowReportForm(false)} className="text-xs text-slate-400 hover:text-slate-600">
                    Cancel
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="p-3 bg-green-50 text-green-700 border border-green-100 text-xs rounded-xl font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Report submitted successfully! Admin review pending.
                  </div>
                ) : !currentUser ? (
                  <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Report karne ke liye aapko login karna hoga. Please page ke top par login/signup karein.</span>
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Reason</label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        required
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-red-500"
                      >
                        <option value="">Select reason...</option>
                        <option value="fake_property">Fake Listing (Yeh ghar nahi hai)</option>
                        <option value="wrong_rent">Wrong Rent (Rent different hai)</option>
                        <option value="already_rented">Already Rented Out</option>
                        <option value="unavailable_owner">Owner is unreachable</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Additional details (Optional)</label>
                      <textarea
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        rows={2}
                        placeholder="Hindi/English mein detail likhein..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isReporting}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] px-4 py-2 rounded-xl transition-all"
                    >
                      {isReporting ? "Submitting..." : "Submit Report"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing details, Quick summary box */}
        <div className="space-y-4">
          {/* Quick Pricing info box */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Financial Summary</span>
            
            <div className="py-4 border-y border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Monthly Rent</span>
                <span className="text-sm font-extrabold text-slate-800">₹{property.rentAmount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Security Deposit</span>
                <span className="text-sm font-extrabold text-slate-800">₹{property.depositAmount}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-50">
                <span className="text-emerald-700 font-bold">Total Initial Budget</span>
                <span className="text-sm font-extrabold text-emerald-700">₹{property.rentAmount + property.depositAmount}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/30 text-left space-y-1">
              <span className="font-bold text-emerald-800 block">LocaStay Guarantee:</span>
              <span>Brokers ko hazaaro ₹ dene ke bajaye direct ₹10 mein owner se baat karein! Zero hidden broker fees.</span>
            </div>
          </div>

          {/* Save Location widget block */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GPS Bookmark</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Iss property ki location ko safe bookmark karein. Aap ise offline ya high-resolution maps par dekh payenge.
            </p>
            <button
              onClick={handleToggleSave}
              disabled={savingLocation}
              className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                isSaved
                  ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-red-600 text-red-600" : "text-slate-500"}`} />
              {isSaved ? "Saved in My Pins" : "Save Location Pin"}
            </button>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR FOR MOBILE/DESKTOP */}
      <div 
        id="detail-sticky-cta-bar"
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4.5 z-40 shadow-xl flex items-center justify-center"
      >
        <div className="w-full max-w-4xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected Rent</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-700">₹{property.rentAmount}/mo</span>
          </div>

          <div className="flex-grow max-w-md">
            {isUnlocked ? (
              /* Already Unlocked Contact Details */
              <div className="bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 animate-fade-in" id="landlord-contact-info-panel">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Owner Contact Unlocked</span>
                  <span className="text-xs font-bold text-slate-700">Phone: +91 98765 43210</span>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href="tel:+919876543210"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>

                  {onRequestBooking && (
                    <button
                      onClick={onRequestBooking}
                      disabled={bookingStatus === "accepted" || bookingStatus === "pending"}
                      className={`text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all ${
                        bookingStatus === "accepted"
                          ? "bg-green-600 text-white cursor-default"
                          : bookingStatus === "pending"
                          ? "bg-amber-100 text-amber-800 cursor-default"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {bookingStatus === "accepted" 
                        ? "Accepted" 
                        : bookingStatus === "pending" 
                        ? "Pending" 
                        : "Book Now"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Locked Contact - Need payment */
              <button
                onClick={onUnlock}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 outline-none animate-pulse"
                id="unlock-contact-cta-btn"
              >
                <span>View Contact & Book — ₹10</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
