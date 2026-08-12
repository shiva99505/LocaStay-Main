import React, { useState } from "react";
import { Property, BookingRequest } from "../types";
import { ShieldCheck, Calendar, MapPin, AlertCircle, Sparkles, ChevronRight, BookmarkCheck, Phone, ArrowUpRight } from "lucide-react";

interface MyBookingsTabProps {
  bookingRequests: BookingRequest[];
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onBrowseMore: () => void;
}

export default function MyBookingsTab({
  bookingRequests,
  properties,
  onSelectProperty,
  onBrowseMore
}: MyBookingsTabProps) {
  const [subTab, setSubTab] = useState<"requests" | "unlocked">("requests");

  // Get matching property details for a request
  const getPropertyForRequest = (propertyId: string) => {
    return properties.find((p) => p.propertyId === propertyId);
  };

  // Unlocked properties: booking requests where unlockedContact == true
  const unlockedRequests = bookingRequests.filter((r) => r.unlockedContact);

  return (
    <div className="space-y-6" id="my-bookings-container">
      {/* Tab Switchers */}
      <div className="flex border-b border-slate-100 pb-px gap-4">
        <button
          onClick={() => setSubTab("requests")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 relative ${
            subTab === "requests"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          id="subtab-requests-btn"
        >
          My Booking Requests ({bookingRequests.length})
        </button>

        <button
          onClick={() => setSubTab("unlocked")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 relative ${
            subTab === "unlocked"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          id="subtab-unlocked-btn"
        >
          Unlocked Contacts ({unlockedRequests.length})
        </button>
      </div>

      {/* 1. Booking Requests list */}
      {subTab === "requests" && (
        <div className="space-y-4" id="requests-subtab-content">
          {bookingRequests.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">Koi Booking Request nahi mili</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aapne abhi tak kisi property ke liye formal booking request nahi bheji hai. Ek baar available properties ko explore karein.
                </p>
              </div>
              <button
                onClick={onBrowseMore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md shadow-emerald-600/10 transition-all outline-none"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookingRequests.map((req) => {
                const prop = getPropertyForRequest(req.propertyId);
                const isApproved = req.status === "accepted";
                const isRejected = req.status === "rejected";

                return (
                  <div
                    key={req.requestId}
                    onClick={() => prop && onSelectProperty(prop)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs hover:border-emerald-100/80 transition-all cursor-pointer flex gap-4 hover:shadow-sm group active:scale-[0.99]"
                  >
                    {/* Property Mini Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={prop?.photos && prop.photos.length > 0 ? prop.photos[0] : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=150&q=80"}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Meta information */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={prop?.title}>
                            {prop ? prop.title : `Property Code: ${req.propertyId}`}
                          </h4>
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase shrink-0">
                            REQ-{req.requestId.slice(-5).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center text-slate-400 text-[11px]">
                          <MapPin className="w-3 h-3 mr-0.5 text-slate-300" />
                          <span className="truncate">{prop ? `${prop.city}, ${prop.state}` : "Unknown Town"}</span>
                        </div>
                      </div>

                      {/* Request Date & Status Badge */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-1">
                        <span className="text-[10px] text-slate-400 flex items-center font-medium">
                          <Calendar className="w-3 h-3 mr-1 text-slate-300" />
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Date unavailable"}
                        </span>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : isRejected
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Unlocked Contacts section */}
      {subTab === "unlocked" && (
        <div className="space-y-4" id="unlocked-subtab-content">
          {unlockedRequests.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <ShieldCheck className="w-6 h-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">Koi Unlocked Property nahi mili</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aapne abhi tak ₹10 pay karke kisi landlord ka direct contact unlock nahi kiya hai.
                </p>
              </div>
              <button
                onClick={onBrowseMore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md shadow-emerald-600/10 transition-all outline-none"
              >
                Browse & Unlock now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedRequests.map((req) => {
                const prop = getPropertyForRequest(req.propertyId);
                return (
                  <div
                    key={req.requestId}
                    onClick={() => prop && onSelectProperty(prop)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs hover:border-emerald-100/80 transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm group active:scale-[0.99]"
                  >
                    <div className="flex gap-4 mb-3">
                      {/* Property Thumbnail */}
                      <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                        <img
                          src={prop?.photos && prop.photos.length > 0 ? prop.photos[0] : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=150&q=80"}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{prop ? prop.title : "Rental Unit"}</h4>
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                            ₹{prop?.rentAmount}/mo
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 mr-0.5" /> {prop?.address}, {prop?.city}
                        </p>
                      </div>
                    </div>

                    {/* Landlord details & phone call block */}
                    <div className="pt-3 border-t border-slate-100/80 flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl">
                      <div className="text-left">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Direct Landlord Contact</span>
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> +91 98765 43210
                        </span>
                      </div>

                      <div className="flex items-center text-emerald-600 font-bold text-[11px] gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                        View Details <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
