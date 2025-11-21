import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema, type InsertBooking, type Room, type Event, type Property } from "@shared/schema";
import { Calendar, MapPin, Users, Euro, ArrowRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import confetti from "canvas-confetti";

interface WidgetData {
  property: Property;
  rooms: Room[];
  events: Event[];
}

export default function WidgetEmbed({ propertyId }: { propertyId: string }) {
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Fetch all widget data in one API call
  const { data: widgetData, isLoading } = useQuery<WidgetData>({
    queryKey: ["/api/widget/properties", propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/widget/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error("Proprietà non trovata");
      }
      return response.json();
    },
  });

  // Notify parent iframe about height changes for auto-resize
  useEffect(() => {
    const notifyResize = () => {
      if (window.parent !== window) {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({
          type: 'booking-widget-resize',
          height
        }, '*');
      }
    };

    // Initial notification
    notifyResize();

    // Watch for DOM changes
    const observer = new ResizeObserver(notifyResize);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, [widgetData, selectedRoom, checkIn, checkOut, showBookingForm]);

  const upcomingEvents = widgetData?.events.filter(e => {
    const eventDate = new Date(e.eventDate);
    const now = new Date();
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    return eventDate >= now && eventDate <= fourteenDaysFromNow;
  }) || [];

  const selectedRoomData = widgetData?.rooms.find(r => r.id === selectedRoom);
  const numberOfNights = checkIn && checkOut ? differenceInDays(new Date(checkOut), new Date(checkIn)) : 0;
  const totalPrice = selectedRoomData && numberOfNights > 0 
    ? Number(selectedRoomData.pricePerNight) * numberOfNights 
    : 0;

  const form = useForm({
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      guestsCount: 1,
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      return apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      // Show success with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "✅ Richiesta Inviata!",
        description: "La tua prenotazione è stata ricevuta. Ti contatteremo presto.",
      });

      // Reset form
      form.reset();
      setSelectedRoom(null);
      setCheckIn("");
      setCheckOut("");
      setShowBookingForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!selectedRoom || !widgetData?.property) {
      toast({
        title: "Errore",
        description: "Camera non selezionata",
        variant: "destructive",
      });
      return;
    }

    const bookingData: InsertBooking = {
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone || "",
      guestsCount: data.guestsCount,
      roomId: selectedRoom,
      propertyId: widgetData.property.id,
      checkIn,
      checkOut,
      totalPrice: totalPrice.toString(),
      status: "pending",
    };

    bookingMutation.mutate(bookingData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!widgetData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Proprietà Non Trovata</CardTitle>
            <CardDescription>La proprietà richiesta non è disponibile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Property Header */}
        <div className="text-center space-y-2 pb-4 border-b">
          <h1 className="text-3xl font-bold">{widgetData.property.name}</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            {widgetData.property.city}, {widgetData.property.country}
          </p>
          {widgetData.property.description && (
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              {widgetData.property.description}
            </p>
          )}
        </div>

        {/* Date Selection */}
        <Card data-testid="card-date-selection">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Seleziona le Tue Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Check-in</label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    setShowBookingForm(false);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-checkin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Check-out</label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    setShowBookingForm(false);
                  }}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  data-testid="input-checkout"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rooms Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {checkIn && checkOut ? "Camere Disponibili" : "Le Nostre Camere"}
          </h2>
          
          {(!checkIn || !checkOut) && (
            <Card className="mb-4">
              <CardContent className="py-4 text-center text-muted-foreground">
                <p className="text-sm">Seleziona le date di check-in e check-out per vedere i prezzi totali</p>
              </CardContent>
            </Card>
          )}
          
          {widgetData.rooms.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessuna camera disponibile
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {widgetData.rooms.map((room) => {
                const nights = checkIn && checkOut ? differenceInDays(new Date(checkOut), new Date(checkIn)) : 1;
                const price = Number(room.pricePerNight) * nights;
                const isSelected = selectedRoom === room.id;

                return (
                  <Card
                    key={room.id}
                    className={`cursor-pointer hover-elevate transition-all ${isSelected ? "border-primary border-2 shadow-lg" : ""}`}
                    onClick={() => {
                      setSelectedRoom(room.id);
                      setShowBookingForm(false);
                    }}
                    data-testid={`card-room-${room.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {room.name}
                        {isSelected && <Sparkles className="w-5 h-5 text-primary" />}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Fino a {room.maxGuests}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          €{Number(room.pricePerNight).toFixed(2)}/notte
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {room.description && (
                        <p className="text-sm text-muted-foreground">
                          {room.description}
                        </p>
                      )}
                      <div className="pt-2 border-t">
                        {checkIn && checkOut ? (
                          <div>
                            <div className="text-lg font-bold text-primary">
                              Totale: €{price.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {nights} {nights === 1 ? "notte" : "notti"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            Seleziona le date per vedere il prezzo totale
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

            {/* Booking Button */}
            {selectedRoom && checkIn && checkOut && !showBookingForm && (
              <div className="mt-6 text-center">
                <Button
                  size="lg"
                  onClick={() => setShowBookingForm(true)}
                  data-testid="button-show-booking-form"
                  className="min-w-[200px]"
                >
                  Prenota Ora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
        </div>

        {/* Booking Form */}
        {showBookingForm && selectedRoom && (
          <Card data-testid="card-booking-form">
            <CardHeader>
              <CardTitle>Completa la Prenotazione</CardTitle>
              <CardDescription>Inserisci i tuoi dati per richiedere la prenotazione</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mario Rossi" data-testid="input-guest-name" required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="mario@esempio.com" data-testid="input-guest-email" required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono (opzionale)</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="+39 123 456 7890" data-testid="input-guest-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero di Ospiti</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max={selectedRoomData?.maxGuests || 10}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-guests-count"
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Prezzo Totale</div>
                      <div className="text-2xl font-bold">€{totalPrice.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {numberOfNights} {numberOfNights === 1 ? "notte" : "notti"}
                      </div>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={bookingMutation.isPending}
                      data-testid="button-submit-booking"
                    >
                      {bookingMutation.isPending ? "Invio..." : "Conferma Prenotazione"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Prossimi Eventi Nelle Vicinanze</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.slice(0, 4).map((event) => (
                <Card key={event.id} className="hover-elevate" data-testid={`card-event-${event.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 flex-1">{event.title}</span>
                      {event.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent whitespace-nowrap">
                          {event.category}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(event.eventDate), "d MMM yyyy")}
                    </CardDescription>
                  </CardHeader>
                  {(event.description || event.location) && (
                    <CardContent className="space-y-2">
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
