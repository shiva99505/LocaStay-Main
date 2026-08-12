import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { User, UserRole } from "../types";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Languages, 
  Bell, 
  Upload, 
  LogOut, 
  Save, 
  Check, 
  AlertCircle, 
  Calendar, 
  MessageSquare,
  Sparkles
} from "lucide-react";

interface UserProfileTabProps {
  currentUser: User;
  onLogout: () => void;
  role: "tenant" | "landlord" | "admin";
  onProfileUpdate?: (updatedUser: User) => void;
}

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
];

export default function UserProfileTab({ currentUser, onLogout, role, onProfileUpdate }: UserProfileTabProps) {
  const { language, setLanguage, theme, setTheme, t } = useApp();

  const [name, setName] = useState(currentUser.name || "");
  const [email, setEmail] = useState(currentUser.email || "");
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl || "");
  
  // Notification States
  const [notifyPush, setNotifyPush] = useState(currentUser.notifyPush !== false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(currentUser.notifyWhatsApp !== false);
  const [notifyEmail, setNotifyEmail] = useState(currentUser.notifyEmail !== false);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    setName(currentUser.name || "");
    setEmail(currentUser.email || "");
    setPhotoUrl(currentUser.photoUrl || "");
    setNotifyPush(currentUser.notifyPush !== false);
    setNotifyWhatsApp(currentUser.notifyWhatsApp !== false);
    setNotifyEmail(currentUser.notifyEmail !== false);
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSaving(true);

    try {
      // Client-side validations
      if (!name || name.trim().length === 0) {
        throw new Error(t("profile.nameRequired", "Name cannot be empty."));
      }
      if (name.length > 100) {
        throw new Error(t("profile.nameTooLong", "Name must not exceed 100 characters."));
      }
      
      if (email && email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error(t("profile.invalidEmail", "Please enter a valid email address."));
        }
        if (email.length > 100) {
          throw new Error(t("profile.emailTooLong", "Email must not exceed 100 characters."));
        }
      }

      setSuccessMsg(t("profile.saveSuccess", "Profile updated successfully!"));
      
      // Update locally
      const updatedUser: User = {
        ...currentUser,
        name: name.trim(),
        email: email ? email.trim() : "",
        photoUrl: photoUrl,
        notifyPush: !!notifyPush,
        notifyWhatsApp: !!notifyWhatsApp,
        notifyEmail: !!notifyEmail
      };
      
      localStorage.setItem("locastay_user", JSON.stringify(updatedUser));
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }

      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = (url: string) => {
    setPhotoUrl(url);
    setShowAvatarSelector(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formattedDate = currentUser.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString(language === "en" ? "en-US" : "hi-IN", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : "-";

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="user-profile-tab-container">
      {/* Upper Profile Display Card */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 relative overflow-hidden transition-all">
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#1F6F54] to-[#2a8f6d] opacity-90" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-left pt-6">
          {/* Avatar Area */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white flex items-center justify-center shadow-md relative">
              {photoUrl ? (
                <img referrerPolicy="no-referrer" src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-[#1F6F54]" />
              )}
            </div>
            
            <button
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              type="button"
              className="absolute -bottom-1 -right-1 bg-[#1F6F54] hover:bg-[#185842] text-white p-2 rounded-full shadow-md transition-colors cursor-pointer"
              title="Change Photo"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{name || "LocaStay User"}</h2>
              
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                role === "admin" 
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : role === "landlord"
                  ? "bg-emerald-100 text-[#1F6F54] border border-emerald-200"
                  : "bg-emerald-100 text-[#1F6F54] border border-emerald-200"
              }`}>
                {t(`common.${role}`, role.toUpperCase())}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-mono font-bold flex items-center justify-center sm:justify-start gap-1">
              <Phone className="w-3.5 h-3.5 text-[#1F6F54]" />
              {currentUser.phone || "No Phone Linked"}
            </p>
            
            <div className="flex justify-center sm:justify-start items-center gap-1.5 text-[11px] text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{t("profile.memberSince")}: <span className="font-extrabold text-slate-700">{formattedDate}</span></span>
            </div>
          </div>
        </div>

        {/* Quick Custom Avatar Selector */}
        {showAvatarSelector && (
          <div className="mt-6 p-4 border border-slate-200/80 rounded-2xl bg-emerald-50/50 text-center space-y-3 relative z-20">
            <p className="text-xs font-extrabold text-slate-700">Select a Profile Avatar or upload custom:</p>
            <div className="flex justify-center gap-4">
              {AVATAR_OPTIONS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAvatarSelect(url)}
                  className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent hover:border-[#1F6F54] transition-all focus:scale-95 shadow-xs cursor-pointer"
                >
                  <img src={url} alt={`Avatar option ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <label className="text-[10px] font-extrabold bg-white text-[#1F6F54] border border-[#1F6F54]/30 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors shadow-xs">
                {t("profile.photo", "Upload File")}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => setShowAvatarSelector(false)}
                className="text-[10px] text-slate-500 hover:text-slate-800 px-2 font-bold cursor-pointer"
              >
                {t("common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Alerts & Message Block */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-[#1F6F54] p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-[#1F6F54] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Inputs */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-4 h-4 text-[#1F6F54]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                {t("profile.fullName")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Madan Lal"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#1F6F54] focus:ring-2 focus:ring-[#1F6F54]/15 outline-none transition-all text-slate-800 font-semibold"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                {t("profile.email")}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. landlord@locastay.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#1F6F54] focus:ring-2 focus:ring-[#1F6F54]/15 outline-none transition-all text-slate-800 font-semibold"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              {t("profile.phone")}
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
              <Phone className="w-4 h-4 text-[#1F6F54]" />
              <span className="text-xs font-bold text-slate-800 font-mono">
                {currentUser.phone || "Not Provided"}
              </span>
              <span className="text-[9px] bg-emerald-100 text-[#1F6F54] border border-emerald-200 font-extrabold px-2 py-0.5 rounded-md ml-auto">
                READ-ONLY (SECURED)
              </span>
            </div>
          </div>
        </div>

        {/* System Settings (Language & Theme) */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-[#1F6F54]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              App Settings & Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Language Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Preferred Language
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    language === "en"
                      ? "bg-[#1F6F54] text-white border-[#1F6F54] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    language === "hi"
                      ? "bg-[#1F6F54] text-white border-[#1F6F54] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  हिंदी (Devanagari)
                </button>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Visual Theme
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    theme === "light"
                      ? "bg-[#1F6F54] text-white border-[#1F6F54] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    theme === "dark"
                      ? "bg-[#1F6F54] text-white border-[#1F6F54] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-[#1F6F54]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {t("profile.preferences", "Notification Preferences")}
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {/* Push Alert Preference */}
            <label className="flex items-start justify-between gap-4 p-3.5 hover:bg-emerald-50/50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-emerald-100">
              <div className="flex gap-3">
                <Bell className="w-4 h-4 text-[#1F6F54] mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t("profile.preferences", "In-App Push Alerts")}</span>
                  <span className="text-[11px] text-slate-500 font-medium">Instant browser notifications for booking responses.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyPush}
                onChange={(e) => setNotifyPush(e.target.checked)}
                className="w-4 h-4 text-[#1F6F54] bg-slate-100 border-slate-300 rounded focus:ring-[#1F6F54] cursor-pointer accent-[#1F6F54]"
              />
            </label>

            {/* WhatsApp Preference */}
            <label className="flex items-start justify-between gap-4 p-3.5 hover:bg-emerald-50/50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-emerald-100">
              <div className="flex gap-3">
                <MessageSquare className="w-4 h-4 text-[#1F6F54] mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t("profile.whatsappAlerts", "WhatsApp Updates")}</span>
                  <span className="text-[11px] text-slate-500 font-medium">Receive automated rent reminders & payment verification links via WhatsApp.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 text-[#1F6F54] bg-slate-100 border-slate-300 rounded focus:ring-[#1F6F54] cursor-pointer accent-[#1F6F54]"
              />
            </label>

            {/* Email Preference */}
            <label className="flex items-start justify-between gap-4 p-3.5 hover:bg-emerald-50/50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-emerald-100">
              <div className="flex gap-3">
                <Mail className="w-4 h-4 text-[#1F6F54] mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t("profile.emailAlerts", "Email Receipts & Invoices")}</span>
                  <span className="text-[11px] text-slate-500 font-medium">Automated digital monthly invoice PDFs & instant receipts to your inbox.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 text-[#1F6F54] bg-slate-100 border-slate-300 rounded focus:ring-[#1F6F54] cursor-pointer accent-[#1F6F54]"
              />
            </label>
          </div>
        </div>

        {/* Safeguarding Alert for Verification */}
        {role === "landlord" && !currentUser.isVerified && (
          <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl text-left space-y-2 text-xs shadow-xs">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Safeguarding Kirayedars
            </p>
            <p className="text-amber-800 leading-relaxed font-medium text-[11px]">
              To protect tenants from fake listings, LocaStay manually audits every landlord identity. Our verification team will reach out to you via call/SMS shortly to verify your identity.
            </p>
          </div>
        )}

        {/* Buttons Action Container */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#1F6F54] hover:bg-[#185842] text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 focus:scale-[0.99] cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("common.loading", "Saving changes...")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("profile.saveBtn", "Save Profile")}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-red-50 hover:bg-red-100 border border-red-200/80 text-red-600 font-extrabold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 focus:scale-[0.99] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {t("profile.logoutBtn", "Log Out")}
          </button>
        </div>
      </form>
    </div>
  );
}
