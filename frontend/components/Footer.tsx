import { Pill, Phone, Mail, MapPin, Shield, Truck } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-secondary-900 text-white mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Información de la empresa */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Pill className="h-8 w-8 text-primary-400" />
              <h2 className="text-2xl font-bold">Afirmative Pill</h2>
            </div>
            <p className="text-secondary-300 mb-4">
              Tu farmacia de confianza en línea. Ofrecemos medicamentos de calidad con entrega rápida y segura.
            </p>
            <div className="flex space-x-4">
              <Shield className="h-5 w-5 text-primary-400" />
              <Truck className="h-5 w-5 text-primary-400" />
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog" className="text-secondary-300 hover:text-white transition-colors">
                  Catálogo Completo
                </Link>
              </li>
              <li>
                <Link href="/prescription-info" className="text-secondary-300 hover:text-white transition-colors">
                  Cómo enviar recetas
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-secondary-300 hover:text-white transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-secondary-300 hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-secondary-300 hover:text-white transition-colors">
                  Términos de Servicio
                </Link>
              </li>
            </ul>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categorías</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog/categories/analgesicos" className="text-secondary-300 hover:text-white transition-colors">
                  Analgésicos
                </Link>
              </li>
              <li>
                <Link href="/catalog/categories/antibioticos" className="text-secondary-300 hover:text-white transition-colors">
                  Antibióticos
                </Link>
              </li>
              <li>
                <Link href="/catalog/categories/antihipertensivos" className="text-secondary-300 hover:text-white transition-colors">
                  Antihipertensivos
                </Link>
              </li>
              <li>
                <Link href="/catalog/categories/antidiabeticos" className="text-secondary-300 hover:text-white transition-colors">
                  Antidiabéticos
                </Link>
              </li>
              <li>
                <Link href="/catalog/categories/vitaminas" className="text-secondary-300 hover:text-white transition-colors">
                  Vitaminas y Suplementos
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-400" />
                <span className="text-secondary-300">+57 300 123 4567</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-400" />
                <span className="text-secondary-300">info@afirmativepill.com</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary-400 mt-1" />
                <span className="text-secondary-300">
                  Calle 123 #45-67<br />
                  Bogotá, Colombia
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-secondary-800 my-8"></div>

        {/* Copyright */}
        <div className="text-center text-secondary-400">
          <p>&copy; {new Date().getFullYear()} Afirmative Pill. Todos los derechos reservados.</p>
          <p className="text-sm mt-2">Desarrollado con GraphQL + CQRS + Next.js</p>
        </div>
      </div>
    </footer>
  );
}