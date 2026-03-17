import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import Index from "./pages/Index";
import SelectExchange from "./pages/SelectExchange";
import ApiKeyInput from "./pages/ApiKeyInput";
import MemberDashboard from "./pages/MemberDashboard";
import AdminRates from "./pages/AdminRates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/select-exchange" element={<SelectExchange />} />
            <Route path="/api-key/:exchangeId" element={<ApiKeyInput />} />
            <Route path="/member/:memberId" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminRates />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
