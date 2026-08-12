import React from "react";
import { Property } from "../types";
import { MapPin, ShieldCheck, Sparkles, Navigation, Sofa, Wifi, Zap, Car, Wind, Droplets, ChevronRight } from "lucide-react";

interface PropertyCardProps {
  key?: React.Key;
  property: Property;
  onSelect: (property: Property) => void;
}

export default function PropertyCard({ property, onSelect }: PropertyCardProps): React.ReactElement {
  // Rent amount formatting
  const formattedRent = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(property.rentAmount);

  // Return appropriate amenity icon
  const getAmenityIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "wifi":
        return <Wifi className="w-3 h-3" />;
      case "water supply":
      case "water":
        return <Droplets className="w-3 h-3" />;
      case "electricity":
      case "power":
        return <Zap className="w-3 h-3" />;
      case "parking":
        return <Car className="w-3 h-3" />;
      case "furnished":
        return <Sofa className="w-3 h-3" />;
      case "ac":
        return <Wind className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      id={`property-card-${property.propertyId}`}
      onClick={() => onSelect(property)}
      className="group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-100/80 transition-all duration-300 cursor-pointer relative flex flex-col h-full active:scale-[0.98]"
    >
      {/* Featured & Verified Badges overlay */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5 pointer-events-none">
        {property.isFeatured && (
          <span 
            id={`featured-badge-${property.propertyId}`}
            className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 animate-pulse"
          >
            <Sparkles className="w-3 h-3" /> Featured
          </span>
        )}
        {property.isVerified && (
          <span 
            id={`verified-badge-${property.propertyId}`}
            className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        )}
      </div>

      {/* Property Thumbnail with Lazy Loading */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <img
          src={property.photos && property.photos.length > 0 ? property.photos[0] : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out"
          referrerPolicy="no-referrer"
        />
        {/* Type Badge bottom-right */}
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-white font-bold tracking-wide uppercase">
          {property.type}
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors" title={property.title}>
              {property.title}
            </h4>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
              {formattedRent}/mo
            </span>
          </div>

          <div className="flex items-center text-slate-500 text-xs">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{property.address}, {property.city}</span>
          </div>

          {/* Key landmark section */}
          {property.distanceFromLandmarks && property.distanceFromLandmarks.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium bg-slate-50/80 p-2 rounded-xl border border-slate-100">
              <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="line-clamp-1">
                {property.distanceFromLandmarks[0].distance} from {property.distanceFromLandmarks[0].name}
              </span>
            </div>
          )}
        </div>

        {/* Footer Area with amenities and view CTA */}
        <div className="pt-3 border-t border-slate-100/60 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 max-w-[65%] overflow-hidden">
            {property.amenities.slice(0, 3).map((a, idx) => (
              <span 
                key={idx} 
                className="bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                title={a}
              >
                {getAmenityIcon(a)}
                <span className="max-w-[40px] truncate line-clamp-1">{a}</span>
              </span>
            ))}
          </div>
          
          <button 
            type="button" 
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 outline-none shrink-0"
          >
            Sabar karein <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
