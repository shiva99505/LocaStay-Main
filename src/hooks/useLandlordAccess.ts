import { useState, useEffect } from "react";

export interface LandlordAccess {
  plan: "free" | "basic" | "featured";
  isActive: boolean;
  expiresAt: string | null;
  features: {
    rentTracker: boolean;
    qrGenerator: boolean;
    topPlacement: boolean;
  };
}

export function useLandlordAccess(landlordId: string) {
  const [access, setAccess] = useState<LandlordAccess>({
    plan: "free",
    isActive: false,
    expiresAt: null,
    features: {
      rentTracker: false,
      qrGenerator: false,
      topPlacement: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/landlord/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landlordId }),
      });
      if (!res.ok) {
        throw new Error("Failed to check landlord access");
      }
      const data = await res.json();
      if (data.success) {
        setAccess(data.access);
      } else {
        throw new Error(data.error || "Failed to retrieve access info");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("useLandlordAccess error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccess();
  }, [landlordId]);

  return { access, loading, error, refreshAccess: fetchAccess };
}
