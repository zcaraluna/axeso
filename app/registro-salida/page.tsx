'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

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

export default function RegistroSalida() {
  const [searchTerm, setSearchTerm] = useState('');
  const [visitsInside, setVisitsInside] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }
    
    loadVisitsInside();
  }, [user, authLoading, router]);

  useEffect(() => {
    filterVisits();
  }, [searchTerm, visitsInside]);

  const loadVisitsInside = async () => {
    try {
      setLoadingVisits(true);
      const response = await apiClient.getVisits();
      
      if (response.error) {
        setError(response.error);
        return;
      }

      // Filtrar solo las visitas que están dentro (sin exitDate)
      if (response.data && Array.isArray(response.data)) {
        const insideVisits = response.data.filter((visit: Visit) => !visit.exitDate);
        setVisitsInside(insideVisits);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
      setError('Error al cargar las visitas');
    } finally {
      setLoadingVisits(false);
    }
  };

  const filterVisits = () => {
    if (!searchTerm.trim()) {
      setFilteredVisits(visitsInside);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = visitsInside.filter(visit => 
      visit.id.toLowerCase().includes(term) ||
      visit.nombres.toLowerCase().includes(term) ||
      visit.apellidos.toLowerCase().includes(term) ||
      visit.cedula.toLowerCase().includes(term) ||
      visit.motivoCategoria.toLowerCase().includes(term) ||
      visit.motivoDescripcion.toLowerCase().includes(term)
    );
    
    setFilteredVisits(filtered);
  };

  const handleRegisterExit = async (visitId: string, visitanteNombre: string, visitanteApellido: string) => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let currentUser = user;
      
      // Si los datos del usuario no están completos, intentar refrescarlos
      if (!user.nombres || !user.apellidos) {
        await refreshUser();
        // Obtener el usuario actualizado del localStorage
        const updatedUserData = localStorage.getItem('user');
        if (updatedUserData) {
          currentUser = JSON.parse(updatedUserData);
        }
      }

      const now = new Date();
      const exitRegisteredBy = currentUser.nombres && currentUser.apellidos 
        ? `${currentUser.nombres} ${currentUser.apellidos}`.trim()
        : currentUser.username || 'Usuario desconocido';
      
      const updateData = {
        exitDate: now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        exitTime: now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false }),
        exitRegisteredBy
      };

      const response = await apiClient.updateVisit(visitId, updateData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage(`Salida de ${visitanteNombre} ${visitanteApellido} registrada exitosamente`);
      setShowSuccess(true);
      // Limpiar el campo de búsqueda
      setSearchTerm('');
      // Recargar la lista de visitas dentro
      loadVisitsInside();
    } catch (error) {
      console.error('Error updating visit:', error);
      setError('Error al registrar la salida');
    } finally {
      setLoading(false);
    }
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Registro de Salida</h1>
            <div className="text-lg font-medium text-slate-600">
              Dentro de la unidad: <span className="font-bold text-blue-600">{visitsInside.length}</span>
            </div>
          </div>

          {showSuccess && (
            <div className="bg-green-50 border-2 border-green-500 text-green-700 px-6 py-4 rounded-lg mb-6">
              <p className="font-semibold text-lg">{successMessage}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Barra de búsqueda */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="searchTerm" className="block text-sm font-medium text-slate-700">
                  Buscar Visitante (ID, Nombre, Apellido, Documento, Motivo)
                </label>
                <button
                  onClick={loadVisitsInside}
                  disabled={loadingVisits}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  title="Actualizar lista"
                >
                  {loadingVisits ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
              <input
                id="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cualquier campo..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}


            {/* Lista de visitantes */}
            {loadingVisits ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 text-lg">
                  {searchTerm ? 'No se encontraron visitantes con ese criterio de búsqueda' : 'No hay visitantes dentro de la institución'}
                </p>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                filteredVisits.length === 1 
                  ? 'grid-cols-1 max-w-2xl mx-auto' 
                  : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
              }`}>
                {filteredVisits.map((visit) => (
                  <div key={visit.id} className="border border-slate-200 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{visit.nombres} {visit.apellidos}</h3>
                        <p className="text-slate-600 text-sm">ID: {visit.id}</p>
                      </div>
                      {visit.photo && (
                        <div 
                          className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-md cursor-pointer hover:border-blue-500 transition-colors"
                          onClick={() => setFullscreenImage(visit.photo || null)}
                          title="Click para ver foto completa"
                        >
                          <img
                            src={visit.photo}
                            alt="Foto del visitante"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs text-slate-500">Número de Documento</p>
                        <p className="font-medium text-slate-700">{visit.cedula}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Entrada</p>
                        <p className="font-medium text-slate-700">{visit.entryDate} - {visit.entryTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Motivo</p>
                        <p className="font-medium text-slate-700">{visit.motivoCategoria}</p>
                      </div>
                      {visit.motivoDescripcion && (
                        <div>
                          <p className="text-xs text-slate-500">Descripción</p>
                          <p className="font-medium text-slate-700 text-sm">{visit.motivoDescripcion}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegisterExit(visit.id, visit.nombres, visit.apellidos)}
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                    >
                      {loading ? 'Registrando...' : 'Registrar Salida'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}

