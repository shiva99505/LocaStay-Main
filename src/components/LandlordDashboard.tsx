import React, { useState, useEffect } from "react";
import MapPicker from "./MapPicker";
import { db, storage } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  onSnapshot 
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { 
  Property, 
  BookingRequest, 
  User, 
  RentRecord,
  Subscription, 
  PropertyType, 
  PropertyStatus, 
  LandmarkDistance 
} from "../types";
import { 
  Plus, 
  Home, 
  KeyRound, 
  QrCode, 
  FileText, 
  CheckCircle, 
  XCircle, 
  CreditCard,
  Eye, 
  Lock, 
  Check, 
  Image as ImageIcon, 
  Trash, 
  MapPin, 
  Sparkles, 
  Compass,
  X, 
  Download, 
  ShieldCheck, 
  Phone,
  User as UserIcon,
  Edit2,
  RefreshCw,
  PhoneCall,
  Printer
} from "lucide-react";
import QRCode from "qrcode";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useLandlordAccess } from "../hooks/useLandlordAccess";
import { NotificationCenter } from "./NotificationCenter";
import UserProfileTab from "./UserProfileTab";
import { useApp } from "../context/AppContext";

interface LandlordDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate?: (user: User) => void;
}

export default function LandlordDashboard({ currentUser, onLogout, onProfileUpdate }: LandlordDashboardProps) {
  const { language, setLanguage, theme, setTheme, t } = useApp();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    "my-properties" | "add-property" | "bookings" | "tracker" | "subscription" | "profile"
  >("my-properties");
  const [loading, setLoading] = useState(false);

  // Core Datasets
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Premium Access Gating Hooks and States
  const { access, loading: accessLoading, refreshAccess } = useLandlordAccess(currentUser.uid);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<"rentTracker" | "qrGenerator" | null>(null);

  // Move-In Modal States
  const [showMoveInModal, setShowMoveInModal] = useState(false);
  const [moveInRequest, setMoveInRequest] = useState<BookingRequest | null>(null);
  const [moveInDate, setMoveInDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rentDueDay, setRentDueDay] = useState(() => new Date().getDate());
  const [isSubmittingMoveIn, setIsSubmittingMoveIn] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  // Property Form Mode & States
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [activeFormPropertyId, setActiveFormPropertyId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<PropertyType>("room");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newDeposit, setNewDeposit] = useState("");
  const [formLat, setFormLat] = useState<number>(25.4484);
  const [formLng, setFormLng] = useState<number>(78.5685);
  const [newAmenities, setNewAmenities] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState<LandmarkDistance[]>([{ name: "", distance: "" }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Booking Filtering and Detail States
  const [bookingFilter, setBookingFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [tenantProfiles, setTenantProfiles] = useState<Record<string, User>>({});

  // Landlord Profile States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentUser.name);

  // Unread Bookings Notification States
  const [lastViewedBookingsTime, setLastViewedBookingsTime] = useState<number>(() => {
    return Number(localStorage.getItem(`last_viewed_bookings_${currentUser.uid}`) || "0");
  });

  // QR Generator Dialog States
  const [activeQRProperty, setActiveQRProperty] = useState<Property | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Payment Upgrade States
  const [upgradingPlan, setUpgradingPlan] = useState<"basic_49" | "featured_99" | null>(null);
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  // Standard Amenities List
  const allAmenities = ["Wifi", "Water Supply", "Electricity", "Parking", "Furnished", "AC", "Attached Bath"];

  // Custom unified toast states
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [showToastAlert, setShowToastAlert] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setShowToastAlert(true);
    setTimeout(() => {
      setShowToastAlert(false);
    }, 4000);
  };

  // 1. Fetch Primary Data (Properties, Rent records, Subscription)
  const fetchData = async () => {
    setLoading(true);
    try {
      // Landlord Properties (ignore soft-deleted ones)
      const qProperties = query(collection(db, "properties"), where("landlordId", "==", currentUser.uid));
      const snapProperties = await getDocs(qProperties);
      const listProperties: Property[] = [];
      snapProperties.forEach((d) => {
        const data = d.data() as Property;
        if (!(data as any).isDeleted) {
          listProperties.push(data);
        }
      });
      setProperties(listProperties);

      // Rent tracker records
      const qRent = query(collection(db, "rentRecords"), where("landlordId", "==", currentUser.uid));
      const snapRent = await getDocs(qRent);
      const listRent: RentRecord[] = [];
      snapRent.forEach((d) => {
        listRent.push(d.data() as RentRecord);
      });
      setRentRecords(listRent);

      // Tenancies
      const qTen = query(collection(db, "tenancies"), where("landlordId", "==", currentUser.uid), where("active", "==", true));
      const snapTen = await getDocs(qTen);
      const listTenancies: any[] = [];
      snapTen.forEach((d) => {
        listTenancies.push(d.data());
      });
      setTenancies(listTenancies);

      // Subscription
      const qSub = query(collection(db, "subscriptions"), where("landlordId", "==", currentUser.uid), where("status", "==", "active"));
      const snapSub = await getDocs(qSub);
      if (!snapSub.empty) {
        setSubscription(snapSub.docs[0].data() as Subscription);
      } else {
        setSubscription(null);
      }

    } catch (err) {
      console.error("Error fetching landlord datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.uid]);

  // 2. Real-time Booking Requests listener (onSnapshot)
  useEffect(() => {
    if (!currentUser.uid) return;
    const q = query(
      collection(db, "bookingRequests"),
      where("landlordId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const listBookings: BookingRequest[] = [];
        snapshot.forEach((doc) => {
          listBookings.push(doc.data() as BookingRequest);
        });
        
        // Sort newest first
        listBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookingRequests(listBookings);

        // Fetch tenant profiles dynamically for missing keys
        const tenantIds = Array.from(new Set(listBookings.map((b) => b.tenantId)));
        tenantIds.forEach(async (tId) => {
          if (!tenantProfiles[tId]) {
            try {
              const userSnap = await getDoc(doc(db, "users", tId));
              if (userSnap.exists()) {
                setTenantProfiles((prev) => ({ ...prev, [tId]: userSnap.data() as User }));
              }
            } catch (err) {
              console.error("Error fetching tenant profile:", err);
            }
          }
        });
      },
      (error) => {
        console.error("Booking requests listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Update Last Viewed Booking Requests time when visiting bookings tab
  useEffect(() => {
    if (activeTab === "bookings") {
      const now = Date.now();
      localStorage.setItem(`last_viewed_bookings_${currentUser.uid}`, String(now));
      setLastViewedBookingsTime(now);
    }
  }, [activeTab, currentUser.uid]);

  // Unread bookings count
  const unviewedPendingCount = bookingRequests.filter(
    (r) => r.status === "pending" && new Date(r.createdAt).getTime() > lastViewedBookingsTime
  ).length;

  const hasBasicAccess = () => {
    return access.features.rentTracker || access.features.qrGenerator;
  };

  // 3. Client-Side Compression + Progressive Firebase Storage Image Uploading
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files) as File[];
    
    let currentPid = editingProperty ? editingProperty.propertyId : activeFormPropertyId;
    if (!currentPid) {
      currentPid = `prop_${Math.random().toString(36).substring(2, 10)}`;
      setActiveFormPropertyId(currentPid);
    }

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          // Client-side HTML Canvas resize compression (70% quality, max 800px width)
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const MAX_WIDTH = 800;
          const scaleFactor = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (!blob) return;
              
              const storagePath = `properties/${currentPid}/photos/${Date.now()}_${file.name}`;
              const storageRef = ref(storage, storagePath);
              const uploadTask = uploadBytesResumable(storageRef, blob);
              
              setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
              
              uploadTask.on(
                "state_changed", 
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
                }, 
                (error) => {
                  console.error("Storage upload error:", error);
                  setFormError(`Photo upload issue: ${error.message}`);
                }, 
                async () => {
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  setPhotos((prev) => [...prev, downloadUrl]);
                  setUploadProgress((prev) => {
                    const copy = { ...prev };
                    delete copy[file.name];
                    return copy;
                  });
                }
              );
            }, "image/jpeg", 0.7);
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // 4. Status toggle Available / Rented / Hidden
  const handleStatusToggle = async (propertyId: string, currentStatus: PropertyStatus) => {
    try {
      const statusCycle: PropertyStatus[] = ["available", "rented", "hidden"];
      const nextIdx = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIdx];
      
      await updateDoc(doc(db, "properties", propertyId), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      
      setProperties(properties.map((p) => p.propertyId === propertyId ? { ...p, status: nextStatus } : p));
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  };

  // 5. Soft Delete Property
  const handleDeleteProperty = (propertyId: string) => {
    setPropertyToDelete(propertyId);
  };

  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return;
    try {
      await updateDoc(doc(db, "properties", propertyToDelete), {
        isDeleted: true,
        updatedAt: new Date().toISOString()
      });
      
      setProperties(properties.filter((p) => p.propertyId !== propertyToDelete));
      showToast("Property safaltapurvak delete ho gayi!", "success");
    } catch (err) {
      console.error("Delete property error:", err);
      showToast("Property delete karne mein error aaya.", "error");
    } finally {
      setPropertyToDelete(null);
    }
  };

  // 6. Transition handlers for Edit Property Form
  const startEditProperty = (p: Property) => {
    setEditingProperty(p);
    setActiveFormPropertyId(p.propertyId);
    setNewTitle(p.title);
    setNewDescription(p.description || "");
    setNewType(p.type);
    setNewAddress(p.address);
    setNewCity(p.city);
    setNewState(p.state || "Uttar Pradesh");
    setNewPincode(p.pincode || "");
    setNewRent(String(p.rentAmount));
    setNewDeposit(String(p.depositAmount));
    setFormLat(p.latitude || 25.4484);
    setFormLng(p.longitude || 78.5685);
    setNewAmenities(p.amenities || []);
    setLandmarks(p.distanceFromLandmarks && p.distanceFromLandmarks.length > 0 ? p.distanceFromLandmarks : [{ name: "", distance: "" }]);
    setPhotos(p.photos || []);
    setActiveTab("add-property");
  };

  const cancelEditProperty = () => {
    setEditingProperty(null);
    setActiveFormPropertyId("");
    setNewTitle("");
    setNewDescription("");
    setNewType("room");
    setNewAddress("");
    setNewCity("");
    setNewState("");
    setNewPincode("");
    setNewRent("");
    setNewDeposit("");
    setFormLat(25.4484);
    setFormLng(78.5685);
    setNewAmenities([]);
    setLandmarks([{ name: "", distance: "" }]);
    setPhotos([]);
    setActiveTab("my-properties");
  };

  // 7. Add or Update Property Doc Form submission
  const handleAddPropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (!newTitle || !newAddress || !newCity || !newRent) {
      setFormError("Kripya sabhi mukhya details (Title, Address, City, Rent) bharein.");
      return;
    }

    setLoading(true);
    try {
      const propertyId = editingProperty ? editingProperty.propertyId : (activeFormPropertyId || `prop_${Math.random().toString(36).substring(2, 10)}`);
      const validLandmarks = landmarks.filter((l) => l.name !== "" && l.distance !== "");

      const propertyDoc: Property = {
        propertyId,
        landlordId: currentUser.uid,
        title: newTitle,
        description: newDescription,
        type: newType,
        address: newAddress,
        city: newCity,
        state: newState || "Uttar Pradesh",
        pincode: newPincode,
        latitude: formLat,
        longitude: formLng,
        rentAmount: Number(newRent),
        depositAmount: Number(newDeposit) || Number(newRent) * 2,
        amenities: newAmenities,
        photos: photos.length > 0 ? photos : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"],
        distanceFromLandmarks: validLandmarks,
        status: editingProperty?.status || "available",
        isFeatured: editingProperty?.isFeatured || false,
        isVerified: editingProperty?.isVerified || false,
        scanCount: editingProperty?.scanCount || 0,
        viewCount: editingProperty?.viewCount || 0,
        createdAt: editingProperty?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "properties", propertyId), propertyDoc);

      setFormSuccess(true);
      
      // Reset form fields
      setEditingProperty(null);
      setActiveFormPropertyId("");
      setNewTitle("");
      setNewDescription("");
      setNewAddress("");
      setNewCity("");
      setNewState("");
      setNewPincode("");
      setNewRent("");
      setNewDeposit("");
      setFormLat(25.4484);
      setFormLng(78.5685);
      setNewAmenities([]);
      setLandmarks([{ name: "", distance: "" }]);
      setPhotos([]);

      fetchData();
      setTimeout(() => {
        setActiveTab("my-properties");
        setFormSuccess(false);
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || "Failed to list property");
    } finally {
      setLoading(false);
    }
  };

  // 8. Accept / Reject booking requests
  const handleBookingAction = async (request: BookingRequest, nextStatus: "accepted" | "rejected") => {
    try {
      await updateDoc(doc(db, "bookingRequests", request.requestId), {
        status: nextStatus
      });

      if (nextStatus === "accepted") {
        // Mark property as Rented in Firestore
        await updateDoc(doc(db, "properties", request.propertyId), {
          status: "rented",
          updatedAt: new Date().toISOString()
        });

        // Automatically trigger Move-In Modal to setup rent tracking properly and securely
        setMoveInRequest(request);
        setMoveInDate(new Date().toISOString().split("T")[0]);
        setShowMoveInModal(true);
        showToast("Tenant request accept ho gayi hai! Kripya move-in data and rent parameters confirm karein.", "success");
      }

      fetchData();
      setSelectedRequest(null);
    } catch (err) {
      console.error("Booking action error:", err);
    }
  };

  // Confirm rent paid and generate receipt via server cron callback
  const handleConfirmPaid = async (rentId: string) => {
    try {
      const response = await fetch("/api/rent/confirm-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentId })
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Error marking rent paid:", err);
    }
  };

  // QR Flyer generation handler
  const handleGenerateQR = async (property: Property) => {
    if (!hasBasicAccess()) {
      setActiveTab("subscription");
      return;
    }
    setActiveQRProperty(property);
    
    const hostUrl = window.location.origin;
    const targetUrl = `${hostUrl}/property/${property.propertyId}?source=qr`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#047857",
          light: "#FFFFFF"
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error("QR Code Error:", err);
    }
  };

  const handlePrintFlyer = () => {
    if (!activeQRProperty || !qrCodeUrl) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the flyer!");
      return;
    }
    
    const flyerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Flyer - ${activeQRProperty.title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f8fafc;
          }
          .flyer {
            width: 595px;
            height: 842px;
            background: white;
            border: 8px solid #047857;
            padding: 40px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .header {
            font-size: 32px;
            font-weight: 900;
            color: #047857;
            letter-spacing: -1px;
            margin-bottom: 5px;
          }
          .header span {
            color: #334155;
          }
          .tagline {
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
          }
          .badge {
            background: #ecfdf5;
            color: #047857;
            font-size: 12px;
            font-weight: 800;
            padding: 8px 16px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border: 1px solid #a7f3d0;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin: 20px 0 10px 0;
            line-height: 1.3;
          }
          .details {
            font-size: 16px;
            color: #475569;
            margin-bottom: 30px;
            font-weight: 500;
          }
          .rent-box {
            background: #f0fdf4;
            border: 2px dashed #047857;
            border-radius: 16px;
            padding: 15px 30px;
            margin-bottom: 30px;
          }
          .rent-amount {
            font-size: 36px;
            font-weight: 900;
            color: #047857;
          }
          .rent-label {
            font-size: 12px;
            font-weight: 700;
            color: #15803d;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .qr-container {
            border: 4px solid #f1f5f9;
            padding: 15px;
            border-radius: 24px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            margin-bottom: 20px;
          }
          .qr-image {
            width: 220px;
            height: 220px;
          }
          .scan-instruction {
            font-size: 16px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 10px;
          }
          .footer-note {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            width: 100%;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .flyer {
              box-shadow: none;
              border: 8px solid #047857;
              width: 100%;
              height: 100vh;
            }
          }
        </style>
      </head>
      <body>
        <div class="flyer">
          <div>
            <div class="header">Loca<span>Stay</span></div>
            <div class="tagline">Ghar baithe, direct bina broker ke ghar dhundhein!</div>
            <div class="badge">LocaStay Verified Property</div>
          </div>
          
          <div>
            <div class="title">${activeQRProperty.title}</div>
            <div class="details">${activeQRProperty.address}, ${activeQRProperty.city} (${activeQRProperty.pincode})</div>
            
            <div class="rent-box">
              <div class="rent-amount">₹${activeQRProperty.rentAmount}/Month</div>
              <div class="rent-label">Security Deposit: ₹${activeQRProperty.depositAmount}</div>
            </div>
          </div>
          
          <div>
            <div class="qr-container">
              <img src="${qrCodeUrl}" class="qr-image" />
            </div>
            <div class="scan-instruction">Scan code with phone camera to view details & book!</div>
          </div>
          
          <div class="footer-note">
            LocaStay platform is trust-guaranteed. No brokerage fees. Direct landlord connection.
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(flyerHtml);
    printWindow.document.close();
  };

  // Subscription plan upgrade
  const handleSubscriptionUpgrade = async (plan: "basic_49" | "featured_99") => {
    setUpgradingPlan(plan);
    setIsProcessingUpgrade(true);
    
    try {
      const amount = plan === "basic_49" ? 49 : 99;

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: plan === "basic_49" ? "landlord_subscription" : "featured_listing",
          userId: currentUser.uid
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error);

      const verifyRes = await fetch("/api/payments/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `rzp_pay_${Math.random().toString(36).substring(2, 12)}`,
          razorpaySignature: "simulated_verification_auth_key",
          type: plan === "basic_49" ? "landlord_subscription" : "featured_listing",
          amount,
          userId: currentUser.uid
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error);

      await fetchData();
      await refreshAccess();
      setUpgradingPlan(null);

    } catch (err) {
      console.error("Failed to upgrade subscription plan:", err);
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  const handleInitiateRentTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveInRequest) return;
    setIsSubmittingMoveIn(true);
    try {
      const response = await fetch("/api/rent/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: moveInRequest.propertyId,
          tenantId: moveInRequest.tenantId,
          landlordId: currentUser.uid,
          moveInDate,
          rentDueDay: Number(rentDueDay)
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Rent tracking safaltapurvak shuru ho gaya! Har mahine ki ${rentDueDay} ko reminders bheje jayenge.`, "success");
        setShowMoveInModal(false);
        setMoveInRequest(null);
        await fetchData();
      } else {
        showToast(data.error || "Rent tracking shuru karne mein error aaya", "error");
      }
    } catch (err: any) {
      console.error("Error initiating rent tracking:", err);
      showToast("Rent tracking shuru karne mein error aaya", "error");
    } finally {
      setIsSubmittingMoveIn(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: editedName,
        updatedAt: new Date().toISOString()
      });
      setIsEditingName(false);
      
      const savedUser = localStorage.getItem("locastay_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.name = editedName;
        localStorage.setItem("locastay_user", JSON.stringify(parsed));
      }
      
      window.location.reload();
    } catch (err) {
      console.error("Error updating landlord name:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLandmarkRow = () => {
    setLandmarks([...landmarks, { name: "", distance: "" }]);
  };

  const handleRemoveLandmarkRow = (idx: number) => {
    setLandmarks(landmarks.filter((_, i) => i !== idx));
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
      const tenant = tenantProfiles[r.tenantId];
      return {
        "Rent Record ID": r.rentId,
        "Property Name": prop ? prop.title : "Rental Unit",
        "Property ID": r.propertyId,
        "Tenant Name": tenant ? tenant.name : "N/A",
        "Tenant ID": r.tenantId,
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
    exportToCSV(csvData, `LocaStay_RentRecords_${new Date().toISOString().split("T")[0]}`);
  };

  const getChartData = () => {
    const monthlyMap: Record<string, { month: string; Collected: number; Pending: number }> = {};
    
    rentRecords.forEach((r) => {
      const month = r.monthYear;
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, Collected: 0, Pending: 0 };
      }
      if (r.status === "paid") {
        monthlyMap[month].Collected += r.amountDue;
      } else {
        monthlyMap[month].Pending += r.amountDue;
      }
    });
    
    return Object.values(monthlyMap).sort((a, b) => {
      const [mA, yA] = a.month.split("/").map(Number);
      const [mB, yB] = b.month.split("/").map(Number);
      return (yA * 12 + mA) - (yB * 12 + mB);
    });
  };

  // Filtered Booking Requests
  const filteredRequests = bookingRequests.filter((r) => {
    if (bookingFilter === "all") return true;
    return r.status === bookingFilter;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 pb-24 animate-fade-in" id="landlord-dashboard">
      
      {/* Custom Unified Toast Alert */}
      {showToastAlert && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl animate-fade-in ${
          toastType === "success" ? "bg-[#1F6F54]" : toastType === "error" ? "bg-red-600" : "bg-blue-600"
        }`} id="landlord-toast">
          <Check className="w-4 h-4 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* 1. Header Area */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-700 text-white rounded-xl p-2.5 font-black text-sm shadow-md tracking-tight">
            LS
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">LocaStay Landlord</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono font-medium">Owner Panel |</span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                access.plan !== "free"
                  ? access.plan === "featured"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {access.plan !== "free" ? `${access.plan.toUpperCase()} PLAN` : "FREE PLAN"}
              </span>
              {access.expiresAt && (
                <span className="text-[8px] text-slate-400 font-medium">
                  (Expires: {new Date(access.expiresAt).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Add property button for Desktop */}
          {activeTab !== "add-property" && (
            <button
              onClick={() => {
                setEditingProperty(null);
                setActiveFormPropertyId("");
                setNewTitle("");
                setNewDescription("");
                setNewAddress("");
                setNewCity("");
                setNewState("");
                setNewPincode("");
                setNewRent("");
                setNewDeposit("");
                setFormLat(25.4484);
                setFormLng(78.5685);
                setNewAmenities([]);
                setLandmarks([{ name: "", distance: "" }]);
                setPhotos([]);
                setActiveTab("add-property");
              }}
              className="hidden md:flex bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl items-center gap-1.5 transition-all shadow-md shadow-emerald-700/10"
              id="desktop-add-property-btn"
            >
              <Plus className="w-4 h-4" /> Add Property
            </button>
          )}

          {/* Centralized real-time Notification Center */}
          <NotificationCenter
            userId={currentUser.uid}
            role="landlord"
            onNavigate={(tab) => {
              if (tab === "tracker") setActiveTab("tracker");
              else if (tab === "bookings") setActiveTab("bookings");
              else setActiveTab("my-properties");
            }}
            showToast={showToast}
          />

          <button 
            onClick={fetchData} 
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            title="Refresh Data"
            id="refresh-landlord-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          
          <button 
            onClick={onLogout}
            className="text-xs font-extrabold px-3 py-2 border border-red-100 text-red-600 hover:bg-red-50 rounded-xl transition-all"
            id="logout-landlord-btn"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* 2. Desktop Tab-Bar Navigation (hidden on mobile, wrapping) */}
        <div 
          className="hidden md:flex flex-wrap gap-2 mb-6 bg-white dark:bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs" 
          id="landlord-desktop-tabs"
          style={{ backgroundColor: "#ffffff" }}
        >
          <button
            onClick={() => setActiveTab("my-properties")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-extrabold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "my-properties"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-700"
            }`}
          >
            <Home className="w-3.5 h-3.5 mr-2" />
            {t("nav.myProperties", "My Properties")}
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-extrabold rounded-xl flex items-center justify-center transition-all relative ${
              activeTab === "bookings"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-700"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 mr-2" />
            {t("nav.bookingRequests", "Booking Requests")}
            {bookingRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center animate-pulse shadow-sm">
                {bookingRequests.filter((r) => r.status === "pending").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tracker")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-extrabold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "tracker"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-700"
            }`}
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            {t("nav.rentTracker", "Rent Tracker")}
          </button>

          <button
            onClick={() => setActiveTab("subscription")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-extrabold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "subscription"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-700"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 mr-2" />
            {t("nav.subscription", "Subscription")}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 min-w-[130px] py-3 text-xs font-extrabold rounded-xl flex items-center justify-center transition-all ${
              activeTab === "profile"
                ? "bg-[#1F6F54] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-700"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 mr-2" />
            {t("nav.profile", "Profile")}
          </button>
        </div>

        {/* ==================== TAB 1: MY PROPERTIES ==================== */}
        {activeTab === "my-properties" && (
          <div className="space-y-6 animate-fade-in">
            {properties.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto">
                <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-700">Aapne abhi tak koi property list nahi ki hai</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5 leading-relaxed">
                  Apne ghar, PG, hostel ya dukan ko list karke kirayedaro se online judiye aur rent cycles automatic track karein.
                </p>
                <button
                  onClick={() => {
                    setEditingProperty(null);
                    setActiveFormPropertyId("");
                    setNewTitle("");
                    setNewDescription("");
                    setNewAddress("");
                    setNewCity("");
                    setNewState("");
                    setNewPincode("");
                    setNewRent("");
                    setNewDeposit("");
                    setNewAmenities([]);
                    setLandmarks([{ name: "", distance: "" }]);
                    setPhotos([]);
                    setActiveTab("add-property");
                  }}
                  className="bg-emerald-700 text-white text-xs font-bold px-5 py-3 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-emerald-700/10 hover:bg-emerald-800 transition-all"
                >
                  <Plus className="w-4 h-4" /> Start Your First Listing
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Insights / Stats Overview Section */}
                <div className="grid grid-cols-3 gap-4 bg-white border border-slate-100 p-5 rounded-3xl shadow-xs animate-fade-in">
                  <div className="text-center p-2 border-r border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Listings</span>
                    <span className="text-sm sm:text-base font-black text-slate-800">{properties.length}</span>
                  </div>
                  <div className="text-center p-2 border-r border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total QR Scans</span>
                    <span className="text-sm sm:text-base font-black text-emerald-700 flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                      {properties.reduce((acc, curr) => acc + (curr.scanCount || 0), 0)}
                    </span>
                  </div>
                  <div className="text-center p-2">
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Views</span>
                    <span className="text-sm sm:text-base font-black text-blue-700 flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                      {properties.reduce((acc, curr) => acc + (curr.viewCount || 0), 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p) => (
                  <div key={p.propertyId} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-200/60 transition-all">
                    
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <img src={p.photos[0]} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      
                      <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider ${
                          p.status === "available"
                            ? "bg-emerald-600 text-white"
                            : p.status === "rented"
                            ? "bg-slate-900 text-white"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {p.status}
                        </span>
                        {p.isFeatured && (
                          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1 uppercase">
                            <Sparkles className="w-3 h-3 text-amber-100" /> Featured
                          </span>
                        )}
                        {p.isVerified && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1 uppercase">
                            Verified ✓
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                        <p className="text-[11px] text-slate-400 flex items-center mt-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {p.address}, {p.city}
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50/60 p-3 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Rent</span>
                            <span className="text-xs font-black text-slate-800">₹{p.rentAmount}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">QR Scans</span>
                            <span className="text-xs font-black text-slate-800">{p.scanCount || 0}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Views</span>
                            <span className="text-xs font-black text-slate-800">{p.viewCount || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                        {/* Quick status cycle buttons */}
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                          {(["available", "rented", "hidden"] as PropertyStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, "properties", p.propertyId), { status: st });
                                  setProperties(properties.map((x) => x.propertyId === p.propertyId ? { ...x, status: st } : x));
                                } catch (e) {
                                  console.error("Status update error:", e);
                                }
                              }}
                              className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg uppercase tracking-wider transition-all ${
                                p.status === st
                                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/50"
                                  : "text-slate-400 hover:text-slate-700"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        {/* Property Cards management buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => startEditProperty(p)}
                            className="text-[10px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProperty(p.propertyId)}
                            className="text-[10px] font-bold border border-red-100 text-red-600 hover:bg-red-50/50 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <Trash className="w-3.5 h-3.5" /> Del
                          </button>

                          <button
                            onClick={() => {
                              if (!access.features.qrGenerator) {
                                setShowUpgradePrompt("qrGenerator");
                                return;
                              }
                              handleGenerateQR(p);
                            }}
                            className="text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs"
                          >
                            {!access.features.qrGenerator && <Lock className="w-3 h-3 text-emerald-100/85 shrink-0" />}
                            <QrCode className="w-3.5 h-3.5" /> Flyer
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: ADD / EDIT PROPERTY FORM ==================== */}
        {activeTab === "add-property" && (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 max-w-2xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                {editingProperty ? "Property Details Badlein (Edit Listing)" : "Nayi Property List Karein (Add Listing)"}
              </h2>
              {editingProperty && (
                <button
                  onClick={cancelEditProperty}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs rounded-xl font-medium mb-5">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-green-50 text-green-700 border border-green-100 text-xs rounded-xl font-medium mb-5">
                Property listing safely updated! Redirecting to dashboard...
              </div>
            )}

            <form onSubmit={handleAddPropertySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Property Title (Ghar ka Naam)</label>
                <input
                  type="text"
                  placeholder="E.g. Shiv Dham Hostel, 2 BHK Independent House"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Property Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="room">Room (Kamra)</option>
                    <option value="house">House (Swatantra Ghar)</option>
                    <option value="hostel">Hostel (PG)</option>
                    <option value="shop">Shop (Dukan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Rent Amount (₹/Month)</label>
                  <input
                    type="number"
                    placeholder="E.g. 3500"
                    value={newRent}
                    onChange={(e) => setNewRent(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Security Deposit (₹)</label>
                  <input
                    type="number"
                    placeholder="E.g. 7000"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">PIN Code (6 digits)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="284001"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Detailed Address (Pura Pata)</label>
                <input
                  type="text"
                  placeholder="E.g. House No. 12, Behind BU Campus, Shastri Nagar"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">City (Shehar)</label>
                  <input
                    type="text"
                    placeholder="Jhansi"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">State (Rajya)</label>
                  <input
                    type="text"
                    placeholder="Uttar Pradesh"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Map Picker pin drop */}
              <div className="border border-slate-100 rounded-3xl p-5 bg-slate-50/50">
                <label className="block text-xs font-black text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-700 shrink-0" /> Set Property GPS Location (Map Pin)
                </label>
                <MapPicker
                  latitude={formLat}
                  longitude={formLng}
                  onChange={(lat, lng, address) => {
                    setFormLat(lat);
                    setFormLng(lng);
                    if (!newAddress) {
                      setNewAddress(address);
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wide">Amenities Checklist</label>
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map((am) => {
                    const isChecked = newAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setNewAmenities(newAmenities.filter((a) => a !== am));
                          } else {
                            setNewAmenities([...newAmenities, am]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          isChecked
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {am}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo uploading field with progress bar */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wide">Upload Photos (Compressed on client-side)</label>
                <div className="grid grid-cols-4 gap-2">
                  <label className="border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-emerald-500 bg-slate-50/50 transition-colors">
                    <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[9px] font-extrabold text-slate-500">Add Photo</span>
                    <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden shadow-xs border border-slate-100">
                      <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="absolute right-1.5 top-1.5 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Progressive uploads list showing percentage loaders */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="mt-3 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Uploading Progress</p>
                    {Object.entries(uploadProgress).map(([fileName, pct]) => (
                      <div key={fileName} className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 font-medium truncate flex-1">{fileName}</span>
                        <div className="w-32 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-600">{pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repeatable Near Landmarks Distances */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">Nearby Landmarks (Repeatable Fields)</label>
                  <button
                    type="button"
                    onClick={handleAddLandmarkRow}
                    className="text-[10px] font-extrabold text-emerald-700 hover:underline flex items-center"
                  >
                    + Add Landmark
                  </button>
                </div>
                <div className="space-y-2">
                  {landmarks.map((l, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="E.g. Railway Station, Bus Stand"
                        value={l.name}
                        onChange={(e) => {
                          const updated = [...landmarks];
                          updated[idx].name = e.target.value;
                          setLandmarks(updated);
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Distance (e.g. 500m)"
                        value={l.distance}
                        onChange={(e) => {
                          const updated = [...landmarks];
                          updated[idx].distance = e.target.value;
                          setLandmarks(updated);
                        }}
                        className="w-28 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                      />
                      {landmarks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLandmarkRow(idx)}
                          className="p-2 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wide">Detailed Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="E.g. Shiv Dham Hostel ke is kamre mein single beds, water cooler, aur daily cleaning suvidha shamil hai..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-lg transition-all"
              >
                {loading ? "Saving Information..." : editingProperty ? "Save Changes (Update Property)" : "Publish Listing (Save Property)"}
              </button>
            </form>
          </div>
        )}

        {/* ==================== TAB 3: BOOKING REQUESTS ==================== */}
        {activeTab === "bookings" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Booking Requests</h2>
              
              {/* Filter Sub-Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start">
                {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBookingFilter(f)}
                    className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg tracking-wider transition-all ${
                      bookingFilter === f
                        ? "bg-white text-emerald-800 shadow-xs"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm max-w-lg mx-auto">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 leading-normal">
                  Koshish karein! Is filter ({bookingFilter}) ke antargat koi request nahi mili.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const prop = properties.find((p) => p.propertyId === req.propertyId);
                  const tenant = tenantProfiles[req.tenantId];
                  
                  return (
                    <div 
                      key={req.requestId} 
                      onClick={() => setSelectedRequest(req)}
                      className="bg-white border border-slate-100 hover:border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 cursor-pointer transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                            REQ-{req.requestId.slice(-6).toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            req.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : req.status === "rejected"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-bold text-slate-800 mt-2">
                          Tenant: {tenant ? tenant.name : `Renter ID: ${req.tenantId.slice(-6).toUpperCase()}`}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          Listing: <span className="font-bold text-slate-600">{prop ? prop.title : "Rental Unit"}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Requested: {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {req.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleBookingAction(req, "rejected")}
                              className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button
                              onClick={() => handleBookingAction(req, "accepted")}
                              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-emerald-700/10"
                            >
                              <CheckCircle className="w-4 h-4" /> Accept Request
                            </button>
                          </>
                        )}
                        {req.status !== "pending" && (
                          <div className="flex gap-2">
                            {req.status === "accepted" && !tenancies.some((t) => t.propertyId === req.propertyId && t.active) && (
                              <button
                                onClick={() => {
                                  if (!access.features.rentTracker) {
                                    setShowUpgradePrompt("rentTracker");
                                    return;
                                  }
                                  setMoveInRequest(req);
                                  setMoveInDate(new Date().toISOString().split("T")[0]);
                                  setRentDueDay(new Date().getDate());
                                  setShowMoveInModal(true);
                                }}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-700/10 flex items-center gap-1"
                              >
                                {!access.features.rentTracker && <Lock className="w-3 h-3 text-emerald-100/80 shrink-0" />}
                                <Sparkles className="w-3.5 h-3.5" /> Mark Moved In
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-3 py-2 rounded-xl transition-all"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: RENT CYCLE MANAGEMENT ==================== */}
        {activeTab === "tracker" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Rent Cycles Tracker</h2>
                <p className="text-xs text-slate-400 font-medium">Automatic rent cycle logging & billing records</p>
              </div>
              {hasBasicAccess() && rentRecords.length > 0 && (
                <button
                  onClick={handleExportRentRecords}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-100 text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export Rent History (CSV)
                </button>
              )}
            </div>

            {!hasBasicAccess() ? (
              <div className="bg-amber-50/60 border border-amber-100 p-8 rounded-3xl text-center space-y-4 max-w-lg mx-auto shadow-sm">
                <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">🔒 Premium Feature Gating</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Automatic Rent Tracking, printable receipts generation, and SMS/WhatsApp reminders are locked. Kripya ₹49/month plans se unlock karein.
                </p>
                <button
                  onClick={() => setActiveTab("subscription")}
                  className="bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md"
                >
                  View Plans & Unlock Now
                </button>
              </div>
            ) : rentRecords.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm">
                <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Abhi tak kisi tenant ka active rent cycle record nahi paya gaya.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Recharts Collection Trends Chart */}
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs">
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                      Revenue Metrics
                    </span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mt-2">Monthly Rent Collection Trends</h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }} />
                        <Bar dataKey="Collected" fill="#047857" name="Collected (₹)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pending" fill="#F59E0B" name="Pending (₹)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Rent Cycle List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">All Rent Billing Logs</h3>
                  {rentRecords.map((r) => {
                    const prop = properties.find((p) => p.propertyId === r.propertyId);
                    const tenant = tenantProfiles[r.tenantId];
                    return (
                      <div key={r.rentId} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{r.monthYear}</span>
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                              r.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : r.status === "pending_confirmation"
                                ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                                : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                            }`}>
                              {r.status === "pending_confirmation" ? "Tenant Paid (Verify)" : r.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-700 mt-2">
                            Tenant: {tenant ? tenant.name : `ID: ${r.tenantId.slice(-6).toUpperCase()}`}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            Listing: <span className="font-semibold text-slate-600">{prop ? prop.title : "Rental Unit"}</span> | Amount: <span className="font-bold text-slate-700">₹{r.amountDue}</span> | Due Date: {r.dueDate}
                          </p>
                          {r.status === "pending_confirmation" && (
                            <div className="mt-1.5 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-500">
                              Payment Mode: <strong className="text-slate-700">{r.paymentMode || "Not Provided"}</strong>
                              {r.transactionId && <span> | Ref ID: <strong className="text-slate-700">{r.transactionId}</strong></span>}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {r.status !== "paid" && (
                            <button
                              onClick={() => handleConfirmPaid(r.rentId)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
                            >
                              Confirm Paid & Receipt
                            </button>
                          )}
                          {r.status === "paid" && r.receiptUrl && (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-xl inline-flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: PLANS & SUBSCRIPTIONS ==================== */}
        {activeTab === "subscription" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Premium Booster Plans</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative flex flex-col justify-between h-full">
                {subscription?.plan === "basic_49" && (
                  <span className="absolute -top-3 left-6 bg-emerald-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    Active Plan
                  </span>
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-700">Basic Automation Pack</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Perfect for serious independent local landlords</p>
                  
                  <div className="my-5 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800">₹49</span>
                    <span className="text-xs font-bold text-slate-400">/ month</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Rent cycles automated records</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Dynamic printable QR Flyer generation</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Digital PDF printable receipts</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> SMS payment reminders support</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscriptionUpgrade("basic_49")}
                  disabled={isProcessingUpgrade || subscription?.plan === "basic_49"}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessingUpgrade && upgradingPlan === "basic_49" ? "Upgrading..." : subscription?.plan === "basic_49" ? "Subscribed ✅" : "Upgrade to ₹49"}
                </button>
              </div>

              <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-100 rounded-3xl p-6 shadow-sm relative flex flex-col justify-between h-full">
                {subscription?.plan === "featured_99" && (
                  <span className="absolute -top-3 left-6 bg-amber-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    Active Plan
                  </span>
                )}
                <div>
                  <h3 className="text-sm font-black text-amber-950 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Featured Booster Pack
                  </h3>
                  <p className="text-[11px] text-amber-800 mt-1">Get 10x more tenant inquiries instantly</p>
                  
                  <div className="my-5 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-950">₹99</span>
                    <span className="text-xs font-bold text-amber-700">/ month</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-amber-900 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Put your properties at the very top</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Special VIP Landlord verified badge</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> All Basic automation plan benefits</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscriptionUpgrade("featured_99")}
                  disabled={isProcessingUpgrade || subscription?.plan === "featured_99"}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessingUpgrade && upgradingPlan === "featured_99" ? "Upgrading..." : subscription?.plan === "featured_99" ? "Featured Active ✅" : "Activate Booster ₹99"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: LANDLORD PROFILE ==================== */}
        {activeTab === "profile" && (
          <UserProfileTab
            currentUser={currentUser}
            onLogout={onLogout}
            role="landlord"
            onProfileUpdate={onProfileUpdate}
          />
        )}

      </div>

      {/* ==================== 3. Mobile Bottom Navigation Bar ==================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 py-2.5 px-4 flex justify-around items-center z-40 shadow-xl" id="mobile-navigation-bar">
        <button
          onClick={() => setActiveTab("my-properties")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            activeTab === "my-properties" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>{t("nav.myPropertiesShort", "My Listings")}</span>
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold relative ${
            activeTab === "bookings" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          <KeyRound className="w-5 h-5" />
          <span>{t("nav.bookingRequestsShort", "Requests")}</span>
          {bookingRequests.filter((r) => r.status === "pending").length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold rounded-full text-[8px] w-4 h-4 flex items-center justify-center animate-pulse">
              {bookingRequests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tracker")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            activeTab === "tracker" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>{t("nav.rentTrackerShort", "Tracker")}</span>
        </button>

        <button
          onClick={() => setActiveTab("subscription")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            activeTab === "subscription" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>{t("nav.subscriptionShort", "Plans")}</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            activeTab === "profile" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span>{t("nav.profile", "Profile")}</span>
        </button>
      </div>

      {/* Floating Action Button (FAB) for mobile */}
      {activeTab !== "add-property" && (
        <button
          onClick={() => {
            setEditingProperty(null);
            setActiveFormPropertyId("");
            setNewTitle("");
            setNewDescription("");
            setNewAddress("");
            setNewCity("");
            setNewState("");
            setNewPincode("");
            setNewRent("");
            setNewDeposit("");
            setNewAmenities([]);
            setLandmarks([{ name: "", distance: "" }]);
            setPhotos([]);
            setActiveTab("add-property");
          }}
          className="md:hidden fixed bottom-20 right-6 bg-emerald-700 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-800 z-50 flex items-center justify-center transition-all scale-100 active:scale-95 border-2 border-white"
          id="mobile-add-property-fab"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Booking Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="booking-detail-modal">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-emerald-700 text-white p-6 text-center">
              <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-90" />
              <h3 className="text-base font-black">Request Details</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Booking request information panel</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Property Name</span>
                  <span className="text-xs font-bold text-slate-800">
                    {properties.find((p) => p.propertyId === selectedRequest.propertyId)?.title || "Rental Unit"}
                  </span>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Tenant Name</span>
                  <span className="text-xs font-bold text-slate-800">
                    {tenantProfiles[selectedRequest.tenantId]?.name || `Renter (${selectedRequest.tenantId.slice(-6).toUpperCase()})`}
                  </span>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className="text-xs font-black uppercase text-emerald-800">{selectedRequest.status}</span>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Requested On</span>
                  <span className="text-xs font-bold text-slate-800">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Tenant Contact Info</span>
                  {selectedRequest.unlockedContact ? (
                    <div className="mt-2 bg-emerald-50 p-3 border border-emerald-100 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>{tenantProfiles[selectedRequest.tenantId]?.phone || "Not Available"}</span>
                      </div>
                      <a
                        href={`tel:${tenantProfiles[selectedRequest.tenantId]?.phone}`}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-2 px-3 rounded-xl text-[10px] flex items-center justify-center gap-1.5 shadow-sm transition-all uppercase"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call Tenant Now
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic mt-1 block">
                      🔒 Tenant hasn't completed Razorpay unlock yet.
                    </span>
                  )}
                </div>
              </div>

              {selectedRequest.status === "pending" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleBookingAction(selectedRequest, "rejected")}
                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleBookingAction(selectedRequest, "accepted")}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-700/10"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                </div>
              )}

              {selectedRequest.status === "accepted" && !tenancies.some((t) => t.propertyId === selectedRequest.propertyId && t.active) && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!access.features.rentTracker) {
                        setShowUpgradePrompt("rentTracker");
                        setSelectedRequest(null);
                        return;
                      }
                      setMoveInRequest(selectedRequest);
                      setMoveInDate(new Date().toISOString().split("T")[0]);
                      setRentDueDay(new Date().getDate());
                      setShowMoveInModal(true);
                      setSelectedRequest(null);
                    }}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/10 uppercase tracking-wide transition-all"
                  >
                    {!access.features.rentTracker && <Lock className="w-4 h-4 text-emerald-100/80 shrink-0" />}
                    <Sparkles className="w-4 h-4" /> Mark Tenant as Moved In
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* QR Flyer Download Dialog */}
      {activeQRProperty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="qr-dialog">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setActiveQRProperty(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 text-center space-y-4">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">Printable QR Flyer</h3>
              <p className="text-xs text-slate-400 font-medium">Download and print this flyer to paste on your property wall!</p>
              
              <div className="border-4 border-emerald-700 p-4 rounded-2xl bg-white text-center space-y-3" id="flyer-printable-template">
                <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                  LocaStay Verified Listing
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">{activeQRProperty.title}</h4>
                <p className="text-xs text-slate-500 font-bold">Rent: ₹{activeQRProperty.rentAmount}/month</p>
                
                {qrCodeUrl && (
                  <div className="aspect-square w-40 h-40 mx-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <img src={qrCodeUrl} alt="LocaStay QR" className="w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Scan code to view details & book!</p>
              </div>

               <div className="flex flex-col gap-2 w-full">
                <a
                  href={qrCodeUrl}
                  download={`${activeQRProperty.title}-flyer.png`}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/10 transition-all"
                >
                  <Download className="w-4 h-4" /> Download QR Image
                </a>

                <button
                  onClick={handlePrintFlyer}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" /> Print / Download PDF Flyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move-In & Start Rent Tracking Modal */}
      {showMoveInModal && moveInRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="move-in-dialog">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button
              onClick={() => {
                setShowMoveInModal(false);
                setMoveInRequest(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-emerald-700 text-white p-6 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-90" />
              <h3 className="text-base font-black uppercase tracking-wide">Kirayedar Move-In Confirm Karein</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Start automatic rent tracking & monthly reminders</p>
            </div>

            <form onSubmit={handleInitiateRentTracking} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Aap <strong>{tenantProfiles[moveInRequest.tenantId]?.name || "Kirayedar"}</strong> ko official taur par moved-in mark kar rahe hain. Isse is property ke liye rent tracking shuru ho jayegi aur automated reminders set ho jayenge.
              </p>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wide">Move-In Date</label>
                <input
                  type="date"
                  required
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase tracking-wide">Monthly Rent Due Day (1-28)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">E.g. "5" matlab har mahine ki 5 tarik ko automatic rent bill banega aur reminder jayega.</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveInModal(false);
                    setMoveInRequest(null);
                  }}
                  className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMoveIn}
                  className="w-1/2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-emerald-700/10 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingMoveIn ? "Processing..." : "Confirm Move-In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="upgrade-prompt-modal">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowUpgradePrompt(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-50 transition-all outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-amber-50 text-amber-700 border border-amber-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-800">
                {showUpgradePrompt === "rentTracker" ? "Automated Rent Tracking Locked" : "Printable QR Flyer Locked"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {showUpgradePrompt === "rentTracker"
                  ? "Rent cycles automated records, PDF compliant receipts, and automated SMS alerts require a premium plan."
                  : "Downloading custom physical brochures with dynamic QR codes and property statistics requires a premium plan."}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlock All Premium Features:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600 font-medium">
                <li>✓ Unlimited property listings</li>
                <li>✓ Automatic rent records generation</li>
                <li>✓ Download and print PDF flyers with QR</li>
                <li>✓ Verified Owner Badge (Attract 10x renters)</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpgradePrompt(null);
                  setActiveTab("subscription");
                }}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md shadow-emerald-700/10 transition-all"
              >
                View Pricing & Upgrade (Starts ₹49)
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradePrompt(null)}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-property-modal">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Trash className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-800">
                Property Delete Karein?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Kya aap such mein is property ko list se hatana chahte hain? Yeh action revert nahi kiya ja sakta.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase transition-all"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={confirmDeleteProperty}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md shadow-red-600/15 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
