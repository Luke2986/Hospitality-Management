import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import type { Booking, Room } from "@shared/schema";
import { Check, X, Mail, Search, Filter, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { fetchPage, PaginationControls, type PageResult } from "@/components/pagination";

export default function Bookings() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    guestName: "",
    status: "",
    roomId: "",
    checkInFrom: "",
    checkInTo: "",
  });

  const [page, setPage] = useState(0);
  const updateFilters = (next: typeof filters) => {
    setFilters(next);
    setPage(0);
  };

  const queryParams = new URLSearchParams();
  if (filters.guestName) queryParams.set("guestName", filters.guestName);
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.roomId) queryParams.set("roomId", filters.roomId);
  if (filters.checkInFrom) queryParams.set("checkInFrom", filters.checkInFrom);
  if (filters.checkInTo) queryParams.set("checkInTo", filters.checkInTo);

  const { data, isLoading } = useQuery<PageResult<Booking>>({
    queryKey: ["/api/bookings", queryParams.toString(), page],
    queryFn: () => fetchPage<Booking>("/api/bookings", queryParams, page),
    placeholderData: keepPreviousData,
  });
  const bookings = data?.items;

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Successo",
        description: "Stato prenotazione aggiornato",
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

  const [anonymizing, setAnonymizing] = useState<Booking | null>(null);
  const anonymizeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/bookings/${id}/anonymize`),
    onSuccess: () => {
      setAnonymizing(null);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Dati dell'ospite cancellati" });
    },
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-success text-white" data-testid={`badge-confirmed`}>Confermata</Badge>;
      case "pending":
        return <Badge className="bg-warning text-white" data-testid={`badge-pending`}>In attesa</Badge>;
      case "cancelled":
        return <Badge className="bg-danger text-white" data-testid={`badge-cancelled`}>Annullata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Prenotazioni</h1>
        <p className="text-muted-foreground">Gestisci tutte le prenotazioni delle tue proprietà</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtri</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guest-search">Nome Ospite</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-search"
                  placeholder="Cerca per nome"
                  value={filters.guestName}
                  onChange={(e) => updateFilters({ ...filters, guestName: e.target.value })}
                  className="pl-8"
                  data-testid="input-guest-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Stato</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => updateFilters({ ...filters, status: value === "all" ? "" : value })}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="confirmed">Confermata</SelectItem>
                  <SelectItem value="cancelled">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-filter">Camera</Label>
              <Select value={filters.roomId || "all"} onValueChange={(value) => updateFilters({ ...filters, roomId: value === "all" ? "" : value })}>
                <SelectTrigger id="room-filter" data-testid="select-room-filter">
                  <SelectValue placeholder="Tutte le camere" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le camere</SelectItem>
                  {rooms && rooms.length > 0 && rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin-from">Check-in Da</Label>
              <Input
                id="checkin-from"
                type="date"
                value={filters.checkInFrom}
                onChange={(e) => updateFilters({ ...filters, checkInFrom: e.target.value })}
                data-testid="input-checkin-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin-to">Check-in A</Label>
              <Input
                id="checkin-to"
                type="date"
                value={filters.checkInTo}
                onChange={(e) => updateFilters({ ...filters, checkInTo: e.target.value })}
                data-testid="input-checkin-to"
              />
            </div>
          </div>
          {(filters.guestName || filters.status || filters.roomId || filters.checkInFrom || filters.checkInTo) && (
            <Button 
              variant="outline" 
              onClick={() => updateFilters({ guestName: "", status: "", roomId: "", checkInFrom: "", checkInTo: "" })}
              className="mt-4"
              data-testid="button-clear-filters"
            >
              Cancella filtri
            </Button>
          )}
        </CardContent>
      </Card>

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold mb-2">Nessuna prenotazione ancora</h3>
            <p className="text-muted-foreground text-center">
              Le prenotazioni appariranno qui quando gli ospiti effettueranno prenotazioni
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ospite</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Ospiti</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.guestName}</div>
                        {!booking.anonymizedAt && (
                          <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{format(parseISO(booking.checkIn), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(parseISO(booking.checkOut), "MMM d, yyyy")}</TableCell>
                    <TableCell>{booking.guestsCount}</TableCell>
                    <TableCell className="font-medium">€{Number(booking.totalPrice).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "confirmed" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-confirm-${booking.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-cancel-${booking.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {!booking.anonymizedAt && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${booking.guestEmail}`} data-testid={`button-email-${booking.id}`}>
                                <Mail className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Cancella i dati dell'ospite"
                              onClick={() => setAnonymizing(booking)}
                              data-testid={`button-anonymize-${booking.id}`}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PaginationControls page={page} total={data?.total ?? 0} onPageChange={setPage} />

      <AlertDialog open={anonymizing !== null} onOpenChange={(open) => !open && setAnonymizing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare i dati di {anonymizing?.guestName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nome, email, telefono e note vengono cancellati definitivamente; restano date, importo e stato. Usalo quando
              un ospite chiede la cancellazione dei suoi dati. Non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => anonymizing && anonymizeMutation.mutate(anonymizing.id)}
              data-testid="button-confirm-anonymize"
            >
              Cancella dati
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
