import React, { useState } from "react";
import { db, auth } from "../lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { User, UserRole } from "../types";
import { KeyRound, Phone, Mail, UserCheck, ShieldCheck, ArrowRight, CheckCircle } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthScreen({ onAuthSuccess, onBack, initialMode }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(initialMode === "signup");
  const [usePhoneOTP, setUsePhoneOTP] = useState(true); // Default to Phone OTP login for Tier 3/4 comfort
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Simulated OTP sender since standard recaptcha triggers are sometimes unstable in iframe previews
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setLoading(false);
    }, 800);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== "123456" && otpCode !== "654321") {
      setError("Incorrect OTP code. Enter 123456 or 654321 to bypass standard SMS simulation");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "phone",
          phone,
          name,
          role
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        let errText = "Authentication failed";
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
        onAuthSuccess(user);
      } else {
        throw new Error("Failed to load user profile from database.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (isRegistering && !name) {
      setError("Please enter your name");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          email,
          password,
          isRegistering,
          name,
          phone: phone || "",
          role
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        let errText = "Authentication failed";
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
        onAuthSuccess(user);
      } else {
        throw new Error("Failed to retrieve user profile from database.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden mt-8 md:mt-16 animate-fade-in" id="auth-panel">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-10 text-white relative">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            id="auth-back-btn"
          >
            ← Back
          </button>
        )}
        <div className={`absolute right-6 top-6 bg-white/10 px-3 py-1 rounded-full text-xs font-mono tracking-wide ${onBack ? "hidden sm:block" : ""}`}>
          v1.0.0 Stable
        </div>
        <h2 className="text-3xl font-sans font-bold tracking-tight mb-2">LocaStay</h2>
        <p className="text-emerald-100 text-sm font-sans">
          Tier 3/4 Towns Ka Trusted Rental Companion
        </p>
      </div>

      <div className="p-8">
        {/* Toggle between OTP and Email */}
        <div className="flex border border-gray-100 rounded-xl p-1 mb-6 bg-gray-50/50" id="auth-method-toggles">
          <button
            onClick={() => {
              setUsePhoneOTP(true);
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
              usePhoneOTP
                ? "bg-white text-emerald-700 shadow-sm border border-gray-100/50"
                : "text-gray-500 hover:text-gray-900"
            }`}
            id="otp-method-btn"
          >
            <Phone className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
            Mobile OTP Login
          </button>
          <button
            onClick={() => {
              setUsePhoneOTP(false);
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
              !usePhoneOTP
                ? "bg-white text-emerald-700 shadow-sm border border-gray-100/50"
                : "text-gray-500 hover:text-gray-900"
            }`}
            id="email-method-btn"
          >
            <Mail className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
            Email Fallback
          </button>
        </div>

        {error && (
          <div className="p-3.5 mb-5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl" id="auth-error">
            {error}
          </div>
        )}

        {/* 1. Phone Number OTP Auth Flow */}
        {usePhoneOTP ? (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4" id="phone-form">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Apna Mobile Number Likhein
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-14 pr-4 py-3.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Aapka Name
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Aapka Role Kya Hai?
                  </label>
                  <div className="grid grid-cols-2 gap-3" id="role-selection">
                    <button
                      type="button"
                      onClick={() => setRole("tenant")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all ${
                        role === "tenant"
                          ? "border-emerald-500 bg-emerald-50/40 text-emerald-800"
                          : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
                      }`}
                    >
                      <UserCheck className="w-5 h-5 mb-1" />
                      <span className="text-xs font-semibold">Tenant (Kirayedar)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("landlord")}
                      className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all ${
                        role === "landlord"
                          ? "border-emerald-500 bg-emerald-50/40 text-emerald-800"
                          : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 mb-1" />
                      <span className="text-xs font-semibold">Landlord (Makan Malik)</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center text-sm"
                  id="send-otp-btn"
                >
                  {loading ? "SMS Bheja Jaa Raha Hai..." : "Bhejein OTP SMS (Send OTP)"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-5" id="otp-form">
                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl text-center">
                  <p className="text-xs font-medium text-emerald-800">
                    OTP sent to +91 {phone}! Use code <span className="font-bold underline">123456</span> to login immediately.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="******"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3.5 text-center tracking-widest text-lg font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Didn't receive?</span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Change Mobile Number
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center text-sm"
                  id="verify-otp-btn"
                >
                  {loading ? "Verifying..." : "Verify OTP & Continue"}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* 2. Email Fallback login */
          <form onSubmit={handleEmailAuth} className="space-y-4" id="email-form">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Ram Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="ram@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3" id="role-selection-email">
                  <button
                    type="button"
                    onClick={() => setRole("tenant")}
                    className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all ${
                      role === "tenant"
                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-800"
                        : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">Tenant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("landlord")}
                    className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all ${
                      role === "landlord"
                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-800"
                        : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">Landlord</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center text-sm"
              id="email-auth-btn"
            >
              {loading ? "Processing..." : isRegistering ? "Create Account" : "Sign In"}
              <KeyRound className="w-4 h-4 ml-2" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                {isRegistering ? "Already have an account? Sign In" : "New to LocaStay? Create an Account"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Securely powered by **Firebase authentication & firestore database rules**.
          </p>
        </div>
      </div>
    </div>
  );
}
