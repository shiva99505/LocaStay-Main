import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion,
  getDoc
} from "firebase/firestore";
import { 
  Bell, 
  Check, 
  X, 
  Sparkles, 
  AlertCircle, 
  Settings, 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationCenterProps {
  userId: string;
  role: "tenant" | "landlord";
  onNavigate: (tab: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function NotificationCenter({ userId, role, onNavigate, showToast }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFcmprompt, setShowFcmprompt] = useState(false);
  const [preferences, setPreferences] = useState({ notifyPush: true, notifyWhatsApp: true });
  
  // Active slide-in push alert simulation state
  const [activePushAlert, setActivePushAlert] = useState<any | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  // 1. Listen for in-app Notifications in Real-time via onSnapshot
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });

        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        // Push notification simulation trigger:
        // If a brand new notification arrives (created in last 10 seconds) and was not there before
        if (hasMounted.current && list.length > 0) {
          const newest = list[0];
          const isNew = (Date.now() - new Date(newest.createdAt).getTime()) < 10000;
          const isUnread = !newest.isRead;
          
          // Check if this notification was already shown or processed
          const alreadyKnown = notifications.some(n => n.notificationId === newest.notificationId);
          
          if (isNew && isUnread && !alreadyKnown && preferences.notifyPush) {
            // Trigger visual Push Notification Alert box
            setActivePushAlert(newest);
            // Auto hide after 5 seconds
            setTimeout(() => {
              setActivePushAlert((current) => current?.notificationId === newest.notificationId ? null : current);
            }, 6000);
          }
        }

        setNotifications(list);
        hasMounted.current = true;
      },
      (err) => {
        console.error("Real-time notifications fetch failed:", err);
      }
    );

    return () => unsubscribe();
  }, [userId, preferences.notifyPush]);

  // 2. Fetch User Profile to get Notification Preferences & check FCM status
  useEffect(() => {
    if (!userId) return;

    const fetchPreferences = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", userId));
        if (uDoc.exists()) {
          const data = uDoc.data();
          setPreferences({
            notifyPush: data.notifyPush !== false,
            notifyWhatsApp: data.notifyWhatsApp !== false
          });

          // Show FCM registration prompt if they haven't made a choice yet
          const fcmChoice = localStorage.getItem(`fcm_prompt_choice_${userId}`);
          if (!fcmChoice && !data.fcmTokens?.length) {
            // Delay slightly to prevent jarring UX on immediate boot
            setTimeout(() => {
              setShowFcmprompt(true);
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      }
    };

    fetchPreferences();
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 3. Mark Notification as Read & Navigate to Related Context
  const handleNotificationClick = async (n: any) => {
    setIsOpen(false);
    try {
      // Update both read and isRead in Firestore for absolute safety and backward compatibility
      const nRef = doc(db, "notifications", n.id || n.notificationId);
      await updateDoc(nRef, {
        isRead: true,
        read: true
      });

      // Handle navigation routing based on notification type/actionUrl
      if (role === "tenant") {
        if (n.type === "rent_due" || n.title.includes("Rent") || n.type === "receipt") {
          onNavigate("rent-records");
        } else if (n.type === "booking_request" || n.title.includes("Booking")) {
          onNavigate("bookings");
        }
      } else if (role === "landlord") {
        if (n.type === "rent_due" || n.title.includes("Rent") || n.type === "receipt") {
          onNavigate("tracker");
        } else if (n.type === "booking_request" || n.title.includes("Booking")) {
          onNavigate("bookings");
        }
      }
    } catch (err) {
      console.error("Error updating notification status:", err);
    }
  };

  // 4. Mark All as Read
  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.isRead);
      for (const n of unreadList) {
        await updateDoc(doc(db, "notifications", n.id || n.notificationId), {
          isRead: true,
          read: true
        });
      }
      showToast("Sabhi notifications padhe hue mark kar diye gaye hain.", "success");
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  // 5. Save Updated Preferences in Firestore User Document
  const handleTogglePreference = async (key: "notifyPush" | "notifyWhatsApp") => {
    const updatedVal = !preferences[key];
    const newPrefs = { ...preferences, [key]: updatedVal };
    setPreferences(newPrefs);

    try {
      await updateDoc(doc(db, "users", userId), {
        [key]: updatedVal
      });
      showToast(
        `${key === "notifyPush" ? "Push Notification" : "WhatsApp alert"} preference update ho gayi hai!`,
        "success"
      );
    } catch (err) {
      console.error("Preference update error:", err);
      showToast("Preference save karne mein error aayi.", "error");
    }
  };

  // 6. Simulate FCM Token Permission Request and registration
  const handleGrantFcmPermission = async () => {
    setShowFcmprompt(false);
    localStorage.setItem(`fcm_prompt_choice_${userId}`, "allow");
    
    try {
      // Simulate token generation
      const mockToken = `fcm_web_tok_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString().slice(-4)}`;
      
      // Register device token in user's fcmTokens array and activate push prefs
      await updateDoc(doc(db, "users", userId), {
        fcmTokens: arrayUnion(mockToken),
        notifyPush: true
      });

      setPreferences(prev => ({ ...prev, notifyPush: true }));
      showToast("Real-time Push Notifications activate ho chuki hain! 🔔", "success");
      
      // Send welcoming simulation push notification immediately
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Alerts Activated! 🔔",
          body: "LocaStay has successfully linked this browser session. Live updates and reminders will reach you instantly.",
          type: "system"
        })
      });
    } catch (err) {
      console.error("FCM registration error:", err);
      showToast("Notification settings setup fail ho gaya.", "error");
    }
  };

  const handleDenyFcmPermission = () => {
    setShowFcmprompt(false);
    localStorage.setItem(`fcm_prompt_choice_${userId}`, "deny");
    showToast("Aapne alerts block kiye hain. In-app bell list check karte rahein.", "info");
  };

  // Helper for relative timestamps
  function getRelativeTime(timestampStr: string) {
    if (!timestampStr) return "Some time ago";
    const now = new Date();
    const past = new Date(timestampStr);
    const diffMs = now.getTime() - past.getTime();
    
    if (diffMs < 60000) return "Just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }

  return (
    <div className="relative" ref={dropdownRef} id="locastay-notification-center">
      {/* 1. Header Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all focus:outline-none"
        title="Alerts & Notifications"
        id="header-notification-bell-btn"
      >
        <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white font-extrabold rounded-full text-[8px] w-4.5 h-4.5 flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 2. Notification Center Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
            id="notification-bell-dropdown"
          >
            {/* Dropdown Header */}
            <div className="bg-[#1F6F54] text-white px-4 py-3.5 flex justify-between items-center border-b border-emerald-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-emerald-200" />
                <h3 className="text-xs font-black uppercase tracking-wider">Alerts & Logs</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors ${showSettings ? "bg-emerald-900" : ""}`}
                  title="Notification Preferences"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dropdown Content Area */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {showSettings ? (
                // Notification Preferences Inside Dropdown
                <div className="p-5 space-y-4 animate-fade-in">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-[#1F6F54]" /> Notification Prefs
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Turn channels on/off. Transactional alerts are always active.
                  </p>

                  <div className="space-y-3 pt-2">
                    {/* Channel 1: In-App (always on) */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          In-App Notifications
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Core database alert logs</p>
                      </div>
                      <span className="bg-emerald-50 text-[#1F6F54] text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase border border-emerald-100">
                        Always On
                      </span>
                    </div>

                    {/* Channel 2: Push Notifications (FCM) */}
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-slate-500" /> Push Alerts (FCM)
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Real-time browser notifications</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("notifyPush")}
                        className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                          preferences.notifyPush ? "bg-emerald-600 flex justify-end" : "bg-slate-200 flex justify-start"
                        }`}
                      >
                        <motion.span layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>

                    {/* Channel 3: WhatsApp Alerts */}
                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Updates
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Primary channel for critical alerts</p>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("notifyWhatsApp")}
                        className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                          preferences.notifyWhatsApp ? "bg-[#1F6F54] flex justify-end" : "bg-slate-200 flex justify-start"
                        }`}
                      >
                        <motion.span layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all uppercase tracking-wider"
                  >
                    Back to Alerts
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                // Empty Notifications State
                <div className="p-8 text-center space-y-2">
                  <Bell className="w-10 h-10 text-slate-200 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-700">Koi naya update nahi mila</h4>
                  <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
                    Makan Malik/Tenant ki updates, booking results ya receipts yahan dikhayi degi.
                  </p>
                </div>
              ) : (
                // Notifications List
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.notificationId}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer relative flex gap-3 ${
                        n.isRead ? "bg-white" : "bg-emerald-50/15"
                      }`}
                    >
                      {/* Read/Unread state Dot */}
                      {!n.isRead && (
                        <span className="absolute top-4 right-4 w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                      )}
                      
                      <div className="flex-1 space-y-1 pr-4">
                        <div className="flex justify-between items-baseline gap-1.5">
                          <span className={`text-xs font-bold ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                            {n.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">{n.body}</p>
                        
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {n.type || "ALERT"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {getRelativeTime(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Footer Actions */}
            {!showSettings && notifications.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex justify-between items-center text-[10px] font-extrabold uppercase text-[#1F6F54] tracking-wide">
                <button 
                  onClick={handleMarkAllRead} 
                  className="hover:text-emerald-800 transition-colors"
                >
                  Mark All Read
                </button>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate(role === "tenant" ? "notifs" : "tracker");
                  }}
                  className="flex items-center gap-0.5 hover:text-emerald-800 transition-colors"
                >
                  View All Alerts <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Simulated Desktop Push Notification Slide-in Toast Card */}
      <AnimatePresence>
        {activePushAlert && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-6 right-6 z-50 w-80 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 flex gap-3 cursor-pointer"
            onClick={() => {
              handleNotificationClick(activePushAlert);
              setActivePushAlert(null);
            }}
            id="fcm-mock-push-alert"
          >
            <div className="bg-emerald-500 rounded-xl p-2 h-fit shrink-0 flex items-center justify-center text-white">
              <Bell className="w-4 h-4 animate-swing" />
            </div>
            
            <div className="flex-1 space-y-0.5 text-left pr-4 relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePushAlert(null);
                }}
                className="absolute -top-1 -right-2 text-slate-400 hover:text-white p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <span className="text-[9px] font-bold font-mono tracking-wider text-emerald-400 uppercase flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> Push Alert Simulated (FCM)
              </span>
              <h4 className="text-xs font-black tracking-tight">{activePushAlert.title}</h4>
              <p className="text-[11px] text-slate-300 leading-normal line-clamp-2">{activePushAlert.body}</p>
              <p className="text-[8px] text-slate-500 font-semibold pt-1">Click to review or manage</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Beautiful FCM Opt-in Permission Request Modal Overlay */}
      <AnimatePresence>
        {showFcmprompt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="fcm-permission-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4"
            >
              <div className="bg-emerald-50 text-[#1F6F54] border border-emerald-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto shadow-xs">
                <Bell className="w-7 h-7 animate-swing" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-black text-[#1F6F54] uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Real-time alerts
                </span>
                <h3 className="text-base font-black text-slate-800 tracking-tight mt-1">LocaStay alerts activate karein?</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Ghar ki updates, rent payment receipts, auto reminders aur booking confirmations aapko turant mobile aur computer par push notifications ke zariye milenge.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDenyFcmPermission}
                  className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase transition-all"
                >
                  Not Now
                </button>
                <button
                  onClick={handleGrantFcmPermission}
                  className="w-1/2 py-3 bg-[#1F6F54] hover:bg-[#1a5d46] text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-emerald-700/10 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Enable Alerts
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
