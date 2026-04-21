import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Professionals from "./pages/Professionals";
import InsurancePlans from "./pages/InsurancePlans";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";
import Conversations from "./pages/Conversations";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <AdminLayout><Dashboard /></AdminLayout>} />
      <Route path="/professionals" component={() => <AdminLayout><Professionals /></AdminLayout>} />
      <Route path="/insurance" component={() => <AdminLayout><InsurancePlans /></AdminLayout>} />
      <Route path="/appointments" component={() => <AdminLayout><Appointments /></AdminLayout>} />
      <Route path="/conversations" component={() => <AdminLayout><Conversations /></AdminLayout>} />
      <Route path="/settings" component={() => <AdminLayout><Settings /></AdminLayout>} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
