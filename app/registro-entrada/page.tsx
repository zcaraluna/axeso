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
  tipoDocumento: string;
  telefono: string;
  entryDate: string;
  entryTime: string;
  motivoCategoria: string;
  motivoDescripcion: string;
  exitDate?: string;
  exitTime?: string;
  registeredBy: string;
  exitRegisteredBy?: string;
}

export default function RegistroEntrada() {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    tipoDocumento: '',
    telefono: '',
    motivoCategoria: '',
    motivoDescripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const motivosCategoria = [
    'Consulta',
    'Entrega de Documentos',
    'Citación',
    'Denuncia',
    'Visita a Director',
    'Prensa',
    'Otro'
  ];

  const tiposDocumento = [
    'Cédula de Identidad',
    'Pasaporte',
    'Cédula Extranjera',
    'Otro'
  ];

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const visitData = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: formData.cedula,
        tipoDocumento: formData.tipoDocumento,
        telefono: formData.telefono,
        entryDate: now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        entryTime: now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false }),
        motivoCategoria: formData.motivoCategoria,
        motivoDescripcion: formData.motivoDescripcion,
        userId: user.id
      };

      const response = await apiClient.createVisit(visitData);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data && typeof response.data === 'object' && 'id' in response.data) {
        // Redirigir a la página de resumen
        router.push(`/resumen-registro?id=${(response.data as { id: string }).id}`);
      }
    } catch (error) {
      console.error('Error creating visit:', error);
      setError('Error al registrar la visita');
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Registro de Entrada</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombres" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombres *
                </label>
                <input
                  id="nombres"
                  name="nombres"
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleInputChange(e);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="apellidos" className="block text-sm font-medium text-slate-700 mb-2">
                  Apellidos *
                </label>
                <input
                  id="apellidos"
                  name="apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleInputChange(e);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="tipoDocumento" className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  id="tipoDocumento"
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposDocumento.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cedula" className="block text-sm font-medium text-slate-700 mb-2">
                  Número de Documento *
                </label>
                <input
                  id="cedula"
                  name="cedula"
                  type="text"
                  value={formData.cedula}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-slate-700 mb-2">
                  Número de Teléfono *
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="motivoCategoria" className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo de Visita *
                </label>
                <select
                  id="motivoCategoria"
                  name="motivoCategoria"
                  value={formData.motivoCategoria}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                >
                  <option value="">Seleccione un motivo</option>
                  {motivosCategoria.map(motivo => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="motivoDescripcion" className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción del Motivo *
                </label>
                <textarea
                  id="motivoDescripcion"
                  name="motivoDescripcion"
                  value={formData.motivoDescripcion}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 resize-none"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? 'Registrando...' : 'Registrar Entrada'}
              </button>
              <Link href="/dashboard" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
