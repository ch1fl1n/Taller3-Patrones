'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_MEDICATION_DETAILS } from '@/graphql/queries';
import { Pill, AlertCircle, CheckCircle, Truck, Shield, Clock } from 'lucide-react';
import { useState } from 'react';

export default function MedicationDetailsPage() {
  const params = useParams();
  const medicationId = params.id as string;
  const [quantity, setQuantity] = useState(1);

  const { data, loading, error } = useQuery(GET_MEDICATION_DETAILS, {
    variables: { id: medicationId },
    skip: !medicationId,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-secondary-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-secondary-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-6 bg-secondary-200 rounded w-2/3"></div>
              <div className="h-4 bg-secondary-200 rounded"></div>
              <div className="h-4 bg-secondary-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.medication) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Medicamento no encontrado</h1>
        <p className="text-secondary-600 mb-6">
          El medicamento que buscas no existe o no está disponible.
        </p>
        <a href="/catalog" className="btn-primary">
          Volver al catálogo
        </a>
      </div>
    );
  }

  const medication = data.medication;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-secondary-600 mb-8">
        <a href="/" className="hover:text-primary-600">Inicio</a>
        <span className="mx-2">/</span>
        <a href="/catalog" className="hover:text-primary-600">Catálogo</a>
        <span className="mx-2">/</span>
        <span className="text-secondary-800 font-medium">{medication.commercialName}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column - Information */}
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Pill className="h-10 w-10 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{medication.commercialName}</h1>
                <p className="text-lg text-secondary-600">{medication.activeIngredient}</p>
              </div>
            </div>

            {/* Category and Status */}
            <div className="flex items-center space-x-4 mb-6">
              <span className="badge badge-info">{medication.category.name}</span>
              {medication.requiresPrescription && (
                <span className="badge badge-warning flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Requiere prescripción médica</span>
                </span>
              )}
              <div className="flex items-center space-x-2">
                {medication.stock > 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">En stock ({medication.stock} unidades)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-600 font-medium">Agotado</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Laboratory and Presentation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-2">Laboratorio</h3>
                <p className="text-secondary-700">{medication.laboratory}</p>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-2">Presentación</h3>
                <p className="text-secondary-700">{medication.presentation}</p>
              </div>
            </div>

            {/* Price */}
            <div className="card">
              <h3 className="font-semibold mb-2">Precio</h3>
              <p className="text-4xl font-bold text-primary-700">{formatPrice(medication.price)}</p>
              <p className="text-sm text-secondary-600 mt-1">Precio por unidad</p>
            </div>

            {/* Indications */}
            {medication.indications && (
              <div className="card">
                <h3 className="font-semibold mb-2">Indicaciones</h3>
                <p className="text-secondary-700">{medication.indications}</p>
              </div>
            )}

            {/* Contraindications */}
            {medication.contraindications && (
              <div className="card">
                <h3 className="font-semibold mb-2">Contraindicaciones</h3>
                <p className="text-secondary-700">{medication.contraindications}</p>
              </div>
            )}

            {/* Created At */}
            <div className="text-sm text-secondary-500">
              <p>Disponible desde: {new Date(medication.createdAt).toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Purchase */}
        <div>
          <div className="sticky top-24">
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Comprar</h2>

              {/* Quantity Selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">Cantidad</label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100 text-xl"
                    disabled={!medication.stock || medication.stock === 0}
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold">{quantity}</span>
                    <p className="text-sm text-secondary-600 mt-1">unidades</p>
                  </div>
                  <button
                    onClick={() => setQuantity(Math.min(medication.stock || 10, quantity + 1))}
                    className="w-12 h-12 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100 text-xl"
                    disabled={!medication.stock || medication.stock === 0 || quantity >= medication.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="mb-8">
                <div className="flex justify-between items-center py-4 border-t border-b border-secondary-200">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-3xl font-bold text-primary-700">
                    {formatPrice(medication.price * quantity)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <button
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                    medication.stock > 0
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
                  }`}
                  disabled={!medication.stock || medication.stock === 0}
                >
                  {medication.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
                </button>

                <button
                  className="w-full py-4 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold text-lg hover:bg-primary-50 transition-colors"
                  disabled={!medication.stock || medication.stock === 0}
                >
                  Comprar ahora
                </button>
              </div>

              {/* Prescription Warning */}
              {medication.requiresPrescription && (
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-1">Requiere prescripción médica</h4>
                      <p className="text-amber-700 text-sm">
                        Para comprar este medicamento necesitarás enviar una receta médica válida.
                        Puedes enviarla durante el proceso de checkout.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center space-x-3">
                  <Truck className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-secondary-700">Entrega en 24-48 horas</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-secondary-700">Producto certificado y garantizado</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-secondary-700">Asesoramiento farmacéutico disponible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}