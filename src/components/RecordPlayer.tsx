import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";
import { SpotifyTrack } from "@/lib/spotify";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { extractImageColor } from "@/lib/color-utils";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX,
  Music, User, LogOut, RefreshCw
} from "lucide-react";

export const RecordPlayer = () => {
  const { user, logout } = useSpotifyAuth();
  const { 
    playerState, 
    isLoadingPlayer,
    play, 
    pause, 
    nextTrack, 
    previousTrack, 
    setVolume,
    refreshPlayerData
  } = useSpotifyPlayer(true);

  const [activeSide, setActiveSide] = useState<"player" | "recent">("player");
  const [needlePosition, setNeedlePosition] = useState("lifted");
  const [spinSpeed, setSpinSpeed] = useState<"none" | "slow" | "normal" | "fast">("none");
  const [backgroundColor, setBackgroundColor] = useState("rgb(10, 10, 10)");
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Set the record spinning animation based on playback state
  useEffect(() => {
    if (playerState.isPlaying) {
      setSpinSpeed("normal");
      setNeedlePosition("playing");
    } else {
      setSpinSpeed("slow");
      setNeedlePosition("lifted");
    }
  }, [playerState.isPlaying]);

  // Extract background color from album art when track changes
  useEffect(() => {
    if (playerState.currentTrack?.album?.images[0]?.url) {
      extractImageColor(playerState.currentTrack.album.images[0].url, (color) => {
        setBackgroundColor(color);
      });
    }
  }, [playerState.currentTrack?.album?.images[0]?.url]);
  
  // Format time from milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get progress percentage
  const progressPercentage = playerState.durationMs > 0
    ? (playerState.progressMs / playerState.durationMs) * 100
    : 0;

  // Get volume icon based on volume level
  const getVolumeIcon = () => {
    if (playerState.volume === 0) return <VolumeX size={18} />;
    if (playerState.volume < 50) return <Volume1 size={18} />;
    return <Volume2 size={18} />;
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (playerState.isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  // Flip the record player to show recent tracks or go back to the player
  const flipRecord = () => {
    setActiveSide(prev => prev === "player" ? "recent" : "player");
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col justify-between p-4 md:p-8 transition-colors duration-1000"
      style={{ backgroundColor }}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Vinyl Play</h1>
        
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-zinc-200 text-sm">
              <User size={14} />
              <span>{user.display_name}</span>
            </div>
            <button 
              onClick={refreshPlayerData}
              className="p-2 text-zinc-200 hover:text-white rounded-full transition-colors"
              title="Refresh player"
            >
              <RefreshCw size={16} />
            </button>
            <button 
              onClick={logout}
              className="p-2 text-zinc-200 hover:text-white rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeSide === "player" ? (
                <motion.div
                  key="player-side"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="relative"
                >
                  {/* Turntable base */}
                  <div className="turntable-base rounded-2xl p-10 relative overflow-hidden">
                    <div className="absolute inset-0 backdrop-blur-sm bg-black/40"></div>
                    
                    {/* Platter with record */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative mb-12">
                        {/* Turntable platter */}
                        <div className="turntable-platter w-64 h-64 md:w-72 md:h-72 rounded-full shadow-record relative">
                          {/* Vinyl record with full album art */}
                          <motion.div 
                            className="absolute inset-0 rounded-full overflow-hidden shadow-inner-dark"
                            animate={{ rotate: spinSpeed === "none" ? 0 : 360 }}
                            transition={{ 
                              duration: spinSpeed === "slow" ? 3 : 1.8,
                              ease: "linear",
                              repeat: Infinity
                            }}
                          >
                            {playerState.currentTrack ? (
                              <div className="w-full h-full relative">
                                {/* Full album art as background */}
                                <img 
                                  src={playerState.currentTrack.album.images[0]?.url} 
                                  alt={playerState.currentTrack.album.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                                {/* Vinyl grooves overlay for record effect */}
                                <div className="absolute inset-0 vinyl-grooves opacity-40 mix-blend-overlay"></div>
                                {/* Center hole */}
                                <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black border-4 border-zinc-800"></div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                <Music size={32} className="text-zinc-700" />
                                <div className="absolute inset-0 vinyl-grooves opacity-30"></div>
                              </div>
                            )}
                          </motion.div>
                          
                          {/* Vinyl spindle */}
                          <div className="vinyl-spindle absolute inset-0 m-auto w-4 h-4 rounded-full z-10"></div>
                        </div>
                        
                        {/* Tonearm */}
                        <motion.div 
                          className="absolute top-6 -right-4 origin-top-right"
                          animate={{ rotate: needlePosition === "playing" ? 0 : -25 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 50, 
                            damping: 12
                          }}
                        >
                          <div className="record-arm w-16 h-1.5 rounded-full"></div>
                          <div className="w-2 h-8 bg-zinc-700 absolute -bottom-8 right-1 rounded-sm"></div>
                        </motion.div>
                      </div>
                      
                      {/* Playback controls */}
                      <div className="w-full max-w-sm">
                        {/* Progress bar */}
                        {playerState.currentTrack && (
                          <div className="mb-4">
                            <div 
                              className="progress-bar-track w-full"
                              ref={progressBarRef}
                            >
                              <div 
                                className="progress-bar-fill"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-zinc-300">
                              <span>{formatTime(playerState.progressMs)}</span>
                              <span>{formatTime(playerState.durationMs)}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Track info */}
                        <div className="mb-5 text-center">
                          {playerState.currentTrack ? (
                            <>
                              <h2 className="text-lg font-medium text-white truncate">
                                {playerState.currentTrack.name}
                              </h2>
                              <p className="text-sm text-zinc-300 truncate">
                                {playerState.currentTrack.artists.map(a => a.name).join(", ")}
                              </p>
                            </>
                          ) : (
                            <p className="text-zinc-300">No track playing</p>
                          )}
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4">
                          <button 
                            onClick={previousTrack}
                            className="control-button"
                            disabled={isLoadingPlayer}
                            aria-label="Previous track"
                          >
                            <SkipBack size={18} />
                          </button>
                          
                          <button 
                            onClick={handlePlayPause}
                            className="control-button control-button-large"
                            disabled={isLoadingPlayer || !playerState.currentTrack}
                            aria-label={playerState.isPlaying ? "Pause" : "Play"}
                          >
                            {playerState.isPlaying ? (
                              <Pause size={22} />
                            ) : (
                              <Play size={22} className="ml-0.5" />
                            )}
                          </button>
                          
                          <button 
                            onClick={nextTrack}
                            className="control-button"
                            disabled={isLoadingPlayer}
                            aria-label="Next track"
                          >
                            <SkipForward size={18} />
                          </button>
                        </div>
                        
                        {/* Volume control */}
                        <div className="mt-6 flex items-center justify-center gap-3">
                          <div className="text-zinc-300">
                            {getVolumeIcon()}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={playerState.volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="volume-slider w-24"
                            aria-label="Volume"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Flip button */}
                  <motion.button 
                    onClick={flipRecord}
                    className="absolute top-4 right-4 z-20 text-zinc-300 hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="See recent tracks"
                  >
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M21 9H3M18 3L22 9L18 3ZM18 15H3H18ZM18 21H3H18ZM6 3L2 9L6 3Z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="recent-side"
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="turntable-base rounded-2xl p-6 relative"
                >
                  <div className="absolute inset-0 backdrop-blur-sm bg-black/40"></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-white">Recent Tracks</h2>
                      
                      <motion.button 
                        onClick={flipRecord}
                        className="text-zinc-400 hover:text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Back to player"
                      >
                        <svg 
                          width="24" 
                          height="24" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            d="M3 9H21M6 3L2 9L6 3ZM6 15H21H6ZM6 21H21H6ZM18 3L22 9L18 3Z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.button>
                    </div>
                    
                    <div className="max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                      {playerState.recentTracks.length > 0 ? (
                        <div className="space-y-2">
                          {playerState.recentTracks.map((track) => (
                            <div 
                              key={track.id} 
                              className={`track-list-item flex items-center gap-3 ${
                                playerState.currentTrack?.id === track.id ? 'track-list-item-active' : ''
                              }`}
                              onClick={() => play(track.uri)}
                            >
                              <div className="h-10 w-10 flex-shrink-0">
                                <img 
                                  src={track.album.images[0]?.url} 
                                  alt={track.album.name}
                                  className="h-full w-full rounded object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-white truncate">
                                  {track.name}
                                </h3>
                                <p className="text-xs text-zinc-400 truncate">
                                  {track.artists.map(a => a.name).join(", ")}
                                </p>
                              </div>
                              <div className="w-8 flex items-center justify-center">
                                {playerState.currentTrack?.id === track.id && 
                                  playerState.isPlaying ? (
                                  <Pause size={16} className="text-white" />
                                ) : (
                                  <Play size={16} className="text-zinc-400" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <Music size={32} className="text-zinc-700 mx-auto mb-3" />
                          <p className="text-zinc-500">No recent tracks found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-zinc-300">
        <p>Requires Spotify Premium for full playback control</p>
      </div>
    </div>
  );
};
