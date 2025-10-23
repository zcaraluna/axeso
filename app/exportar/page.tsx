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

export default function Exportar() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const loadVisits = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getVisits(user.id);
      
      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data && Array.isArray(response.data)) {
        setVisits(response.data);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
      setError('Error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Nombres',
      'Apellidos',
      'Número de Documento',
      'Fecha Nacimiento',
      'Edad',
      'Teléfono',
      'Fecha Entrada',
      'Hora Entrada',
      'Motivo',
      'Descripción',
      'Fecha Salida',
      'Hora Salida',
      'Registrado Por',
      'Salida Registrada Por'
    ];

    const rows = visits.map(v => [
      v.id,
      v.nombres,
      v.apellidos,
      v.cedula,
      v.fechaNacimiento,
      v.edad.toString(),
      v.telefono,
      v.entryDate,
      v.entryTime,
      v.motivoCategoria,
      v.motivoDescripcion,
      v.exitDate || '',
      v.exitTime || '',
      v.registeredBy,
      v.exitRegisteredBy || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const filename = `visitas_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(visits, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const filename = `visitas_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedVisits = JSON.parse(content);
        
        if (confirm(`¿Está seguro de importar ${importedVisits.length} visitas? Esto sobrescribirá los datos actuales.`)) {
          localStorage.setItem('visits', JSON.stringify(importedVisits));
          setVisits(importedVisits);
          alert('Datos importados exitosamente');
        }
      } catch (error) {
        alert('Error al importar el archivo. Asegúrese de que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
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
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Buscar Visitante</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-slate-600 text-xl">Cargando datos...</div>
              </div>
            ) : (
              <>
                {/* Estadísticas */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">Datos Actuales</h2>
                  <p className="text-slate-700">
                    Total de visitas en el sistema: <span className="font-bold text-2xl text-blue-600">{visits.length}</span>
                  </p>
                </div>

            {/* Exportar */}
            <div className="border-2 border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Exportar Datos</h2>
              <p className="text-slate-600 mb-4">
                Descargue todos los datos de visitas en el formato de su preferencia.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={exportToCSV}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                  disabled={visits.length === 0}
                >
                  Exportar como CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                  disabled={visits.length === 0}
                >
                  Exportar como JSON
                </button>
              </div>
              {visits.length === 0 && (
                <p className="text-sm text-slate-500 mt-2 text-center">
                  No hay datos para exportar
                </p>
              )}
            </div>

            {/* Importar */}
            <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Importar Datos</h2>
              <p className="text-slate-700 mb-4">
                Importe datos desde un archivo JSON previamente exportado.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Advertencia:</strong> Al importar datos, se sobrescribirán todos los datos actuales del sistema. 
                  Se recomienda hacer una copia de seguridad antes de continuar.
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              />
            </div>

            {/* Información */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-2">Información sobre los formatos:</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>
                  <strong>CSV:</strong> Formato compatible con Excel y hojas de cálculo. Ideal para análisis de datos.
                </li>
                <li>
                  <strong>JSON:</strong> Formato para backup completo. Use este formato para hacer copias de seguridad y restauración.
                </li>
              </ul>
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

