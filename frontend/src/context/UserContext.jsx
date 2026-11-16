import { createContext, useCallback, useEffect, useState } from "react";
import * as authApi from "../services/authService";
import * as billingApi from "../services/billingService";
import { getToken, saveToken, removeToken } from "../utils/token";
import defaultAvatar from "../assets/default-avatar.svg";

export const UserContext = createContext();

// Shape the backend user for the UI: id alias, and the standard default
// avatar until the user uploads their own photo
const normalizeUser = (u) =>
  u
    ? {
        ...u,
        id: u._id,
        avatar: u.avatar || defaultAvatar,
        hasCustomAvatar: !!u.avatar,
      }
    : null;

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null);
  // true while we check a saved token on first load
  const [authLoading, setAuthLoading] = useState(!!getToken());

  const setUser = useCallback((u) => setUserState(normalizeUser(u)), []);

  const logout = useCallback(() => {
    removeToken();
    // per-session AI data must not leak to the next account in this tab
    try {
      sessionStorage.removeItem("tasklytic:insights");
      sessionStorage.removeItem("tasklytic:play-briefing");
      window.speechSynthesis?.cancel();
    } catch { /* storage blocked */ }
    setUserState(null);
  }, []);

  // Restore session from saved token
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    authApi
      .getCurrentUser()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setAuthLoading(false));
    return () => {
      cancelled = true;
    };
  }, [setUser, logout]);

  // apiClient fires this when the server says the token is invalid/expired
  useEffect(() => {
    const onForcedLogout = () => setUserState(null);
    window.addEventListener("auth:logout", onForcedLogout);
    return () => window.removeEventListener("auth:logout", onForcedLogout);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const { user: u, token } = await authApi.loginUser(credentials);
      saveToken(token);
      setUser(u);
      return u;
    },
    [setUser]
  );

  const register = useCallback(
    async (data) => {
      const { user: u, token } = await authApi.registerUser(data);
      saveToken(token);
      setUser(u);
      return u;
    },
    [setUser]
  );

  const updateProfile = useCallback(
    async (data) => {
      const u = await authApi.updateProfile(data);
      setUser(u);
      return u;
    },
    [setUser]
  );

  const uploadAvatar = useCallback(
    async (file) => {
      const u = await authApi.uploadAvatar(file);
      setUser(u);
      return u;
    },
    [setUser]
  );

  // After Paddle checkout (or a card update): pull the latest plan from Paddle
  const syncSubscription = useCallback(async (transactionId) => {
    const u = await billingApi.syncSubscription(transactionId);
    setUser(u);
    return u;
  }, [setUser]);

  // Turn Premium auto-renew off / back on
  const cancelSubscription = useCallback(async () => {
    const u = await billingApi.cancelSubscription();
    setUser(u);
    return u;
  }, [setUser]);

  const resumeSubscription = useCallback(async () => {
    const u = await billingApi.resumeSubscription();
    setUser(u);
    return u;
  }, [setUser]);

  const removeAvatar = useCallback(async () => {
    const u = await authApi.removeAvatar();
    setUser(u);
    return u;
  }, [setUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        authLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        syncSubscription,
        cancelSubscription,
        resumeSubscription,
        isPremium: !!user?.isPremium,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
