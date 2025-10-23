'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import ThermalTicket from '@/app/components/ThermalTicket';

interface Visit {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  entryDate: string;
  entryTime: string;
  motivoCategoria: string;
  motivoDescripcion: string;
  photo?: string;
  exitDate?: string;
  exitTime?: string;
  registeredBy: string;
  exitRegisteredBy?: string;
}

export default function Historial() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [filter, setFilter] = useState<'all' | 'inside' | 'exited'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [motivoFilter, setMotivoFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }

    loadVisits();
  }, [user, authLoading, router]);

  useEffect(() => {
    filterVisits();
    setCurrentPage(1); // Reset a la primera página cuando cambian los filtros
  }, [visits, filter, searchTerm, searchDescription, motivoFilter, startDate, endDate]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVisits();
      
      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data && Array.isArray(response.data)) {
        setVisits(response.data); // Ya vienen ordenados por la API (más recientes primero)
      }
    } catch (error) {
      console.error('Error loading visits:', error);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const filterVisits = useCallback(() => {
    let filtered = [...visits];

    // Filtrar por estado
    if (filter === 'inside') {
      filtered = filtered.filter(v => !v.exitDate);
    } else if (filter === 'exited') {
      filtered = filtered.filter(v => v.exitDate);
    }

    // Filtrar por búsqueda general (ID, nombre, apellido, cédula)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.id.toLowerCase().includes(term) ||
        v.nombres.toLowerCase().includes(term) ||
        v.apellidos.toLowerCase().includes(term) ||
        v.cedula.includes(term)
      );
    }

    // Filtrar por descripción del motivo
    if (searchDescription) {
      const term = searchDescription.toLowerCase();
      filtered = filtered.filter(v =>
        v.motivoDescripcion.toLowerCase().includes(term)
      );
    }

    // Filtrar por motivo de visita (categoría)
    if (motivoFilter) {
      filtered = filtered.filter(v =>
        v.motivoCategoria === motivoFilter
      );
    }

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      filtered = filtered.filter(v => {
        // Convertir fecha de formato DD/MM/YYYY a Date
        const [day, month, year] = v.entryDate.split('/');
        const visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          return visitDate >= start && visitDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          return visitDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          return visitDate <= end;
        }
        return true;
      });
    }

    setFilteredVisits(filtered);
  }, [visits, filter, searchTerm, searchDescription, motivoFilter, startDate, endDate]);

  // Calcular visitas para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVisits = filteredVisits.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition">
              aXeso - Policía Nacional (DCHPEF)
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm font-medium">
              Volver al Inicio
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Historial de Visitas</h1>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Buscar por ID, nombre, apellido o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
              />
              <input
                type="text"
                placeholder="Buscar por descripción del motivo..."
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha desde:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha hasta:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('inside')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    filter === 'inside'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Dentro
                </button>
                <button
                  onClick={() => setFilter('exited')}
                  className={`px-4 py-3 rounded-lg font-medium transition ${
                    filter === 'exited'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Salidas
                </button>
              </div>
              
              <div className="flex-1">
                <select
                  value={motivoFilter}
                  onChange={(e) => setMotivoFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 bg-white"
                >
                  <option value="">Todos los motivos</option>
                  <option value="Consulta">Consulta</option>
                  <option value="Entrega de Documentos">Entrega de Documentos</option>
                  <option value="Citación">Citación</option>
                  <option value="Denuncia">Denuncia</option>
                  <option value="Visita a Director">Visita a Director</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-slate-600 text-xl">Cargando historial...</div>
            </div>
          ) : (
            <>
              <div className="text-sm text-slate-600 mb-4">
                Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredVisits.length)} de {filteredVisits.length} visitas
              </div>

              <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Foto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Número de Documento</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Entrada</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Salida</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Motivo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentVisits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No se encontraron visitas
                    </td>
                  </tr>
                ) : (
                  currentVisits.map((visit) => (
                    <tr key={visit.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {visit.photo ? (
                          <div className="w-12 h-12 rounded overflow-hidden border border-slate-300">
                            <img
                              src={visit.photo}
                              alt="Foto"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                            Sin foto
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{visit.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {visit.nombres} {visit.apellidos}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{visit.cedula}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {visit.entryDate}<br />
                        <span className="text-slate-600">{visit.entryTime}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {visit.exitDate ? (
                          <>
                            {visit.exitDate}<br />
                            <span className="text-slate-600">{visit.exitTime}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">
                        {visit.motivoCategoria}
                      </td>
                      <td className="px-4 py-3">
                        {visit.exitDate ? (
                          <span className="inline-block px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">
                            Salió
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-green-200 text-green-700 rounded-full text-xs font-medium">
                            Dentro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedVisit(visit)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition"
              >
                Anterior
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Mostrar solo algunas páginas alrededor de la actual
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 3 ||
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="px-2 text-slate-500">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* Modal de detalles */}
          {selectedVisit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedVisit(null)}>
              <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-slate-800">Detalles de la Visita</h3>
                    <button
                      onClick={() => setSelectedVisit(null)}
                      className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex gap-6">
                    {/* Foto a la izquierda */}
                    {selectedVisit.photo && (
                      <div className="flex-shrink-0">
                        <div 
                          className="w-48 h-48 rounded-lg overflow-hidden border-4 border-slate-200 shadow-lg cursor-pointer hover:border-blue-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenImage(selectedVisit.photo || null);
                          }}
                          title="Click para ver en tamaño completo"
                        >
                          <img
                            src={selectedVisit.photo}
                            alt="Foto del visitante"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      </div>
                    )}

                    {/* Datos a la derecha */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Identificador</p>
                      <p className="font-semibold text-slate-900 text-lg">{selectedVisit.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Nombre Completo</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.nombres} {selectedVisit.apellidos}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Número de Documento</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.cedula}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Edad</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.edad} años</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Teléfono</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.telefono}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Motivo</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.motivoCategoria}</p>
                      <p className="text-slate-700 mt-1">{selectedVisit.motivoDescripcion}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Entrada</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.entryDate} - {selectedVisit.entryTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Entrada registrada por</p>
                      <p className="font-semibold text-slate-900">{selectedVisit.registeredBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Salida</p>
                      <p className="font-semibold text-slate-900">
                        {selectedVisit.exitDate ? `${selectedVisit.exitDate} - ${selectedVisit.exitTime}` : 'Aún dentro'}
                      </p>
                    </div>
                    {selectedVisit.exitRegisteredBy && (
                      <div>
                        <p className="text-sm text-slate-600">Salida registrada por</p>
                        <p className="font-semibold text-slate-900">{selectedVisit.exitRegisteredBy}</p>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setTicketData(selectedVisit);
                        setShowTicket(true);
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      Imprimir Ticket
                    </button>
                    <button
                      onClick={() => setSelectedVisit(null)}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de imagen en pantalla completa */}
          {fullscreenImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]"
              onClick={() => setFullscreenImage(null)}
            >
              <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
                <button
                  onClick={() => setFullscreenImage(null)}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center z-10"
                  title="Cerrar"
                >
                  ×
                </button>
                <img
                  src={fullscreenImage}
                  alt="Foto en tamaño completo"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Modal de ticket térmico */}
          {showTicket && ticketData && (
            <ThermalTicket
              data={{
                id: ticketData.id,
                nombres: ticketData.nombres,
                apellidos: ticketData.apellidos,
                cedula: ticketData.cedula,
                entryDate: ticketData.entryDate,
                entryTime: ticketData.entryTime,
                motivoCategoria: ticketData.motivoCategoria,
                motivoDescripcion: ticketData.motivoDescripcion
              }}
              onClose={() => {
                setShowTicket(false);
                setTicketData(null);
              }}
            />
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

