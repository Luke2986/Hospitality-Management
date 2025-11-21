import React, { useState } from 'react';
import { Menu, User, Search, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Left Nav */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-white" size={20} />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Auto<span className="text-primary">Hub</span>
              </span>
            </div>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <a href="#" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium">
                Compra
              </a>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Vendi
              </a>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Servizi
              </a>
            </div>
          </div>

          {/* Right Nav */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600">
              <User size={18} />
              Accedi
            </Button>
            <Button variant="primary" size="sm" className="hidden md:flex">
              Per Rivenditori
            </Button>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 bg-gray-50 border-l-4 border-primary">
              Compra
            </a>
            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300">
              Vendi
            </a>
            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300">
              Servizi
            </a>
          </div>
          <div className="pt-4 pb-6 border-t border-gray-200 px-4 space-y-3">
            <Button variant="ghost" className="w-full justify-start gap-2 text-gray-600">
              <User size={18} />
              Accedi
            </Button>
            <Button variant="primary" className="w-full justify-center">
              Per Rivenditori
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};