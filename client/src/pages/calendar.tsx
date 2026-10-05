import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Event, Room } from '@shared/schema';
import { availableRooms, type BookedRange } from '@/lib/availability';
import { Calendar } from '@/components/calendar/Calendar';
import { EventsSidebar } from '@/components/calendar/EventsSidebar';
import { RoomsGrid } from '@/components/calendar/RoomsGrid';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarPage() {
  const [selectedDates, setSelectedDates] = useState<{ from?: Date; to?: Date }>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ rooms: Room[]; events: Event[]; bookedRanges: BookedRange[] }>({
    queryKey: ['/api/calendar'],
    staleTime: 0,
  });
  const events = data?.events ?? [];

  const freeRooms =
    data && selectedDates.from && selectedDates.to
      ? availableRooms(
          data.rooms.filter((room) => room.isAvailable),
          data.bookedRanges,
          selectedDates.from,
          selectedDates.to,
        )
      : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Prenota il tuo soggiorno
          </h1>
          <p className="text-muted-foreground">
            Seleziona le date, esplora gli eventi locali e scegli la camera perfetta
          </p>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            <div className="space-y-6">
              <Skeleton className="h-[500px] w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            {/* Left Column: Calendar + Rooms */}
            <div className="space-y-6">
              <Calendar
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                events={events}
                selectedCategory={selectedCategory}
              />

              {freeRooms && freeRooms.length > 0 && (
                <RoomsGrid
                  rooms={freeRooms}
                  selectedDates={selectedDates}
                />
              )}

              {freeRooms && freeRooms.length === 0 && (
                <div className="bg-card rounded-xl p-6 shadow-lg border border-border text-center">
                  <p className="text-muted-foreground">
                    Nessuna camera disponibile per le date selezionate
                  </p>
                </div>
              )}

              {(!selectedDates.from || !selectedDates.to) && (
                <div className="bg-card rounded-xl p-6 shadow-lg border border-border text-center">
                  <p className="text-muted-foreground">
                    Seleziona le date per vedere le camere disponibili
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Events Sidebar */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <EventsSidebar
                events={events}
                selectedDates={selectedDates}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
