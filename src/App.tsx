import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import TenantDashboard from "./components/TenantDashboard";
import LandlordDashboard from "./components/LandlordDashboard";
import AdminDashboard from "./components/AdminDashboard";
import PropertyDetail from "./components/PropertyDetail";
import { User, UserRole, Property, BookingRequest } from "./types";
import { Sparkles, Users, UserCheck, ShieldAlert, ArrowRight, Home, CreditCard, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authActionPending, setAuthActionPending] = useState(false);

  // Public/Anonymous Property Detail States
  const [publicPropertyId, setPublicPropertyId] = useState<string | null>(null);
  const [publicProperty, setPublicProperty] = useState<Property | null>(null);
  const [publicPropertyLoading, setPublicPropertyLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string | undefined>(undefined);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Monitor user session via localStorage for sandbox robustness
  useEffect(() => {
    const savedUser = localStorage.getItem("locastay_user");
    const savedToken = localStorage.getItem("locastay_token");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Error loading saved user session:", err);
      }
    }
    if (savedToken && !savedToken.startsWith("bypass_token_")) {
      signInWithCustomToken(auth, savedToken).catch(err => {
        console.error("Auto custom token authentication failed:", err);
      });
    }
    setLoading(false);
  }, []);

  // Check for public property URL routing
  useEffect(() => {
    const match = window.location.pathname.match(/\/property\/([a-zA-Z0-9_-]+)/);
    const queryParams = new URLSearchParams(window.location.search);
    const propId = match ? match[1] : queryParams.get("propertyId");
    
    if (propId) {
      setPublicPropertyId(propId);
      trackScanAndView(propId);
    }
  }, [currentUser]);

  const trackScanAndView = async (propId: string) => {
    const queryParams = new URLSearchParams(window.location.search);
    const isQr = queryParams.get("source") === "qr";
    
    // 1. Log property view count
    try {
      await fetch("/api/properties/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: propId,
          tenantId: currentUser?.uid || null
        })
      });
    } catch (e) {
      console.error("View tracking error:", e);
    }

    // 2. Log QR Scan if source=qr
    if (isQr) {
      try {
        await fetch("/api/properties/scan-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: propId })
        });
      } catch (e) {
        console.error("Scan tracking error:", e);
      }
    }
  };

  // Fetch public property detail if publicPropertyId changes
  useEffect(() => {
    if (!publicPropertyId) {
      setPublicProperty(null);
      return;
    }

    const fetchPublicProperty = async () => {
      setPublicPropertyLoading(true);
      try {
        const docRef = doc(db, "properties", publicPropertyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Property;
          if (data && data.isDeleted) {
            console.warn("Public property has been deleted");
            setPublicProperty(null);
          } else {
            setPublicProperty({ propertyId: docSnap.id, ...data } as Property);
          }
        } else {
          console.warn("Public property not found");
        }
      } catch (err) {
        console.error("Error fetching public property:", err);
      } finally {
        setPublicPropertyLoading(false);
      }
    };

    fetchPublicProperty();
  }, [publicPropertyId]);

  // Check contact unlock state for publicProperty & currentUser
  useEffect(() => {
    if (!publicProperty || !currentUser) {
      setIsUnlocked(false);
      setBookingStatus(undefined);
      return;
    }

    const checkUnlockStatus = async () => {
      try {
        const q = query(
          collection(db, "bookingRequests"),
          where("propertyId", "==", publicProperty.propertyId),
          where("tenantId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setIsUnlocked(data.unlockedContact || false);
          setBookingStatus(data.status);
        } else {
          setIsUnlocked(false);
          setBookingStatus(undefined);
        }
      } catch (err) {
        console.error("Unlock check error:", err);
      }
    };

    checkUnlockStatus();
  }, [publicProperty, currentUser]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("locastay_user");
      localStorage.removeItem("locastay_token");
      setCurrentUser(null);
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  // Quick bypass logger for testing in AI Studio using secure server-side custom token & user profile fetching
  const handleQuickLogin = async (role: UserRole) => {
    if (authActionPending) return;
    setAuthActionPending(true);
    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isSandbox: true,
          targetRole: role
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        let errText = "Sandbox custom token generation failed";
        if (contentType?.includes("application/json")) {
          try {
            const errData = await response.json();
            errText = errData.error || errText;
          } catch (_) {}
        }
        throw new Error(errText);
      }

      const { token, user } = await response.json();
      if (user) {
        localStorage.setItem("locastay_user", JSON.stringify(user));
        if (token) {
          localStorage.setItem("locastay_token", token);
          if (!token.startsWith("bypass_token_")) {
            await signInWithCustomToken(auth, token);
          } else {
            const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
            const fallbackEmail = user.email || `${user.role || "tenant"}@locastay.com`;
            const fallbackPassword = user.password || "Password123";
            try {
              await signInWithEmailAndPassword(auth, fallbackEmail, fallbackPassword);
            } catch (signInErr: any) {
              if (
                signInErr.code === "auth/user-not-found" ||
                signInErr.code === "auth/invalid-credential" ||
                signInErr.code === "auth/invalid-login" ||
                signInErr.message?.includes("not-found") ||
                signInErr.message?.includes("invalid-credential")
              ) {
                try {
                  await createUserWithEmailAndPassword(auth, fallbackEmail, fallbackPassword);
                } catch (signUpErr) {
                  console.error("Failed to register fallback sandbox user in Firebase Auth:", signUpErr);
                }
              } else {
                console.error("Failed to sign in fallback sandbox user:", signInErr);
              }
            }
          }
        }
        setCurrentUser(user);
      } else {
        throw new Error("No user profile returned from sandbox server.");
      }
    } catch (err: any) {
      console.error("Sandbox quick login bypass failed:", err);
    } finally {
      setAuthActionPending(false);
    }
  };

  const handleUnlockPublicProperty = () => {
    if (!currentUser) {
      alert("Owner contact details dekhne aur booking request bhejne ke liye, kripya pehle upar login/signup karein!");
      return;
    }
    if (currentUser.role !== "tenant") {
      alert("Makan Malik ke details unlock karne ke liye kripya tenant account se log in karein.");
      return;
    }
    setUnlockModalOpen(true);
  };

  const confirmUnlockPayment = async () => {
    if (!publicProperty || !currentUser) return;
    setIsUnlocking(true);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          type: "contact_unlock",
          relatedPropertyId: publicProperty.propertyId,
          userId: currentUser.uid
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error);

      const bookingRequestId = `req_${Math.random().toString(36).substring(2, 10)}`;
      const bookingReqDoc = {
        requestId: bookingRequestId,
        propertyId: publicProperty.propertyId,
        tenantId: currentUser.uid,
        landlordId: publicProperty.landlordId,
        status: "pending",
        unlockedContact: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "bookingRequests", bookingRequestId), bookingReqDoc);

      const payDetails = {
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: `rzp_pay_${Math.random().toString(36).substring(2, 12)}`,
        razorpaySignature: "simulated_secure_signature",
        type: "contact_unlock",
        amount: 10,
        userId: currentUser.uid,
        relatedPropertyId: publicProperty.propertyId,
        bookingRequestId
      };

      const verifyRes = await fetch("/api/payments/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payDetails)
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error);

      setIsUnlocked(true);
      setBookingStatus("pending");
      setUnlockModalOpen(false);
      alert("Owner contact details unlocked successfully! Aap unse direct baat kar sakte hain.");
    } catch (err: any) {
      console.error(err);
      alert("Payment fail ho gaya: " + err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRequestBookingPublic = async () => {
    if (!publicProperty || !currentUser) return;
    try {
      const q = query(
        collection(db, "bookingRequests"),
        where("propertyId", "==", publicProperty.propertyId),
        where("tenantId", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      
      let requestId = `req_${Math.random().toString(36).substring(2, 10)}`;
      if (!snap.empty) {
        requestId = snap.docs[0].id;
        await setDoc(doc(db, "bookingRequests", requestId), {
          status: "pending",
          unlockedContact: true
        }, { merge: true });
      } else {
        const bookingReqDoc = {
          requestId,
          propertyId: publicProperty.propertyId,
          tenantId: currentUser.uid,
          landlordId: publicProperty.landlordId,
          status: "pending",
          unlockedContact: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "bookingRequests", requestId), bookingReqDoc);
      }

      // Add notification to landlord
      const notifId = `not_${Math.random().toString(36).substring(2, 10)}`;
      await setDoc(doc(db, "notifications", notifId), {
        notificationId: notifId,
        userId: publicProperty.landlordId,
        title: "Nayi Booking Request! 🏠",
        body: `${currentUser.name} ne aapki property "${publicProperty.title}" ke liye booking request bheji hai.`,
        type: "booking_request",
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setBookingStatus("pending");
      alert("Booking request bhej di gayi hai! Landlord aapse coordinate karenge.");
    } catch (err) {
      console.error(err);
      alert("Booking request fail ho gayi.");
    }
  };

  const handleBackFromPublicProperty = () => {
    setPublicProperty(null);
    setPublicPropertyId(null);
    window.history.pushState({}, "", "/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans" id="loading-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Securing connection to LocaStay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between relative" id="app-root">
      
      {/* Top Main Brand Cover / Quick Sandbox Bypass Switcher */}
      {!currentUser && (
        <div className="w-full max-w-lg mx-auto px-4 mt-6" id="quick-login-header">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-3xl shadow-md text-center space-y-3 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-100 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-100">AI Studio Sandbox Simulator</span>
            </div>
            
            <h3 className="text-sm font-extrabold">Instant Testing Quick Login Bypass</h3>
            <p className="text-xs text-amber-50 leading-relaxed">
              Standard Firebase Firestore data is pre-seeded! Pick a role below to log in instantly without waiting for mobile SMS OTP code:
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1" id="quick-action-buttons">
              <button
                onClick={() => handleQuickLogin("tenant")}
                className="bg-white hover:bg-slate-100 text-slate-800 font-bold py-2 rounded-xl text-[10px] flex flex-col items-center justify-center gap-1 transition-colors border border-amber-200/40"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Tenant View
              </button>
              <button
                onClick={() => handleQuickLogin("landlord")}
                className="bg-white hover:bg-slate-100 text-slate-800 font-bold py-2 rounded-xl text-[10px] flex flex-col items-center justify-center gap-1 transition-colors border border-amber-200/40"
              >
                <Home className="w-4 h-4 text-emerald-700" />
                Landlord View
              </button>
              <button
                onClick={() => handleQuickLogin("admin")}
                className="bg-white hover:bg-slate-100 text-slate-800 font-bold py-2 rounded-xl text-[10px] flex flex-col items-center justify-center gap-1 transition-colors border border-amber-200/40"
              >
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dashboards Routing */}
      <main className="flex-grow flex items-center justify-center w-full px-4 sm:px-6">
        {publicPropertyLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading public property details...</p>
          </div>
        ) : publicProperty ? (
          <div className="w-full py-6">
            <PropertyDetail
              property={publicProperty}
              currentUser={currentUser}
              isUnlocked={isUnlocked}
              onBack={handleBackFromPublicProperty}
              onUnlock={handleUnlockPublicProperty}
              onRequestBooking={handleRequestBookingPublic}
              bookingStatus={bookingStatus}
            />
          </div>
        ) : !currentUser ? (
          <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />
        ) : currentUser.role === "admin" ? (
          <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
        ) : currentUser.role === "landlord" ? (
          <LandlordDashboard currentUser={currentUser} onLogout={handleLogout} onProfileUpdate={(user) => setCurrentUser(user)} />
        ) : (
          <TenantDashboard currentUser={currentUser} onLogout={handleLogout} onProfileUpdate={(user) => setCurrentUser(user)} />
        )}
      </main>

      {/* Mock Razorpay Contact Unlock Payment Modal */}
      {unlockModalOpen && publicProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 shadow-2xl p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl font-bold text-xs">
                  LS
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Secure Razorpay Gateway</h3>
                  <span className="text-[9px] text-slate-400 font-mono">Order: ORDER_{Math.random().toString(36).substring(3,9).toUpperCase()}</span>
                </div>
              </div>
              <button 
                onClick={() => setUnlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
              >
                Cancel
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5 text-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Amount to Pay</span>
              <div className="text-2xl font-black text-slate-800 mt-1">₹10.00</div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50/60 border border-emerald-100 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-block">
                Direct Contact Unlock Fee
              </span>
            </div>

            <div className="space-y-3.5 mb-6 text-xs text-slate-500">
              <div className="flex justify-between items-center">
                <span>Property Unit:</span>
                <span className="font-bold text-slate-700 truncate max-w-[200px]">{publicProperty.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Landlord Ref:</span>
                <span className="font-mono text-slate-700">{publicProperty.landlordId.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Gateway Status:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  ● Ready
                </span>
              </div>
            </div>

            <button
              onClick={confirmUnlockPayment}
              disabled={isUnlocking}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isUnlocking ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Payment...
                </>
              ) : (
                "Mock Pay ₹10 Securely"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Humble Footer */}
      <footer className="w-full text-center py-5 border-t border-slate-100 bg-white/60">
        <p className="text-xs text-slate-400 font-mono">
          LocaStay Real Production Rental Platform © 2026. Made in India.
        </p>
      </footer>
    </div>
  );
}
