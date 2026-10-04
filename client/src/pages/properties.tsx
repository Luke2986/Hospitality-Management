import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema, type InsertProperty, type Property } from "@shared/schema";
import { Plus, Building2, MapPin, Edit } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArchiveButton, ArchivedList, useArchive } from "@/components/archive";

export default function Properties() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      country: "Italia",
      roomsCount: 1,
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      return apiRequest("POST", "/api/properties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setOpen(false);
      setEditingProperty(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Proprietà salvata con successo",
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      return apiRequest("PATCH", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setOpen(false);
      setEditingProperty(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Proprietà aggiornata con successo",
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

  const archive = useArchive("properties");

  const onSubmit = (data: InsertProperty) => {
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    form.reset({
      name: property.name,
      description: property.description || "",
      address: property.address || "",
      city: property.city,
      country: property.country,
      roomsCount: property.roomsCount,
      active: property.active,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingProperty(null);
    form.reset({
      name: "",
      description: "",
      address: "",
      city: "",
      country: "Italia",
      roomsCount: 1,
      active: true,
    });
    setOpen(true);
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Proprietà</h1>
          <p className="text-muted-foreground">Gestisci le tue strutture ricettive</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew} data-testid="button-add-property">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Proprietà
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Modifica Proprietà" : "Aggiungi Nuova Proprietà"}</DialogTitle>
              <DialogDescription>
                {editingProperty ? "Aggiorna i dettagli della proprietà" : "Crea una nuova proprietà per la tua attività ricettiva"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Proprietà</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bellissimo B&B" data-testid="input-property-name" />
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
                        <Textarea {...field} value={field.value ?? ""} placeholder="Descrivi la tua proprietà..." rows={3} data-testid="input-property-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Firenze" data-testid="input-property-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paese</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Italia" data-testid="input-property-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Via Roma 123" data-testid="input-property-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero di Camere</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-property-rooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-property"
                >
                  {editingProperty ? "Aggiorna Proprietà" : "Crea Proprietà"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessuna proprietà ancora</h3>
            <p className="text-muted-foreground text-center mb-4">
              Inizia aggiungendo la tua prima proprietà
            </p>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Proprietà
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="hover-elevate" data-testid={`card-property-${property.id}`}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{property.name}</span>
                  {!property.active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Inattiva
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {property.city}, {property.country}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {property.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Camere: {property.roomsCount}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(property)}
                    className="flex-1"
                    data-testid={`button-edit-property-${property.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifica
                  </Button>
                  <ArchiveButton
                    onClick={() => archive.archive(property.id)}
                    disabled={archive.isArchiving}
                    testId={`button-archive-property-${property.id}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ArchivedList<Property>
        resource="properties"
        describe={(p) => `${p.city}, ${p.country}`}
        restore={archive.restore}
        isRestoring={archive.isRestoring}
      />
      {archive.confirmDialog}
    </div>
  );
}
