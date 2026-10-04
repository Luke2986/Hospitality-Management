import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Calendar } from '@/components/calendar/Calendar';
import { EventsSidebar } from '@/components/calendar/EventsSidebar';
import { RoomsGrid } from '@/components/calendar/RoomsGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { Property, Room, Event } from '@shared/schema';
import { availableRooms, type BookedRange } from '@/lib/availability';

interface WidgetData {
  property: Property;
  rooms: Room[];
  events: Event[];
  bookedRanges: BookedRange[];
}

export default function WidgetEmbedPage() {
  const { propertyId } = useParams();
  const [selectedDates, setSelectedDates] = useState<{ from?: Date; to?: Date }>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: widgetData, isLoading } = useQuery<WidgetData>({
    queryKey: ['/api/widget/properties', propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/widget/properties/${propertyId}`);
      if (!response.ok) throw new Error('Failed to load widget data');
      return response.json();
    },
    enabled: !!propertyId,
  });

  const freeRooms =
    widgetData && selectedDates.from && selectedDates.to
      ? availableRooms(widgetData.rooms, widgetData.bookedRanges, selectedDates.from, selectedDates.to)
      : null;

  const rootRef = useRef<HTMLDivElement>(null);

  // Measures the content, not the viewport: the iframe's own height must not feed back into it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.parent === window) return;

    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: 'booking-widget-resize', height }, '*');
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [propertyId]);

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Property ID non valido</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Property Info */}
        {isLoading ? (
          <div className="text-center space-y-2">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
        ) : widgetData ? (
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {widgetData.property.name}
            </h1>
            <p className="text-muted-foreground">
              📍 {widgetData.property.city}, {widgetData.property.country}
            </p>
            {widgetData.property.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {widgetData.property.description}
              </p>
            )}
          </div>
        ) : null}

        {/* Main Content - Calendar Layout */}
        {isLoading ? (
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            <div className="space-y-6">
              <Skeleton className="h-[500px] w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : widgetData ? (
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            {/* Left Column: Calendar + Rooms */}
            <div className="space-y-6">
              <Calendar
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                events={widgetData.events}
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
            <div>
              <EventsSidebar
                events={widgetData.events}
                selectedDates={selectedDates}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Impossibile caricare i dati della proprietà</p>
          </div>
        )}
      </div>
    </div>
  );
}
