import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type InsertEvent, type Event, type Property } from "@shared/schema";
import { Plus, Calendar, Trash2, Edit, MapPin } from "lucide-react";
import { useState } from "react";
import { fetchPage, PaginationControls, type PageResult } from "@/components/pagination";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const eventCategories = [
  "sagra",
  "concerto",
  "fiera",
  "sport",
  "religioso",
  "cultura",
  "mercato",
  "altro"
];

export default function Events() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [page, setPage] = useState(0);
  const { data, isLoading: eventsLoading } = useQuery<PageResult<Event>>({
    queryKey: ["/api/events", page],
    queryFn: () => fetchPage<Event>("/api/events", new URLSearchParams(), page),
    placeholderData: keepPreviousData,
  });
  const events = data?.items;

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      endDate: "",
      location: "",
      category: "",
      propertyId: "",
      status: "confirmed",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      return apiRequest("POST", "/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Evento salvato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEvent> }) => {
      return apiRequest("PATCH", `/api/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Evento aggiornato con successo",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/events/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Successo",
        description: "Evento eliminato con successo",
      });
    },
  });

  const onSubmit = (data: InsertEvent) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || "",
      eventDate: event.eventDate,
      endDate: event.endDate || "",
      location: event.location || "",
      category: event.category || "",
      propertyId: event.propertyId,
      status: event.status,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingEvent(null);
    const firstProperty = properties?.[0];
    form.reset({
      title: "",
      description: "",
      eventDate: "",
      endDate: "",
      location: "",
      category: "",
      propertyId: firstProperty?.id || "",
      status: "confirmed",
    });
    setOpen(true);
  };

  if (eventsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eventi</h1>
          <p className="text-muted-foreground">Gestisci eventi locali per le tue proprietà</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew} data-testid="button-add-event">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Modifica Evento" : "Aggiungi Nuovo Evento"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Aggiorna i dettagli dell'evento" : "Crea un nuovo evento locale"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proprietà</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Seleziona proprietà" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Evento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Festival Estivo" data-testid="input-event-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} placeholder="Dettagli evento..." rows={3} data-testid="input-event-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Evento</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-event-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fine (Opzionale)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} type="date" data-testid="input-event-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luogo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Centro città" data-testid="input-event-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-event"
                >
                  {editingEvent ? "Aggiorna Evento" : "Crea Evento"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {!events || events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun evento ancora</h3>
            <p className="text-muted-foreground text-center mb-4">
              Aggiungi eventi locali per attrarre più ospiti
            </p>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover-elevate" data-testid={`card-event-${event.id}`}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{event.title}</span>
                  {event.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {event.category}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(event.eventDate), "MMM d, yyyy")}
                  {event.endDate && ` - ${format(parseISO(event.endDate), "MMM d, yyyy")}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(event)}
                    className="flex-1"
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(event.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-event-${event.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls page={page} total={data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
