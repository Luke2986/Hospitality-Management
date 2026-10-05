import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Booking, Event } from "@shared/schema";

type DashboardSummary = {
  bookingsThisMonth: number;
  pendingBookings: number;
  confirmedBookings: number;
  revenueThisMonth: string;
  upcomingCheckIns: Booking[];
  upcomingEvents: Event[];
};

export default function DashboardHome() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary", today],
    queryFn: async () => (await apiRequest("GET", `/api/dashboard/summary?today=${today}`)).json(),
    staleTime: 0,
  });

  const upcomingCheckIns = summary?.upcomingCheckIns ?? [];
  const upcomingEvents = summary?.upcomingEvents ?? [];

  const stats = [
    {
      title: "Prenotazioni Questo Mese",
      value: summary?.bookingsThisMonth ?? 0,
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Prenotazioni In Attesa",
      value: summary?.pendingBookings ?? 0,
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Prenotazioni Confermate",
      value: summary?.confirmedBookings ?? 0,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Ricavi Questo Mese",
      value: `€${summary?.revenueThisMonth ?? "0.00"}`,
      icon: DollarSign,
      color: "text-accent",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Bentornato! Ecco la tua panoramica</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prossimi Check-in</CardTitle>
            <CardDescription>Prossimi 3 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun check-in in programma</p>
            ) : (
              <div className="space-y-4">
                {upcomingCheckIns.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between" data-testid={`booking-${booking.id}`}>
                    <div>
                      <p className="text-sm font-medium">{booking.guestName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(booking.checkIn), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {booking.guestsCount} {booking.guestsCount === 1 ? "ospite" : "ospiti"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimi Eventi</CardTitle>
            <CardDescription>Prossimi 7 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento in programma</p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between" data-testid={`event-${event.id}`}>
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.eventDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    {event.category && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {event.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
