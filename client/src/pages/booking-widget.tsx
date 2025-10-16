import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema, type InsertBooking, type Room, type Event, type Property } from "@shared/schema";
import { Calendar, MapPin, Users, Euro, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

export default function BookingWidget() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: !!selectedProperty,
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!selectedProperty,
  });

  const availableRooms = rooms?.filter(
    r => r.propertyId === selectedProperty && r.isAvailable
  ) || [];

  const upcomingEvents = events?.filter(e => {
    const eventDate = new Date(e.eventDate);
    const now = new Date();
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    return e.propertyId === selectedProperty && eventDate >= now && eventDate <= fourteenDaysFromNow;
  }) || [];

  const selectedRoomData = rooms?.find(r => r.id === selectedRoom);
  const numberOfNights = checkIn && checkOut ? differenceInDays(new Date(checkOut), new Date(checkIn)) : 0;
  const totalPrice = selectedRoomData && numberOfNights > 0 
    ? Number(selectedRoomData.pricePerNight) * numberOfNights 
    : 0;

  const form = useForm<InsertBooking>({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestsCount: 1,
      checkIn: "",
      checkOut: "",
      totalPrice: "0",
      status: "pending",
      roomId: "",
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      return apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Request Sent!",
        description: "Your booking request has been submitted. We'll contact you soon.",
      });
      form.reset();
      setSelectedRoom(null);
      setCheckIn("");
      setCheckOut("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBooking) => {
    if (!selectedRoom) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive",
      });
      return;
    }

    bookingMutation.mutate({
      ...data,
      roomId: selectedRoom,
      checkIn,
      checkOut,
      totalPrice: totalPrice.toString(),
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Book Your Stay</h1>
          <p className="text-muted-foreground">Find the perfect room for your visit</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Property & Dates</CardTitle>
            <CardDescription>Choose your destination and travel dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Property</label>
              <Select onValueChange={setSelectedProperty} value={selectedProperty}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.filter(p => p.active).map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.city}, {property.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Check-in</label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-checkin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Check-out</label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  data-testid="input-checkout"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedProperty && checkIn && checkOut && (
          <>
            <div>
              <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
              {availableRooms.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No rooms available for the selected dates
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableRooms.map((room) => {
                    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
                    const price = Number(room.pricePerNight) * nights;
                    return (
                      <Card
                        key={room.id}
                        className={`cursor-pointer hover-elevate ${selectedRoom === room.id ? "border-primary border-2" : ""}`}
                        onClick={() => setSelectedRoom(room.id)}
                        data-testid={`card-room-${room.id}`}
                      >
                        <CardHeader>
                          <CardTitle>{room.name}</CardTitle>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Up to {room.maxGuests}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {Number(room.pricePerNight).toFixed(2)}/night
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {room.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {room.description}
                            </p>
                          )}
                          <div className="text-lg font-bold text-primary">
                            Total: €{price.toFixed(2)} for {nights} {nights === 1 ? "night" : "nights"}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Upcoming Events Nearby</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map((event) => (
                    <Card key={event.id} className="hover-elevate" data-testid={`card-event-${event.id}`}>
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <span className="line-clamp-1">{event.title}</span>
                          {event.category && (
                            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                              {event.category}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(event.eventDate), "MMM d, yyyy")}
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
                              {event.location}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedRoom && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Booking</CardTitle>
                  <CardDescription>Enter your details to request a reservation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Doe" data-testid="input-guest-name" />
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
                              <Input {...field} type="email" placeholder="john@example.com" data-testid="input-guest-email" />
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
                            <FormLabel>Number of Guests</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max={selectedRoomData?.maxGuests || 10}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-guests-count"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Price</div>
                          <div className="text-2xl font-bold">€{totalPrice.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{numberOfNights} nights</div>
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          disabled={bookingMutation.isPending}
                          data-testid="button-submit-booking"
                        >
                          {bookingMutation.isPending ? "Submitting..." : "Request Booking"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
