import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Compra</h3>
            <ul className="mt-4 space-y-4">
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Usato Garantito</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Km 0</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Elettriche</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Azienda</h3>
            <ul className="mt-4 space-y-4">
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Chi Siamo</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Lavora con noi</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Press</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Supporto</h3>
            <ul className="mt-4 space-y-4">
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Centro Assistenza</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Contatti</a></li>
              <li><a href="#" className="text-base text-gray-500 hover:text-gray-900">Termini e Condizioni</a></li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white font-bold text-xs">
                AH
              </div>
              <span className="font-bold text-lg">AutoHub</span>
            </div>
            <p className="text-gray-500 text-sm">
              Il marketplace di fiducia per l'acquisto di auto usate certificate in Italia.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          &copy; 2024 AutoHub Italia S.r.l. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
};