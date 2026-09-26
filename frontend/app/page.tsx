'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CATEGORIES, GET_MEDICATIONS } from '@/graphql/queries';
import { Pill, Shield, Truck, Clock, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { MedicationCard } from '@/components/MedicationCard';

interface Medication {
  id: string;
  commercialName: string;
  activeIngredient: string;
  price: number;
  presentation: string;
  laboratory: string;
  requiresPrescription: boolean;
  inStock: boolean;
  category: {
    id: string;
    name: string;
  };
}

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  // Filtro aplicado: la consulta solo cambia al pulsar "Buscar", no con cada tecla
  const [appliedFilter, setAppliedFilter] = useState({ search: '', categoryId: '' });

  const { data, loading, error, refetch } = useQuery(GET_MEDICATIONS, {
    variables: {
      filter: {
        search: appliedFilter.search || undefined,
        categoryId: appliedFilter.categoryId || undefined,
        limit: 12,
      },
    },
  });
  const { data: categoriesData } = useQuery<{ categories: { id: string; name: string }[] }>(GET_CATEGORIES);

  const handleSearch = () => {
    setAppliedFilter({ search: search.trim(), categoryId: categoryFilter });
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-2xl p-8 md:p-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Pill className="h-16 w-16" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tu salud, nuestra prioridad
          </h1>
          <p className="text-xl mb-8 text-primary-100">
            Encuentra los medicamentos que necesitas con la calidad y seguridad que mereces.
            Entrega rápida y asesoramiento profesional.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/catalog" className="btn-primary bg-white text-primary-700 hover:bg-primary-100">
              Ver catálogo completo
            </Link>
            <Link href="/prescription-info" className="btn-secondary bg-transparent border-2 border-white text-white hover:bg-white/10">
              Cómo enviar recetas
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Medicamentos Certificados</h3>
          <p className="text-secondary-600">
            Todos nuestros productos cumplen con los más altos estándares de calidad y seguridad.
          </p>
        </div>

        <div className="card text-center">
          <div className="flex justify-center mb-4">
            <Truck className="h-12 w-12 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Entrega Rápida</h3>
          <p className="text-secondary-600">
            Recibe tus medicamentos en la puerta de tu casa en menos de 24 horas.
          </p>
        </div>

        <div className="card text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-12 w-12 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Asesoramiento 24/7</h3>
          <p className="text-secondary-600">
            Nuestros farmacéuticos están disponibles para resolver tus dudas en cualquier momento.
          </p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar medicamentos por nombre o principio activo..."
                className="input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-5 w-5" />
              <select
                className="input pl-10"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categoriesData?.categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleSearch} className="btn-primary px-8">
            Buscar
          </button>
        </div>

        {/* Medications Grid */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Medicamentos Destacados</h2>
            {data?.medications && (
              <span className="text-secondary-600">
                {data.medications.totalCount} productos encontrados
              </span>
            )}
          </div>

          {loading && !data ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-secondary-600">Cargando medicamentos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">Error al cargar los medicamentos</p>
              <button onClick={() => refetch()} className="btn-secondary mt-4">
                Reintentar
              </button>
            </div>
          ) : data?.medications?.items?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.medications.items.map((medication: Medication) => (
                <MedicationCard key={medication.id} medication={medication} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary-600">No se encontraron medicamentos</p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-secondary-50 rounded-2xl p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">¿Necesitas medicamentos con prescripción?</h2>
        <p className="text-secondary-700 mb-8 max-w-2xl mx-auto">
          En Afirmative Pill manejamos con seguridad y confidencialidad todas las prescripciones médicas.
          Nuestro equipo de farmacéuticos valida cada receta para garantizar tu seguridad.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link href="/prescription-info" className="btn-primary">
            Cómo enviar tu receta
          </Link>
        </div>
      </section>
    </div>
  );
}