import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Property, User } from "../types";
import { MapPin, Trash, Eye, Compass, Heart, RefreshCw, Navigation } from "lucide-react";

// Fix default Leaflet marker icons in production
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface SavedLocation {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  rentAmount: number;
  photoUrl?: string;
  photos?: string[];
  savedAt: string;
}

interface SavedPinsTabProps {
  currentUser: User;
  allProperties: Property[];
  onSelectProperty: (property: Property) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function SavedPinsTab({ currentUser, allProperties, onSelectProperty, showToast }: SavedPinsTabProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [savedPins, setSavedPins] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedSavedPin, setSelectedSavedPin] = useState<SavedLocation | null>(null);

  const cacheKey = `locastay_saved_pins_cache_${currentUser.uid}`;
  const mapboxToken = (((import.meta as any).env?.VITE_MAPBOX_TOKEN || (import.meta as any).env?.NEXT_PUBLIC_MAPBOX_TOKEN || "") as string).trim();

  // Initial load from local storage cache for instant UI rendering
  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedPins(parsed);
          setLoading(false);
        }
      } catch (e) {
        console.warn("Error parsing local saved pins cache:", e);
      }
    }
  }, [cacheKey]);

  // Real-time Firestore sync listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const q = query(collection(db, "savedLocations"), where("tenantId", "==", currentUser.uid));
    
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: SavedLocation[] = [];
        snap.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as SavedLocation);
        });

        // Sort newest first
        list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

        // Cache locally
        localStorage.setItem(cacheKey, JSON.stringify(list));
        setSavedPins(list);
        setIsOffline(false);
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore savedLocations subscription failed (Using offline cache):", err);
        setIsOffline(true);
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setSavedPins(JSON.parse(cached));
          } catch (e) {
            console.error("Cache parsing error:", e);
          }
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser.uid, cacheKey]);

  // Manual refresh option
  const fetchSavedPins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "savedLocations"), where("tenantId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const list: SavedLocation[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SavedLocation);
      });

      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      localStorage.setItem(cacheKey, JSON.stringify(list));
      setSavedPins(list);
      setIsOffline(false);
      showToast("Saved pins synced cleanly!", "success");
    } catch (err) {
      console.warn("Firestore fetch error:", err);
      setIsOffline(true);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setSavedPins(JSON.parse(cached));
        } catch (e) {
          console.error("Cache parsing error:", e);
        }
      }
      showToast("Offline mode active. Showing cached pins.", "info");
    } finally {
      setLoading(false);
    }
  };

  // Render & plot interactive Leaflet Map
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialCenterLat = savedPins.length > 0 ? savedPins[0].latitude : 25.4484;
    const initialCenterLng = savedPins.length > 0 ? savedPins[0].longitude : 78.5685;

    const map = L.map(mapContainerRef.current, {
      center: [initialCenterLat, initialCenterLng],
      zoom: savedPins.length > 0 ? 12 : 11,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    let tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapboxToken) {
      tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
      attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a>';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    // Plot markers
    const tempMarkers: Record<string, L.Marker> = {};
    savedPins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude]).addTo(map);
      
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}`;
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px;">${pin.title}</strong>
          <span style="font-size: 11px; color: #1F6F54; font-weight: 800;">₹${pin.rentAmount}/mo</span><br/>
          <span style="font-size: 10px; color: #64748b;">${pin.address}, ${pin.city}</span>
          <div style="margin-top: 8px;">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #1F6F54; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 10px; font-weight: bold; display: inline-block;">
              📍 Get Directions
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        setSelectedSavedPin(pin);
        map.setView([pin.latitude, pin.longitude], 15);
      });

      tempMarkers[pin.id] = marker;
    });

    markersRef.current = tempMarkers;

    if (savedPins.length > 1) {
      const group = L.featureGroup(Object.values(tempMarkers));
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [savedPins, loading]);

  const handleCardClick = (pin: SavedLocation) => {
    setSelectedSavedPin(pin);
    if (mapRef.current) {
      mapRef.current.setView([pin.latitude, pin.longitude], 15);
      const marker = markersRef.current[pin.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleUnsave = async (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "savedLocations", pinId));
      const updatedList = savedPins.filter((p) => p.id !== pinId);
      setSavedPins(updatedList);
      localStorage.setItem(cacheKey, JSON.stringify(updatedList));

      if (selectedSavedPin?.id === pinId) {
        setSelectedSavedPin(null);
      }

      showToast("Location un-saved successfully!", "success");
    } catch (err) {
      console.error("Unsave error:", err);
      // Fallback local remove
      const updatedList = savedPins.filter((p) => p.id !== pinId);
      setSavedPins(updatedList);
      localStorage.setItem(cacheKey, JSON.stringify(updatedList));
      showToast("Location removed from local cache.", "info");
    }
  };

  const handleViewDetails = (propertyId: string) => {
    const prop = allProperties.find((p) => p.propertyId === propertyId);
    if (prop) {
      onSelectProperty(prop);
    } else {
      showToast("Yeh property ab catalog mein available nahi hai.", "info");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="saved-locations-tab">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-4.5 h-4.5 text-red-500 fill-red-500" /> Saved Property Pins ({savedPins.length})
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            {isOffline ? "Offline Mode: Showing cached pins" : "Real-time sync active with cloud DB"}
          </p>
        </div>

        <button
          onClick={fetchSavedPins}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all shadow-xs cursor-pointer"
          title="Sync Saved Pins"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && savedPins.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-6 h-6 border-2 border-[#1F6F54] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading saved pins...</p>
        </div>
      ) : savedPins.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-xs space-y-2">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">Koi Saved Pin Nahi Hai</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
            Explore tab par jaakar kisi bhi property detail page par "Save Location Pin" dabayein. Saved locations yahan interactive map par dikhai dengi!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map Display (2 Columns span on large screens) */}
          <div className="lg:col-span-2 border border-slate-100 rounded-3xl overflow-hidden shadow-xs relative">
            <div ref={mapContainerRef} className="w-full h-80 lg:h-[420px] z-10" />
            <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-100 rounded-lg px-2.5 py-1 text-[9px] font-extrabold text-slate-600 tracking-wide uppercase flex items-center gap-1 shadow-sm">
              <Compass className="w-3 h-3 text-[#1F6F54] animate-pulse" /> Tap card or pin for details & directions
            </div>
          </div>

          {/* Saved List Cards */}
          <div className="space-y-3 max-h-80 lg:max-h-[420px] overflow-y-auto pr-1">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Bookmarked Locations ({savedPins.length}):</span>
            
            {savedPins.map((pin) => {
              const isSelected = selectedSavedPin?.id === pin.id;
              const matchingProperty = allProperties.find((p) => p.propertyId === pin.propertyId);
              const thumbnailUrl = pin.photoUrl || matchingProperty?.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80";
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}`;

              return (
                <div
                  key={pin.id}
                  onClick={() => handleCardClick(pin)}
                  className={`border p-3.5 rounded-2xl transition-all cursor-pointer text-left space-y-2.5 relative group ${
                    isSelected
                      ? "bg-emerald-50/60 border-[#1F6F54]/40 shadow-md ring-1 ring-[#1F6F54]/20"
                      : "bg-white border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Thumbnail Image */}
                    <img
                      src={thumbnailUrl}
                      alt={pin.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 shadow-xs"
                    />

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={pin.title}>
                          {pin.title}
                        </h4>
                        <span className="font-extrabold text-[10px] text-[#1F6F54] bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                          ₹{pin.rentAmount}/mo
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1F6F54] shrink-0" /> {pin.address}, {pin.city}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100/80">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(pin.propertyId)}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Property
                    </button>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 bg-[#1F6F54] hover:bg-[#185842] text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      title="Open Google Maps Directions"
                    >
                      <Navigation className="w-3 h-3" /> Get Directions
                    </a>

                    <button
                      type="button"
                      onClick={(e) => handleUnsave(pin.id, e)}
                      className="p-1.5 border border-red-100 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-extrabold flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Unsave location"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
