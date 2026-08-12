class MockAuth {
  currentUser: any = null;
  listeners: any[] = [];

  constructor() {
    const savedUser = localStorage.getItem("locastay_user");
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  onAuthStateChanged(callback: any) {
    this.listeners.push(callback);
    // Call immediately with the current state to simulate Firestore behavior
    setTimeout(() => {
      callback(this.currentUser);
    }, 0);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  updateUser(user: any) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem("locastay_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("locastay_user");
    }
    this.listeners.forEach(l => l(user));
  }
}

const authInstance = new MockAuth();

export function getAuth() {
  return authInstance;
}

export function onAuthStateChanged(auth: any, callback: any) {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithCustomToken(auth: any, token: string) {
  const savedUser = localStorage.getItem("locastay_user");
  if (savedUser) {
    const user = JSON.parse(savedUser);
    auth.updateUser(user);
    return { user };
  }
  return { user: auth.currentUser };
}

export async function signInWithEmailAndPassword(auth: any, email: string) {
  const response = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", email })
  });
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Authentication endpoint returned non-JSON response");
  }
  const data = await response.json();
  if (data.user) {
    localStorage.setItem("locastay_user", JSON.stringify(data.user));
    localStorage.setItem("locastay_token", data.token);
    auth.updateUser(data.user);
    return { user: data.user };
  }
  throw new Error(data.error || "Login failed");
}

export async function createUserWithEmailAndPassword(auth: any, email: string) {
  const response = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", email, isRegistering: true })
  });
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Registration endpoint returned non-JSON response");
  }
  const data = await response.json();
  if (data.user) {
    localStorage.setItem("locastay_user", JSON.stringify(data.user));
    localStorage.setItem("locastay_token", data.token);
    auth.updateUser(data.user);
    return { user: data.user };
  }
  throw new Error(data.error || "Registration failed");
}

export async function signOut(auth: any) {
  localStorage.removeItem("locastay_user");
  localStorage.removeItem("locastay_token");
  auth.updateUser(null);
}
