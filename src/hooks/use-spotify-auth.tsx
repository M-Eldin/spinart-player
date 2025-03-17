
import { useEffect, useState } from "react";
import { 
  isAuthenticated as checkAuth,
  getSpotifyLoginUrl,
  handleAuthCallback,
  logout as spotifyLogout,
  getUserProfile,
  SpotifyUser
} from "@/lib/spotify";

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);

  // Check if we're in the OAuth callback
  const isAuthCallback = window.location.search.includes("code=");

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsLoading(true);
      try {
        if (isAuthCallback) {
          const success = await handleAuthCallback();
          setIsAuthenticated(success);
        } else {
          const authStatus = await checkAuth();
          setIsAuthenticated(authStatus);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [isAuthCallback]);

  // Fetch user profile when authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated) {
        try {
          const profile = await getUserProfile();
          setUser(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated]);

  const login = async () => {
    try {
      const loginUrl = await getSpotifyLoginUrl();
      window.location.href = loginUrl;
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = () => {
    spotifyLogout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };
}
