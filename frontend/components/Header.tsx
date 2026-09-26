'use client';

import { ShoppingCart, Pill, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { CategoryLinks } from './CategoryLinks';

export function Header() {
  const router = useRouter();
  const { totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/catalog?search=${encodeURIComponent(query)}` : '/catalog');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Pill className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-primary-700">Afirmative Pill</h1>
              <p className="text-xs text-secondary-500">E-Commerce Farmacéutico</p>
            </div>
          </Link>

          {/* Barra de búsqueda */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar medicamentos por nombre o principio activo..."
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Navegación */}
          <nav className="flex items-center space-x-6">
            <Link href="/catalog" className="text-secondary-700 hover:text-primary-600 font-medium">
              Catálogo
            </Link>
            <Link href="/orders" className="text-secondary-700 hover:text-primary-600 font-medium">
              Mis Órdenes
            </Link>

            {/* Carrito */}
            <Link href="/cart" className="relative p-2 hover:bg-secondary-100 rounded-full" aria-label="Carrito">
              <ShoppingCart className="h-6 w-6 text-secondary-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Navegación secundaria: categorías reales */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <CategoryLinks className="text-secondary-600 hover:text-primary-600" />
          <Link href="/prescription-info" className="text-secondary-600 hover:text-primary-600">
            Información sobre Prescripciones
          </Link>
        </div>
      </div>
    </header>
  );
}
