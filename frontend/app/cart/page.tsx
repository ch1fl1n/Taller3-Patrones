'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { AlertCircle, FileText, ShoppingCart, Trash2 } from 'lucide-react';
import { CREATE_ORDER } from '@/graphql/mutations';
import { GET_MY_ORDERS } from '@/graphql/queries';
import { useCart } from '@/components/CartProvider';
import { formatPrice } from '@/lib/format';

// Resultado de createOrder: una union de éxito y errores de negocio tipados
type CreateOrderResult =
  | { __typename: 'CreateOrderSuccess'; order: { id: string } }
  | { __typename: 'InsufficientStockError'; message: string; medicationName: string; availableStock: number; requestedQuantity: number }
  | { __typename: 'PrescriptionRequiredError'; message: string; medicationNames: string[] }
  | { __typename: 'ValidationError'; message: string; code: string; field: string | null };

function describeError(result: Exclude<CreateOrderResult, { __typename: 'CreateOrderSuccess' }>) {
  switch (result.__typename) {
    case 'InsufficientStockError':
      return `No hay stock suficiente de ${result.medicationName}: pediste ${result.requestedQuantity} y quedan ${result.availableStock}.`;
    case 'PrescriptionRequiredError':
      return `Estos medicamentos requieren fórmula médica: ${result.medicationNames.join(', ')}. Agrega el enlace a tu fórmula.`;
    case 'ValidationError':
      if (result.field === 'prescriptionEvidence.documentUrl') {
        return 'El enlace de la fórmula debe empezar por http:// o https://.';
      }
      return `No se pudo crear la orden: ${result.message}`;
  }
}

export default function CartPage() {
  const router = useRouter();
  const { items, totalPrice, requiresPrescription, updateQuantity, removeItem, clear } = useCart();
  const [documentUrl, setDocumentUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createOrder, { loading }] = useMutation<{ createOrder: CreateOrderResult }>(CREATE_ORDER, {
    // Actualización de caché tras la mutación: la orden nueva aparece en "Mis órdenes"
    // sin volver a pedir la lista al servidor.
    update(cache, { data }) {
      const result = data?.createOrder;
      if (result?.__typename !== 'CreateOrderSuccess') return;
      cache.updateQuery({ query: GET_MY_ORDERS }, existing =>
        existing ? { myOrders: [result.order, ...existing.myOrders] } : existing
      );
    },
  });

  const handleCheckout = async () => {
    setErrorMessage(null);

    const { data, errors } = await createOrder({
      variables: {
        input: {
          items: items.map(item => ({ medicationId: item.medicationId, quantity: item.quantity })),
          prescriptionEvidence: requiresPrescription && documentUrl.trim()
            ? { documentUrl: documentUrl.trim() }
            : null,
        },
      },
    });

    const result = data?.createOrder;
    if (!result || errors?.length) {
      setErrorMessage('No se pudo conectar con el servidor. Intenta de nuevo.');
      return;
    }

    if (result.__typename === 'CreateOrderSuccess') {
      clear();
      router.push(`/orders/${result.order.id}`);
      return;
    }

    setErrorMessage(describeError(result));
  };

  if (items.length === 0) {
    return (
      <div className="card text-center py-16 max-w-xl mx-auto">
        <ShoppingCart className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tu carrito está vacío</h1>
        <p className="text-secondary-600 mb-6">Agrega medicamentos desde el catálogo.</p>
        <Link href="/catalog" className="btn-primary">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Carrito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ítems */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.medicationId} className="card flex flex-wrap items-center gap-4 justify-between">
              <div className="flex-1 min-w-48">
                <Link href={`/medication/${item.medicationId}`} className="font-semibold text-lg hover:text-primary-600">
                  {item.commercialName}
                </Link>
                <p className="text-sm text-secondary-600">{item.presentation}</p>
                {item.requiresPrescription && (
                  <span className="badge badge-warning inline-block mt-2">Requiere fórmula médica</span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.medicationId, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
                  aria-label="Disminuir cantidad"
                >
                  -
                </button>
                <span className="w-10 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.medicationId, item.quantity + 1)}
                  className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-100"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <div className="text-right w-32">
                <p className="font-bold text-primary-700">{formatPrice(item.price * item.quantity)}</p>
                <p className="text-xs text-secondary-500">{formatPrice(item.price)} c/u</p>
              </div>

              <button
                onClick={() => removeItem(item.medicationId)}
                className="p-2 text-secondary-500 hover:text-red-600"
                aria-label={`Quitar ${item.commercialName}`}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Resumen y checkout */}
        <div className="card h-fit space-y-6">
          <h2 className="text-xl font-semibold">Resumen</h2>

          {requiresPrescription && (
            <div className="space-y-2">
              <label htmlFor="prescription" className="flex items-center space-x-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>Enlace a tu fórmula médica</span>
              </label>
              <input
                id="prescription"
                type="url"
                className="input"
                placeholder="https://..."
                value={documentUrl}
                onChange={e => setDocumentUrl(e.target.value)}
              />
              <p className="text-xs text-secondary-500">
                Un químico farmacéutico la revisa después de crear la orden. Mientras tanto,
                la orden queda pendiente de aprobación.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center py-4 border-t border-secondary-200">
            <span className="text-lg font-medium">Total</span>
            <span className="text-2xl font-bold text-primary-700">{formatPrice(totalPrice)}</span>
          </div>

          {errorMessage && (
            <div role="alert" className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
            {loading ? 'Creando orden...' : 'Confirmar orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
