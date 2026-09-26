import Link from 'next/link';
import { CheckCircle, FileText, ShoppingCart, Truck } from 'lucide-react';

const STEPS = [
  {
    icon: ShoppingCart,
    title: 'Agrega tus medicamentos',
    text: 'Los medicamentos formulados están marcados con "Requiere prescripción médica".',
  },
  {
    icon: FileText,
    title: 'Adjunta el enlace a tu fórmula',
    text: 'En el carrito aparece un campo para el enlace (http o https) al documento de tu fórmula. Sin él, la orden no se crea.',
  },
  {
    icon: CheckCircle,
    title: 'Revisión del químico farmacéutico',
    text: 'La orden queda pendiente de aprobación mientras se revisa la fórmula. Si la rechazan, puedes enviar un nuevo enlace desde el seguimiento de la orden.',
  },
  {
    icon: Truck,
    title: 'Aprobación y despacho',
    text: 'Con la fórmula validada, la orden se aprueba y se despacha. Verás cada cambio en tiempo real.',
  },
];

export default function PrescriptionInfoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cómo enviar tu fórmula médica</h1>
        <p className="text-secondary-600">
          Algunos medicamentos solo se venden con fórmula médica. Así funciona el proceso.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="card flex items-start space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Icon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">
                {index + 1}. {title}
              </h2>
              <p className="text-secondary-700">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Entorno de demostración:</strong> la revisión es simulada. Un enlace que contenga
        &quot;rechaz&quot; (por ejemplo <code>https://ejemplo.com/formula-rechazada.pdf</code>) se rechaza;
        cualquier otro enlace válido se aprueba a los pocos segundos.
      </div>

      <Link href="/catalog" className="btn-primary inline-block">
        Ir al catálogo
      </Link>
    </div>
  );
}
