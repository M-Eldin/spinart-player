
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, HashRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Use HashRouter for GitHub Pages compatibility
const isGitHubPages = window.location.hostname.includes("github.io");
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LazyMotion features={domAnimation}>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors />
        {isGitHubPages ? (
          // Use HashRouter for GitHub Pages
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        ) : (
          // Use BrowserRouter for local development
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </LazyMotion>
  </QueryClientProvider>
);

export default App;
