import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PoliceDashboard from "./pages/PoliceDashboard.tsx";
import PoliceDossiers from "./pages/PoliceDossiers.tsx";
import PoliceNouveau from "./pages/PoliceNouveau.tsx";
import TribunalDashboard from "./pages/TribunalDashboard.tsx";
import TribunalDossiers from "./pages/TribunalDossiers.tsx";
import TribunalAudiences from "./pages/TribunalAudiences.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Police routes */}
          <Route path="/police" element={<PoliceDashboard />} />
          <Route path="/police/dossiers" element={<PoliceDossiers />} />
          <Route path="/police/nouveau" element={<PoliceNouveau />} />
          {/* Tribunal routes */}
          <Route path="/tribunal" element={<TribunalDashboard />} />
          <Route path="/tribunal/dossiers" element={<TribunalDossiers />} />
          <Route path="/tribunal/audiences" element={<TribunalAudiences />} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
