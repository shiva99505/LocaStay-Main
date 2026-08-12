import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, query, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { User, Property, Payment, AdminAction } from "../types";
import { 
  Users, Building, IndianRupee, ShieldCheck, Ban, Trash2, Search, 
  ListFilter, FileText, CheckCircle, ArrowRightLeft, RefreshCw, BarChart3, AlertTriangle,
  ChevronLeft, ChevronRight, Download, X, ShieldAlert, Check, Calendar, TrendingUp, AlertCircle,
  Menu
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "properties" | "payments" | "audits">("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- 1. OVERVIEW STATE ---
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<User[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  // --- 2. USERS STATE ---
  const [users, setUsers] = useState<User[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userVerificationFilter, setUserVerificationFilter] = useState("all");

  // --- 3. PROPERTIES STATE ---
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propSearch, setPropSearch] = useState("");
  const [propCityFilter, setPropCityFilter] = useState("all");
  const [propStatusFilter, setPropStatusFilter] = useState("all");
  const [propVerifiedFilter, setPropVerifiedFilter] = useState("all");
  const [isReportedOnly, setIsReportedOnly] = useState(false);
  const [reportedDetailProperty, setReportedDetailProperty] = useState<any | null>(null);
  
  // --- 4. PAYMENTS STATE ---
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentStartDate, setPaymentStartDate] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState("");

  // --- 5. AUDIT TRAILS STATE ---
  const [auditLogs, setAuditLogs] = useState<AdminAction[]>([]);

  // --- MODALS / DIALOGS STATE ---
  const [showSuspendDialog, setShowSuspendDialog] = useState<{ userId: string; name: string; isSuspended: boolean } | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState<{ propertyId: string; title: string } | null>(null);
  const [removalReason, setRemovalReason] = useState("");

  // --- APIS FETCHERS ---

  // Fetch Overview Data
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview-stats");
      const data = await res.json();
      if (data.success) {
        setOverviewStats(data.stats);
        setOverviewTrend(data.trend);
        setRecentSignups(data.recentActivity.signups);
        setRecentProperties(data.recentActivity.properties);
        setRecentPayments(data.recentActivity.payments);
      }
    } catch (err) {
      console.error("Error fetching admin overview stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Users Paginated
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(usersPage),
        limit: "10",
        search: userSearch,
        role: userRoleFilter,
        isVerified: userVerificationFilter
      });
      const res = await fetch(`/api/admin/users?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setUsersCount(data.totalCount);
      }
    } catch (err) {
      console.error("Error fetching users list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Properties Paginated
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(propertiesPage),
        limit: "10",
        search: propSearch,
        city: propCityFilter,
        status: propStatusFilter,
        isVerified: propVerifiedFilter,
        isReportedOnly: String(isReportedOnly)
      });
      const res = await fetch(`/api/admin/properties?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties);
        setPropertiesCount(data.totalCount);
      }
    } catch (err) {
      console.error("Error fetching properties list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Payments Paginated
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(paymentsPage),
        limit: "10",
        type: paymentTypeFilter,
        status: paymentStatusFilter,
        startDate: paymentStartDate,
        endDate: paymentEndDate
      });
      const res = await fetch(`/api/admin/payments?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
        setPaymentsCount(data.totalCount);
      }
    } catch (err) {
      console.error("Error fetching payments list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Audit Logs Chronologically
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "adminActions"), orderBy("timestamp", "desc"), firestoreLimit(100));
      const snap = await getDocs(q);
      const list: AdminAction[] = [];
      snap.forEach(d => {
        list.push(d.data() as AdminAction);
      });
      setAuditLogs(list);
    } catch (err) {
      console.error("Error loading audit actions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Master refresh function
  const handleRefresh = () => {
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "properties") fetchProperties();
    if (activeTab === "payments") fetchPayments();
    if (activeTab === "audits") fetchAuditLogs();
  };

  // Trigger fetches on activeTab or filters changing
  useEffect(() => {
    handleRefresh();
  }, [
    activeTab,
    // Users dependencies
    usersPage, userRoleFilter, userVerificationFilter,
    // Properties dependencies
    propertiesPage, propCityFilter, propStatusFilter, propVerifiedFilter, isReportedOnly,
    // Payments dependencies
    paymentsPage, paymentTypeFilter, paymentStatusFilter, paymentStartDate, paymentEndDate
  ]);

  // Debounced/Delayed Search Handler
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (activeTab === "users") {
        setUsersPage(1);
        fetchUsers();
      }
      if (activeTab === "properties") {
        setPropertiesPage(1);
        fetchProperties();
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [userSearch, propSearch]);


  // --- ADMINISTRATOR MUTATIONS ---

  // Verify/Unverify Landlord Malik profile
  const handleVerifyLandlord = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/setLandlordVerification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          isVerified: !currentStatus,
          adminId: currentUser.uid
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        if (activeTab === "overview") fetchOverview();
      }
    } catch (err) {
      console.error("Error setting landlord verification status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Suspend/Activate User Account
  const handleSuspendConfirm = async () => {
    if (!showSuspendDialog) return;
    const { userId, isSuspended } = showSuspendDialog;
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/setUserSuspension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          isSuspended: !isSuspended,
          adminId: currentUser.uid
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        setShowSuspendDialog(null);
      }
    } catch (err) {
      console.error("Error setting user suspension state:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Property Verification Status
  const handleVerifyProperty = async (propertyId: string, currentStatus: boolean) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch("/api/admin/setPropertyVerification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          isVerified: !currentStatus,
          adminId: currentUser.uid
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchProperties();
      }
    } catch (err) {
      console.error("Error setting property verification:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Soft-delete/Hide property listing with reason
  const handleRemovePropertyConfirm = async () => {
    if (!showRemoveDialog || !removalReason.trim()) return;
    const { propertyId } = showRemoveDialog;
    setActionLoading(propertyId);
    try {
      const res = await fetch("/api/admin/removeProperty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          reason: removalReason,
          adminId: currentUser.uid
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchProperties();
        setShowRemoveDialog(null);
        setRemovalReason("");
        setReportedDetailProperty(null); // Close report drawer if open
      }
    } catch (err) {
      console.error("Error soft-deleting listing:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Dismiss reports of a property listing
  const handleDismissReports = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch("/api/admin/dismissReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          adminId: currentUser.uid
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchProperties();
        setReportedDetailProperty(null);
      }
    } catch (err) {
      console.error("Error dismissing active listing reports:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // --- CSV EXPORTER ---
  const exportPaymentsToCSV = () => {
    const headers = ["Transaction ID", "Customer Name", "Customer Phone", "Type", "Amount (INR)", "Status", "Date"];
    const rows = payments.map(p => [
      p.paymentId,
      p.userName || "N/A",
      p.userPhone || "N/A",
      p.type,
      `INR ${p.amount}`,
      p.status,
      new Date(p.createdAt).toLocaleString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `locastay_payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 pb-20 animate-fade-in" id="admin-dashboard">
      
      {/* Sticky Admin Controls Top Navbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200/60 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3.5">
          <div className="bg-slate-900 text-white rounded-2xl p-2.5 font-extrabold text-sm tracking-tight shadow-md flex items-center justify-center w-10 h-10">
            LS
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">LocaStay Admin Dashboard</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Administrative Management Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh} 
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors border border-slate-100"
            title="Refresh Data Logs"
            id="refresh-admin-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-slate-900" : ""}`} />
          </button>
          
          <button 
            onClick={onLogout}
            className="text-xs font-bold px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100/50"
            id="logout-admin-btn"
          >
            Log Out Portal
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        
        {/* Mobile Hamburger Menu (below 768px) */}
        <div className="md:hidden mb-6 relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-2xl text-slate-700 dark:text-slate-300 font-extrabold text-sm shadow-sm transition-all outline-none"
            id="admin-mobile-menu-trigger"
          >
            <div className="flex items-center gap-2">
              {activeTab === "overview" && <BarChart3 className="w-4 h-4 text-[#1F6F54]" />}
              {activeTab === "users" && <Users className="w-4 h-4 text-[#1F6F54]" />}
              {activeTab === "properties" && <Building className="w-4 h-4 text-[#1F6F54]" />}
              {activeTab === "payments" && <ArrowRightLeft className="w-4 h-4 text-[#1F6F54]" />}
              {activeTab === "audits" && <FileText className="w-4 h-4 text-[#1F6F54]" />}
              <span className="capitalize">{activeTab === "audits" ? "Audit Trails" : `${activeTab} Panel`}</span>
            </div>
            <Menu className="w-5 h-5 text-slate-500" />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1 animate-fade-in" id="admin-mobile-dropdown">
              <button
                onClick={() => { setActiveTab("overview"); setMenuOpen(false); }}
                className={`w-full py-3 px-4 text-left text-xs font-bold rounded-xl flex items-center transition-all ${
                  activeTab === "overview" ? "bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2.5 text-slate-400" />
                Overview Panel
              </button>
              <button
                onClick={() => { setActiveTab("users"); setUsersPage(1); setMenuOpen(false); }}
                className={`w-full py-3 px-4 text-left text-xs font-bold rounded-xl flex items-center transition-all ${
                  activeTab === "users" ? "bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Users className="w-4 h-4 mr-2.5 text-slate-400" />
                User Directories
              </button>
              <button
                onClick={() => { setActiveTab("properties"); setPropertiesPage(1); setMenuOpen(false); }}
                className={`w-full py-3 px-4 text-left text-xs font-bold rounded-xl flex items-center transition-all ${
                  activeTab === "properties" ? "bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Building className="w-4 h-4 mr-2.5 text-slate-400" />
                Property Moderation
              </button>
              <button
                onClick={() => { setActiveTab("payments"); setPaymentsPage(1); setMenuOpen(false); }}
                className={`w-full py-3 px-4 text-left text-xs font-bold rounded-xl flex items-center transition-all ${
                  activeTab === "payments" ? "bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2.5 text-slate-400" />
                Platform Revenue Logs
              </button>
              <button
                onClick={() => { setActiveTab("audits"); setMenuOpen(false); }}
                className={`w-full py-3 px-4 text-left text-xs font-bold rounded-xl flex items-center transition-all ${
                  activeTab === "audits" ? "bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <FileText className="w-4 h-4 mr-2.5 text-slate-400" />
                Audit Trails
              </button>
            </div>
          )}
        </div>

        {/* Modern Tab Pill Switchers (Desktop only, wrapping) */}
        <div 
          className="hidden md:flex flex-wrap gap-2 mb-8 bg-white dark:bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs" 
          id="admin-tabs"
          style={{ backgroundColor: "#ffffff" }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "overview"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40"
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview Panel
          </button>

          <button
            onClick={() => { setActiveTab("users"); setUsersPage(1); }}
            className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "users"
                ? "bg-[#4a6821] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40"
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            User Directories
          </button>

          <button
            onClick={() => { setActiveTab("properties"); setPropertiesPage(1); }}
            className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "properties"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/40 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40"
            }`}
          >
            <Building className="w-4 h-4 mr-2" />
            Property Moderation
          </button>

          <button
            onClick={() => { setActiveTab("payments"); setPaymentsPage(1); }}
            className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "payments"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/40 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Platform Revenue Logs
          </button>

          <button
            onClick={() => setActiveTab("audits")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "audits"
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/40 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40"
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Audit Trails
          </button>
        </div>


        {/* ==================================== TAB 1: OVERVIEW & ANALYTICS ==================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Month Revenue</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    ₹{overviewStats?.thisMonthRevenue?.toLocaleString() || "0"}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> Real-time tracking
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Tenants</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    {overviewStats?.totalTenants || "0"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Registered on platform</span>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Landlords</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    {overviewStats?.totalLandlords || "0"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Profile verified maliks</span>
                </div>
                <div className="bg-purple-50 text-purple-600 p-3.5 rounded-2xl shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Properties Listing</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    {overviewStats?.totalProperties || "0"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                    {overviewStats?.availableProperties || "0"} available / {overviewStats?.rentedProperties || "0"} rented
                  </span>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl shrink-0">
                  <Building className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Quick Navigation Cards */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Navigation Utilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab("users")} 
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left border border-slate-100 transition-colors"
                >
                  <Users className="w-5 h-5 text-blue-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">Verify & Suspend Users</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage tenants, verification logs, and suspend users.</p>
                </button>
                <button 
                  onClick={() => setActiveTab("properties")} 
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left border border-slate-100 transition-colors"
                >
                  <Building className="w-5 h-5 text-amber-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">Review & Moderate Properties</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Approve, deny, view user reports, or remove listings.</p>
                </button>
                <button 
                  onClick={() => setActiveTab("payments")} 
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left border border-slate-100 transition-colors"
                >
                  <ArrowRightLeft className="w-5 h-5 text-emerald-600 mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">Revenue Analytics & CSV Export</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">View transaction streams, trends, and export logs to CSV.</p>
                </button>
              </div>
            </div>

            {/* Recharts Analytics Trend Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">6-Month Revenue Trend Growth</h3>
                    <p className="text-[10px] text-slate-400">Month-over-month growth from subscriptions and unlocks</p>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-lg font-bold font-mono">
                    TOTAL: ₹{overviewStats?.allTimeRevenue?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewTrend}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                      <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
                      <Area type="monotone" dataKey="amount" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Streams split panel */}
              <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Revenue Stream Split</h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Rent Contact Unlocks</span>
                        <span>₹{overviewStats?.unlockRevenue || "0"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${overviewStats?.allTimeRevenue ? (overviewStats.unlockRevenue / overviewStats.allTimeRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Landlord Plans (₹49)</span>
                        <span>₹{overviewStats?.subscriptionRevenue || "0"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full" 
                          style={{ width: `${overviewStats?.allTimeRevenue ? (overviewStats.subscriptionRevenue / overviewStats.allTimeRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Featured Boosts (₹99)</span>
                        <span>₹{overviewStats?.featuredRevenue || "0"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-amber-600 h-full rounded-full" 
                          style={{ width: `${overviewStats?.allTimeRevenue ? (overviewStats.featuredRevenue / overviewStats.allTimeRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Audit compliant accounting</span>
                    <span className="font-bold text-slate-600">Active</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Live Activities Feed (Phase 6) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Last 10 Signups */}
              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span>Recent Signups</span>
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {recentSignups.map((u) => (
                    <div key={u.uid} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-all">
                      <div className="bg-blue-50 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">{u.name}</span>
                        <span className="block text-[9px] text-slate-400 font-mono truncate">{u.email}</span>
                      </div>
                      <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase shrink-0">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last 10 Listed Properties */}
              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span>Newest Listings</span>
                  <Building className="w-3.5 h-3.5 text-amber-500" />
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {recentProperties.map((p) => (
                    <div key={p.propertyId} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-all">
                      <div className="bg-amber-50 text-amber-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {p.type.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">{p.title}</span>
                        <span className="block text-[9px] text-slate-400 truncate">{p.city}, {p.state}</span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 shrink-0">
                        ₹{p.rentAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last 10 Platform Payments */}
              <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span>Recent Payments</span>
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {recentPayments.map((pay) => (
                    <div key={pay.paymentId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="block text-xs font-bold text-slate-800 truncate uppercase">
                          {pay.type.replace("_", " ")}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-mono">
                          {new Date(pay.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 shrink-0 bg-emerald-50 px-2.5 py-1 rounded-xl">
                        +₹{pay.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}


        {/* ==================================== TAB 2: USER DIRECTORIES ==================================== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            
            {/* Search Filters Section */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search user directories by name, phone, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-xs bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex gap-2.5 w-full md:w-auto shrink-0">
                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); setUsersPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none w-full md:w-auto"
                >
                  <option value="all">All Roles</option>
                  <option value="tenant">Tenants (Kirayedars)</option>
                  <option value="landlord">Landlords (Maliks)</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={userVerificationFilter}
                  onChange={(e) => { setUserVerificationFilter(e.target.value); setUsersPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none w-full md:w-auto"
                >
                  <option value="all">All Statuses</option>
                  <option value="true">Verified Only</option>
                  <option value="false">Pending Verification</option>
                </select>
              </div>
            </div>

            {/* Users Data Grid Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-x-auto shadow-sm" id="users-table-container">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Role Badge</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Suspension Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                        No registered users match the filtered criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.uid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-800 text-sm block">{u.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">UID: {u.uid}</span>
                        </td>
                        <td className="p-4">
                          <span className="block text-slate-700 font-semibold">{u.phone || "N/A"}</span>
                          <span className="block text-[10px] text-slate-400">{u.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            u.role === "tenant" ? "bg-blue-50 text-blue-700" : u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.role === "landlord" ? (
                            <button
                              onClick={() => handleVerifyLandlord(u.uid, u.isVerified)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase flex items-center gap-1 transition-colors ${
                                u.isVerified 
                                  ? "bg-green-50 text-green-700 border border-green-100 hover:bg-green-100" 
                                  : "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                              }`}
                              disabled={actionLoading === u.uid}
                            >
                              {u.isVerified ? (
                                <><Check className="w-3.5 h-3.5" /> Verified</>
                              ) : (
                                <><AlertCircle className="w-3.5 h-3.5" /> Unverified</>
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${
                            u.isSuspended ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {u.isSuspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="p-4 text-right flex gap-1.5 justify-end">
                          {u.role !== "admin" && (
                            <button
                              onClick={() => setShowSuspendDialog({ userId: u.uid, name: u.name, isSuspended: !!u.isSuspended })}
                              className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                u.isSuspended 
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100" 
                                  : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                              }`}
                              disabled={actionLoading === u.uid}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {u.isSuspended ? "Activate Account" : "Suspend Account"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {usersCount > 0 && (
              <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-xs text-slate-500">
                <span>Showing page {usersPage} of {Math.ceil(usersCount / 10)} ({usersCount} total users)</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                    disabled={usersPage === 1}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700">{usersPage}</span>
                  <button
                    onClick={() => setUsersPage(prev => prev + 1)}
                    disabled={usersPage >= Math.ceil(usersCount / 10)}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}


        {/* ==================================== TAB 3: PROPERTY MODERATION ==================================== */}
        {activeTab === "properties" && (
          <div className="space-y-4">
            
            {/* Search Filters Section */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search properties by title, city, or physical address..."
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-xs bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto shrink-0">
                <select
                  value={propStatusFilter}
                  onChange={(e) => { setPropStatusFilter(e.target.value); setPropertiesPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none flex-1 md:flex-initial"
                >
                  <option value="all">All States</option>
                  <option value="available">Available (Sadasya)</option>
                  <option value="rented">Rented (Rented out)</option>
                  <option value="hidden">Hidden / Soft-Deleted</option>
                </select>

                <select
                  value={propVerifiedFilter}
                  onChange={(e) => { setPropVerifiedFilter(e.target.value); setPropertiesPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none flex-1 md:flex-initial"
                >
                  <option value="all">All Verification</option>
                  <option value="true">Verified Listings</option>
                  <option value="false">Unverified Listings</option>
                </select>

                {/* SPECIAL REPORTED FILTER */}
                <button
                  onClick={() => { setIsReportedOnly(prev => !prev); setPropertiesPage(1); }}
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all outline-none border flex-1 md:flex-initial ${
                    isReportedOnly 
                      ? "bg-red-50 border-red-200 text-red-600 font-extrabold" 
                      : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Reported Only
                </button>
              </div>
            </div>

            {/* Properties Data Grid Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-x-auto shadow-sm" id="properties-table-container">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Property Thumbnail & Title</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Price / Deposit</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Tenant Complaints</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                        No property listings match the filtered criteria.
                      </td>
                    </tr>
                  ) : (
                    properties.map((p) => (
                      <tr key={p.propertyId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3.5">
                            {p.photos && p.photos.length > 0 ? (
                              <img 
                                src={p.photos[0]} 
                                alt={p.title} 
                                className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-xl border border-slate-100 text-slate-400 flex items-center justify-center font-bold font-mono text-[9px] shrink-0">
                                NO IMG
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 text-sm block truncate max-w-[240px]">{p.title}</span>
                              <span className="text-[9px] text-slate-400 font-mono block mt-0.5 truncate max-w-[240px]">
                                ID: {p.propertyId} • Landlord: {p.landlordId.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="block font-bold text-slate-700">{p.city}, {p.state}</span>
                          <span className="block text-[10px] text-slate-400 truncate max-w-[180px]">{p.address}</span>
                        </td>
                        <td className="p-4">
                          <span className="block text-slate-800 font-bold text-sm">₹{p.rentAmount.toLocaleString()}/mo</span>
                          <span className="block text-[10px] text-slate-400 font-semibold">Deposit: ₹{p.depositAmount.toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleVerifyProperty(p.propertyId, p.isVerified)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase flex items-center gap-1 transition-colors ${
                              p.isVerified 
                                ? "bg-green-50 text-green-700 border border-green-100 hover:bg-green-100" 
                                : "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                            }`}
                            disabled={actionLoading === p.propertyId}
                          >
                            {p.isVerified ? (
                              <><Check className="w-3.5 h-3.5" /> Verified</>
                            ) : (
                              <><AlertCircle className="w-3.5 h-3.5" /> Unverified</>
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          {p.reportsCount > 0 ? (
                            <button
                              onClick={() => setReportedDetailProperty(p)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-full flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
                              {p.reportsCount} Reports
                            </button>
                          ) : (
                            <span className="text-slate-400 italic font-medium">None</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {p.status !== "hidden" ? (
                            <button
                              onClick={() => setShowRemoveDialog({ propertyId: p.propertyId, title: p.title })}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100/50 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all"
                              disabled={actionLoading === p.propertyId}
                            >
                              Remove Listing
                            </button>
                          ) : (
                            <div>
                              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Soft Deleted</span>
                              {p.removalReason && (
                                <span className="text-[9px] text-slate-400 italic block mt-0.5 truncate max-w-[120px]" title={p.removalReason}>
                                  Reason: {p.removalReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {propertiesCount > 0 && (
              <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-xs text-slate-500">
                <span>Showing page {propertiesPage} of {Math.ceil(propertiesCount / 10)} ({propertiesCount} total listings)</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPropertiesPage(prev => Math.max(prev - 1, 1))}
                    disabled={propertiesPage === 1}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700">{propertiesPage}</span>
                  <button
                    onClick={() => setPropertiesPage(prev => prev + 1)}
                    disabled={propertiesPage >= Math.ceil(propertiesCount / 10)}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}


        {/* ==================================== TAB 4: REVENUE HISTORIC LOGS ==================================== */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            
            {/* Payment Statistics Top Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">All-Time Yield</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">₹{overviewStats?.allTimeRevenue?.toLocaleString() || "0"}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Month Run</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">₹{overviewStats?.thisMonthRevenue?.toLocaleString() || "0"}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Contact Unlocks</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">₹{overviewStats?.unlockRevenue?.toLocaleString() || "0"}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Plan Subs (₹49)</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">₹{overviewStats?.subscriptionRevenue?.toLocaleString() || "0"}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Featured Rank</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">₹{overviewStats?.featuredRevenue?.toLocaleString() || "0"}</span>
              </div>
            </div>

            {/* Advanced Filters and CSV Export Button */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => { setPaymentTypeFilter(e.target.value); setPaymentsPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none flex-1 md:flex-initial"
                >
                  <option value="all">All Purposes</option>
                  <option value="contact_unlock">Rent Contact Unlocks</option>
                  <option value="landlord_subscription">Landlord Subscriptions</option>
                  <option value="featured_listing">Featured Listing Ranks</option>
                </select>

                <select
                  value={paymentStatusFilter}
                  onChange={(e) => { setPaymentStatusFilter(e.target.value); setPaymentsPage(1); }}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none flex-1 md:flex-initial"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="success">Success Transacts</option>
                  <option value="failed">Failed Receipts</option>
                  <option value="pending">Pending Orders</option>
                </select>

                <div className="flex items-center space-x-1.5 flex-1 md:flex-initial">
                  <input
                    type="date"
                    value={paymentStartDate}
                    onChange={(e) => { setPaymentStartDate(e.target.value); setPaymentsPage(1); }}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none w-full"
                    title="Start Date"
                  />
                  <span className="text-slate-300 font-mono text-[10px]">to</span>
                  <input
                    type="date"
                    value={paymentEndDate}
                    onChange={(e) => { setPaymentEndDate(e.target.value); setPaymentsPage(1); }}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none w-full"
                    title="End Date"
                  />
                </div>
              </div>

              <button
                onClick={exportPaymentsToCSV}
                className="w-full md:w-auto px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-slate-900/10 shrink-0"
              >
                <Download className="w-4 h-4" />
                Export Filtered to CSV
              </button>

            </div>

            {/* Payments Table Data */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Transaction ID & Razorpay Reference</th>
                    <th className="p-4">Registered Tenant/Landlord</th>
                    <th className="p-4">Yield Amount</th>
                    <th className="p-4">Purpose / Category</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Transaction Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                        No financial logs found matching these dates or streams.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.paymentId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-800 text-sm block">{p.paymentId}</span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">RPAY ID: {p.razorpayPaymentId || "Simulated Gateway"}</span>
                        </td>
                        <td className="p-4">
                          <span className="block font-bold text-slate-800 text-xs">{p.userName || "N/A"}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{p.userPhone || "N/A"}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-extrabold text-slate-800">₹{p.amount.toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-600 block uppercase text-[10px] tracking-wider">
                            {p.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            p.status === "success" ? "bg-green-50 text-green-700" : p.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-semibold">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {paymentsCount > 0 && (
              <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-xs text-slate-500">
                <span>Showing page {paymentsPage} of {Math.ceil(paymentsCount / 10)} ({paymentsCount} total logs)</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPaymentsPage(prev => Math.max(prev - 1, 1))}
                    disabled={paymentsPage === 1}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700">{paymentsPage}</span>
                  <button
                    onClick={() => setPaymentsPage(prev => prev + 1)}
                    disabled={paymentsPage >= Math.ceil(paymentsCount / 10)}
                    className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}


        {/* ==================================== TAB 5: AUDIT LOG TRAILS ==================================== */}
        {activeTab === "audits" && (
          <div className="space-y-4">
            
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Security Auditing Compliance Trail</h2>
                <p className="text-xs text-slate-400 mt-0.5">Immutable record of admin verifications, suspensions, and listing modifications.</p>
              </div>
              <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="bg-white border border-slate-100 p-8 rounded-3xl text-center text-slate-400 italic text-xs">
                  No security-critical modifications logged in this audit interval.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.actionId} className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {log.actionId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Admin: {log.adminId}
                        </span>
                      </div>
                      <p className="text-slate-800 font-bold mt-2 text-sm">
                        {log.action}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Affected Document Target ID: <span className="font-mono bg-slate-50 px-1 rounded">{log.targetId}</span>
                      </p>
                    </div>
                    
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-slate-400 flex items-center gap-1 sm:justify-end">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-semibold">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>


      {/* ==================================== MODAL DRAWER 1: TENANT REPORTS VIEW ==================================== */}
      {reportedDetailProperty && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in p-6">
            
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center space-x-2 text-red-600">
                  <ShieldAlert className="w-5 h-5 animate-bounce" />
                  <h3 className="text-base font-extrabold tracking-tight">Active Complaint Reports</h3>
                </div>
                <button 
                  onClick={() => setReportedDetailProperty(null)}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Property Card details inside Reports drawer */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-5 flex items-center gap-3">
                {reportedDetailProperty.photos && reportedDetailProperty.photos.length > 0 && (
                  <img 
                    src={reportedDetailProperty.photos[0]} 
                    alt={reportedDetailProperty.title} 
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-800 truncate">{reportedDetailProperty.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{reportedDetailProperty.city}, {reportedDetailProperty.state}</p>
                  <p className="text-[10px] text-slate-700 font-bold mt-1">₹{reportedDetailProperty.rentAmount.toLocaleString()}/mo</p>
                </div>
              </div>

              {/* Complaints List */}
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2.5">Complaints Logs ({reportedDetailProperty.reports?.length || 0})</h4>
              <div className="space-y-3.5 max-y-[450px] overflow-y-auto pr-1">
                {reportedDetailProperty.reports?.map((report: any) => (
                  <div key={report.reportId} className="bg-red-50/45 p-4 rounded-2xl border border-red-100/50">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>By Tenant: {report.reporterName || `UID: ${report.reporterId.slice(-6)}`}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="block text-red-700 font-extrabold text-xs mt-1.5">{report.reason}</span>
                    {report.details && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">"{report.details}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Drawer Panel */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => handleDismissReports(reportedDetailProperty.propertyId)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200/50"
                disabled={actionLoading === reportedDetailProperty.propertyId}
              >
                Dismiss Complaint
              </button>
              <button
                onClick={() => {
                  setShowRemoveDialog({ 
                    propertyId: reportedDetailProperty.propertyId, 
                    title: reportedDetailProperty.title 
                  });
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-red-600/15"
                disabled={actionLoading === reportedDetailProperty.propertyId}
              >
                Remove Listing
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ==================================== MODAL DIALOG 2: SUSPEND CONFIRMATION ==================================== */}
      {showSuspendDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl border border-slate-100 shadow-2xl animate-scale-up">
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
              Confirm Account Suspension Action
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Are you sure you want to {showSuspendDialog.isSuspended ? "activate" : "suspend"} the registered user profile of <strong>{showSuspendDialog.name}</strong>?
            </p>
            {!showSuspendDialog.isSuspended && (
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl mt-3 flex items-start gap-2 border border-red-100/40 text-[10px]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Suspending a profile immediately revokes all current Firebase identity session tokens and prevents logins until unsuspended.</span>
              </div>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowSuspendDialog(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200/40"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendConfirm}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md ${
                  showSuspendDialog.isSuspended 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" 
                    : "bg-red-600 hover:bg-red-700 shadow-red-600/10"
                }`}
                disabled={actionLoading === showSuspendDialog.userId}
              >
                {showSuspendDialog.isSuspended ? "Confirm Activation" : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ==================================== MODAL DIALOG 3: REMOVE PROPERTY LOG ==================================== */}
      {showRemoveDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex items-center space-x-2 text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-base font-extrabold tracking-tight">
                Remove Property Listing
              </h3>
            </div>
            
            <p className="text-xs text-slate-400">
              You are removing the listing <strong>{showRemoveDialog.title}</strong> from the public search directories. Provide a compliance reason (saved alongside the soft-delete audit logs).
            </p>

            <div className="mt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reason for Removal *</label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g., Duplicate posting, Fake photos, Scam listing, Inappropriate behavior"
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:bg-white focus:border-red-500 transition-all"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => { setShowRemoveDialog(null); setRemovalReason(""); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200/40"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePropertyConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/10 disabled:opacity-40"
                disabled={!removalReason.trim() || actionLoading === showRemoveDialog.propertyId}
              >
                Confirm Soft-Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
