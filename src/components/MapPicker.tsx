import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Locate, Search, MapPin, Compass } from "lucide-react";

// Fix Leaflet Default Icon issue in production/bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number, address: string) => void;
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [addressConfirmation, setAddressConfirmation] = useState("");
  const [geolocationLoading, setGeolocationLoading] = useState(false);

  // Fallback map coordinates (Jhansi)
  const defaultLat = 25.4484;
  const defaultLng = 78.5685;

  const currentLat = latitude || defaultLat;
  const currentLng = longitude || defaultLng;

  // Check for Mapbox Token
  const mapboxToken = (((import.meta as any).env?.VITE_MAPBOX_TOKEN || (import.meta as any).env?.NEXT_PUBLIC_MAPBOX_TOKEN || "") as string).trim();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create the map instance
    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 14,
      zoomControl: false, // We'll add zoom control custom or placement
    });
    mapRef.current = map;

    // Add zoom control to bottom right for neat UI
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Style the tile layer. Use Mapbox if token available, else CartoDB Voyager (very elegant, light, professional)
    let tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    if (mapboxToken) {
      tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
      attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    // Create draggable marker
    const marker = L.marker([currentLat, currentLng], {
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Listen to dragend events
    marker.on("dragend", async () => {
      const position = marker.getLatLng();
      await handleLocationUpdate(position.lat, position.lng);
    });

    // Run reverse geocoding on initial mount to show address confirmation
    reverseGeocode(currentLat, currentLng);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when coordinates prop changes from outside (e.g. on search or geolocation)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentMarkerLatLng = markerRef.current.getLatLng();
      if (currentMarkerLatLng.lat !== latitude || currentMarkerLatLng.lng !== longitude) {
        mapRef.current.setView([latitude, longitude], 15);
        markerRef.current.setLatLng([latitude, longitude]);
        reverseGeocode(latitude, longitude);
      }
    }
  }, [latitude, longitude]);

  // Reverse Geocoding Helper (Mapbox vs OpenStreetMap Nominatim)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      let address = "";
      if (mapboxToken) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`
        );
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          address = data.features[0].place_name;
        }
      }

      // Fallback/direct Nominatim call to ensure address lookup is robust
      if (!address) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en,hi",
              "User-Agent": "LocaStayRentApp/1.0"
            }
          }
        );
        const data = await res.json();
        address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      setAddressConfirmation(address);
      onChange(lat, lng, address);
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      const fallbackAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddressConfirmation(fallbackAddr);
      onChange(lat, lng, fallbackAddr);
    }
  };

  // Handle manual coordinate updates (from dragging or search)
  const handleLocationUpdate = async (lat: number, lng: number) => {
    await reverseGeocode(lat, lng);
  };

  // Trigger browser location locator
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Aapke browser mein GPS locator support nahi hai.");
      return;
    }

    setGeolocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: gpsLat, longitude: gpsLng } = position.coords;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([gpsLat, gpsLng], 16);
          markerRef.current.setLatLng([gpsLat, gpsLng]);
          await handleLocationUpdate(gpsLat, gpsLng);
        }
        setGeolocationLoading(false);
      },
      (error) => {
        console.warn("Geolocation warning/permission denied:", error);
        alert("GPS Permission nahi mili! Aap manual search box ka upyog karke apna area dhoondh sakte hain.");
        setGeolocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Forward Geocoding Text Search (Mapbox API vs Nominatim API fallback)
  const handleManualSearch = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      let lat = 0;
      let lng = 0;
      let address = "";

      if (mapboxToken) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&limit=1`
        );
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          lng = feature.center[0];
          lat = feature.center[1];
          address = feature.place_name;
        }
      }

      // Nominatim search fallback if no mapbox token or Mapbox return is empty
      if (!lat || !lng) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
          {
            headers: {
              "Accept-Language": "en,hi",
              "User-Agent": "LocaStayRentApp/1.0"
            }
          }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
          address = data[0].display_name;
        }
      }

      if (lat && lng) {
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
          setAddressConfirmation(address);
          onChange(lat, lng, address);
        }
      } else {
        alert("Location nahi mil saki. Kripya dushra naam search karein (jaise 'Jhansi', 'Saket Delhi').");
      }
    } catch (err) {
      console.error("Forward geocoding error:", err);
      alert("Location search karne mein dikkat aayi.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3" id="map-picker-container">
      <div className="flex gap-2">
        <div className="flex-1 flex gap-1.5">
          <input
            type="text"
            placeholder="Apne area/landmark ka naam search karein..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleManualSearch();
              }
            }}
            className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
          />
          <button
            type="button"
            onClick={() => handleManualSearch()}
            disabled={isSearching}
            className="bg-slate-950 hover:bg-slate-800 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
          >
            {isSearching ? "Searching..." : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={geolocationLoading}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
          title="Mera GPS use karein"
        >
          <Locate className={`w-3.5 h-3.5 ${geolocationLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">GPS Me</span>
        </button>
      </div>

      {/* Map display area */}
      <div className="relative border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
        <div ref={mapContainerRef} className="w-full h-56 z-10" style={{ minHeight: "220px" }} />
        
        {/* Floating marker helper info overlay */}
        <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-xs border border-slate-100 rounded-lg px-2.5 py-1 text-[9px] font-extrabold text-slate-500 tracking-wide uppercase flex items-center gap-1">
          <Compass className="w-3 h-3 text-emerald-700 animate-pulse" /> Pin ko drag karke exact location set karein
        </div>
      </div>

      {/* Reverse-geocoded Address Confirmer */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-600 font-medium flex items-start gap-2">
        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Selected Map Location (Pata):</span>
          <p className="line-clamp-2 text-slate-700 font-bold">{addressConfirmation || "Locating..."}</p>
          <span className="font-mono text-[9px] text-slate-400 block mt-1">Coordinates: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}</span>
        </div>
      </div>
    </div>
  );
}
