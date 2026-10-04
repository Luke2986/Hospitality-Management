import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import DashboardHome from "@/pages/dashboard-home";
import Properties from "@/pages/properties";
import RoomsManagement from "@/pages/rooms-management";
import Bookings from "@/pages/bookings";
import Events from "@/pages/events";
import Settings from "@/pages/settings";
import WidgetEmbed from "@/pages/widget-embed";
import CalendarPage from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Caricamento...</div>;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/widget/:propertyId">
        {(params) => <WidgetEmbed propertyId={params.propertyId} />}
      </Route>
      
      <Route path="/dashboard">
        <DashboardLayout>
          <DashboardHome />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/properties">
        <DashboardLayout>
          <Properties />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/rooms">
        <DashboardLayout>
          <RoomsManagement />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/bookings">
        <DashboardLayout>
          <Bookings />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/events">
        <DashboardLayout>
          <Events />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/calendario">
        <DashboardLayout>
          <CalendarPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/settings">
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
