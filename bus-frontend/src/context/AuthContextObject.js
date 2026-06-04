import { createContext, useContext } from "react";

export const AuthContext = createContext({
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

export function useAuth() {
  return useContext(AuthContext);
}
