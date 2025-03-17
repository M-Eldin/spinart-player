
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCurrentlyPlaying,
  getRecentlyPlayed,
  startPlayback,
  pausePlayback,
  skipToNext,
  skipToPrevious,
  setVolume as setSpotifyVolume,
  getPlayerState,
  SpotifyPlaybackState,
  SpotifyTrack,
  SpotifyRecentlyPlayed
} from "@/lib/spotify";
import { toast } from "sonner";

interface PlayerState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  progressMs: number;
  durationMs: number;
  volume: number;
  deviceId: string | null;
  recentTracks: SpotifyTrack[];
}

export function useSpotifyPlayer(isAuthenticated: boolean | null) {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTrack: null,
    progressMs: 0,
    durationMs: 0,
    volume: 80,
    deviceId: null,
    recentTracks: [],
  });

  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const progressInterval = useRef<number | null>(null);
  const playerUpdater = useRef<number | null>(null);

  // Clear intervals on component unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) window.clearInterval(progressInterval.current);
      if (playerUpdater.current) window.clearInterval(playerUpdater.current);
    };
  }, []);

  // Handle loading state
  useEffect(() => {
    if (isAuthenticated === null) {
      setIsLoadingPlayer(true);
    } else if (isAuthenticated === false) {
      setIsLoadingPlayer(false);
    }
  }, [isAuthenticated]);

  // Fetch player state and recent tracks
  const fetchPlayerData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Get current playback state
      const playbackResponse = await getPlayerState();
      
      // Get recently played tracks
      const recentResponse = await getRecentlyPlayed(20);

      if (playbackResponse) {
        setPlayerState(prevState => ({
          ...prevState,
          isPlaying: playbackResponse.is_playing,
          currentTrack: playbackResponse.item,
          progressMs: playbackResponse.progress_ms || 0,
          durationMs: playbackResponse.item?.duration_ms || 0,
          volume: playbackResponse.device?.volume_percent || prevState.volume,
          deviceId: playbackResponse.device?.id || null,
        }));
      }

      if (recentResponse) {
        // Extract unique tracks from recently played
        const uniqueTracks = new Map<string, SpotifyTrack>();
        recentResponse.items.forEach(item => {
          if (!uniqueTracks.has(item.track.id)) {
            uniqueTracks.set(item.track.id, item.track);
          }
        });
        
        setPlayerState(prevState => ({
          ...prevState,
          recentTracks: Array.from(uniqueTracks.values()),
        }));
      }

      setIsLoadingPlayer(false);
    } catch (error) {
      console.error("Error fetching player data:", error);
      setIsLoadingPlayer(false);
    }
  }, [isAuthenticated]);

  // Set up intervals for updating progress and refreshing player state
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch
    fetchPlayerData();

    // Progress timer (updates every second)
    if (progressInterval.current) window.clearInterval(progressInterval.current);
    progressInterval.current = window.setInterval(() => {
      setPlayerState(prevState => {
        if (prevState.isPlaying) {
          const newProgress = Math.min(prevState.progressMs + 1000, prevState.durationMs);
          return {
            ...prevState,
            progressMs: newProgress,
          };
        }
        return prevState;
      });
    }, 1000);

    // Player state updater (updates every 5 seconds)
    if (playerUpdater.current) window.clearInterval(playerUpdater.current);
    playerUpdater.current = window.setInterval(fetchPlayerData, 5000);

    return () => {
      if (progressInterval.current) window.clearInterval(progressInterval.current);
      if (playerUpdater.current) window.clearInterval(playerUpdater.current);
    };
  }, [isAuthenticated, fetchPlayerData]);

  // Control functions
  const play = async (trackUri?: string) => {
    if (!isAuthenticated || !playerState.deviceId) {
      toast.error("No active Spotify device found");
      return;
    }

    try {
      await startPlayback(
        playerState.deviceId, 
        trackUri ? [trackUri] : undefined
      );
      await fetchPlayerData();
    } catch (error) {
      console.error("Error starting playback:", error);
      toast.error("Failed to play track");
    }
  };

  const pause = async () => {
    if (!isAuthenticated) return;

    try {
      await pausePlayback(playerState.deviceId || undefined);
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    } catch (error) {
      console.error("Error pausing playback:", error);
      toast.error("Failed to pause track");
    }
  };

  const nextTrack = async () => {
    if (!isAuthenticated) return;

    try {
      await skipToNext(playerState.deviceId || undefined);
      await fetchPlayerData();
    } catch (error) {
      console.error("Error skipping to next track:", error);
      toast.error("Failed to skip to next track");
    }
  };

  const previousTrack = async () => {
    if (!isAuthenticated) return;

    try {
      await skipToPrevious(playerState.deviceId || undefined);
      await fetchPlayerData();
    } catch (error) {
      console.error("Error skipping to previous track:", error);
      toast.error("Failed to skip to previous track");
    }
  };

  const setVolume = async (newVolume: number) => {
    if (!isAuthenticated) return;

    try {
      await setSpotifyVolume(
        Math.round(newVolume), 
        playerState.deviceId || undefined
      );
      setPlayerState(prev => ({ ...prev, volume: newVolume }));
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  };

  return {
    playerState,
    isLoadingPlayer,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume,
    refreshPlayerData: fetchPlayerData
  };
}
