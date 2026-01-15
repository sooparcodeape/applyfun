import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { PageTransition } from "./components/PageTransition";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import AIOnboarding from "./pages/AIOnboarding";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import Queue from "./pages/Queue";
import Applications from "./pages/Applications";
import Credits from "./pages/Credits";
import PublicJobs from "./pages/PublicJobs";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/ai-onboarding" component={AIOnboarding} />    <Route path="/dashboard">
        <DashboardLayout>
          <PageTransition>
            <Dashboard />
          </PageTransition>
        </DashboardLayout>
      </Route>      <Route path="/profile">
        <DashboardLayout>
          <PageTransition>
            <Profile />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/jobs" component={PublicJobs} />
      <Route path="/admin">
        <DashboardLayout>
          <PageTransition>
            <AdminDashboard />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/jobs">
        <DashboardLayout>
          <PageTransition>
            <Jobs />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/queue">
        <DashboardLayout>
          <PageTransition>
            <Queue />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/applications">
        <DashboardLayout>
          <PageTransition>
            <Applications />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/credits">
        <DashboardLayout>
          <PageTransition>
            <Credits />
          </PageTransition>
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <div className="pb-16 md:pb-0">
            <Router />
            <MobileBottomNav />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
