import { db } from "./firebase";
import { collection, doc, getDocs, setDoc, query, limit } from "firebase/firestore";
import { Property, User, Payment, RentRecord } from "../types";

export async function seedInitialFirestoreData() {
  try {
    // Check if properties already exist
    const propertiesSnap = await getDocs(query(collection(db, "properties"), limit(1)));
    if (!propertiesSnap.empty) {
      console.log("Firestore already seeded with LocaStay properties");
      return;
    }

    console.log("Seeding LocaStay initial platform mock records directly to Cloud Firestore...");

    // 1. Seed standard Admin and Landlord Users
    const sampleAdmin: User = {
      uid: "usr_admin",
      name: "Pradeep Sharma (Admin)",
      phone: "9988776655",
      email: "admin@locastay.com",
      role: "admin",
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", "usr_admin"), sampleAdmin);

    const sampleLandlord: User = {
      uid: "usr_landlord",
      name: "Madan Lal (Makan Malik)",
      phone: "9876543210",
      email: "landlord@locastay.com",
      role: "landlord",
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", "usr_landlord"), sampleLandlord);

    const sampleTenant: User = {
      uid: "usr_tenant",
      name: "Ravi Kumar (Kirayedar)",
      phone: "9123456789",
      email: "tenant@locastay.com",
      role: "tenant",
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", "usr_tenant"), sampleTenant);

    // 2. Seed properties in Tier 3/4 Indian towns (Jhansi, Alwar, Gaya, Salem)
    const seedProperties: Property[] = [
      {
        propertyId: "prop_seed_1",
        landlordId: "usr_landlord",
        title: "Shiv Dham Boys Hostel - Near Bundelkhand Univ",
        description: "Bundelkhand University ke bilkul paas boys hostel. Saf safai, water purifier, high-speed wifi, aur secure CCTV facilities available. Tiffin service tie-ups available.",
        type: "hostel",
        address: "Lane 3, Civil Lines, Behind BU Campus",
        city: "Jhansi",
        state: "Uttar Pradesh",
        pincode: "284001",
        latitude: 25.4484,
        longitude: 78.5685,
        rentAmount: 3200,
        depositAmount: 6400,
        amenities: ["Wifi", "Water Supply", "Electricity", "Furnished"],
        photos: ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"],
        distanceFromLandmarks: [
          { name: "BU Campus Gate", distance: "200m" },
          { name: "Jhansi Bus Stand", distance: "2.5km" }
        ],
        status: "available",
        isFeatured: true,
        isVerified: true,
        scanCount: 15,
        viewCount: 124,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        propertyId: "prop_seed_2",
        landlordId: "usr_landlord",
        title: "2 BHK Family Independent Floor (Ground Floor)",
        description: "Ekdum shant paryavaran mein swatantra ghar parivaar ke liye. Car parking space, 24 ghante pani, aur attached washroom available. Palak/Market walking distance par hai.",
        type: "house",
        address: "B-24, Shastri Nagar, Near Alwar Railway Colony",
        city: "Alwar",
        state: "Rajasthan",
        pincode: "301001",
        latitude: 27.5530,
        longitude: 76.6346,
        rentAmount: 8500,
        depositAmount: 17000,
        amenities: ["Water Supply", "Electricity", "Parking", "Attached Bath"],
        photos: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"],
        distanceFromLandmarks: [
          { name: "Alwar Junction", distance: "1.2km" },
          { name: "Local Government School", distance: "600m" }
        ],
        status: "available",
        isFeatured: false,
        isVerified: true,
        scanCount: 8,
        viewCount: 68,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        propertyId: "prop_seed_3",
        landlordId: "usr_landlord",
        title: "Single Furnished Room for Working Professionals",
        description: "Alag se entry wala fully furnished single room. Bed, almirah, study table aur fan already set hai. Single boys ya girls professional ke liye perfect choice.",
        type: "room",
        address: "Chandi Choraha, Near Gaya Market Complex",
        city: "Gaya",
        state: "Bihar",
        pincode: "823001",
        latitude: 24.7955,
        longitude: 84.9994,
        rentAmount: 2200,
        depositAmount: 4400,
        amenities: ["Electricity", "Water Supply", "Furnished"],
        photos: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"],
        distanceFromLandmarks: [
          { name: "Gaya Bus Stand", distance: "900m" },
          { name: "Main Market Complex", distance: "400m" }
        ],
        status: "available",
        isFeatured: true,
        isVerified: false,
        scanCount: 3,
        viewCount: 42,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        propertyId: "prop_seed_4",
        landlordId: "usr_landlord",
        title: "Commercial Shop - Market Frontage",
        description: "Salem main market complex mein ground floor par dukan. Retail shop, office, ya boutique ke liye best location. Heavy footfall area.",
        type: "shop",
        address: "Shop No. 12, Salem Bazaar, Near Main Chowk",
        city: "Salem",
        state: "Tamil Nadu",
        pincode: "636001",
        latitude: 11.6643,
        longitude: 78.1460,
        rentAmount: 12000,
        depositAmount: 36000,
        amenities: ["Electricity", "Water Supply", "Parking"],
        photos: ["https://images.unsplash.com/photo-1554435493-93422e8220c8?auto=format&fit=crop&w=800&q=80"],
        distanceFromLandmarks: [
          { name: "Main Town Chowk", distance: "50m" },
          { name: "Salem Bus Depot", distance: "1.5km" }
        ],
        status: "available",
        isFeatured: false,
        isVerified: true,
        scanCount: 11,
        viewCount: 105,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const prop of seedProperties) {
      await setDoc(doc(db, "properties", prop.propertyId), prop);
    }

    // 3. Seed some historical payment transactions
    const samplePayments: Payment[] = [
      {
        paymentId: "pay_seed_1",
        userId: "usr_landlord",
        type: "landlord_subscription",
        amount: 49,
        razorpayPaymentId: "pay_rzp_mock_112233",
        status: "success",
        createdAt: new Date().toISOString()
      },
      {
        paymentId: "pay_seed_2",
        userId: "usr_landlord",
        type: "featured_listing",
        amount: 99,
        razorpayPaymentId: "pay_rzp_mock_445566",
        status: "success",
        relatedPropertyId: "prop_seed_1",
        createdAt: new Date().toISOString()
      }
    ];

    for (const pay of samplePayments) {
      await setDoc(doc(db, "payments", pay.paymentId), pay);
    }

    // 4. Seed active landlord subscriptions
    await setDoc(doc(db, "subscriptions", "sub_seed_landlord"), {
      subscriptionId: "sub_seed_landlord",
      landlordId: "usr_landlord",
      plan: "featured_99",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      razorpayPaymentId: "pay_rzp_mock_445566"
    });

    console.log("Firestore successfully seeded with realistic sample records!");
  } catch (err) {
    console.error("Error seeding FireStore data:", err);
  }
}
