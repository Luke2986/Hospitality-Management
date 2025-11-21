
import React, { useState } from 'react';
import { format, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { Sparkles, Calendar, X } from 'lucide-react';
import { EventCard } from './EventCard';
import { MOCK_EVENTS } from '../../constants';
import { cn } from '../../lib/design/utils';

interface EventsSidebarProps {
  propertyId: string;
  selectedDates: { from?: Date; to?: Date };
}

export function EventsSidebar({ propertyId, selectedDates }: EventsSidebarProps) {
  // In a real app, fetch based on propertyId. Here we use mocks.
  const events = MOCK_EVENTS;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories for the filter
  const categories = Array.from(new Set(events.map(e => e.category).filter(Boolean))) as string[];

  const filteredEvents = events.filter(event => {
    // Date Filter
    let dateMatch = true;
    if (selectedDates.from && selectedDates.to) {
      const eventDate = new Date(event.event_date);
      dateMatch = isWithinInterval(eventDate, {
        start: selectedDates.from,
        end: selectedDates.to,
      });
    }

    // Category Filter
    let categoryMatch = true;
    if (selectedCategory) {
      categoryMatch = event.category === selectedCategory;
    }

    return dateMatch && categoryMatch;
  });

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg sticky top-4 md:top-8 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-widget-accent" />
        <h3 className="text-lg md:text-xl font-bold text-widget-text">Eventi in zona</h3>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2 scrollbar-hide md:scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
            !selectedCategory 
              ? "bg-widget-text text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Tutti
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all flex-shrink-0",
              selectedCategory === cat
                ? "bg-widget-primary text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {selectedDates.from && selectedDates.to && (
        <div className="mb-4 p-3 bg-widget-accent/10 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-widget-muted">
            <Calendar className="w-4 h-4" />
            <span>
              {format(selectedDates.from, 'dd MMM', { locale: it })} - {format(selectedDates.to, 'dd MMM', { locale: it })}
            </span>
          </div>
        </div>
      )}

      {filteredEvents.length > 0 ? (
        <div className="space-y-3 max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
          {filteredEvents.map(event => (
            <div key={event.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-widget-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-widget-muted">
            {selectedCategory 
              ? `Nessun evento di tipo "${selectedCategory}" in questo periodo`
              : selectedDates.from 
                ? 'Nessun evento in questo periodo'
                : 'Seleziona le date per vedere gli eventi'}
          </p>
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-widget-primary text-sm font-medium mt-2 hover:underline"
            >
              Mostra tutti gli eventi
            </button>
          )}
        </div>
      )}
    </div>
  );
}
