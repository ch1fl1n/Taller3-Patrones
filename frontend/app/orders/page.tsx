'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Package } from 'lucide-react';
import { GET_MY_ORDERS } from '@/graphql/queries';
import { formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL, OrderStatus } from '@/lib/orderStatus';

interface OrderSummary {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: { id: string; quantity: number; medication: { commercialName: string } }[];
}

export default function OrdersPage() {
  const { data, loading, error, refetch } = useQuery<{ myOrders: OrderSummary[] }>(GET_MY_ORDERS);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 mb-4">Error al cargar tus órdenes</p>
        <button onClick={() => refetch()} className="btn-secondary">
          Reintentar
        </button>
      </div>
    );
  }

  const orders = data?.myOrders ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Mis órdenes</h1>

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
          <p className="text-secondary-600 mb-6">Todavía no tienes órdenes.</p>
          <Link href="/catalog" className="btn-primary">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="card flex flex-wrap items-center justify-between gap-4 hover:shadow-lg transition-shadow"
            >
              <div>
                <p className="font-semibold">Orden {order.id.slice(0, 8)}</p>
                <p className="text-sm text-secondary-600">{formatDateTime(order.createdAt)}</p>
                <p className="text-sm text-secondary-600 mt-1">
                  {order.items.map(item => `${item.medication.commercialName} x${item.quantity}`).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`badge ${ORDER_STATUS_BADGE[order.status]}`}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
                <span className="text-lg font-bold text-primary-700">{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
