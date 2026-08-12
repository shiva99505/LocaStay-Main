import React from "react";
import { PropertyType } from "../types";
import { X, Check, SlidersHorizontal, MapPin, Sparkles, RefreshCw } from "lucide-react";

interface FiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  citiesList: string[];
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedTypes: PropertyType[];
  setSelectedTypes: (types: PropertyType[]) => void;
  minRent: number;
  setMinRent: (rent: number) => void;
  maxRent: number;
  setMaxRent: (rent: number) => void;
  selectedAmenities: string[];
  setSelectedAmenities: (amenities: string[]) => void;
  onReset: () => void;
}

export default function FiltersSheet({
  isOpen,
  onClose,
  citiesList,
  selectedCity,
  setSelectedCity,
  selectedTypes,
  setSelectedTypes,
  minRent,
  setMinRent,
  maxRent,
  setMaxRent,
  selectedAmenities,
  setSelectedAmenities,
  onReset
}: FiltersSheetProps) {
  const predefinedCities = Array.from(new Set(["Jhansi", "Alwar", "Orai", "Kota", "Lalitpur", "Gwalior", "Sagar", ...citiesList]));
  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: "house", label: "House (Ghar)" },
    { value: "hostel", label: "Hostel (PG)" },
    { value: "room", label: "Room (Kamra)" },
    { value: "shop", label: "Shop (Dukan)" }
  ];
  const allAmenities = ["Wifi", "Water Supply", "Electricity", "Parking", "Furnished", "AC", "Attached Bath"];

  const toggleType = (type: PropertyType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" id="filters-modal-overlay">
      {/* Mobile bottom sheet, Desktop modal */}
      <div 
        id="filters-modal-container"
        className="bg-white rounded-t-[32px] sm:rounded-3xl w-full sm:max-w-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-100"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4.5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Advanced Filter Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
            id="close-filters-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Predefined launching cities */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select City (Shehar)</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                id="city-select-dropdown"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Tier 3/4 Cities (Sabhi Shehar)</option>
                {predefinedCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Types Multi-select Chips */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Property Category (Type)</label>
            <div className="flex flex-wrap gap-2" id="property-type-chips">
              {propertyTypes.map((pt) => {
                const isSelected = selectedTypes.includes(pt.value);
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => toggleType(pt.value)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/10"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rent Range Number Input Fields */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Rent budget (₹)</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Minimum</span>
                <input
                  type="number"
                  id="rent-min-input"
                  min="0"
                  max="100000"
                  placeholder="0"
                  value={minRent}
                  onChange={(e) => setMinRent(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Maximum</span>
                <input
                  type="number"
                  id="rent-max-input"
                  min="0"
                  max="100000"
                  placeholder="50000"
                  value={maxRent}
                  onChange={(e) => setMaxRent(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Amenities Multi-select list */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Required Amenities (Suvidhayein)</label>
            <div className="flex flex-wrap gap-2.5" id="amenities-filters-container">
              {allAmenities.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                      isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center gap-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all"
            id="reset-filters-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear All
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md shadow-emerald-600/10 transition-all flex-1 text-center"
            id="apply-filters-btn"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
