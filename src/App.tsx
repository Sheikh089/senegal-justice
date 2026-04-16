import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Inscription from "./pages/Inscription.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
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
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/inscription" element={<Inscription />} />
            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            {/* Police routes */}
            <Route path="/police" element={<ProtectedRoute allowedRoles={["police"]}><PoliceDashboard /></ProtectedRoute>} />
            <Route path="/police/dossiers" element={<ProtectedRoute allowedRoles={["police"]}><PoliceDossiers /></ProtectedRoute>} />
            <Route path="/police/nouveau" element={<ProtectedRoute allowedRoles={["police"]}><PoliceNouveau /></ProtectedRoute>} />
            {/* Tribunal routes */}
            <Route path="/tribunal" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalDashboard /></ProtectedRoute>} />
            <Route path="/tribunal/dossiers" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalDossiers /></ProtectedRoute>} />
            <Route path="/tribunal/audiences" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalAudiences /></ProtectedRoute>} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
