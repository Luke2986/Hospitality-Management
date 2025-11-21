
import React, { useState } from 'react';
import { Room } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle, X, Loader2, ArrowLeft, Calendar, User, Mail, AlertTriangle, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  selectedDates: { from?: Date; to?: Date };
  nights: number;
}

export function BookingModal({ isOpen, onClose, room, selectedDates, nights }: BookingModalProps) {
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  // Cancellation State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  
  // Form State
  const [guestData, setGuestData] = useState({
    name: '',
    email: '',
    guests: 1
  });

  // Handle initial form submission (move to review)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  // Handle final confirmation
  const handleFinalConfirm = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ec4899', '#eab308'],
      });
    }, 1500);
  };

  const handleCancelBooking = () => {
    // Simulate cancellation API call
    setIsCancelled(true);
    setShowCancelConfirm(false);
  };

  if (!isOpen) return null;

  const totalPrice = room.price_per_night * (nights || 1);
  const guestOptions = Array.from({ length: room.max_guests }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full md:max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto relative max-h-[90vh] flex flex-col m-4">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-widget-primary/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              {step === 'review' && (
                <button 
                  onClick={() => setStep('form')} 
                  className="p-1 hover:bg-gray-200 rounded-full mr-1 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h3 className="text-lg md:text-xl font-bold text-widget-text">
                  {step === 'form' && 'Completa i tuoi dati'}
                  {step === 'review' && 'Riepilogo e Conferma'}
                  {step === 'success' && (isCancelled ? 'Prenotazione Annullata' : 'Prenotazione Confermata!')}
              </h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-5 md:p-6 overflow-y-auto">
            {/* STEP 1: FORM */}
            {step === 'form' && (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
                        <div className="font-medium text-widget-text text-lg leading-tight">{room.name}</div>
                        <div className="text-sm text-widget-muted flex items-center gap-2 mt-2">
                            <Calendar size={14} />
                            {selectedDates.from?.toLocaleDateString()} - {selectedDates.to?.toLocaleDateString()}
                        </div>
                        <div className="text-sm font-bold mt-3 text-widget-primary bg-widget-primary/10 inline-block px-2 py-1 rounded">
                            Totale: €{totalPrice}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-widget-text">Numero Ospiti</label>
                          <div className="relative">
                            <Users className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select
                              className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-widget-primary/50 outline-none transition-all appearance-none bg-white"
                              value={guestData.guests}
                              onChange={(e) => setGuestData({...guestData, guests: parseInt(e.target.value)})}
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
                          <label className="block text-sm font-medium mb-1.5 text-widget-text">Nome Completo</label>
                          <input 
                            required 
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-widget-primary/50 outline-none transition-all" 
                            placeholder="Mario Rossi" 
                            value={guestData.name}
                            onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1.5 text-widget-text">Email</label>
                          <input 
                            required 
                            type="email" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-widget-primary/50 outline-none transition-all" 
                            placeholder="mario@example.com" 
                            value={guestData.email}
                            onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                          />
                      </div>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full bg-widget-primary hover:bg-widget-primary/90 text-white mt-6 py-3 text-lg"
                    >
                        Continua
                    </Button>
                </form>
            )}

            {/* STEP 2: REVIEW */}
            {step === 'review' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-widget-muted uppercase tracking-wider">Dettagli Soggiorno</h4>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-sm md:text-base">
                    <div className="flex justify-between">
                      <span className="text-widget-muted">Camera</span>
                      <span className="font-medium text-widget-text text-right">{room.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-widget-muted">Date</span>
                      <span className="font-medium text-widget-text text-right">
                        {selectedDates.from?.toLocaleDateString()} - {selectedDates.to?.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-widget-muted">Notti</span>
                      <span className="font-medium text-widget-text">{nights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-widget-muted">Ospiti</span>
                      <span className="font-medium text-widget-text">{guestData.guests}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-2">
                      <span className="font-bold text-widget-text">Totale da pagare</span>
                      <span className="text-xl font-bold text-widget-primary">€{totalPrice}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-widget-muted uppercase tracking-wider mt-6">I tuoi dati</h4>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-widget-primary/10 flex items-center justify-center text-widget-primary flex-shrink-0">
                        <User size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-widget-muted">Nome</p>
                        <p className="font-medium text-widget-text truncate">{guestData.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-widget-primary/10 flex items-center justify-center text-widget-primary flex-shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-widget-muted">Email</p>
                        <p className="font-medium text-widget-text truncate">{guestData.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('form')}
                    className="flex-1 border-gray-300"
                  >
                    Modifica
                  </Button>
                  <Button 
                    onClick={handleFinalConfirm}
                    className="flex-[2] bg-widget-primary hover:bg-widget-primary/90 text-white"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : 'Conferma Prenotazione'}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS (Confirmed or Cancelled) */}
            {step === 'success' && (
                <div className="text-center py-4 animate-in zoom-in duration-300">
                    {!isCancelled ? (
                      <>
                        {/* Success State */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                            </div>
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-widget-text mb-2">Grazie, {guestData.name.split(' ')[0]}!</h4>
                        <p className="text-sm md:text-base text-widget-muted mb-8">
                          La tua prenotazione per <span className="font-medium text-widget-text">{guestData.guests} {guestData.guests === 1 ? 'persona' : 'persone'}</span> è stata confermata con successo. <br className="hidden md:block"/>
                          Abbiamo inviato una email di riepilogo a <span className="font-medium text-widget-text block md:inline">{guestData.email}</span>.
                        </p>
                        
                        {!showCancelConfirm ? (
                          <>
                            <Button onClick={onClose} className="w-full bg-widget-primary text-white rounded-full py-5 md:py-6 text-base md:text-lg shadow-lg shadow-widget-primary/25 mb-4">
                              Torna alla Home
                            </Button>
                            <button 
                              onClick={() => setShowCancelConfirm(true)}
                              className="text-sm text-red-500 hover:text-red-600 hover:underline font-medium transition-colors"
                            >
                              Annulla questa prenotazione
                            </button>
                          </>
                        ) : (
                          // Confirmation Dialog
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
                                className="flex-1 bg-white border-red-200 text-red-600 hover:bg-red-50 order-2 md:order-1"
                              >
                                No, mantieni
                              </Button>
                              <Button 
                                onClick={handleCancelBooking}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white order-1 md:order-2"
                              >
                                Sì, annulla
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Cancelled State
                      <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center">
                              <X className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                            </div>
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-widget-text mb-2">Prenotazione Annullata</h4>
                        <p className="text-sm md:text-base text-widget-muted mb-8">
                          La prenotazione è stata cancellata come richiesto. <br/>
                          Riceverai una conferma di cancellazione via email.
                        </p>
                        <Button onClick={onClose} className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-full py-5 md:py-6 text-base md:text-lg">
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
