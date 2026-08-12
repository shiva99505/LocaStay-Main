import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { NotificationCenter } from "./NotificationCenter";
import { Property, BookingRequest, User, RentRecord, PropertyType } from "../types";
import { 
  Search, SlidersHorizontal, MapPin, BadgePercent, ShieldCheck, Heart, 
  Sparkles, Check, Phone, Mail, Navigation, CreditCard, ChevronRight,
  ArrowLeft, Download, RefreshCw, X, MessageSquare, ListFilter, AlertCircle,
  Bell, User as UserIcon
} from "lucide-react";

import PropertyCard from "./PropertyCard";
import FiltersSheet from "./FiltersSheet";
import PropertyDetail from "./PropertyDetail";
import MyBookingsTab from "./MyBookingsTab";
import SavedPinsTab from "./SavedPinsTab";
import UserProfileTab from "./UserProfileTab";
import { useApp } from "../context/AppContext";

interface TenantDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate?: (user: User) => void;
}

export default function TenantDashboard({ currentUser, onLogout, onProfileUpdate }: TenantDashboardProps) {
  const { language, setLanguage, theme, setTheme, t } = useApp();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"browse" | "bookings" | "rent-records" | "notifs" | "saved-locations" | "profile">("browse");
  
  // Data States
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // UI states
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10); // Paginate 10 at a time

  // Searching & Filtering States
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem("locastay_search_query") || "";
  });
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(() => {
    try {
      const saved = localStorage.getItem("locastay_filter_types");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem("locastay_filter_city") || "all";
  });
  const [minRent, setMinRent] = useState<number>(() => {
    return Number(localStorage.getItem("locastay_filter_minRent")) || 0;
  });
  const [maxRent, setMaxRent] = useState<number>(() => {
    return Number(localStorage.getItem("locastay_filter_maxRent")) || 50000;
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("locastay_filter_amenities");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showFilters, setShowFilters] = useState(false);

  // Razorpay / Unlock Contact Modal States
  const [unlockingProperty, setUnlockingProperty] = useState<Property | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Rent Reporting Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingRecord, setReportingRecord] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<"UPI" | "Cash" | "Bank Transfer">("UPI");
  const [txId, setTxId] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Custom Toast State (No iframe-blocking alerts!)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // List of cities derived from data
  const [citiesList, setCitiesList] = useState<string[]>([]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Save filters to localStorage whenever they change to persist search
  useEffect(() => {
    localStorage.setItem("locastay_search_query", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem("locastay_filter_types", JSON.stringify(selectedTypes));
  }, [selectedTypes]);

  useEffect(() => {
    localStorage.setItem("locastay_filter_city", selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem("locastay_filter_minRent", minRent.toString());
  }, [minRent]);

  useEffect(() => {
    localStorage.setItem("locastay_filter_maxRent", maxRent.toString());
  }, [maxRent]);

  useEffect(() => {
    localStorage.setItem("locastay_filter_amenities", JSON.stringify(selectedAmenities));
  }, [selectedAmenities]);

  // Fetch all properties & metadata
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available properties
      const propertiesQuery = query(collection(db, "properties"), where("status", "==", "available"));
      const querySnapshot = await getDocs(propertiesQuery);
      const propertiesList: Property[] = [];
      querySnapshot.forEach((docSnap) => {
        const prop = docSnap.data() as Property;
        if (!prop.isDeleted) {
          propertiesList.push(prop);
        }
      });
      
      // Sort: Featured first, then by createdAt descending (Phase 3A Requirement)
      propertiesList.sort((a, b) => {
        const aFeatured = a.isFeatured && (!a.featuredUntil || new Date(a.featuredUntil) > new Date());
        const bFeatured = b.isFeatured && (!b.featuredUntil || new Date(b.featuredUntil) > new Date());
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setProperties(propertiesList);

      // Extract unique cities
      const cities = Array.from(new Set(propertiesList.map((p) => p.city))).filter(Boolean);
      setCitiesList(cities);

      // 2. Fetch user's booking requests
      const bookingsQuery = query(collection(db, "bookingRequests"), where("tenantId", "==", currentUser.uid));
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookingsList: BookingRequest[] = [];
      bookingsSnap.forEach((docSnap) => {
        bookingsList.push(docSnap.data() as BookingRequest);
      });
      setBookingRequests(bookingsList);

      // 3. Fetch user's rent records
      const rentQuery = query(collection(db, "rentRecords"), where("tenantId", "==", currentUser.uid));
      const rentSnap = await getDocs(rentQuery);
      const rentList: RentRecord[] = [];
      rentSnap.forEach((docSnap) => {
        rentList.push(docSnap.data() as RentRecord);
      });
      setRentRecords(rentList);

    } catch (err) {
      console.error("Error fetching tenant data:", err);
      showToast("Data fetch karne mein error aayi hai. Refresh karein.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.uid]);

  // Real-time onSnapshot listener for notifications
  useEffect(() => {
    if (!currentUser.uid) return;
    const notifsQuery = query(collection(db, "notifications"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(list);
    }, (err) => {
      console.error("Error in real-time notifications snapshot:", err);
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  // Mark notification read and auto-route
  const handleMarkReadAndNavigate = async (n: any) => {
    try {
      const nId = n.id || n.notificationId;
      if (nId) {
        await updateDoc(doc(db, "notifications", nId), {
          isRead: true,
          read: true
        });
      }
      
      if (n.type === "rent_due" || n.title.includes("Rent") || n.type === "receipt") {
        setActiveTab("rent-records");
      } else if (n.type === "booking_request" || n.title.includes("Booking")) {
        setActiveTab("bookings");
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  // Reset advanced filter controls
  const handleResetFilters = () => {
    setSelectedTypes([]);
    setSelectedCity("all");
    setMinRent(0);
    setMaxRent(50000);
    setSelectedAmenities([]);
    setSearchQuery("");
    showToast("Filters clear kar diye gaye hain.", "info");
  };

  // Filter properties in memory based on selection (Phase 3B Requirements)
  const filteredProperties = properties.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(p.type);
    const matchesCity = selectedCity === "all" || p.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesRent = p.rentAmount >= minRent && p.rentAmount <= maxRent;
    const matchesAmenities = selectedAmenities.every((amenity) => 
      p.amenities.some((a) => a.toLowerCase() === amenity.toLowerCase())
    );

    return matchesSearch && matchesType && matchesCity && matchesRent && matchesAmenities;
  });

  // Paginated View Slice (10 at a time)
  const paginatedProperties = filteredProperties.slice(0, displayLimit);
  const hasMoreProperties = filteredProperties.length > displayLimit;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  // Handle pay to unlock contact flow
  const handleUnlockContact = async (property: Property) => {
    setUnlockingProperty(property);
    setPaymentError("");
    setPaymentSuccess(false);
  };

  const handleRazorpayMockCheckout = async () => {
    if (!unlockingProperty) return;
    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      // 1. Create order on full-stack API server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          type: "contact_unlock",
          relatedPropertyId: unlockingProperty.propertyId,
          userId: currentUser.uid
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to initiate payment");
      }

      // Check if bookingRequest already exists, otherwise create one
      let bookingRequestId = "";
      const existingReq = bookingRequests.find(r => r.propertyId === unlockingProperty.propertyId);
      if (existingReq) {
        bookingRequestId = existingReq.requestId;
      } else {
        bookingRequestId = `req_${Math.random().toString(36).substring(2, 10)}`;
        const bookingReqDoc: BookingRequest = {
          requestId: bookingRequestId,
          propertyId: unlockingProperty.propertyId,
          tenantId: currentUser.uid,
          landlordId: unlockingProperty.landlordId,
          status: "pending",
          unlockedContact: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "bookingRequests", bookingRequestId), bookingReqDoc);
      }

      // 2. Mocking Razorpay JS Callback for signature verification
      const payDetails = {
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: `rzp_pay_${Math.random().toString(36).substring(2, 12)}`,
        razorpaySignature: "simulated_secure_signature",
        type: "contact_unlock",
        amount: 10,
        userId: currentUser.uid,
        relatedPropertyId: unlockingProperty.propertyId,
        bookingRequestId
      };

      // 3. Verify server-side signature
      const verifyRes = await fetch("/api/payments/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payDetails)
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || "Signature verification failed");
      }

      setPaymentSuccess(true);
      showToast("Contact Unlock Ho Gaya!", "success");
      
      // Update counts and fetch newest booking list
      await fetchData();

      // Trigger QR Scan or view tracking increment on server side
      await fetch("/api/properties/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: unlockingProperty.propertyId })
      });

    } catch (err: any) {
      setPaymentError(err.message || "Failed to process Razorpay payment");
      showToast("Razorpay connection issue. Kripya dubaara try karein.", "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Submit Rent self-report status pending Landlord Final confirmation
  const handleReportRentPaid = (record: any) => {
    setReportingRecord(record);
    setPaymentMode("UPI");
    setTxId("");
    setShowReportModal(true);
  };

  const handleSubmitRentPaidReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingRecord) return;
    setIsSubmittingReport(true);
    try {
      const rentRef = doc(db, "rentRecords", reportingRecord.rentId);
      
      const payload: any = {
        status: "pending_confirmation",
        paymentMode,
        reportedAt: new Date().toISOString()
      };
      if (txId.trim()) {
        payload.transactionId = txId;
      }
      
      await updateDoc(rentRef, payload);
      
      // Notify landlord via backend API for multi-channel support
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: reportingRecord.landlordId,
          title: "Rent Paid Self-Reported 💸",
          body: `Tenant ne ${reportingRecord.monthYear} ke liye rent payment self-report kiya hai via ${paymentMode}. Please check and mark paid to generate receipt.`,
          type: "rent_due"
        })
      });
      
      showToast("Rent paid report submit ho gayi hai. Makan Malik check karenge.", "success");
      setShowReportModal(false);
      setReportingRecord(null);
      setTxId("");
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast("Status update fail ho gaya.", "error");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            let val = row[fieldName] === undefined || row[fieldName] === null ? "" : row[fieldName];
            if (typeof val === "string") {
              val = val.replace(/"/g, '""');
              if (val.includes(",") || val.includes("\n") || val.includes('"')) {
                val = `"${val}"`;
              }
            }
            return val;
          })
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRentRecords = () => {
    const csvData = rentRecords.map((r) => {
      const prop = properties.find((p) => p.propertyId === r.propertyId);
      return {
        "Rent Record ID": r.rentId,
        "Property Name": prop ? prop.title : "Rental Unit",
        "Property ID": r.propertyId,
        "Month/Year": r.monthYear,
        "Amount Due": r.amountDue,
        "Due Date": r.dueDate,
        "Status": r.status,
        "Payment Mode": r.paymentMode || "N/A",
        "Transaction ID": r.transactionId || "N/A",
        "Reported At": r.reportedAt || "N/A",
        "Paid At": r.paidAt || "N/A",
        "Receipt URL": r.receiptUrl || "N/A"
      };
    });
    exportToCSV(csvData, `LocaStay_MyRentRecords_${new Date().toISOString().split("T")[0]}`);
  };

  // Request Booking if unlocked
  const handleRequestBooking = async (property: Property) => {
    try {
      const existingReq = bookingRequests.find(r => r.propertyId === property.propertyId);
      if (existingReq) {
        showToast("Aapki booking request pehle se pending state mein hai!", "info");
        return;
      }
      
      const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;
      const bookingReqDoc: BookingRequest = {
        requestId,
        propertyId: property.propertyId,
        tenantId: currentUser.uid,
        landlordId: property.landlordId,
        status: "pending",
        unlockedContact: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "bookingRequests", requestId), bookingReqDoc);
      
      // Add notification to landlord via backend API for multi-channel support
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: property.landlordId,
          title: "Nayi Booking Request! 🏠",
          body: `${currentUser.name} ne aapki property "${property.title}" ke liye booking request bheji hai.`,
          type: "booking_request"
        })
      });

      showToast("Booking request bhej di gayi hai!", "success");
      fetchData();
    } catch (err) {
      console.error("Error creating booking request:", err);
      showToast("Booking request fail ho gayi.", "error");
    }
  };

  // Check if a specific property's contact is unlocked for this tenant
  const isUnlocked = (propertyId: string) => {
    const booking = bookingRequests.find((b) => b.propertyId === propertyId);
    return booking ? booking.unlockedContact : false;
  };

  const getBookingStatus = (propertyId: string) => {
    const booking = bookingRequests.find((b) => b.propertyId === propertyId);
    return booking ? booking.status : undefined;
  };

  const handleSelectProperty = (prop: Property) => {
    setSelectedProperty(prop);
    setActiveTab("browse");
    fetch("/api/properties/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: prop.propertyId, tenantId: currentUser.uid })
    }).catch((err) => console.error("Error logging view count:", err));
  };

  // Count active filters for badge
  const activeFiltersCount = 
    (selectedCity !== "all" ? 1 : 0) + 
    selectedTypes.length + 
    (minRent > 0 || maxRent < 50000 ? 1 : 0) + 
    selectedAmenities.length;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 pb-20 animate-fade-in" id="tenant-dashboard">
      {/* Toast Alert Indicator */}
      {toastMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-bold transition-all animate-bounce ${
            toastType === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : toastType === "error"
              ? "bg-red-50 border-red-100 text-red-800"
              : "bg-blue-50 border-blue-100 text-blue-800"
          }`}
          id="custom-toast"
        >
          {toastType === "success" && <Check className="w-4 h-4 text-emerald-600" />}
          {toastType === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
          {toastType === "info" && <SlidersHorizontal className="w-4 h-4 text-blue-600" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Sub-header (Aesthetic Pairing with JetBrains Mono) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1F6F54] text-white rounded-xl p-2 font-bold text-sm tracking-tight shadow-md">
            LS
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">LocaStay Kirayedar</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono">Welcome, {currentUser.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Centralized real-time Notification Center */}
          <NotificationCenter
            userId={currentUser.uid}
            role="tenant"
            onNavigate={(tab) => {
              // Direct tab mapping
              if (tab === "rent-records") setActiveTab("rent-records");
              else if (tab === "bookings") setActiveTab("bookings");
              else setActiveTab("notifs");
            }}
            showToast={showToast}
          />

          {/* Refresh Action */}
          <button 
            onClick={fetchData} 
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors"
            title="Refresh Data"
            id="refresh-tenant-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          
          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3 py-2 border rounded-xl transition-all ${
              activeTab === "profile"
                ? "bg-[#1F6F54] text-white border-[#1F6F54] shadow-sm"
                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            id="profile-tenant-btn"
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t("nav.profile", "Profile")}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 mt-5">
        
        {/* Navigation Tabs (Mobile bottom rail styling optimized, desktop wrapping layout) */}
        {!selectedProperty && (
          <div 
            className="hidden md:flex flex-wrap gap-2 mb-6 bg-white dark:bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs" 
            id="tenant-nav-tabs"
            style={{ backgroundColor: "#ffffff" }}
          >
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex-1 min-w-[120px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
                activeTab === "browse"
                  ? "bg-[#1F6F54] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Search className="w-4 h-4 mr-1.5" />
              {t("nav.explore", "Explore")}
            </button>
            
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex-1 min-w-[120px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all relative ${
                activeTab === "bookings"
                  ? "bg-[#1F6F54] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              {t("nav.myBookings", "My Bookings")}
              {bookingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center">
                  {bookingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("rent-records")}
              className={`flex-1 min-w-[120px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all relative ${
                activeTab === "rent-records"
                  ? "bg-[#1F6F54] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              {t("nav.rentTracker", "Rent Tracker")}
              {rentRecords.some((r) => r.status === "pending" || r.status === "overdue") && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center animate-pulse">
                  !
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("notifs")}
              className={`flex-1 min-w-[120px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all relative ${
                activeTab === "notifs"
                  ? "bg-[#1F6F54] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Bell className="w-4 h-4 mr-1.5" />
              {t("nav.alerts", "Alerts")}
              {notifications.some((n) => !n.isRead) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center">
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("saved-locations")}
              className={`flex-1 min-w-[120px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all relative ${
                activeTab === "saved-locations"
                  ? "bg-[#1F6F54] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <MapPin className="w-4 h-4 mr-1.5" />
              {t("nav.savedPins", "Saved Pins")}
            </button>
          </div>
        )}

        {/* ==================== TAB 1: EXPLORE / BROWSE PROPERTIES ==================== */}
        {activeTab === "browse" && (
          <div className="space-y-6">
            {!selectedProperty ? (
              <>
                {/* Search & Sticky Filter bar Trigger */}
                <div className="flex flex-col md:flex-row gap-3 sticky top-[72px] z-30 bg-slate-50/90 backdrop-blur-sm py-2">
                  <div className="relative flex-1 shadow-xs rounded-2xl overflow-hidden">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Shehar ya mohalla search karein... (e.g. Jhansi, Alwar)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 text-xs font-semibold bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      id="search-input"
                    />
                  </div>
                  
                  <button
                    onClick={() => setShowFilters(true)}
                    className={`px-5 py-3.5 rounded-2xl border flex items-center justify-center text-xs font-bold gap-2 transition-all shadow-xs ${
                      activeFiltersCount > 0
                        ? "border-[#1F6F54] bg-[#1F6F54]/5 text-[#1F6F54]"
                        : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                    }`}
                    id="filter-toggle-btn"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filter Options
                    {activeFiltersCount > 0 && (
                      <span className="bg-[#1F6F54] text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Active Filter Chips Overlay */}
                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap gap-2 items-center pb-2" id="active-filter-chips-bar">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Active Filters:</span>
                    
                    {selectedCity !== "all" && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">
                        City: {selectedCity}
                        <button onClick={() => setSelectedCity("all")} className="p-0.5 hover:bg-emerald-100 rounded-md">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {selectedTypes.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">
                        Type: {t}
                        <button onClick={() => setSelectedTypes(selectedTypes.filter(x => x !== t))} className="p-0.5 hover:bg-emerald-100 rounded-md">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {(minRent > 0 || maxRent < 50000) && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">
                        Budget: ₹{minRent} - ₹{maxRent}
                        <button onClick={() => { setMinRent(0); setMaxRent(50000); }} className="p-0.5 hover:bg-emerald-100 rounded-md">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {selectedAmenities.map((am) => (
                      <span key={am} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">
                        Amenity: {am}
                        <button onClick={() => setSelectedAmenities(selectedAmenities.filter(x => x !== am))} className="p-0.5 hover:bg-emerald-100 rounded-md">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    <button 
                      onClick={handleResetFilters}
                      className="text-[10px] font-bold text-[#1F6F54] hover:underline px-2 py-1"
                    >
                      Clear All
                    </button>
                  </div>
                )}

                {/* Skeleton Loading State (Phase 3A Requirement) */}
                {loading && properties.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="skeleton-loading-grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs p-4 space-y-4">
                        <div className="aspect-[4/3] w-full bg-slate-200/60 rounded-2xl animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200/60 rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-slate-200/60 rounded w-1/2 animate-pulse" />
                        </div>
                        <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                          <div className="h-3 bg-slate-200/60 rounded w-1/4 animate-pulse" />
                          <div className="h-3 bg-slate-200/60 rounded w-1/5 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : paginatedProperties.length === 0 ? (
                  /* Empty state (Phase 3A Requirement) */
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-xs max-w-lg mx-auto space-y-4" id="empty-properties-view">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-700">Is area mein abhi koi property nahi mili</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Aapne jo filters select kiye hain unhe badal kar ya search query clear karke dubaara check karein.
                      </p>
                    </div>
                    <button
                      onClick={handleResetFilters}
                      className="bg-[#1F6F54] hover:bg-[#1a5d46] text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md transition-all outline-none"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  /* Standard Property Card Grid (Phase 3A Requirements) */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="properties-grid">
                      {paginatedProperties.map((p) => (
                        <PropertyCard 
                          key={p.propertyId} 
                          property={p} 
                          onSelect={handleSelectProperty} 
                        />
                      ))}
                    </div>

                    {/* Pagination Load More Button */}
                    {hasMoreProperties && (
                      <div className="text-center pt-4">
                        <button
                          onClick={handleLoadMore}
                          className="bg-white hover:bg-slate-50 text-[#1F6F54] border border-slate-200 font-bold text-xs py-3 px-8 rounded-2xl shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-1"
                          id="load-more-btn"
                        >
                          Load More Properties (More Listings)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ==================== SELECTED PROPERTY DETAIL VIEW ==================== */
              <PropertyDetail
                property={selectedProperty}
                currentUser={currentUser}
                isUnlocked={isUnlocked(selectedProperty.propertyId)}
                onBack={() => setSelectedProperty(null)}
                onUnlock={() => handleUnlockContact(selectedProperty)}
                onRequestBooking={() => handleRequestBooking(selectedProperty)}
                bookingStatus={getBookingStatus(selectedProperty.propertyId)}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* ==================== TAB 2: MY BOOKINGS ==================== */}
        {activeTab === "bookings" && (
          <MyBookingsTab
            bookingRequests={bookingRequests}
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onBrowseMore={() => setActiveTab("browse")}
          />
        )}

        {/* ==================== TAB 3: RENT TRACKER ==================== */}
        {activeTab === "rent-records" && (
          <div className="space-y-4 animate-fade-in" id="rent-tracker-container">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Rent Records & Receipts</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Track rent payments, reported modes, and download receipts</p>
              </div>
              {rentRecords.length > 0 && (
                <button
                  onClick={handleExportRentRecords}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-100 text-xs font-extrabold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              )}
            </div>
            
            {rentRecords.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Koi active rent records ya billing history nahi payi gayi hai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rentRecords.map((r) => {
                  const targetProp = properties.find((p) => p.propertyId === r.propertyId);
                  return (
                    <div 
                      key={r.rentId} 
                      className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:border-emerald-100/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 font-mono">{r.monthYear}</span>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                            r.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : r.status === "overdue"
                              ? "bg-red-50 text-red-700 border-red-100 animate-pulse"
                              : r.status === "pending_confirmation"
                              ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {r.status === "pending_confirmation" ? "reporting paid" : r.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-600">
                          {targetProp ? targetProp.title : "Rental Unit"}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Amount Due: <span className="font-bold text-slate-700">₹{r.amountDue}</span> | Due Date: <span className="font-semibold">{r.dueDate}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.status === "pending_confirmation" ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-100">
                            Awaiting verification...
                          </span>
                        ) : r.status !== "paid" ? (
                          <button
                            onClick={() => handleReportRentPaid(r)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs outline-none"
                          >
                            Report Paid
                          </button>
                        ) : (
                          r.receiptUrl ? (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Download Receipt
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                              Awaiting receipt link...
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: ALERTS / NOTIFICATIONS ==================== */}
        {activeTab === "notifs" && (
          <div className="space-y-4 animate-fade-in" id="alerts-container">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Latest Alerts & Activity</h2>
            
            {notifications.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Aapke paas koi alerts nahi hain.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div 
                    key={n.notificationId} 
                    onClick={() => handleMarkReadAndNavigate(n)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-emerald-200 hover:shadow-xs ${
                      n.isRead ? "bg-white border-slate-100 text-slate-600" : "bg-emerald-50/25 border-emerald-100 text-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        {!n.isRead && <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse shrink-0" />}
                        <h4 className="text-xs font-bold">{n.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded shrink-0">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{n.body}</p>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span className="text-[9px] font-mono font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {n.type || "ALERT"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Click to action & mark read
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: SAVED LOCATIONS / PINS ==================== */}
        {activeTab === "saved-locations" && (
          <SavedPinsTab
            currentUser={currentUser}
            allProperties={properties}
            onSelectProperty={handleSelectProperty}
            showToast={showToast}
          />
        )}

        {/* ==================== TAB 6: PROFILE & APP SETTINGS ==================== */}
        {activeTab === "profile" && (
          <UserProfileTab
            currentUser={currentUser}
            onLogout={onLogout}
            role="tenant"
            onProfileUpdate={onProfileUpdate}
          />
        )}
      </div>

      {/* Advanced Filters Overlay Sheet Drawer (collapsible bottom drawer) */}
      <FiltersSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        citiesList={citiesList}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        minRent={minRent}
        setMinRent={setMinRent}
        maxRent={maxRent}
        setMaxRent={setMaxRent}
        selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
        onReset={handleResetFilters}
      />

      {/* Razorpay Unlock Payment Modal Simulation */}
      {unlockingProperty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="razorpay-unlock-modal">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setUnlockingProperty(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="bg-[#1F6F54] text-white p-6 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-90 animate-pulse" />
              <h3 className="text-base font-bold">Secure Razorpay Gateway</h3>
              <p className="text-xs text-emerald-100 mt-0.5">LocaStay Premium Safety Protocol</p>
            </div>

            <div className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs rounded-xl font-medium">
                  {paymentError}
                </div>
              )}

              {paymentSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Payment Completed!</h4>
                  <p className="text-xs text-slate-500">
                    Makan Malik ka Mobile number unlock ho chuka hai! Please check details on the property detail page or bookings tab.
                  </p>
                  <button
                    onClick={() => {
                      setUnlockingProperty(null);
                      fetchData();
                    }}
                    className="w-full bg-[#1F6F54] text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all outline-none"
                  >
                    View Details
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Unlock Contact Fee</span>
                      <span>₹10.00</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Convenience Tax</span>
                      <span>₹0.00</span>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2 flex justify-between text-xs font-bold text-slate-800">
                      <span>Total Amount</span>
                      <span className="text-emerald-700">₹10.00</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    By clicking continue, you initiate standard Razorpay Node Checkout simulation logic. Real payments logs are written directly to Cloud Firestore `/payments`.
                  </p>

                  <button
                    onClick={handleRazorpayMockCheckout}
                    disabled={isProcessingPayment}
                    className="w-full bg-[#1F6F54] hover:bg-[#1a5d46] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isProcessingPayment ? "Connecting Razorpay..." : "Pay ₹10 with Razorpay"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tenant Self-Report Payment Modal */}
      {showReportModal && reportingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="report-payment-modal">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button
              onClick={() => {
                setShowReportModal(false);
                setReportingRecord(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-[#1F6F54] text-white p-6 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-90" />
              <h3 className="text-base font-black uppercase tracking-wide">Rent Payment Report Karein</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Report your payment to Landlord for verification</p>
            </div>

            <form onSubmit={handleSubmitRentPaidReport} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Aap <strong>{reportingRecord.monthYear}</strong> ke rent payment (₹{reportingRecord.amountDue}) ko self-report kar rahe hain. Landlord verification ke baad official receipt banegi.
              </p>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["UPI", "Cash", "Bank Transfer"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        paymentMode === mode
                          ? "bg-emerald-50 text-emerald-700 border-emerald-600"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                  Transaction ID / Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="E.g. UPI Txn ID, bank ref..."
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportingRecord(null);
                  }}
                  className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-1/2 py-3 bg-[#1F6F54] hover:bg-[#1a5d46] text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-emerald-700/10 flex items-center justify-center"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar for Mobile Viewports */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around items-center shadow-lg md:hidden">
        <button
          onClick={() => { setSelectedProperty(null); setActiveTab("browse"); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all ${
            activeTab === "browse" ? "text-[#1F6F54] dark:text-emerald-400 font-extrabold" : "text-slate-400"
          }`}
        >
          <Search className="w-5 h-5" />
          <span>{t("nav.explore", "Explore")}</span>
        </button>

        <button
          onClick={() => { setSelectedProperty(null); setActiveTab("bookings"); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all relative ${
            activeTab === "bookings" ? "text-[#1F6F54] dark:text-emerald-400 font-extrabold" : "text-slate-400"
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>{t("nav.myBookings", "Bookings")}</span>
          {bookingRequests.length > 0 && (
            <span className="absolute top-1 right-2 bg-amber-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
              {bookingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedProperty(null); setActiveTab("rent-records"); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all relative ${
            activeTab === "rent-records" ? "text-[#1F6F54] dark:text-emerald-400 font-extrabold" : "text-slate-400"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>{t("nav.rentTracker", "Rent")}</span>
        </button>

        <button
          onClick={() => { setSelectedProperty(null); setActiveTab("notifs"); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all relative ${
            activeTab === "notifs" ? "text-[#1F6F54] dark:text-emerald-400 font-extrabold" : "text-slate-400"
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>{t("nav.alerts", "Alerts")}</span>
          {notifications.some((n) => !n.isRead) && (
            <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
              !
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedProperty(null); setActiveTab("saved-locations"); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all ${
            activeTab === "saved-locations" ? "text-[#1F6F54] dark:text-emerald-400 font-extrabold" : "text-slate-400"
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>{t("nav.savedPins", "Saved")}</span>
        </button>
      </div>
    </div>
  );
}
