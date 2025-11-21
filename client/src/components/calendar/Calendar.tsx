import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { Event } from '@shared/schema';

interface CalendarProps {
  selectedDates: { from?: Date; to?: Date };
  onDatesChange: (range: { from?: Date; to?: Date }) => void;
  disabledDates?: Date[];
  events?: Event[];
  className?: string;
}

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
    
    if (!selectedDates.from || (selectedDates.from && selectedDates.to)) {
      setCurrentMonth(startOfMonth(date));
      onDatesChange({ from: date, to: undefined });
    } else {
      if (isBefore(date, selectedDates.from)) {
        setCurrentMonth(startOfMonth(date));
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

    const startDay = monthStart.getDay();
    const italianStartDay = startDay === 0 ? 6 : startDay - 1;
    const padding = Array(italianStartDay).fill(null);

    return (
      <div className="select-none w-full max-w-[320px] mx-auto">
        <div className="font-semibold text-center mb-4 text-foreground capitalize text-lg" aria-live="polite">
          {format(monthDate, 'MMMM yyyy', { locale: it })}
        </div>
        <div 
          className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2" 
          aria-hidden="true"
        >
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <div key={`day-${i}`} className="py-1">{d}</div>
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
            
            const dayEvents = events.filter(event => isSameDay(new Date(event.eventDate), day));
            const hasEvent = dayEvents.length > 0;
            const displayEvents = dayEvents.slice(0, 3);
            
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
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                className={cn(
                  "group relative w-full aspect-square rounded-full flex items-center justify-center text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isDisabled 
                    ? "text-muted-foreground/30 bg-muted/50 cursor-not-allowed opacity-60"
                    : "hover:bg-primary/20 text-foreground",
                  isSelected ? "bg-primary text-primary-foreground hover:bg-primary shadow-md z-10 opacity-100" : "",
                  !isSelected && isInRange ? "bg-primary/10 text-foreground rounded-none" : "",
                  isInRange && isSameDay(day, selectedDates.from!) ? "rounded-l-full rounded-r-none" : "",
                  isInRange && isSameDay(day, selectedDates.to!) ? "rounded-r-full rounded-l-none" : ""
                )}
              >
                <span className="relative z-10 leading-none pb-1.5 text-xs sm:text-sm" aria-hidden="true">{format(day, 'd')}</span>
                
                {hasEvent && !isDisabled && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex -space-x-0.5" aria-hidden="true">
                    {displayEvents.map((e, index) => (
                      <span 
                        key={e.id}
                        className={cn(
                          "w-1 h-1 rounded-full ring-1",
                          isSelected ? "ring-primary" : "ring-white",
                          getCategoryColor(e.category || undefined)
                        )} 
                        style={{ zIndex: 10 - index }}
                      />
                    ))}
                  </div>
                )}

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
    <div className={cn("bg-card p-3 sm:p-6 rounded-xl shadow-lg border border-border overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Seleziona date</h2>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={prevMonth} 
            disabled={isBefore(currentMonth, today)} 
            aria-label="Mese precedente"
            data-testid="button-prev-month"
            className="p-1.5 sm:p-2 hover:bg-muted rounded-full disabled:opacity-30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button 
            onClick={nextMonth} 
            aria-label="Mese successivo"
            data-testid="button-next-month"
            className="p-1.5 sm:p-2 hover:bg-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      <div 
        key={currentMonth.toISOString()}
        className={cn(
          "flex flex-col md:flex-row gap-8 justify-center w-full",
          slideDirection === 'right' ? 'animate-in slide-in-from-right' : '',
          slideDirection === 'left' ? 'animate-in slide-in-from-left' : ''
        )}
      >
        {renderMonth(currentMonth)}
        <div className="hidden md:block w-px bg-border" role="presentation" />
        <div className="hidden md:block" aria-hidden="true">
            {renderMonth(addMonths(currentMonth, 1))}
        </div>
      </div>
    </div>
  );
}
