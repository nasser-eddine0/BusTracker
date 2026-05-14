import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  role: null,
  busId: null,
  studentId: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    id: user.id ? String(user.id) : null,
    busId: user.busId ? String(user.busId) : null,
    studentId: user.studentId ? String(user.studentId) : null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      return nextUser;
    } catch {
      localStorage.removeItem("token");
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
    setUser(nextUser);
    return nextUser;
  }, []);

  const signUp = useCallback(async (payload) => {
    const response = await api.post("/register", payload);
    localStorage.setItem("token", response.data.access_token);
    const nextUser = normalizeUser(response.data.user);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // local cleanup still matters even if the API call fails
    } finally {
      localStorage.removeItem("token");
      setUser(null);
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

export function useAuth() {
  return useContext(AuthContext);
}
