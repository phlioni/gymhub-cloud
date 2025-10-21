import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Modalities from "./pages/Modalities";
import Products from "./pages/Products";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import CheckIns from "./pages/CheckIns";
import Scheduling from "./pages/Scheduling";
import Workouts from "./pages/Workouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rotas que NÃO usam o layout principal */}
          <Route path="/" element={<Auth />} />
          <Route path="/super-admin" element={<SuperAdmin />} />

          {/* Rota "pai" que usa o AppLayout */}
          <Route element={<AppLayout />}>
            {/* Rotas "filhas" que serão renderizadas dentro do AppLayout */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/modalities" element={<Modalities />} />
            <Route path="/products" element={<Products />} />
            <Route path="/check-ins" element={<CheckIns />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/scheduling" element={<Scheduling />} /> {/* 2. Adicione a nova rota */}
          </Route>

          {/* Rota para páginas não encontradas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;