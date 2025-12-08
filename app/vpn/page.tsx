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

    if (user.role !== 'admin') {
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

      setCertificates(certsResponse.data?.certificates || []);
      setUsers(usersResponse.data?.users || []);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Crear Certificado VPN</h2>
            <form onSubmit={handleCreateCertificate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Certificado *
                  </label>
                  <input
                    type="text"
                    value={certificateName}
                    onChange={(e) => setCertificateName(e.target.value)}
                    placeholder="recepcion-pc-01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    pattern="[a-zA-Z0-9_-]{1,64}"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Solo letras, números, guiones y guiones bajos (máx 64 caracteres). Debe coincidir con el nombre usado al generar el certificado.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Dispositivo *
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Recepción - PC 01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Nombre descriptivo de la computadora/dispositivo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Recepción Principal"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ubicación física del dispositivo (opcional)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Usuario (Opcional)
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin asignar (certificado por computadora)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombres} {u.apellidos} ({u.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Opcional: Asignar a un usuario específico. Si se deja vacío, es un certificado por computadora.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Validez (días)
                  </label>
                  <input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value, 10))}
                    min="1"
                    max="3650"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Crear
                </button>
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
                  className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

