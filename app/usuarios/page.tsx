'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  credencial: string;
  telefono: string;
  grado: string;
  role: string;
  createdAt: string;
}

const GRADOS = [
  'COMISARIO GENERAL',
  'COMISARIO PRINCIPAL',
  'COMISARIO',
  'SUBCOMISARIO',
  'OFICIAL INSPECTOR',
  'OFICIAL PRIMERO',
  'OFICIAL SEGUNDO',
  'OFICIAL AYUDANTE',
  'SUBOFICIAL SUPERIOR',
  'SUBOFICIAL PRINCIPAL',
  'SUBOFICIAL MAYOR',
  'SUBOFICIAL INSPECTOR',
  'SUBOFICIAL PRIMERO',
  'SUBOFICIAL SEGUNDO',
  'SUBOFICIAL AYUDANTE',
  'FUNCIONARIO/A'
];

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    credencial: '',
    telefono: '',
    grado: 'FUNCIONARIO/A',
    role: 'user'
  });

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadUsers();
  }, [user, authLoading, router]);

  const loadUsers = async () => {
    try {
      const response = await apiClient.getUsers();
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        username: userToEdit.username,
        password: '',
        nombres: userToEdit.nombres,
        apellidos: userToEdit.apellidos,
        cedula: userToEdit.cedula || '',
        credencial: userToEdit.credencial,
        telefono: userToEdit.telefono,
        grado: userToEdit.grado,
        role: userToEdit.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        nombres: '',
        apellidos: '',
        cedula: '',
        credencial: '',
        telefono: '',
        grado: 'FUNCIONARIO/A',
        role: 'user'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.nombres || !formData.apellidos || 
        !formData.cedula || !formData.credencial || !formData.telefono) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      if (editingUser) {
        // Editar usuario existente
        const updateData: Record<string, unknown> = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          cedula: formData.cedula,
          credencial: formData.credencial,
          telefono: formData.telefono,
          grado: formData.grado,
          role: formData.role
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await apiClient.updateUser(editingUser.id, updateData);
        if (response.data) {
          setSuccess('Usuario actualizado exitosamente');
          handleCloseModal();
          loadUsers();
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        // Crear nuevo usuario
        const response = await apiClient.createUser(formData);
        if (response.data) {
          setSuccess('Usuario creado exitosamente');
          handleCloseModal();
          loadUsers();
          setTimeout(() => setSuccess(''), 3000);
        }
      }
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response: { data?: { error?: string } } };
        setError(err.response?.data?.error || 'Error al guardar usuario');
      } else {
        setError('Error al guardar usuario');
      }
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === user?.id) {
      setError('No puedes eliminar tu propio usuario');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (confirm(`¿Está seguro de eliminar el usuario "${username}"?`)) {
      try {
        await apiClient.deleteUser(userId);
      setSuccess('Usuario eliminado exitosamente');
        loadUsers();
      setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting user:', error);
        setError('Error al eliminar usuario');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'nombres' || field === 'apellidos') {
      setFormData({ ...formData, [field]: value.toUpperCase() });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando usuarios...</div>
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
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
          >
            + Nuevo Usuario
          </button>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombres y Apellidos</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">C.I.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Credencial</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Grado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{u.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900">{u.nombres} {u.apellidos}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600">{u.cedula}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600">{u.credencial}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600">{u.grado}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600">{u.telefono}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          u.role === 'admin' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.id === user?.id}
                            className={`px-3 py-1 text-sm font-medium rounded transition ${
                              u.id === user?.id
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {u.id === user?.id ? 'Actual' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Crear/Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contraseña {!editingUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required={!editingUser}
                    minLength={6}
                    placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {editingUser ? 'Solo llenar si desea cambiarla' : 'Mínimo 6 caracteres'}
                  </p>
                </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                    value={formData.nombres}
                    onChange={(e) => handleInputChange('nombres', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => handleInputChange('apellidos', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    C.I. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => handleInputChange('cedula', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                  />
          </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Credencial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.credencial}
                    onChange={(e) => handleInputChange('credencial', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                  />
                </div>

                    <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número de Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                  />
                    </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Grado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.grado}
                    onChange={(e) => handleInputChange('grado', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                  >
                    {GRADOS.map((grado) => (
                      <option key={grado} value={grado}>
                        {grado}
                      </option>
                    ))}
                  </select>
            </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                    required
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
            </div>
          </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                >
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
        </div>
      </div>
      )}
    </div>
  );
}
