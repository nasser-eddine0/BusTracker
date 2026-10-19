import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { auth, signInWithCustomToken, signOut as firebaseSignOut } from "../firebase";
import { AuthContext } from "./AuthContextObject";
function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    id: user.id ? String(user.id) : null,
    busId: user.busId ? String(user.busId) : null,
    studentId: user.studentId ? String(user.studentId) : null,
  };
}

function readCachedUser() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    return rawUser ? normalizeUser(JSON.parse(rawUser)) : null;
  } catch {
    return null;
  }
}

function clearClientAuthState() {
  localStorage.removeItem("token");
  localStorage.removeItem("auth_user");

  try {
    sessionStorage.removeItem("admin_bootstrap_cache");
  } catch {
    // ignore storage cleanup failures
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem("token")) && !readCachedUser();
  });

    const refreshProfile = useCallback(async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return null;
      }

      try {
        const response = await api.get("/me");
        const nextUser = normalizeUser(response.data.user);
        setUser(nextUser);
        localStorage.setItem("auth_user", JSON.stringify(nextUser));
        
        // Re-initialize Firebase authentication with fresh token
        try {
          const firebaseTokenResponse = await api.get("/firebase-token");
          await signInWithCustomToken(auth, firebaseTokenResponse.data.firebaseToken);
        } catch (error) {
          console.error("Failed to refresh Firebase authentication:", error);
          // Don't fail the profile refresh if Firebase auth fails
        }
        
        return nextUser;
      } catch {
        clearClientAuthState();
        setUser(null);
        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

    const signIn = useCallback(async (payload) => {
      const response = await api.post("/login", payload);
      localStorage.setItem("token", response.data.access_token);
      const nextUser = normalizeUser(response.data.user);
      localStorage.setItem("auth_user", JSON.stringify(nextUser));
      setUser(nextUser);
      setLoading(false);
      
      // Initialize Firebase authentication
      try {
        const firebaseTokenResponse = await api.get("/firebase-token");
        await signInWithCustomToken(auth, firebaseTokenResponse.data.firebaseToken);
      } catch (error) {
        console.error("Failed to initialize Firebase authentication:", error);
        // Don't fail the login if Firebase auth fails - the app can still work with REST API
      }
      
      return nextUser;
    }, []);

  const signUp = useCallback(async (payload) => {
    const response = await api.post("/register", payload);
    localStorage.setItem("token", response.data.access_token);
    const nextUser = normalizeUser(response.data.user);
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
    setUser(nextUser);
    setLoading(false);
    return nextUser;
  }, []);

    const signOut = useCallback(async () => {
      try {
        await api.post("/logout");
      } catch {
        // local cleanup still matters even if the API call fails
      } finally {
        // Sign out from Firebase
        try {
          await firebaseSignOut(auth);
        } catch (error) {
          console.error("Failed to sign out from Firebase:", error);
        }
        
        clearClientAuthState();
        setUser(null);
        setLoading(false);
      }
    }, []);

  const value = useMemo(() => {
    return {
      user,
      profile: user,
      loading,
      role: user?.role || null,
      schoolId: user?.schoolId || null,
      busId: user?.busId || null,
      studentId: user?.studentId || null,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    };
  }, [loading, refreshProfile, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

