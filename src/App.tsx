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
import PoliceEditer from "./pages/PoliceEditer.tsx";
import TribunalDashboard from "./pages/TribunalDashboard.tsx";
import TribunalDossiers from "./pages/TribunalDossiers.tsx";
import TribunalAudiences from "./pages/TribunalAudiences.tsx";
import ComingSoon from "./pages/ComingSoon.tsx";
import TribunalAttribution from "./pages/TribunalAttribution.tsx";
import TribunalDecisions from "./pages/TribunalDecisions.tsx";
import DossierDetail from "./pages/DossierDetail.tsx";

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
            <Route path="/police/dossiers/:id/editer" element={<ProtectedRoute allowedRoles={["police"]}><PoliceEditer /></ProtectedRoute>} />
            <Route path="/police/transmettre" element={<ProtectedRoute allowedRoles={["police"]}><ComingSoon variant="police" title="Transmettre" /></ProtectedRoute>} />
            <Route path="/police/stats" element={<ProtectedRoute allowedRoles={["police"]}><ComingSoon variant="police" title="Statistiques" /></ProtectedRoute>} />
            <Route path="/police/dossiers/:id" element={<ProtectedRoute allowedRoles={["police"]}><DossierDetail variant="police" /></ProtectedRoute>} />
            {/* Tribunal routes */}
            <Route path="/tribunal" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalDashboard /></ProtectedRoute>} />
            <Route path="/tribunal/dossiers" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalDossiers /></ProtectedRoute>} />
            <Route path="/tribunal/audiences" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalAudiences /></ProtectedRoute>} />
            <Route path="/tribunal/attribution" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalAttribution /></ProtectedRoute>} />
            <Route path="/tribunal/decisions" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><TribunalDecisions /></ProtectedRoute>} />
            <Route path="/tribunal/stats" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><ComingSoon variant="tribunal" title="Statistiques" /></ProtectedRoute>} />
            <Route path="/tribunal/dossiers/:id" element={<ProtectedRoute allowedRoles={["procureur", "juge", "greffier"]}><DossierDetail variant="tribunal" /></ProtectedRoute>} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
