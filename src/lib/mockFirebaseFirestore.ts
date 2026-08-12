export class MockDocRef {
  constructor(public collPath: string, public docId: string) {}
}

export class MockCollectionRef {
  constructor(public collPath: string) {}
}

export class MockQuery {
  public constraints: any[] = [];
  constructor(public collRef: MockCollectionRef) {}
}

export function doc(dbOrColl: any, collOrId: string, docId?: string) {
  if (dbOrColl instanceof MockCollectionRef) {
    return new MockDocRef(dbOrColl.collPath, collOrId);
  }
  return new MockDocRef(collOrId, docId!);
}

export function collection(dbOrDoc: any, collPath: string) {
  if (dbOrDoc instanceof MockDocRef) {
    return new MockCollectionRef(`${dbOrDoc.collPath}/${dbOrDoc.docId}/${collPath}`);
  }
  return new MockCollectionRef(collPath);
}

export function query(collRef: MockCollectionRef, ...constraints: any[]) {
  const q = new MockQuery(collRef);
  q.constraints = constraints.filter(Boolean);
  return q;
}

export function where(field: string, op: string, value: any) {
  return { type: "where", field, op, value };
}

export function limit(count: number) {
  return { type: "limit", count };
}

export function orderBy(field: string, direction: string = "asc") {
  return { type: "orderBy", field, direction };
}

export function increment(n: number) {
  return { type: "increment", value: n };
}

export function getFirestore() {
  return {};
}

export function getDocFromServer(docRef: MockDocRef) {
  return getDoc(docRef);
}

export function arrayUnion(...elements: any[]) {
  return { type: "arrayUnion", elements };
}

export function arrayRemove(...elements: any[]) {
  return { type: "arrayRemove", elements };
}

// Helper to perform API requests to /api/db
async function callDbApi(action: string, payload: any) {
  try {
    const response = await fetch(`/api/db/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      let errMessage = "DB operation failed";
      if (contentType && contentType.includes("application/json")) {
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
      }
      throw new Error(errMessage);
    }
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    throw new Error(`Unexpected non-JSON response from /api/db/${action}`);
  } catch (err: any) {
    console.error(`Local database API failed for ${action}:`, err);
    throw err;
  }
}

export async function getDoc(docRef: MockDocRef) {
  const res = await callDbApi("get", { collPath: docRef.collPath, docId: docRef.docId });
  return {
    exists: () => res.exists,
    id: docRef.docId,
    data: () => res.data
  };
}

export async function getDocs(queryOrColl: any) {
  let collPath = "";
  let constraints = [];
  if (queryOrColl instanceof MockCollectionRef) {
    collPath = queryOrColl.collPath;
  } else if (queryOrColl instanceof MockQuery) {
    collPath = queryOrColl.collRef.collPath;
    constraints = queryOrColl.constraints;
  }

  const res = await callDbApi("query", { collPath, constraints });
  const docs = (res.docs || []).map((d: any) => ({
    exists: () => true,
    id: d.id,
    data: () => d.data
  }));

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb: any) => docs.forEach(cb)
  };
}

export async function setDoc(docRef: MockDocRef, data: any) {
  await callDbApi("set", { collPath: docRef.collPath, docId: docRef.docId, data });
}

export async function updateDoc(docRef: MockDocRef, data: any) {
  await callDbApi("update", { collPath: docRef.collPath, docId: docRef.docId, data });
}

export async function deleteDoc(docRef: MockDocRef) {
  await callDbApi("delete", { collPath: docRef.collPath, docId: docRef.docId });
}

// Simple polling-based real-time listener simulating real-time snapshots safely inside iframe/sandbox
export function onSnapshot(queryOrDoc: any, callback: any) {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      if (queryOrDoc instanceof MockDocRef) {
        const snap = await getDoc(queryOrDoc);
        if (active) callback(snap);
      } else {
        const snap = await getDocs(queryOrDoc);
        if (active) callback(snap);
      }
    } catch (err) {
      console.warn("onSnapshot polling suppressed due to temporary background state:", err);
    }
    // Poll again in 2 seconds
    setTimeout(poll, 2000);
  };

  poll();

  return () => {
    active = false;
  };
}
