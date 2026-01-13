import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import Queue from "./pages/Queue";
import Applications from "./pages/Applications";
import Credits from "./pages/Credits";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding" component={Onboarding} />      <Route path="/dashboard">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>      <Route path="/profile">
        <DashboardLayout>
          <Profile />
        </DashboardLayout>
      </Route>
      <Route path="/jobs">
        <DashboardLayout>
          <Jobs />
        </DashboardLayout>
      </Route>
      <Route path="/queue">
        <DashboardLayout>
          <Queue />
        </DashboardLayout>
      </Route>
      <Route path="/applications">
        <DashboardLayout>
          <Applications />
        </DashboardLayout>
      </Route>
      <Route path="/credits">
        <DashboardLayout>
          <Credits />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
