
import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  isBefore, 
  startOfDay, 
  isWithinInterval,
  subMonths
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/design/utils';
import { Event } from '../../types';

interface CalendarProps {
  selectedDates: { from?: Date; to?: Date };
  onDatesChange: (range: { from?: Date; to?: Date }) => void;
  disabledDates?: Date[];
  events?: Event[];
  className?: string;
}

// Helper to match colors with EventCard
function getCategoryColor(category?: string) {
  const colors: Record<string, string> = {
    concerto: 'bg-purple-500',
    sagra: 'bg-orange-500',
    sport: 'bg-green-500',
    religioso: 'bg-blue-500',
    mercato: 'bg-yellow-500',
    cultura: 'bg-pink-500',
  };
  return colors[category || ''] || 'bg-gray-400';
}

export function Calendar({ selectedDates, onDatesChange, disabledDates = [], events = [], className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const today = startOfDay(new Date());

  const nextMonth = () => {
    setSlideDirection('right');
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setSlideDirection('left');
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    const isPast = isBefore(date, today);
    const isExplicitlyDisabled = disabledDates.some(d => isSameDay(d, date));
    
    if (isPast || isExplicitlyDisabled) return;
    
    // Logic for range selection
    if (!selectedDates.from || (selectedDates.from && selectedDates.to)) {
      // Start new range
      onDatesChange({ from: date, to: undefined });
    } else {
      // Complete range or reset if clicking before start
      if (isBefore(date, selectedDates.from)) {
        onDatesChange({ from: date, to: undefined });
      } else {
        onDatesChange({ ...selectedDates, to: date });
      }
    }
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Padding days for grid alignment
    const startDay = monthStart.getDay(); // 0 is Sunday
    // Adjust for Monday start (Italian week starts Monday)
    const italianStartDay = startDay === 0 ? 6 : startDay - 1;
    const padding = Array(italianStartDay).fill(null);

    return (
      <div className="select-none w-full max-w-[320px] mx-auto">
        <div className="font-semibold text-center mb-4 text-widget-text capitalize text-lg" aria-live="polite">
          {format(monthDate, 'MMMM yyyy', { locale: it })}
        </div>
        <div 
          className="grid grid-cols-7 gap-1 text-center text-xs text-widget-muted mb-2" 
          aria-hidden="true"
        >
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 justify-items-center" role="grid">
          {padding.map((_, i) => <div key={`pad-${i}`} role="presentation" />)}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isExplicitlyDisabled = disabledDates.some(d => isSameDay(d, day));
            const isDisabled = isPast || isExplicitlyDisabled;
            
            const isToday = isSameDay(day, today);
            const isSelected = (selectedDates.from && isSameDay(day, selectedDates.from)) || 
                             (selectedDates.to && isSameDay(day, selectedDates.to));
            const isInRange = selectedDates.from && selectedDates.to && 
                            isWithinInterval(day, { start: selectedDates.from, end: selectedDates.to });
            
            // Find events for this day
            const dayEvents = events.filter(event => isSameDay(new Date(event.event_date), day));
            const hasEvent = dayEvents.length > 0;
            const displayEvents = dayEvents.slice(0, 3); // Max 3 dots
            
            // Accessible label construction
            let ariaLabel = format(day, 'PPPP', { locale: it });
            if (isDisabled) ariaLabel += ", non disponibile";
            if (hasEvent) ariaLabel += `, ${dayEvents.length} eventi: ${dayEvents.map(e => e.title).join(', ')}`;
            if (isSelected) ariaLabel += ", selezionato";
            
            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                aria-label={ariaLabel}
                aria-disabled={isDisabled}
                aria-selected={!!isSelected}
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  "group relative w-full aspect-square rounded-full flex items-center justify-center text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-widget-primary focus-visible:ring-offset-2",
                  isDisabled 
                    ? "text-gray-300 bg-gray-50 cursor-not-allowed opacity-60" // Distinct style for disabled/past dates
                    : "hover:bg-widget-primary/20 text-widget-text",
                  isSelected ? "bg-widget-primary text-white hover:bg-widget-primary shadow-md z-10 opacity-100" : "",
                  !isSelected && isInRange ? "bg-widget-primary/10 text-widget-text rounded-none" : "",
                  // Rounding for range ends inside the range
                  isInRange && isSameDay(day, selectedDates.from!) ? "rounded-l-full rounded-r-none" : "",
                  isInRange && isSameDay(day, selectedDates.to!) ? "rounded-r-full rounded-l-none" : ""
                )}
              >
                {/* Date Number: leading-none helps vertically center and separate from dot */}
                <span className="relative z-10 leading-none pb-1.5 text-xs sm:text-sm" aria-hidden="true">{format(day, 'd')}</span>
                
                {/* Event Dots Cluster */}
                {hasEvent && !isDisabled && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex -space-x-0.5" aria-hidden="true">
                    {displayEvents.map((e, index) => (
                      <span 
                        key={e.id}
                        className={cn(
                          "w-1 h-1 rounded-full ring-1",
                          isSelected ? "ring-widget-primary" : "ring-white", // Cutout effect
                          getCategoryColor(e.category)
                        )} 
                        style={{ zIndex: 10 - index }}
                      />
                    ))}
                  </div>
                )}

                {/* Tooltip on Hover & Focus (Only show if not disabled) */}
                {hasEvent && !isDisabled && (
                  <div 
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[150px] hidden group-hover:block group-focus:block z-50 pointer-events-none"
                  >
                    <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 shadow-xl flex flex-col gap-1">
                      {dayEvents.map((e) => (
                        <span key={e.id} className="truncate">{e.title}</span>
                      ))}
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="w-2 h-2 bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-white p-3 sm:p-6 rounded-xl shadow-lg border border-gray-100 overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-lg sm:text-xl font-bold text-widget-text">Seleziona date</h2>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={prevMonth} 
            disabled={isBefore(currentMonth, today)} 
            aria-label="Mese precedente"
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors focus:outline-none focus:ring-2 focus:ring-widget-primary"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button 
            onClick={nextMonth} 
            aria-label="Mese successivo"
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-widget-primary"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      <div 
        key={currentMonth.toISOString()}
        className={cn(
          "flex flex-col md:flex-row gap-8 justify-center w-full",
          slideDirection === 'right' ? 'animate-enter-from-right' : '',
          slideDirection === 'left' ? 'animate-enter-from-left' : ''
        )}
      >
        {renderMonth(currentMonth)}
        <div className="hidden md:block w-px bg-gray-100" role="presentation" />
        <div className="hidden md:block" aria-hidden="true">
            {/* Hidden from screen readers to avoid duplicate reading of next month, purely visual for desktop */}
            {renderMonth(addMonths(currentMonth, 1))}
        </div>
      </div>
    </div>
  );
}
