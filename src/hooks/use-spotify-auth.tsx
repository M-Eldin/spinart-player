
import { useEffect, useState } from "react";
import { 
  isAuthenticated as checkAuth,
  getSpotifyLoginUrl,
  handleAuthCallback,
  logout as spotifyLogout,
  getUserProfile,
  SpotifyUser
} from "@/lib/spotify";
import { toast } from "sonner";

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if we're in the OAuth callback
  // Note: Handle both query params and hash-based routing
  const isAuthCallback = window.location.search.includes("code=") || 
                         window.location.hash.includes("?code=") || 
                         window.location.hash.includes("&code=");

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsLoading(true);
      try {
        if (isAuthCallback) {
          console.log("Processing auth callback...");
          // Extract code from URL, handling both query params and hash-based routing
          let code = "";
          const searchParams = new URLSearchParams(window.location.search);
          code = searchParams.get("code") || "";
          
          // If code wasn't found in search params, check the hash
          if (!code && window.location.hash) {
            // Remove the '#/' prefix if it exists (for HashRouter)
            const hashContent = window.location.hash.replace(/^#\/?/, '');
            const hashParams = new URLSearchParams(hashContent.includes('?') ? 
              hashContent.substring(hashContent.indexOf('?')) : hashContent);
            code = hashParams.get("code") || "";
          }
          
          console.log("Auth code found:", code ? "Yes (length: " + code.length + ")" : "No");
          
          const success = await handleAuthCallback(code);
          setIsAuthenticated(success);
          if (!success) {
            setAuthError("Failed to complete authentication");
          }
        } else {
          const authStatus = await checkAuth();
          setIsAuthenticated(authStatus);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setAuthError(error instanceof Error ? error.message : "Unknown authentication error");
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
          toast.error("Failed to load Spotify profile");
        }
      } else {
        setUser(null);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated]);

  const login = async () => {
    try {
      console.log("Starting login process...");
      console.log("Current location:", window.location.href);
      setAuthError(null);
      const loginUrl = await getSpotifyLoginUrl();
      console.log("Redirecting to:", loginUrl);
      window.location.href = loginUrl;
    } catch (error) {
      console.error("Login error:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to generate login URL");
      toast.error("Failed to connect to Spotify");
    }
  };

  const logout = () => {
    spotifyLogout();
    setIsAuthenticated(false);
    setUser(null);
    setAuthError(null);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    authError,
    login,
    logout
  };
}
