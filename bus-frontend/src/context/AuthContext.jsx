import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./AuthContextObject";
export { useAuth } from "./AuthContextObject";

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

