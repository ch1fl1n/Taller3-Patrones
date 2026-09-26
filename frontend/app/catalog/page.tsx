'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_MEDICATIONS, GET_CATEGORIES } from '@/graphql/queries';
import { MedicationCard } from '@/components/MedicationCard';
import { useCart } from '@/components/CartProvider';
import { formatPrice } from '@/lib/format';
import { Filter, Search, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
}

interface CatalogFilter {
  search: string;
  categoryId: string;
  requiresPrescription: string;
  inStock: boolean;
}

const DEFAULT_FILTER: CatalogFilter = { search: '', categoryId: '', requiresPrescription: '', inStock: true };

// useSearchParams exige un límite de Suspense en páginas prerenderizadas
export default function CatalogPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}

function Catalog() {
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  // Filtro en edición (formulario) y filtro aplicado (el que usa la consulta)
  const [draft, setDraft] = useState<CatalogFilter>(DEFAULT_FILTER);
  const [applied, setApplied] = useState<CatalogFilter>(DEFAULT_FILTER);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // La búsqueda del encabezado y los enlaces de categorías llegan por la URL
  useEffect(() => {
    const fromUrl = {
      ...DEFAULT_FILTER,
      search: searchParams.get('search') ?? '',
      categoryId: searchParams.get('categoryId') ?? '',
    };
    setDraft(fromUrl);
    setApplied(fromUrl);
    setCurrentPage(1);
  }, [searchParams]);

  const { data: medicationsData, loading, error, refetch } = useQuery(GET_MEDICATIONS, {
    variables: {
      filter: {
        search: applied.search || undefined,
        categoryId: applied.categoryId || undefined,
        requiresPrescription: applied.requiresPrescription === 'yes' ? true : applied.requiresPrescription === 'no' ? false : undefined,
        inStock: applied.inStock || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      },
    },
  });

  const { data: categoriesData } = useQuery(GET_CATEGORIES);

  const handleSearch = () => {
    setApplied({ ...draft, search: draft.search.trim() });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDraft(DEFAULT_FILTER);
    setApplied(DEFAULT_FILTER);
    setCurrentPage(1);
  };

  const handleAddToCart = (medication: Medication) => {
    addItem(
      {
        medicationId: medication.id,
        commercialName: medication.commercialName,
        presentation: medication.presentation,
        price: medication.price,
        requiresPrescription: medication.requiresPrescription,
      },
      1
    );
  };

  const totalPages = Math.ceil((medicationsData?.medications?.totalCount || 0) / itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Catálogo de Medicamentos</h1>
        <p className="text-secondary-600">
          Explora nuestra amplia selección de medicamentos de calidad
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Filtros</h2>
              <button
                onClick={handleResetFilters}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Limpiar todo
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Nombre o principio activo"
                  className="input pl-10"
                  value={draft.search}
                  onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Categoría</label>
              <select
                className="input w-full"
                value={draft.categoryId}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
              >
                <option value="">Todas las categorías</option>
                {categoriesData?.categories?.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prescription Requirement */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Requiere Prescripción</label>
              <select
                className="input w-full"
                value={draft.requiresPrescription}
                onChange={(e) => setDraft({ ...draft, requiresPrescription: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={draft.inStock}
                  onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })}
                  className="h-5 w-5 text-primary-600 rounded"
                />
                <label htmlFor="inStock" className="text-sm font-medium">
                  Solo disponibles en stock
                </label>
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Filter className="h-5 w-5" />
              <span>Aplicar Filtros</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Toolbar */}
          <div className="card mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {loading ? (
                  <div className="h-6 w-48 bg-secondary-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-secondary-700">
                    Mostrando <span className="font-semibold">{medicationsData?.medications?.items?.length || 0}</span> de{' '}
                    <span className="font-semibold">{medicationsData?.medications?.totalCount || 0}</span> productos
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex border border-secondary-300 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-secondary-600'}`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-secondary-600'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>

                {/* Items per Page */}
                <select
                  className="input text-sm py-1"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="12">12 por página</option>
                  <option value="24">24 por página</option>
                  <option value="48">48 por página</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medications Grid/List */}
          {loading && !medicationsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card h-96 animate-pulse">
                  <div className="h-48 bg-secondary-200 rounded-lg mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-secondary-200 rounded"></div>
                    <div className="h-4 bg-secondary-200 rounded w-2/3"></div>
                    <div className="h-4 bg-secondary-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="card text-center py-12">
              <p className="text-red-600 mb-4">Error al cargar los medicamentos</p>
              <button onClick={() => refetch()} className="btn-secondary">
                Reintentar
              </button>
            </div>
          ) : medicationsData?.medications?.items?.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {medicationsData.medications.items.map((medication: Medication) => (
                    <MedicationCard key={medication.id} medication={medication} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {medicationsData.medications.items.map((medication: Medication) => (
                    <div key={medication.id} className="card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{medication.commercialName}</h3>
                          <p className="text-secondary-600">{medication.activeIngredient}</p>
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            <span className="badge badge-info">{medication.category.name}</span>
                            <span>{medication.laboratory}</span>
                            <span>{medication.presentation}</span>
                            {medication.requiresPrescription && (
                              <span className="badge badge-warning">Requiere receta</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-700">
                            {formatPrice(medication.price)}
                          </p>
                          <button
                            onClick={() => handleAddToCart(medication)}
                            disabled={!medication.inStock}
                            className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Agregar al carrito
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="card mt-8">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span>Anterior</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-12">
              <p className="text-secondary-600 mb-4">No se encontraron medicamentos con los filtros seleccionados</p>
              <button onClick={handleResetFilters} className="btn-primary">
                Ver todos los productos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}