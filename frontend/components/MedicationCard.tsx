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
    <div className="card hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Pill className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{medication.commercialName}</h3>
            <p className="text-sm text-secondary-600">{medication.activeIngredient}</p>
          </div>
        </div>
        <span className="badge badge-info">{medication.category.name}</span>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Laboratorio:</span>
          <span className="font-medium">{medication.laboratory}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Presentación:</span>
          <span className="font-medium">{medication.presentation}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Disponibilidad:</span>
          <div className="flex items-center space-x-1">
            {medication.inStock ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">En stock</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600 font-medium">Agotado</span>
              </>
            )}
          </div>
        </div>
        {medication.requiresPrescription && (
          <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Requiere prescripción médica</span>
          </div>
        )}
      </div>

      {/* Price and Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-secondary-200">
        <div>
          <p className="text-2xl font-bold text-primary-700">{formatPrice(medication.price)}</p>
          <p className="text-sm text-secondary-600">por unidad</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
            >
              -
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
            >
              +
            </button>
          </div>
          
          <div className="flex space-x-2">
            <Link
              href={`/medication/${medication.id}`}
              className="btn-secondary"
            >
              Ver detalles
            </Link>
            <button
              onClick={handleAddToCart}
              disabled={!medication.inStock}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
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
    </div>
  );
}