'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { AlertCircle, CheckCircle, Circle, FileText, Loader2, Radio, XCircle } from 'lucide-react';
import { GET_ORDER } from '@/graphql/queries';
import { CANCEL_ORDER, SUBMIT_PRESCRIPTION_EVIDENCE } from '@/graphql/mutations';
import { ORDER_STATUS_CHANGED } from '@/graphql/subscriptions';
import { formatDateTime, formatPrice } from '@/lib/format';
import {
  canCancel,
  EVIDENCE_STATUS_LABEL,
  ORDER_FLOW,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  OrderStatus,
  PrescriptionValidationStatus,
} from '@/lib/orderStatus';

interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  patient: { fullName: string; email: string };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    medication: { id: string; commercialName: string; presentation: string; requiresPrescription: boolean };
  }[];
  prescriptionEvidence: {
    id: string;
    documentUrl: string;
    validationStatus: PrescriptionValidationStatus;
    validatedAt: string | null;
  } | null;
}

interface StatusEvent {
  at: Date;
  status: OrderStatus;
  evidenceStatus?: PrescriptionValidationStatus;
}

type MutationResult = { __typename: string; message?: string };

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [newDocumentUrl, setNewDocumentUrl] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Proyección inicial de la orden (read model)
  const { data, loading, error } = useQuery<{ order: Order | null }>(GET_ORDER, {
    variables: { id: orderId },
  });

  // Actualizaciones en tiempo real, sin polling. Como Order está normalizada por id en la
  // caché, cada evento actualiza automáticamente el estado que muestra esta pantalla.
  const { error: subscriptionError } = useSubscription(ORDER_STATUS_CHANGED, {
    variables: { orderId },
    skip: !data?.order,
    onData: ({ data: event }) => {
      const changed = event.data?.orderStatusChanged;
      if (!changed) return;
      setEvents(current => [
        {
          at: new Date(),
          status: changed.status,
          evidenceStatus: changed.prescriptionEvidence?.validationStatus,
        },
        ...current,
      ]);
    },
  });

  const [cancelOrder, { loading: cancelling }] = useMutation<{ cancelOrder: MutationResult }>(CANCEL_ORDER);
  const [submitEvidence, { loading: submitting }] = useMutation<{ submitPrescriptionEvidence: MutationResult }>(
    SUBMIT_PRESCRIPTION_EVIDENCE
  );

  const handleCancel = async () => {
    setActionError(null);
    const { data: result } = await cancelOrder({ variables: { orderId } });
    if (result?.cancelOrder.__typename !== 'CancelOrderSuccess') {
      setActionError(result?.cancelOrder.message ?? 'No se pudo cancelar la orden.');
    }
  };

  const handleResubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    const { data: result } = await submitEvidence({
      variables: { input: { orderId, evidence: { documentUrl: newDocumentUrl.trim() } } },
    });
    if (result?.submitPrescriptionEvidence.__typename === 'SubmitPrescriptionSuccess') {
      setNewDocumentUrl('');
    } else {
      setActionError(result?.submitPrescriptionEvidence.message ?? 'No se pudo enviar la fórmula.');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-secondary-600">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        Cargando orden...
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="card text-center py-12 max-w-xl mx-auto">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Orden no encontrada</h1>
        <Link href="/orders" className="btn-primary">
          Ver mis órdenes
        </Link>
      </div>
    );
  }

  const order = data.order;
  const evidence = order.prescriptionEvidence;
  const currentStep = ORDER_FLOW.indexOf(order.status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-secondary-600 hover:text-primary-600">
            ← Mis órdenes
          </Link>
          <h1 className="text-3xl font-bold mt-1">Orden {order.id.slice(0, 8)}</h1>
          <p className="text-secondary-600">Creada el {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`badge text-sm ${ORDER_STATUS_BADGE[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Línea de tiempo del estado */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Seguimiento</h2>

            {order.status === 'CANCELLED' ? (
              <div className="flex items-center space-x-3 text-red-700">
                <XCircle className="h-6 w-6" />
                <span className="font-medium">La orden fue cancelada y el stock se restauró.</span>
              </div>
            ) : (
              <ol className="flex items-center">
                {ORDER_FLOW.map((step, index) => {
                  const done = index <= currentStep;
                  return (
                    <li key={step} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center text-center">
                        {done ? (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : (
                          <Circle className="h-8 w-8 text-secondary-300" />
                        )}
                        <span className={`mt-2 text-sm ${done ? 'font-semibold' : 'text-secondary-500'}`}>
                          {ORDER_STATUS_LABEL[step]}
                        </span>
                      </div>
                      {index < ORDER_FLOW.length - 1 && (
                        <div className={`flex-1 h-1 mx-2 rounded ${index < currentStep ? 'bg-green-600' : 'bg-secondary-200'}`} />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {order.status === 'PENDING_APPROVAL' && (
              <p className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Tu orden fue registrada y el stock está reservado. La aprobación se procesa de forma
                asíncrona: esta pantalla se actualiza sola cuando cambie el estado.
              </p>
            )}
          </div>

          {/* Fórmula médica */}
          {evidence && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <span>Fórmula médica</span>
                </h2>
                <span
                  className={`badge ${
                    evidence.validationStatus === 'VALIDATED'
                      ? 'badge-success'
                      : evidence.validationStatus === 'REJECTED'
                        ? 'badge-error'
                        : 'badge-warning'
                  }`}
                >
                  {EVIDENCE_STATUS_LABEL[evidence.validationStatus]}
                </span>
              </div>
              <p className="text-sm text-secondary-600 break-all">{evidence.documentUrl}</p>

              {evidence.validationStatus === 'REJECTED' && order.status === 'PENDING_APPROVAL' && (
                <form onSubmit={handleResubmit} className="space-y-2">
                  <label htmlFor="new-prescription" className="text-sm font-medium">
                    La fórmula fue rechazada. Envía un nuevo enlace:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-prescription"
                      type="url"
                      required
                      className="input"
                      placeholder="https://..."
                      value={newDocumentUrl}
                      onChange={e => setNewDocumentUrl(e.target.value)}
                    />
                    <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap disabled:opacity-60">
                      {submitting ? 'Enviando...' : 'Reenviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Ítems */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Productos</h2>
            <ul className="divide-y divide-secondary-200">
              {order.items.map(item => (
                <li key={item.id} className="py-3 flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.medication.commercialName}</p>
                    <p className="text-sm text-secondary-600">
                      {item.medication.presentation} · {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-4 border-t border-secondary-200 mt-2">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-bold text-primary-700">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Eventos recibidos por la subscription */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Radio className={`h-5 w-5 ${subscriptionError ? 'text-red-500' : 'text-green-600'}`} />
              <span>Tiempo real</span>
            </h2>
            {subscriptionError ? (
              <p className="text-sm text-red-600">Sin conexión en tiempo real: {subscriptionError.message}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-secondary-500">Escuchando cambios de estado...</p>
            ) : (
              <ul className="space-y-3">
                {events.map((event, index) => (
                  <li key={`${event.at.getTime()}-${events.length - index}`} className="text-sm">
                    <span className="text-secondary-500">{event.at.toLocaleTimeString('es-CO')}</span>{' '}
                    <span className="font-medium">{ORDER_STATUS_LABEL[event.status]}</span>
                    {event.evidenceStatus && (
                      <span className="text-secondary-600"> · fórmula {EVIDENCE_STATUS_LABEL[event.evidenceStatus].toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card space-y-3 text-sm">
            <h2 className="text-lg font-semibold">Paciente</h2>
            <p>{order.patient.fullName}</p>
            <p className="text-secondary-600">{order.patient.email}</p>
            <p className="text-secondary-500">Última actualización: {formatDateTime(order.updatedAt)}</p>
          </div>

          {actionError && (
            <div role="alert" className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {canCancel(order.status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 border-2 border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar orden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
