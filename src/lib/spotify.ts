import { toast } from "sonner";

// Spotify API endpoints
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API_ENDPOINT = "https://api.spotify.com/v1";

// Your Spotify App credentials (these are public credentials intended for client-side auth)
const CLIENT_ID = "1a70ba777fec4ffd9633c0c418246310"; // This is a placeholder ID, replace with your real Spotify Client ID

// For GitHub Pages compatibility
const isGitHubPages = window.location.hostname.includes("github.io");

// Configure redirect URI based on whether we're using hash router (GitHub Pages) or not
const getRedirectUri = () => {
  if (isGitHubPages) {
    // For GitHub Pages with hash router, we need to ensure the callback works correctly
    // Remove the hash part and return just the origin with path
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return origin + pathname;
  } else {
    // For regular development or non-GitHub Pages deployment
    return window.location.origin + window.location.pathname;
  }
};

const REDIRECT_URI = getRedirectUri();

// Log the redirect URI for debugging
console.log("Spotify Redirect URI:", REDIRECT_URI);

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
  "streaming",
  "user-read-email",
  "user-read-private",
];

// Local storage keys
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

// Generate a random string for state verification
const generateRandomString = (length: number) => {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
};

// Generate the code challenge and verifier for PKCE
const generateCodeChallenge = async (codeVerifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

// Get the login URL for Spotify OAuth
export const getSpotifyLoginUrl = async () => {
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(64);
  
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store the code verifier and state in local storage
  localStorage.setItem("spotify_code_verifier", codeVerifier);
  localStorage.setItem("spotify_auth_state", state);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: state,
    scope: SCOPES.join(" "),
  });
  
  return `${AUTH_ENDPOINT}?${params.toString()}`;
};

// Exchange authorization code for tokens
export const getAccessToken = async (code: string) => {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  
  if (!codeVerifier) {
    throw new Error("No code verifier found");
  }
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Token exchange error:", errorData);
      throw new Error(`Failed to get access token: ${errorData.error}`);
    }
    
    const data = await response.json();
    
    // Save tokens to local storage
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    
    return data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    toast.error("Failed to authenticate with Spotify");
    throw error;
  }
};

// Refresh access token when it expires
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    throw new Error("No refresh token found");
  }
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }
    
    const data = await response.json();
    
    // Update tokens in local storage
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
};

// Get a valid access token, refreshing if necessary
export const getValidAccessToken = async () => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!accessToken || !expiresAt) {
    return null;
  }
  
  // If token is expired or about to expire in the next 5 minutes, refresh it
  if (Date.now() > Number(expiresAt) - 5 * 60 * 1000) {
    try {
      return await refreshAccessToken();
    } catch (error) {
      return null;
    }
  }
  
  return accessToken;
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getValidAccessToken();
    return !!token;
  } catch (error) {
    return false;
  }
};

// Logout - clear all Spotify auth data
export const logout = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem("spotify_code_verifier");
  localStorage.removeItem("spotify_auth_state");
};

// Generic API request function
const apiRequest = async (endpoint: string, method = "GET", body?: any) => {
  const token = await getValidAccessToken();
  
  if (!token) {
    throw new Error("No valid access token");
  }
  
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_ENDPOINT}${endpoint}`, options);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token might be invalid, try refreshing
      await refreshAccessToken();
      return apiRequest(endpoint, method, body);
    }
    
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// Get user profile
export const getUserProfile = () => apiRequest("/me");

// Get currently playing track
export const getCurrentlyPlaying = () => apiRequest("/me/player/currently-playing");

// Get recently played tracks
export const getRecentlyPlayed = (limit = 20) => 
  apiRequest(`/me/player/recently-played?limit=${limit}`);

// Get available devices
export const getAvailableDevices = () => apiRequest("/me/player/devices");

// Start/Resume playback
export const startPlayback = (deviceId: string, uris?: string[], positionMs?: number) => {
  const body: any = {};
  
  if (uris) body.uris = uris;
  if (positionMs !== undefined) body.position_ms = positionMs;
  
  return apiRequest(`/me/player/play?device_id=${deviceId}`, "PUT", body);
};

// Pause playback
export const pausePlayback = (deviceId?: string) => {
  const endpoint = deviceId ? `/me/player/pause?device_id=${deviceId}` : "/me/player/pause";
  return apiRequest(endpoint, "PUT");
};

// Skip to next track
export const skipToNext = (deviceId?: string) => {
  const endpoint = deviceId ? `/me/player/next?device_id=${deviceId}` : "/me/player/next";
  return apiRequest(endpoint, "POST");
};

// Skip to previous track
export const skipToPrevious = (deviceId?: string) => {
  const endpoint = deviceId ? `/me/player/previous?device_id=${deviceId}` : "/me/player/previous";
  return apiRequest(endpoint, "POST");
};

// Set volume
export const setVolume = (volumePercent: number, deviceId?: string) => {
  const endpoint = `/me/player/volume?volume_percent=${volumePercent}${deviceId ? `&device_id=${deviceId}` : ''}`;
  return apiRequest(endpoint, "PUT");
};

// Get the player state
export const getPlayerState = () => apiRequest("/me/player");

// Handle the auth callback
export const handleAuthCallback = async (code?: string): Promise<boolean> => {
  if (!code) {
    // Extract code from URL if not provided
    const urlParams = new URLSearchParams(window.location.search);
    code = urlParams.get("code") || "";
    
    // If code wasn't found in search params and we're using hash router, check the hash
    if (!code && isGitHubPages && window.location.hash) {
      // Remove the '#/' prefix if it exists (for HashRouter)
      const hashContent = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashContent.includes('?') ? 
        hashContent.substring(hashContent.indexOf('?')) : hashContent);
      code = hashParams.get("code") || "";
    }
  }
  
  if (!code) {
    console.error("No authorization code found in URL");
    throw new Error("No authorization code found");
  }
  
  try {
    await getAccessToken(code);
    // Clean up URL without navigating (important for GitHub Pages)
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (error) {
    console.error("Error handling auth callback:", error);
    throw error;
  }
};

// Types for Spotify API responses
export interface SpotifyUser {
  display_name: string;
  email: string;
  id: string;
  images: { url: string }[];
  product: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  artists: {
    id: string;
    name: string;
  }[];
  duration_ms: number;
  uri: string;
}

export interface SpotifyPlaybackState {
  device: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  };
  is_playing: boolean;
  item: SpotifyTrack;
  progress_ms: number;
  repeat_state: string;
  shuffle_state: boolean;
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyRecentlyPlayed {
  items: {
    track: SpotifyTrack;
    played_at: string;
  }[];
}
