'use client';

import { Pill, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/format';

interface MedicationCardProps {
  medication: {
    id: string;
    commercialName: string;
    activeIngredient: string;
    price: number;
    presentation: string;
    laboratory: string;
    requiresPrescription: boolean;
    inStock: boolean;
    category: {
      name: string;
    };
  };
}

export function MedicationCard({ medication }: MedicationCardProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(
      {
        medicationId: medication.id,
        commercialName: medication.commercialName,
        presentation: medication.presentation,
        price: medication.price,
        requiresPrescription: medication.requiresPrescription,
      },
      quantity
    );
    setQuantity(1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      {/* Encabezado: el nombre puede ocupar dos líneas; la categoría va debajo */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg shrink-0">
          <Pill className="h-6 w-6 text-primary-600" />
        </div>
        <div className="min-w-0">
          <Link
            href={`/medication/${medication.id}`}
            className="block font-semibold text-lg leading-tight break-words hover:text-primary-600"
          >
            {medication.commercialName}
          </Link>
          <p className="text-sm text-secondary-600 break-words">{medication.activeIngredient}</p>
          <span className="badge badge-info inline-block mt-2">{medication.category.name}</span>
        </div>
      </div>

      {/* Detalles: flex-1 empuja el pie al fondo para que las tarjetas queden alineadas */}
      <div className="flex-1 space-y-2 mb-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-secondary-600 shrink-0">Laboratorio:</span>
          <span className="font-medium text-right">{medication.laboratory}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary-600 shrink-0">Presentación:</span>
          <span className="font-medium text-right">{medication.presentation}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary-600 shrink-0">Disponibilidad:</span>
          {medication.inStock ? (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              En stock
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              Agotado
            </span>
          )}
        </div>
        {medication.requiresPrescription && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Requiere prescripción médica</span>
          </div>
        )}
      </div>

      {/* Pie en dos filas: precio arriba, cantidad + agregar abajo */}
      <div className="pt-4 border-t border-secondary-200 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold text-primary-700 leading-none">{formatPrice(medication.price)}</p>
            <p className="text-xs text-secondary-600 mt-1">por unidad</p>
          </div>
          <Link
            href={`/medication/${medication.id}`}
            className="text-sm font-medium text-primary-600 hover:text-primary-800 whitespace-nowrap"
          >
            Ver detalles →
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
              aria-label="Disminuir cantidad"
            >
              -
            </button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!medication.inStock}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              medication.inStock
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
            }`}
          >
            {justAdded ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
            <span>{justAdded ? 'Agregado' : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
