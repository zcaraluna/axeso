'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface VpnCertificate {
  id: string;
  certificateName: string;
  deviceName: string;
  location?: string;
  commonName: string;
  status: 'active' | 'revoked' | 'expired';
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  lastUsedAt?: string;
  ipAddress?: string;
  notes?: string;
  user: {
    id: string;
    username: string;
    nombres: string;
    apellidos: string;
  } | null;
  _count: {
    connections: number;
  };
}

interface User {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
}

export default function VpnManagement() {
  const [certificates, setCertificates] = useState<VpnCertificate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [certificateName, setCertificateName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [location, setLocation] = useState('');
  const [validityDays, setValidityDays] = useState(365);
  const [notes, setNotes] = useState('');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }

    // Solo el usuario "garv" puede acceder a esta página
    if (user.username !== 'garv') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [certsResponse, usersResponse] = await Promise.all([
        apiClient.getVpnCertificates(),
        apiClient.getUsers()
      ]);

      if (certsResponse.error) {
        setError(certsResponse.error);
        return;
      }

      if (usersResponse.error) {
        setError(usersResponse.error);
        return;
      }

      setCertificates((certsResponse.data as { certificates?: VpnCertificate[] })?.certificates || []);
      setUsers((usersResponse.data as { users?: User[] })?.users || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!certificateName || !/^[a-zA-Z0-9_-]{1,64}$/.test(certificateName)) {
      setError('Nombre de certificado inválido');
      return;
    }

    try {
      const response = await apiClient.createVpnCertificate({
        targetUserId: selectedUserId || undefined,
        certificateName,
        deviceName,
        location: location || undefined,
        validityDays,
        notes: notes || undefined
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      // Cerrar modal y recargar
      setShowCreateModal(false);
      setCertificateName('');
      setDeviceName('');
      setLocation('');
      setSelectedUserId('');
      setValidityDays(365);
      setNotes('');
      await loadData();
    } catch (err) {
      console.error('Error creating certificate:', err);
      setError('Error al crear certificado');
    }
  };

  const handleRevokeCertificate = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de que desea revocar el certificado "${name}"?`)) {
      return;
    }

    try {
      const response = await apiClient.revokeVpnCertificate(id);

      if (response.error) {
        setError(response.error);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Error revoking certificate:', err);
      setError('Error al revocar certificado');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      active: 'Activo',
      revoked: 'Revocado',
      expired: 'Expirado'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (authLoading || loading) {
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
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Certificados VPN</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              + Crear Certificado
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Certificado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dispositivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Emitido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Expira
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Último Uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Conexiones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-slate-500">
                      No hay certificados registrados
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr key={cert.id} className={isExpired(cert.expiresAt) ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{cert.certificateName}</div>
                        {cert.notes && (
                          <div className="text-xs text-slate-500">{cert.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{cert.deviceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-500">{cert.location || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cert.user ? (
                          <>
                            <div className="text-sm text-slate-900">
                              {cert.user.nombres} {cert.user.apellidos}
                            </div>
                            <div className="text-xs text-slate-500">{cert.user.username}</div>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(cert.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(cert.issuedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(cert.expiresAt)}
                        {isExpired(cert.expiresAt) && (
                          <span className="ml-2 text-yellow-600 font-semibold">(Expirado)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {cert.lastUsedAt ? (
                          <>
                            {formatDate(cert.lastUsedAt)}
                            {cert.ipAddress && (
                              <div className="text-xs text-slate-400">{cert.ipAddress}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Nunca</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {cert._count.connections}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {cert.status === 'active' && (
                          <button
                            onClick={() => handleRevokeCertificate(cert.id, cert.certificateName)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revocar
                          </button>
                        )}
                        {cert.status === 'revoked' && (
                          <span className="text-slate-400">Revocado</span>
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

      {/* Modal de Creación */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
              setCertificateName('');
              setDeviceName('');
              setLocation('');
              setSelectedUserId('');
              setValidityDays(365);
              setNotes('');
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh] animate-slideUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Crear Certificado VPN</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCertificateName('');
                  setDeviceName('');
                  setLocation('');
                  setSelectedUserId('');
                  setValidityDays(365);
                  setNotes('');
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body con scroll */}
            <form onSubmit={handleCreateCertificate} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Nombre del Certificado */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Nombre del Certificado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={certificateName}
                    onChange={(e) => setCertificateName(e.target.value)}
                    placeholder="DCHPEF-ASU-1"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900"
                    required
                    pattern="[a-zA-Z0-9_-]{1,64}"
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
                    <svg className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Solo letras, números, guiones y guiones bajos (máx 64 caracteres). Debe coincidir con el nombre usado al generar el certificado.
                  </p>
                </div>

                {/* Nombre del Dispositivo */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Nombre del Dispositivo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="DCHPEF Asunción - PC 1"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Nombre descriptivo de la computadora/dispositivo
                  </p>
                </div>

                {/* Grid de 2 columnas para Ubicación y Validez */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Ubicación */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ubicación
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Asunción - DCHPEF"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900"
                    />
                  </div>

                  {/* Validez */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Validez (días)
                    </label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 365)}
                      min="1"
                      max="3650"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {validityDays} días ({Math.floor(validityDays / 365)} año{Math.floor(validityDays / 365) !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>

                {/* Usuario */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Usuario (Opcional)
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900 bg-white"
                  >
                    <option value="">Sin asignar (certificado por computadora)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombres} {u.apellidos} ({u.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Opcional: Asignar a un usuario específico. Si se deja vacío, es un certificado por computadora.
                  </p>
                </div>

                {/* Notas */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Información adicional sobre este certificado..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-900 resize-none"
                  />
                </div>
              </div>

              {/* Footer con botones */}
              <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCertificateName('');
                    setDeviceName('');
                    setLocation('');
                    setSelectedUserId('');
                    setValidityDays(365);
                    setNotes('');
                  }}
                  className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Certificado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

