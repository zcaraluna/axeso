'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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

export default function ReporteIngresos() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/');
            return;
        }
        if (user.username !== 'garv') {
            router.push('/dashboard');
        }
    }, [user, authLoading, router]);

    const handleBuscar = async () => {
        if (!startDate) {
            setError('Seleccioná al menos una fecha de inicio.');
            return;
        }
        setError('');
        setLoading(true);
        setSearched(false);

        try {
            const params = new URLSearchParams({ startDate });
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`/api/reports/ingresos-por-dia?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Error al consultar el reporte.');
                return;
            }

            const data = await res.json();
            setVisits(data.visits || []);
            setSearched(true);
        } catch (e) {
            console.error(e);
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleDescargarCSV = () => {
        if (visits.length === 0) return;

        const headers = [
            'ID',
            'Nombres',
            'Apellidos',
            'Tipo Documento',
            'Número Documento',
            'Teléfono',
            'Fecha Entrada',
            'Hora Entrada',
            'Motivo',
            'Descripción del Motivo',
            'Fecha Salida',
            'Hora Salida',
            'Registrado Por',
            'Salida Registrada Por',
        ];

        const rows = visits.map(v => [
            v.id,
            v.nombres,
            v.apellidos,
            v.tipoDocumento,
            v.cedula,
            v.telefono,
            v.entryDate,
            v.entryTime,
            v.motivoCategoria,
            v.motivoDescripcion,
            v.exitDate || '',
            v.exitTime || '',
            v.registeredBy,
            v.exitRegisteredBy || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const dateLabel = endDate && endDate !== startDate
            ? `${startDate}_a_${endDate}`
            : startDate;
        const filename = `ingresos_${dateLabel}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        );
    }

    if (!user || user.username !== 'garv') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16">
            {/* Navbar */}
            <nav className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/dashboard" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition">
                            aXeso - Policía Nacional (DCHPEF)
                        </Link>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm font-medium"
                        >
                            Volver al Inicio
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h1 className="text-3xl font-bold text-slate-800">Reporte de Ingresos por Día</h1>
                        </div>
                        <p className="text-slate-500 text-sm">
                            Seleccioná una fecha o rango de fechas para obtener la lista detallada de personas que ingresaron.
                        </p>
                    </div>

                    {/* Filtros */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Fecha de inicio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition text-slate-900 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Fecha de fin{' '}
                                    <span className="text-slate-400 font-normal">(opcional, para un rango)</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition text-slate-900 bg-white"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleBuscar}
                            disabled={loading || !startDate}
                            className="w-full md:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Buscando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Buscar Registros
                                </>
                            )}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {/* Resultados */}
                    {searched && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-700 font-medium">
                                        {visits.length === 0
                                            ? 'No se encontraron ingresos para la fecha seleccionada.'
                                            : `${visits.length} ingreso${visits.length !== 1 ? 's' : ''} encontrado${visits.length !== 1 ? 's' : ''}`}
                                    </span>
                                    {visits.length > 0 && (
                                        <span className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                                            {startDate}{endDate && endDate !== startDate ? ` → ${endDate}` : ''}
                                        </span>
                                    )}
                                </div>

                                {visits.length > 0 && (
                                    <button
                                        onClick={handleDescargarCSV}
                                        className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-200 text-sm shadow"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Descargar CSV
                                    </button>
                                )}
                            </div>

                            {visits.length > 0 && (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-100 border-b-2 border-slate-300">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">ID</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Nombre Completo</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Documento</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Teléfono</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Entrada</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Salida</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {visits.map((visit) => (
                                                <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{visit.id}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">
                                                        {visit.nombres} {visit.apellidos}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        <span className="text-xs text-slate-400">{visit.tipoDocumento}</span>
                                                        <br />
                                                        {visit.cedula}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">{visit.telefono}</td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        <span className="font-medium">{visit.entryDate}</span>
                                                        <br />
                                                        <span className="text-slate-500">{visit.entryTime}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        {visit.exitDate ? (
                                                            <>
                                                                <span className="font-medium">{visit.exitDate}</span>
                                                                <br />
                                                                <span className="text-slate-500">{visit.exitTime}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700">
                                                        <span className="font-medium">{visit.motivoCategoria}</span>
                                                        {visit.motivoDescripcion && (
                                                            <>
                                                                <br />
                                                                <span className="text-xs text-slate-400 line-clamp-1">{visit.motivoDescripcion}</span>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {visit.exitDate ? (
                                                            <span className="inline-block px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-medium">
                                                                Salió
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                                Dentro
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
