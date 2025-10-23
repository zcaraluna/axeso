'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ThermalTicket from '../components/ThermalTicket';
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
  registeredBy: string;
  exitRegisteredBy?: string;
}

function ResumenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const visitId = searchParams.get('id');
    if (!visitId) {
      router.push('/dashboard');
      return;
    }

    loadVisit(visitId);
  }, [user, router, searchParams]);

  const loadVisit = async (visitId: string) => {
    try {
      const response = await apiClient.getVisit(visitId);
      
      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        setVisit(response.data as Visit);
      } else {
        setError('Visita no encontrada');
      }
    } catch (error) {
      console.error('Error loading visit:', error);
      setError('Error al cargar la visita');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-slate-600 mb-6">{error || 'Visita no encontrada'}</p>
          <Link href="/dashboard" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 text-center">
            Volver al Inicio
          </Link>
        </div>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Registro Exitoso</h1>
            <p className="text-slate-600">La entrada ha sido registrada correctamente</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 mb-1">ID de Acceso</p>
              <p className="text-4xl font-bold text-blue-600 tracking-wider">{visit.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Información Personal</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Nombre Completo</p>
                  <p className="font-semibold text-slate-800">{visit.nombres} {visit.apellidos}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Número de Documento</p>
                  <p className="font-semibold text-slate-800">{visit.cedula}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Edad</p>
                  <p className="font-semibold text-slate-800">{visit.edad} años</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Teléfono</p>
                  <p className="font-semibold text-slate-800">{visit.telefono}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Detalles de Ingreso</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Fecha de Entrada</p>
                  <p className="font-semibold text-slate-800">{visit.entryDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Hora de Entrada</p>
                  <p className="font-semibold text-slate-800">{visit.entryTime}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Registrado por</p>
                  <p className="font-semibold text-slate-800">{visit.registeredBy}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Motivo de Visita</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Categoría</p>
                  <p className="font-semibold text-slate-800">{visit.motivoCategoria}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Descripción</p>
                  <p className="font-semibold text-slate-800">{visit.motivoDescripcion}</p>
                </div>
              </div>
            </div>

            {visit.photo && (
              <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Fotografía</h3>
                <div className="flex justify-center">
                  <img
                    src={visit.photo}
                    alt="Foto del visitante"
                    className="max-w-sm rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setFullscreenImage(visit.photo || null)}
                    title="Click para ver en tamaño completo"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowTicket(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              Imprimir Ticket de Acceso
            </button>
            <Link href="/registro-entrada" className="flex-1">
              <button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
              >
                Nuevo Registro
              </button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <button
                type="button"
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition duration-200"
              >
                Inicio
              </button>
            </Link>
          </div>
        </div>
      </div>

      {showTicket && (
        <ThermalTicket
          data={{
            id: visit.id,
            nombres: visit.nombres,
            apellidos: visit.apellidos,
            cedula: visit.cedula,
            entryDate: visit.entryDate,
            entryTime: visit.entryTime,
            motivoCategoria: visit.motivoCategoria,
            motivoDescripcion: visit.motivoDescripcion
          }}
          onClose={() => setShowTicket(false)}
        />
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
    </div>
  );
}

export default function ResumenRegistro() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    }>
      <ResumenContent />
    </Suspense>
  );
}

