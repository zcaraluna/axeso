'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface Dispositivo {
  id: string;
  fingerprint: string;
  nombre: string | null;
  user_agent: string | null;
  ip_address: string | null;
  autorizado_en: string;
  ultimo_acceso: string;
  activo: boolean;
  codigo_activacion: string | null;
  codigo_usado: boolean;
  codigo_expira_en: string | null;
  codigo_activo: boolean;
}

interface Codigo {
  id: string;
  codigo: string;
  nombre: string | null;
  usado: boolean;
  usado_en: string | null;
  dispositivo_fingerprint: string | null;
  creado_en: string;
  expira_en: string | null;
  activo: boolean;
  dias_restantes: number | null;
  esta_expirado: boolean;
}

export default function GestionDispositivosPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [mostrarFormularioCodigo, setMostrarFormularioCodigo] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState({ dias: 30, nombre: '' });
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }

    // Verificar que sea admin
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/dispositivos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      const data = await response.json();
      setDispositivos(data.dispositivos || []);
      setCodigos(data.codigos || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesactivar = async (tipo: 'dispositivo' | 'codigo', id: string) => {
    if (!confirm(`¿Estás seguro de desactivar este ${tipo}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tipo, id }),
      });

      if (response.ok) {
        loadData();
      } else {
        alert('Error al desactivar');
      }
    } catch (error) {
      console.error('Error desactivando:', error);
      alert('Error al desactivar');
    }
  };

  const handleGenerarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerandoCodigo(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'generar_codigo',
          diasExpiracion: nuevoCodigo.dias,
          nombre: nuevoCodigo.nombre || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCodigoGenerado(data.codigo);
        setNuevoCodigo({ dias: 30, nombre: '' });
        setMostrarFormularioCodigo(false);
        loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al generar código');
      }
    } catch (error) {
      console.error('Error generando código:', error);
      alert('Error al generar código');
    } finally {
      setGenerandoCodigo(false);
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-PY');
  };

  const formatearCodigo = (codigo: string) => {
    return codigo.match(/.{1,4}/g)?.join('-') || codigo;
  };

  if (authLoading || loading) {
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
              Gestión de Dispositivos y Códigos
            </h1>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm font-medium"
              >
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerta de código generado */}
        {codigoGenerado && (
          <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-green-800 mb-2">¡Código Generado Exitosamente!</h3>
                <p className="text-green-700 font-mono text-xl mb-2">{formatearCodigo(codigoGenerado)}</p>
                <p className="text-sm text-green-600">Copia este código y compártelo de forma segura. Solo puede usarse una vez.</p>
              </div>
              <button
                onClick={() => setCodigoGenerado(null)}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Botón para generar código - SOLO usuario garv */}
        {user?.username === 'garv' && (
          <div className="mb-6">
            {!mostrarFormularioCodigo ? (
              <button
                onClick={() => setMostrarFormularioCodigo(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                + Generar Nuevo Código
              </button>
            ) : (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Generar Nuevo Código de Activación</h3>
              <form onSubmit={handleGenerarCodigo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre/Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevoCodigo.nombre}
                    onChange={(e) => setNuevoCodigo({ ...nuevoCodigo, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ej: Oficina Central, Sucursal Norte"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Días de Validez
                  </label>
                  <input
                    type="number"
                    value={nuevoCodigo.dias}
                    onChange={(e) => setNuevoCodigo({ ...nuevoCodigo, dias: parseInt(e.target.value) || 30 })}
                    min="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={generandoCodigo}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition"
                  >
                    {generandoCodigo ? 'Generando...' : 'Generar Código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFormularioCodigo(false);
                      setNuevoCodigo({ dias: 30, nombre: '' });
                    }}
                    className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              <button className="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                Códigos de Activación ({codigos.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tabla de Códigos */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Códigos de Activación</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expira</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {codigos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                      No hay códigos de activación
                    </td>
                  </tr>
                ) : (
                  codigos.map((codigo) => (
                    <tr key={codigo.id} className={!codigo.activo ? 'bg-slate-100 opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-slate-900 font-semibold">{formatearCodigo(codigo.codigo)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {codigo.nombre || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {codigo.usado ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Usado
                          </span>
                        ) : codigo.esta_expirado ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Expirado
                          </span>
                        ) : !codigo.activo ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Desactivado
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Activo
                            {codigo.dias_restantes !== null && (
                              <span className="ml-1">({codigo.dias_restantes}d)</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatearFecha(codigo.creado_en)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {codigo.expira_en ? formatearFecha(codigo.expira_en) : 'Sin expiración'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {codigo.activo && !codigo.usado && (
                          <button
                            onClick={() => handleDesactivar('codigo', codigo.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Dispositivos */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Dispositivos Autorizados ({dispositivos.filter(d => d.activo).length} activos)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Autorizado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Último Acceso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {dispositivos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                      No hay dispositivos autorizados
                    </td>
                  </tr>
                ) : (
                  dispositivos.map((dispositivo) => (
                    <tr key={dispositivo.id} className={!dispositivo.activo ? 'bg-slate-100 opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {dispositivo.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate max-w-xs">
                          {dispositivo.fingerprint.substring(0, 16)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {dispositivo.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatearFecha(dispositivo.autorizado_en)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatearFecha(dispositivo.ultimo_acceso)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dispositivo.activo ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Desactivado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {dispositivo.activo && (
                          <button
                            onClick={() => handleDesactivar('dispositivo', dispositivo.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

