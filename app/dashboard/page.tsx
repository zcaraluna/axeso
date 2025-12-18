'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface Visit {
  id: string;
  exitTime?: string;
  userId: string;
  entryDate: string;
  exitRegisteredBy?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, inside: 0, exited: 0 });
  const [loading, setLoading] = useState(true);
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }

    // Si el usuario debe cambiar su contraseña, redirigir
    if (user.mustChangePassword) {
      router.push('/cambiar-password');
      return;
    }

    loadStats();
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      const response = await apiClient.getVisits();
      
      if (response.data && Array.isArray(response.data)) {
        const visits: Visit[] = response.data;
        
        // Obtener fecha de hoy en formato DD/MM/YYYY
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        
        // Filtrar solo visitas de hoy
        const todayVisits = visits.filter((v: Visit) => v.entryDate === todayStr);
        
        const total = todayVisits.length;
        // "Dentro de la Dirección" muestra TODAS las personas sin salida registrada, sin importar la fecha de entrada
        const inside = visits.filter((v: Visit) => !v.exitTime).length;
        const exited = todayVisits.filter((v: Visit) => v.exitTime).length;
        setStats({ total, inside, exited });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Si está cargando la autenticación, mostrar pantalla de carga
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-slate-800">
              aXeso - Policía Nacional (DCHPEF)
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Usuario: <span className="font-semibold">{user?.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Visitas de Hoy</h3>
              {loading ? (
                <div className="flex justify-center items-center h-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <p className="text-4xl font-bold text-blue-600">{stats.total.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Dentro de la Dirección</h3>
              {loading ? (
                <div className="flex justify-center items-center h-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <p className="text-4xl font-bold text-green-600">{stats.inside.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Salidas Registradas</h3>
              {loading ? (
                <div className="flex justify-center items-center h-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <p className="text-4xl font-bold text-red-600">{stats.exited.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
              )}
            </div>
          </div>

        {/* Funciones principales - dos tarjetas grandes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Link href="/registro-entrada" className="block group">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-2xl transition-all duration-200 border-2 border-transparent hover:border-green-500 h-full">
              <div className="flex items-center mb-4">
                <img src="/account-plus.svg" alt="Registrar Entrada" className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl font-bold text-slate-800 group-hover:text-green-600 transition">
                  Registrar Entrada
                </h2>
              </div>
              <p className="text-slate-600 text-lg">
                Registrar el ingreso de un visitante a la institución
              </p>
            </div>
          </Link>

          <Link href="/registro-salida" className="block group">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-2xl transition-all duration-200 border-2 border-transparent hover:border-red-500 h-full">
              <div className="flex items-center mb-4">
                <img src="/account-minus.svg" alt="Registrar Salida" className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl font-bold text-slate-800 group-hover:text-red-600 transition">
                  Registrar Salida
                </h2>
              </div>
              <p className="text-slate-600 text-lg">
                Registrar la salida de un visitante de la institución
              </p>
            </div>
          </Link>
        </div>

        {/* Funciones secundarias - tarjetas ajustadas según rol */}
        <div className={`grid grid-cols-1 gap-6 ${user?.role === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          <Link href="/historial" className="block group">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-all duration-200 border-2 border-transparent hover:border-purple-500 h-full">
              <div className="flex items-center mb-3">
                <img src="/history.svg" alt="Historial" className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition">
                  Historial de Visitas
                </h2>
              </div>
              <p className="text-slate-600">
                Ver el historial completo de todas las visitas registradas
              </p>
            </div>
          </Link>

          <Link href="/estadisticas" className="block group">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-all duration-200 border-2 border-transparent hover:border-blue-500 h-full">
              <div className="flex items-center mb-3">
                <img src="/chart-bar.svg" alt="Estadísticas" className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition">
                  Estadísticas
                </h2>
              </div>
              <p className="text-slate-600">
                Ver análisis y estadísticas detalladas del sistema
              </p>
            </div>
          </Link>

          {user?.role === 'admin' && (
            <Link href="/usuarios" className="block group">
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-all duration-200 border-2 border-transparent hover:border-orange-500 h-full">
                <div className="flex items-center mb-3">
                  <img src="/shield-account-variant.svg" alt="Gestión de Usuarios" className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                  <h2 className="text-xl font-bold text-slate-800 group-hover:text-orange-600 transition">
                    Gestión de Usuarios
                </h2>
              </div>
              <p className="text-slate-600">
                Administrar usuarios del personal de guardia
              </p>
            </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

