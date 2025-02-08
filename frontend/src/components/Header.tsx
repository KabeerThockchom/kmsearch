import React from 'react';
import { Search, Menu } from 'lucide-react';
import Logo from './logo.svg';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <a href="https://vgkmpoc.fly.dev/" className="flex-shrink-0 flex items-center">
              <img src={Logo} alt="Vanguard Logo" className="h-10 w-auto mr-2" />
              <span className="text-2xl font-bold text-red-700">Vanguard</span>
            </a>
            <nav className="hidden md:ml-6 md:flex space-x-8">
              <a
                href="#"
                className="text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium"
                aria-current="page"
              >
              </a>
            </nav>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
