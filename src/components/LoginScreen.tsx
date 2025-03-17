
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { motion } from "framer-motion";

export const LoginScreen = () => {
  const { login } = useSpotifyAuth();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Vinyl Play
          </motion.h1>
          <motion.p 
            className="text-lg text-zinc-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Experience your Spotify tracks on a virtual record player
          </motion.p>
        </div>

        <motion.div 
          className="glass-card rounded-2xl p-8 mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="text-center">
            <p className="text-white mb-6">
              Connect your Spotify account to get started with your vinyl experience.
            </p>
            <button
              onClick={login}
              className="login-button"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="mr-2"
              >
                <path 
                  d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" 
                  fill="#1DB954" 
                />
                <path 
                  d="M16.7273 16.3201C16.5893 16.5406 16.2933 16.6089 16.0728 16.4722C13.8341 15.1288 10.9848 14.7573 8.18728 15.6269C7.93272 15.7011 7.66929 15.5551 7.59423 15.3005C7.51917 15.0459 7.66517 14.7825 7.91974 14.7075C10.9826 13.7594 14.0709 14.1755 16.5751 15.6656C16.7956 15.8037 16.8639 16.0996 16.7273 16.3201ZM17.8283 13.8873C17.6533 14.1618 17.2833 14.2473 17.0088 14.0723C14.4474 12.5254 10.5558 11.9879 7.73551 13.1034C7.43036 13.2033 7.09982 13.0353 6.99991 12.7302C6.9 12.425 7.07127 12.0945 7.37642 11.9946C10.5693 10.7316 14.8359 11.3372 17.7433 13.0678C18.0178 13.2428 18.1033 13.6128 17.9283 13.8873ZM17.9517 11.3618C14.9006 9.56456 9.85425 9.34169 7.03224 10.4804C6.66551 10.6031 6.26742 10.4019 6.14393 10.0351C6.02043 9.66841 6.22164 9.27033 6.58837 9.14683C9.83309 7.83344 15.4269 8.09638 18.9562 10.1836C19.3006 10.3941 19.4324 10.8444 19.2231 11.1875C19.0126 11.5319 18.561 11.6649 18.2179 11.4556L17.9517 11.3618Z" 
                  fill="white" 
                />
              </svg>
              Connect with Spotify
            </button>
          </div>
        </motion.div>

        <motion.div 
          className="text-xs text-zinc-500 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          Requires a Spotify account.
          <br />
          Premium account recommended for full playback control.
        </motion.div>
      </motion.div>
    </div>
  );
};
