import { toast } from "sonner";

// Spotify API endpoints
const SPOTIFY_AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Your Spotify App credentials (these are public credentials intended for client-side auth)
const CLIENT_ID = "1a70ba777fec4ffd9633c0c418246310"; // This is a placeholder ID, replace with your real Spotify Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname; // Fix: Use exact path to match what's registered in Spotify Dashboard

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
  "streaming",
  "user-read-email",
  "user-read-private",
];

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
  
  return `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
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
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
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
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
    localStorage.setItem("spotify_token_expires_at", expiresAt.toString());
    
    return data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    toast.error("Failed to authenticate with Spotify");
    throw error;
  }
};

// Refresh access token when it expires
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  
  if (!refreshToken) {
    throw new Error("No refresh token found");
  }
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  
  try {
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
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
    localStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    localStorage.setItem("spotify_token_expires_at", expiresAt.toString());
    
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
};

// Get a valid access token, refreshing if necessary
export const getValidAccessToken = async () => {
  const accessToken = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  
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
export const isAuthenticated = async () => {
  try {
    const token = await getValidAccessToken();
    return !!token;
  } catch (error) {
    return false;
  }
};

// Logout - clear all Spotify auth data
export const logout = () => {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expires_at");
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
  
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, options);
  
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
export const handleAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const storedState = localStorage.getItem("spotify_auth_state");
  const error = urlParams.get("error");
  
  if (error) {
    console.error("Authentication error:", error);
    toast.error(`Authentication error: ${error}`);
    return false;
  }
  
  if (!code || !state || state !== storedState) {
    console.error("State mismatch or missing code", { state, storedState, code });
    toast.error("Authentication failed. Please try again.");
    return false;
  }
  
  try {
    await getAccessToken(code);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (error) {
    console.error("Error handling auth callback:", error);
    toast.error("Authentication failed. Please try again.");
    return false;
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
