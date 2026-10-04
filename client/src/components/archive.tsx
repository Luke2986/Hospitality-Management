import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Archive, ArchiveRestore } from "lucide-react";

type Resource = "properties" | "rooms";

const labels: Record<Resource, { archived: string; restored: string; title: string }> = {
  properties: { archived: "Proprietà archiviata", restored: "Proprietà ripristinata", title: "Archiviare la proprietà?" },
  rooms: { archived: "Camera archiviata", restored: "Camera ripristinata", title: "Archiviare la camera?" },
};

export const archivedQueryKey = (resource: Resource) => [`/api/${resource}`, "archived"];

function invalidateAll() {
  for (const key of ["/api/properties", "/api/rooms", "/api/events", "/api/bookings"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useArchive(resource: Resource) {
  const { toast } = useToast();
  const [pending, setPending] = useState<{ id: string; upcoming: number } | null>(null);
  const text = labels[resource];

  const onError = (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" });

  const archiveMutation = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) =>
      apiRequest("DELETE", `/api/${resource}/${id}${confirm ? "?confirm=true" : ""}`),
    onSuccess: () => {
      setPending(null);
      invalidateAll();
      toast({ title: text.archived, description: "La trovi nella sezione Archivio." });
    },
    onError: (error: Error, { id }) => {
      if (error instanceof ApiError && error.code === "HAS_UPCOMING_BOOKINGS") {
        const upcoming = Number(error.body?.upcomingBookings ?? 0);
        setPending({ id, upcoming });
        return;
      }
      onError(error);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/${resource}/${id}/restore`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: text.restored });
    },
    onError,
  });

  const confirmDialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.upcoming === 1
              ? "C'è 1 prenotazione futura attiva."
              : `Ci sono ${pending?.upcoming} prenotazioni future attive.`}{" "}
            Le prenotazioni restano valide e visibili, ma non sarà più possibile riceverne di nuove finché non
            ripristini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => pending && archiveMutation.mutate({ id: pending.id, confirm: true })}
            data-testid="button-confirm-archive"
          >
            Archivia comunque
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    archive: (id: string) => archiveMutation.mutate({ id, confirm: false }),
    isArchiving: archiveMutation.isPending,
    restore: (id: string) => restoreMutation.mutate(id),
    isRestoring: restoreMutation.isPending,
    confirmDialog,
  };
}

export function ArchiveButton({ onClick, disabled, testId }: { onClick: () => void; disabled: boolean; testId: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} title="Archivia" data-testid={testId}>
      <Archive className="w-4 h-4" />
    </Button>
  );
}

export function ArchivedList<T extends { id: string; name: string }>({
  resource,
  describe,
  restore,
  isRestoring,
}: {
  resource: Resource;
  describe?: (item: T) => string;
  restore: (id: string) => void;
  isRestoring: boolean;
}) {
  const { data: items } = useQuery<T[]>({
    queryKey: archivedQueryKey(resource),
    queryFn: async () => (await apiRequest("GET", `/api/${resource}?archived=true`)).json(),
  });

  if (!items?.length) return null;

  return (
    <Card data-testid={`archive-${resource}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="w-4 h-4" />
          Archivio
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              {describe && <p className="text-sm text-muted-foreground truncate">{describe(item)}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => restore(item.id)}
              disabled={isRestoring}
              data-testid={`button-restore-${item.id}`}
            >
              <ArchiveRestore className="w-4 h-4 mr-2" />
              Ripristina
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
