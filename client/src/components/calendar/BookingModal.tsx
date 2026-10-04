import { useEffect, useState } from 'react';
import { Room } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Loader2, ArrowLeft, Calendar, User, Mail, AlertTriangle, Users, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toDateString } from '@/lib/availability';
import { useToast } from '@/hooks/use-toast';
import { Turnstile } from './Turnstile';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  selectedDates: { from?: Date; to?: Date };
  nights: number;
  turnstileSiteKey?: string | null;
}

export function BookingModal({ isOpen, onClose, room, selectedDates, nights, turnstileSiteKey }: BookingModalProps) {
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const { toast } = useToast();
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const [guestData, setGuestData] = useState({
    name: '',
    email: '',
    phone: '',
    guests: 1
  });
  const [website, setWebsite] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/widget/bookings', data);
      return response.json();
    },
    onSuccess: (data) => {
      setBookingId(data.id);
      setStep('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ec4899', '#eab308'],
      });
    },
    onError: (error: any) => {
      if (turnstileSiteKey) setTurnstileResetKey((key) => key + 1);
      if (error?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['/api/widget/properties'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      }
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione della prenotazione",
        variant: "destructive"
      });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/widget/bookings/${id}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      setIsCancelled(true);
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'annullamento della prenotazione",
        variant: "destructive"
      });
    }
  });

  // Refresh availability only once the modal closes: refreshing earlier would hide this room
  // (now booked) and unmount the modal before the guest sees the confirmation.
  const handleClose = () => {
    if (bookingId) {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/widget/properties'] });
    }
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  const handleFinalConfirm = () => {
    if (!selectedDates.from || !selectedDates.to || nights <= 0) {
      toast({
        title: "Errore",
        description: "Seleziona un intervallo di date valido",
        variant: "destructive"
      });
      return;
    }

    createBookingMutation.mutate({
      roomId: room.id,
      guestName: guestData.name,
      guestEmail: guestData.email,
      guestPhone: guestData.phone,
      checkIn: toDateString(selectedDates.from),
      checkOut: toDateString(selectedDates.to),
      guestsCount: guestData.guests,
      website,
      turnstileToken,
    });
  };

  const handleCancelBooking = () => {
    if (bookingId) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  // Inside an auto-sized iframe the modal is centred on the whole widget, so ask the host page to scroll it into view.
  useEffect(() => {
    if (isOpen && window.parent !== window) {
      window.parent.postMessage({ type: 'booking-widget-modal-open' }, '*');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pricePerNight = parseFloat(room.pricePerNight);
  const totalPrice = pricePerNight * (nights || 1);
  const guestOptions = Array.from({ length: room.maxGuests }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-6 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full md:max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto relative max-h-[90vh] flex flex-col m-4">
        
        <div className="p-5 border-b border-border flex justify-between items-center bg-primary/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              {step === 'review' && (
                <button 
                  onClick={() => setStep('form')} 
                  data-testid="button-back"
                  className="p-1 hover:bg-muted rounded-full mr-1 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h3 className="text-lg md:text-xl font-bold text-foreground">
                  {step === 'form' && 'Completa i tuoi dati'}
                  {step === 'review' && 'Riepilogo e Conferma'}
                  {step === 'success' && (isCancelled ? 'Prenotazione Annullata' : 'Richiesta Inviata!')}
              </h3>
            </div>
            <button 
              onClick={handleClose} 
              data-testid="button-close-modal"
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        <div className="p-5 md:p-6 overflow-y-auto">
            {step === 'form' && (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="absolute -left-[9999px] h-px w-px opacity-0"
                    />
                    <div className="bg-muted p-4 rounded-lg mb-4 border border-border">
                        <div className="font-medium text-foreground text-lg leading-tight">{room.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                            <Calendar size={14} />
                            {selectedDates.from?.toLocaleDateString()} - {selectedDates.to?.toLocaleDateString()}
                        </div>
                        <div className="text-sm font-bold mt-3 text-primary bg-primary/10 inline-block px-2 py-1 rounded">
                            Totale: €{totalPrice.toFixed(2)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-foreground">Numero Ospiti</label>
                          <div className="relative">
                            <Users className="absolute left-3 top-3 text-muted-foreground" size={18} />
                            <select
                              className="w-full border border-input rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none bg-background"
                              value={guestData.guests}
                              onChange={(e) => setGuestData({...guestData, guests: parseInt(e.target.value)})}
                              data-testid="select-guests"
                            >
                              {guestOptions.map(num => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? 'Persona' : 'Persone'}
                                </option>
                              ))}
                            </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-foreground">Nome Completo</label>
                          <input 
                            required 
                            className="w-full border border-input rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background" 
                            placeholder="Mario Rossi" 
                            value={guestData.name}
                            onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                            data-testid="input-guest-name"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
                          <input 
                            required 
                            type="email" 
                            className="w-full border border-input rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background" 
                            placeholder="mario@example.com" 
                            value={guestData.email}
                            onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                            data-testid="input-guest-email"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-foreground">Telefono</label>
                          <input 
                            required 
                            type="tel" 
                            className="w-full border border-input rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background" 
                            placeholder="+39 333 123 4567" 
                            value={guestData.phone}
                            onChange={(e) => setGuestData({...guestData, phone: e.target.value})}
                            data-testid="input-guest-phone"
                          />
                      </div>
                    </div>

                    <Button 
                        type="submit" 
                        data-testid="button-continue"
                        className="w-full mt-6 py-3 text-lg"
                    >
                        Continua
                    </Button>
                </form>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dettagli Soggiorno</h4>
                  <div className="bg-muted p-4 rounded-xl border border-border space-y-3 text-sm md:text-base">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Camera</span>
                      <span className="font-medium text-foreground text-right">{room.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-foreground text-right">
                        {selectedDates.from?.toLocaleDateString()} - {selectedDates.to?.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notti</span>
                      <span className="font-medium text-foreground">{nights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ospiti</span>
                      <span className="font-medium text-foreground">{guestData.guests}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between items-center mt-2">
                      <span className="font-bold text-foreground">Totale da pagare</span>
                      <span className="text-xl font-bold text-primary">€{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">I tuoi dati</h4>
                  <div className="bg-muted p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <User size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-medium text-foreground truncate">{guestData.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground truncate">{guestData.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Phone size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-muted-foreground">Telefono</p>
                        <p className="font-medium text-foreground truncate">{guestData.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {turnstileSiteKey && (
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onToken={setTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('form')}
                    data-testid="button-edit"
                    className="flex-1"
                  >
                    Modifica
                  </Button>
                  <Button 
                    onClick={handleFinalConfirm}
                    data-testid="button-confirm"
                    className="flex-[2]"
                    disabled={createBookingMutation.isPending || (!!turnstileSiteKey && !turnstileToken)}
                  >
                    {createBookingMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : 'Conferma Prenotazione'}
                  </Button>
                </div>
              </div>
            )}

            {step === 'success' && (
                <div className="text-center py-4 animate-in zoom-in duration-300">
                    {!isCancelled ? (
                      <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                            </div>
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-foreground mb-2">Grazie, {guestData.name.split(' ')[0]}!</h4>
                        <p className="text-sm md:text-base text-muted-foreground mb-8">
                          La tua prenotazione per <span className="font-medium text-foreground">{guestData.guests} {guestData.guests === 1 ? 'persona' : 'persone'}</span> è stata inviata ed è in attesa di conferma. <br className="hidden md:block"/>
                          La struttura ti contatterà a <span className="font-medium text-foreground block md:inline">{guestData.email}</span>.
                        </p>
                        
                        {!showCancelConfirm ? (
                          <>
                            <Button 
                              onClick={handleClose} 
                              data-testid="button-close-success"
                              className="w-full rounded-full py-5 md:py-6 text-base md:text-lg shadow-lg mb-4"
                            >
                              Torna alla Home
                            </Button>
                            <button 
                              onClick={() => setShowCancelConfirm(true)}
                              data-testid="button-show-cancel"
                              className="text-sm text-red-500 hover:text-red-600 hover:underline font-medium transition-colors"
                            >
                              Annulla questa prenotazione
                            </button>
                          </>
                        ) : (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-4 md:mt-6 animate-in fade-in slide-in-from-bottom-2 text-left md:text-center">
                            <div className="flex items-center md:justify-center gap-2 text-red-600 mb-2">
                              <AlertTriangle size={20} />
                              <span className="font-bold">Sei sicuro?</span>
                            </div>
                            <p className="text-sm text-red-600/80 mb-4">
                              Questa azione è irreversibile. La tua prenotazione verrà cancellata immediatamente.
                            </p>
                            <div className="flex flex-col md:flex-row gap-3">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowCancelConfirm(false)}
                                data-testid="button-keep-booking"
                                className="flex-1 bg-background border-red-200 text-red-600 hover:bg-red-50 order-2 md:order-1"
                              >
                                No, mantieni
                              </Button>
                              <Button 
                                onClick={handleCancelBooking}
                                data-testid="button-cancel-booking"
                                disabled={cancelBookingMutation.isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white order-1 md:order-2"
                              >
                                {cancelBookingMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : 'Sì, annulla'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center">
                              <X className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                            </div>
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-foreground mb-2">Prenotazione Annullata</h4>
                        <p className="text-sm md:text-base text-muted-foreground mb-8">
                          La prenotazione è stata cancellata come richiesto.
                        </p>
                        <Button 
                          onClick={handleClose} 
                          data-testid="button-close-cancelled"
                          variant="secondary"
                          className="w-full rounded-full py-5 md:py-6 text-base md:text-lg"
                        >
                          Chiudi
                        </Button>
                      </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
