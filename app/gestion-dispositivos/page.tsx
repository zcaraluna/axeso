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
  codigo_activacion_id: string | null;
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
      alert('No tienes permisos para acceder a esta página. Solo administradores pueden ver la gestión de dispositivos.');
      router.push('/dashboard');
      return;
    }

    // Verificar que el token aún sea válido antes de cargar datos
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      router.push('/');
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en API:', response.status, errorData);
        
        if (response.status === 401 || response.status === 403) {
          alert(`Error de autorización: ${errorData.error || 'No tienes permisos para ver esta información'}\n\nPor favor, cierra sesión y vuelve a iniciar sesión.`);
          router.push('/');
          return;
        }
        
        throw new Error(errorData.error || 'Error al cargar datos');
      }

      const data = await response.json();
      console.log('Dispositivos recibidos:', data.dispositivos?.length || 0, data.dispositivos);
      console.log('Códigos recibidos:', data.codigos?.length || 0, data.codigos);
      
      // Verificar que todos los dispositivos se estén guardando
      const dispositivosRecibidos = data.dispositivos || [];
      console.log('Total dispositivos a mostrar:', dispositivosRecibidos.length);
      dispositivosRecibidos.forEach((d: Dispositivo, index: number) => {
        console.log(`Dispositivo ${index + 1}:`, {
          id: d.id,
          nombre: d.nombre,
          activo: d.activo,
          fingerprint: d.fingerprint.substring(0, 16) + '...',
          codigo_activacion: d.codigo_activacion || 'sin código'
        });
      });
      
      setDispositivos(dispositivosRecibidos);
      setCodigos(data.codigos || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nPor favor, recarga la página o cierra sesión y vuelve a iniciar sesión.`);
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
          <div className="mb-8">
            {!mostrarFormularioCodigo ? (
              <button
                onClick={() => setMostrarFormularioCodigo(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generar Nuevo Código
              </button>
            ) : (
            <div className="bg-white rounded-xl shadow-xl p-8 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Generar Nuevo Código de Activación</h3>
              </div>
              <form onSubmit={handleGenerarCodigo} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Nombre/Descripción <span className="text-slate-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={nuevoCodigo.nombre}
                    onChange={(e) => setNuevoCodigo({ ...nuevoCodigo, nombre: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder-slate-400"
                    placeholder="Ej: Oficina Central, Sucursal Norte"
                  />
                  <p className="mt-1 text-xs text-slate-600">Un nombre descriptivo ayudará a identificar el código más fácilmente</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Días de Validez
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={nuevoCodigo.dias}
                      onChange={(e) => setNuevoCodigo({ ...nuevoCodigo, dias: parseInt(e.target.value) || 30 })}
                      min="1"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                      <button
                        type="button"
                        onClick={() => setNuevoCodigo({ ...nuevoCodigo, dias: nuevoCodigo.dias + 1 })}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNuevoCodigo({ ...nuevoCodigo, dias: Math.max(1, nuevoCodigo.dias - 1) })}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">El código será válido por {nuevoCodigo.dias} día{nuevoCodigo.dias !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={generandoCodigo}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                    {generandoCodigo ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Generar Código
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFormularioCodigo(false);
                      setNuevoCodigo({ dias: 30, nombre: '' });
                    }}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-all duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
        )}

        {/* Tabla Unificada de Dispositivos y Códigos */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              Dispositivos Autorizados ({dispositivos.length} total, {dispositivos.filter(d => d.activo).length} activos, {dispositivos.filter(d => !d.activo).length} desactivados)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Fecha de Autorización</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Expiración</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {dispositivos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-700">
                      No hay dispositivos autorizados
                    </td>
                  </tr>
                ) : (
                  dispositivos.map((dispositivo) => {
                    // Buscar el código asociado a este dispositivo
                    // 1. Por ID del código (relación directa en BD)
                    let codigoAsociado = dispositivo.codigo_activacion_id 
                      ? codigos.find(c => c.id === dispositivo.codigo_activacion_id)
                      : null;
                    
                    // 2. Por código en el dispositivo
                    if (!codigoAsociado && dispositivo.codigo_activacion) {
                      codigoAsociado = codigos.find(c => 
                        c.codigo === dispositivo.codigo_activacion
                      );
                    }
                    
                    // 3. Por fingerprint en el código (puede haber múltiples códigos con el mismo fingerprint)
                    // Buscar el más reciente usado con este fingerprint
                    if (!codigoAsociado) {
                      const codigosConFingerprint = codigos.filter(c => 
                        c.dispositivo_fingerprint === dispositivo.fingerprint && c.usado
                      );
                      if (codigosConFingerprint.length > 0) {
                        // Ordenar por fecha de uso y tomar el más reciente
                        codigosConFingerprint.sort((a, b) => {
                          const fechaA = a.usado_en ? new Date(a.usado_en).getTime() : 0;
                          const fechaB = b.usado_en ? new Date(b.usado_en).getTime() : 0;
                          return fechaB - fechaA;
                        });
                        codigoAsociado = codigosConFingerprint[0];
                      }
                    }
                    
                    // Debug: log si no se encuentra código
                    if (!codigoAsociado) {
                      console.log('⚠️ Dispositivo sin código asociado:', {
                        id: dispositivo.id,
                        fingerprint: dispositivo.fingerprint.substring(0, 16) + '...',
                        codigo_activacion: dispositivo.codigo_activacion,
                        codigo_activacion_id: dispositivo.codigo_activacion_id,
                        nombre: dispositivo.nombre
                      });
                    }

                    // Calcular días restantes si hay código asociado
                    let diasRestantes = null;
                    let fechaExpiracion = null;
                    if (codigoAsociado && codigoAsociado.expira_en) {
                      fechaExpiracion = new Date(codigoAsociado.expira_en);
                      const ahora = new Date();
                      const diferencia = fechaExpiracion.getTime() - ahora.getTime();
                      diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
                    }

                    // Formatear código (primeros 4 y últimos 4 caracteres)
                    const codigoFormateado = codigoAsociado 
                      ? `${codigoAsociado.codigo.substring(0, 4)}...${codigoAsociado.codigo.substring(codigoAsociado.codigo.length - 4)}`
                      : '-';

                    // Determinar estado
                    let estado = 'Desactivado';
                    let estadoColor = 'gray';
                    if (dispositivo.activo) {
                      if (codigoAsociado && codigoAsociado.esta_expirado) {
                        estado = 'Expirado';
                        estadoColor = 'orange';
                      } else if (codigoAsociado && !codigoAsociado.activo) {
                        estado = 'Código Desactivado';
                        estadoColor = 'gray';
                      } else {
                        estado = 'Activo';
                        estadoColor = 'green';
                      }
                    }

                    return (
                      <tr key={dispositivo.id} className={!dispositivo.activo ? 'bg-slate-100 opacity-60' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {dispositivo.nombre || codigoAsociado?.nombre || 'Sin nombre'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="font-mono text-sm text-slate-900 font-semibold cursor-help relative group"
                            title={codigoAsociado ? codigoAsociado.codigo : 'Sin código'}
                          >
                            {codigoFormateado}
                            {codigoAsociado && (
                              <span className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                {codigoAsociado.codigo}
                                <span className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></span>
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                          {formatearFecha(dispositivo.autorizado_en)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                          {fechaExpiracion ? (
                            <div>
                              <div>{formatearFecha(fechaExpiracion.toISOString())}</div>
                              {diasRestantes !== null && (
                                <div className="text-xs text-slate-600">
                                  ({diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Expirado'})
                                </div>
                              )}
                            </div>
                          ) : (
                            'Sin expiración'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {estadoColor === 'green' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {estado}
                            </span>
                          )}
                          {estadoColor === 'orange' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              {estado}
                            </span>
                          )}
                          {estadoColor === 'gray' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {estado}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

