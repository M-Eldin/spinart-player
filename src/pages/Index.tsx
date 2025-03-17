
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { LoginScreen } from "@/components/LoginScreen";
import { RecordPlayer } from "@/components/RecordPlayer";
import { motion } from "framer-motion";

const Index = () => {
  const { isAuthenticated, isLoading } = useSpotifyAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-white text-lg font-medium"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show record player if authenticated
  return <RecordPlayer />;
};

export default Index;
