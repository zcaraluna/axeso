'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

interface Stats {
  totalVisits: number;
  insideNow: number;
  totalExited: number;
  avgStayTime: string;
  motivoStats: { [key: string]: number };
  visitsByDay: { [key: string]: number };
  visitsByMonth: { [key: string]: number };
  mostActiveUser: string;
  peakHour: string;
  avgVisitsPerDay: number;
  todayVisits: number;
  thisWeekVisits: number;
  thisMonthVisits: number;
  mostActiveDayOfWeek: string;
  mostFrequentMotive: string;
  peakTimeRange: string;
  historicalPeakDate: string;
  historicalPeakCount: number;
}

export default function Estadisticas() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [histogramRange, setHistogramRange] = useState<'7days' | '15days' | '30days' | 'monthly'>('7days');
  const [motivoFilter, setMotivoFilter] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }

    loadStats();
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVisits();
      
      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data && Array.isArray(response.data)) {
        setVisits(response.data);
        calculateStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (visits: Visit[]) => {
    if (visits.length === 0) {
      setStats({
        totalVisits: 0,
        insideNow: 0,
        totalExited: 0,
        avgStayTime: '0 min',
        motivoStats: {},
        visitsByDay: {},
        visitsByMonth: {},
        mostActiveUser: 'N/A',
        peakHour: 'N/A',
        avgVisitsPerDay: 0,
        todayVisits: 0,
        thisWeekVisits: 0,
        thisMonthVisits: 0,
        mostActiveDayOfWeek: 'N/A',
        mostFrequentMotive: 'N/A',
        peakTimeRange: 'N/A',
        historicalPeakDate: 'N/A',
        historicalPeakCount: 0
      });
      return;
    }

    const today = new Date();
    const todayStr = today.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Fecha de hace una semana
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Fecha de hace un mes
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Visitas de hoy
    const todayVisits = visits.filter(v => v.entryDate === todayStr).length;
    
    // Visitas de esta semana
    const thisWeekVisits = visits.filter(v => {
      const [day, month, year] = v.entryDate.split('/');
      const visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return visitDate >= weekAgo;
    }).length;
    
    // Visitas de este mes
    const thisMonthVisits = visits.filter(v => {
      const [day, month, year] = v.entryDate.split('/');
      const visitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return visitDate >= monthAgo;
    }).length;

    // Visitas totales
    const totalVisits = visits.length;
    
    // Dentro ahora
    const insideNow = visits.filter(v => !v.exitDate).length;
    
    // Total salidas
    const totalExited = visits.filter(v => v.exitDate).length;

    // Tiempo promedio de estadía
    const stayTimes: number[] = [];
    visits.forEach(v => {
      if (v.exitDate && v.exitTime) {
        const [eDay, eMonth, eYear] = v.entryDate.split('/');
        const [xDay, xMonth, xYear] = v.exitDate.split('/');
        const entry = new Date(parseInt(eYear), parseInt(eMonth) - 1, parseInt(eDay), 
          parseInt(v.entryTime.split(':')[0]), parseInt(v.entryTime.split(':')[1]));
        const exit = new Date(parseInt(xYear), parseInt(xMonth) - 1, parseInt(xDay),
          parseInt(v.exitTime.split(':')[0]), parseInt(v.exitTime.split(':')[1]));
        const diff = exit.getTime() - entry.getTime();
        if (diff > 0) {
          stayTimes.push(diff / (1000 * 60)); // minutos
        }
      }
    });
    const avgStayTime = stayTimes.length > 0
      ? `${Math.round(stayTimes.reduce((a, b) => a + b, 0) / stayTimes.length)} min`
      : '0 min';

    // Estadísticas por motivo
    const motivoStats: { [key: string]: number } = {};
    visits.forEach(v => {
      motivoStats[v.motivoCategoria] = (motivoStats[v.motivoCategoria] || 0) + 1;
    });

    // Visitas por día
    const visitsByDay: { [key: string]: number } = {};
    visits.forEach(v => {
      visitsByDay[v.entryDate] = (visitsByDay[v.entryDate] || 0) + 1;
    });
    
    // Visitas por mes
    const visitsByMonth: { [key: string]: number } = {};
    visits.forEach(v => {
      const [, month, year] = v.entryDate.split('/');
      const monthKey = `${month}/${year}`;
      visitsByMonth[monthKey] = (visitsByMonth[monthKey] || 0) + 1;
    });

    // Promedio de visitas por día
    const daysWithVisits = Object.keys(visitsByDay).length;
    const avgVisitsPerDay = daysWithVisits > 0 ? Math.round(totalVisits / daysWithVisits) : 0;

    // Usuario más activo
    const userStats: { [key: string]: number } = {};
    visits.forEach(v => {
      userStats[v.registeredBy] = (userStats[v.registeredBy] || 0) + 1;
    });
    const mostActiveUser = Object.entries(userStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Hora pico
    const hourStats: { [key: string]: number } = {};
    visits.forEach(v => {
      const hour = v.entryTime.split(':')[0];
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    });
    const peakHourNum = Object.entries(hourStats).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakHour = peakHourNum ? `${peakHourNum}:00` : 'N/A';

    // Día de la semana más activo
    const dayOfWeekStats: { [key: string]: number } = {};
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    visits.forEach(v => {
      const [day, month, year] = v.entryDate.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayName = dayNames[date.getDay()];
      dayOfWeekStats[dayName] = (dayOfWeekStats[dayName] || 0) + 1;
    });
    const mostActiveDayOfWeek = Object.entries(dayOfWeekStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Motivo más frecuente
    const mostFrequentMotive = Object.entries(motivoStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Pico histórico - fecha con más visitas
    const sortedDays = Object.entries(visitsByDay).sort((a, b) => b[1] - a[1]);
    const historicalPeakDate = sortedDays[0]?.[0] || 'N/A';
    const historicalPeakCount = sortedDays[0]?.[1] || 0;

    // Rango horario pico (3 horas más activas consecutivas)
    const sortedHours = Object.entries(hourStats)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    let maxRange = { start: 0, end: 0, count: 0 };
    for (let i = 0; i < sortedHours.length - 2; i++) {
      const count = (hourStats[sortedHours[i][0]] || 0) + 
                    (hourStats[sortedHours[i+1]?.[0]] || 0) + 
                    (hourStats[sortedHours[i+2]?.[0]] || 0);
      if (count > maxRange.count) {
        maxRange = { start: parseInt(sortedHours[i][0]), end: parseInt(sortedHours[i][0]) + 2, count };
      }
    }
    const peakTimeRange = maxRange.count > 0 
      ? `${String(maxRange.start).padStart(2, '0')}:00 - ${String(maxRange.end).padStart(2, '0')}:00` 
      : 'N/A';

    setStats({
      totalVisits,
      insideNow,
      totalExited,
      avgStayTime,
      motivoStats,
      visitsByDay,
      visitsByMonth,
      mostActiveUser,
      peakHour,
      avgVisitsPerDay,
      todayVisits,
      thisWeekVisits,
      thisMonthVisits,
      mostActiveDayOfWeek,
      mostFrequentMotive,
      peakTimeRange,
      historicalPeakDate,
      historicalPeakCount
    });
  };

  const getHistogramData = () => {
    if (!visits || visits.length === 0) return [];

    const now = new Date();
    const data: { label: string; count: number }[] = [];

    // Filtrar visitas por motivo si no es "todos"
    const filteredVisits = motivoFilter === 'todos' 
      ? visits 
      : visits.filter(v => v.motivoCategoria === motivoFilter);

    if (histogramRange === 'monthly') {
      // Mostrar 12 meses del año seleccionado
      for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 1);
        const monthKey = `${String(month + 1).padStart(2, '0')}/${selectedYear}`;
        const label = date.toLocaleDateString('es-PY', { month: 'short' });
        
        const count = filteredVisits.filter(v => {
          const [, visitMonth, visitYear] = v.entryDate.split('/');
          return `${visitMonth}/${visitYear}` === monthKey;
        }).length;
        
        data.push({ label, count });
      }
    } else {
      // Para días
      const days = histogramRange === '7days' ? 7 : histogramRange === '15days' ? 15 : 30;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const label = date.toLocaleDateString('es-PY', { day: '2-digit', month: 'short' });
        
        const count = filteredVisits.filter(v => v.entryDate === dateStr).length;
        
        data.push({ label, count });
      }
    }

    return data;
  };

  const histogramData = getHistogramData();
  const maxCount = Math.max(...histogramData.map(d => d.count), 1);

  // Obtener motivos únicos para el filtro
  const motivosUnicos = Array.from(new Set(visits.map(v => v.motivoCategoria))).sort();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const downloadPDF = () => {
    if (!selectedDate) return;
    
    const dayVisits = visits.filter(visit => visit.entryDate === selectedDate);
    if (dayVisits.length === 0) {
      alert('No hay visitas registradas para esta fecha');
      return;
    }

    // Crear elemento temporal para el PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: black;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; padding: 20px; margin: -20px -20px 20px -20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">aXeso</h1>
          <p style="margin: 5px 0 0 0; font-size: 20px; opacity: 0.95;">POLICÍA NACIONAL - DCHPEF</p>
        </div>
        
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 10px 0; text-align: left; color: black;">
          <h1 style="color: black; font-size: 24px; margin: 0 0 10px 0; text-align: center;">REPORTE DE VISITAS</h1>
          <p style="margin: 0 0 5px 0; color: black;"><strong>Fecha:</strong> ${selectedDate}</p>
          <p style="margin: 0 0 5px 0; color: black;"><strong>Total de Visitas:</strong> ${dayVisits.length}</p>
          <p style="margin: 0; color: black;"><strong>Generado:</strong> ${new Date().toLocaleString('es-PY')}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">ID</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">Nombres</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">Apellidos</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">Número de Documento</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">Hora Entrada</th>
              <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">Motivo</th>
            </tr>
          </thead>
          <tbody>
            ${dayVisits.sort((a, b) => a.entryTime.localeCompare(b.entryTime)).map((visit, index) => `
              <tr style="${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.id}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.nombres}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.apellidos}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.cedula}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.entryTime}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: black;">${visit.motivoCategoria}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: black; border-top: 2px solid #e2e8f0; padding-top: 15px;">
          <p style="margin: 0; color: black; font-size: 12px;">aXeso | Policía Nacional (DCHPEF)</p>
          <p style="margin: 5px 0 0 0; color: black;">Este es un documento generado automáticamente por el sistema.</p>
        </div>
      </div>
    `;
    
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    // Generar PDF
    html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Descargar el PDF
      pdf.save(`reporte-visitas-${selectedDate.replace(/\//g, '-')}.pdf`);
      
      // Limpiar
      document.body.removeChild(tempDiv);
    }).catch(error => {
      console.error('Error al generar PDF:', error);
      document.body.removeChild(tempDiv);
      alert('Error al generar el PDF. Intente nuevamente.');
    });
  };

  const printThermalReport = () => {
    if (!selectedDate) return;
    
    const dayVisits = visits.filter(visit => visit.entryDate === selectedDate);
    if (dayVisits.length === 0) {
      alert('No hay visitas registradas para esta fecha');
      return;
    }

    const thermalHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Reporte Térmico - ${selectedDate}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0;
              padding: 0;
              background: white;
              color: black;
            }
            .ticket {
              padding: 10px;
              padding-bottom: 20px;
              font-size: 15px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed black;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .subtitle {
              font-size: 14px;
              margin-bottom: 4px;
            }
            .info-section {
              text-align: center;
              margin: 10px 0;
              padding: 8px;
              border: 2px solid black;
            }
            .info-label {
              font-size: 13px;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              font-weight: bold;
            }
            .visit-row {
              margin: 8px 0;
              border-bottom: 1px dotted black;
              padding-bottom: 6px;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              padding-bottom: 8px;
              border-top: 2px dashed black;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <div class="title">aXeso</div>
              <div class="subtitle">POLICÍA NACIONAL - DCHPEF</div>
            </div>
            
            <div class="info-section">
              <div class="info-label">REPORTE DE VISITAS</div>
              <div class="info-value">${selectedDate}</div>
            </div>
            
            <div class="visit-row">
              <div><strong>Total de Visitas:</strong> ${dayVisits.length}</div>
              <div><strong>Generado:</strong> ${new Date().toLocaleString('es-PY')}</div>
            </div>
            
            ${dayVisits.sort((a, b) => a.entryTime.localeCompare(b.entryTime)).map(visit => `
              <div class="visit-row">
                <div><strong>Doc:</strong> ${visit.cedula}</div>
                <div><strong>Nombre:</strong> ${visit.nombres} ${visit.apellidos}</div>
              </div>
            `).join('')}
            
            <div class="footer">
              <div>--- FIN DEL REPORTE ---</div>
              <div style="border-bottom: 2px dashed black; margin-top: 10px;"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=302,height=600');
    if (printWindow) {
      printWindow.document.write(thermalHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Pequeño delay para asegurar que el contenido se cargue
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
      <div className="text-white text-xl">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">{error || 'Error al cargar estadísticas'}</div>
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
        <h1 className="text-3xl font-bold text-white mb-8">Estadísticas del Sistema</h1>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">Hoy</h3>
            <p className="text-4xl font-bold">{stats.todayVisits.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
            <p className="text-xs mt-2 opacity-75">visitantes</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">Esta Semana</h3>
            <p className="text-4xl font-bold">{stats.thisWeekVisits.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
            <p className="text-xs mt-2 opacity-75">visitantes</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">Este Mes</h3>
            <p className="text-4xl font-bold">{stats.thisMonthVisits.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
            <p className="text-xs mt-2 opacity-75">visitantes</p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">Dentro Ahora</h3>
            <p className="text-4xl font-bold">{stats.insideNow.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
            <p className="text-xs mt-2 opacity-75">personas</p>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total de Visitas</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.totalVisits.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Promedio por Día</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.avgVisitsPerDay.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Salidas Totales</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.totalExited.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Tiempo Prom. Estadía</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.avgStayTime}</p>
          </div>
        </div>

        {/* Histograma */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Histograma de Visitas</h2>
              <div className="flex gap-4">
                {/* Filtro por motivo */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Motivo:</label>
                  <select
                    value={motivoFilter}
                    onChange={(e) => setMotivoFilter(e.target.value)}
                    className="px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">Todos</option>
                    {motivosUnicos.map(motivo => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>
                
                {/* Botones de rango temporal */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistogramRange('7days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      histogramRange === '7days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    7 días
                  </button>
                  <button
                    onClick={() => setHistogramRange('15days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      histogramRange === '15days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    15 días
                  </button>
                  <button
                    onClick={() => setHistogramRange('30days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      histogramRange === '30days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    30 días
                  </button>
                  <button
                    onClick={() => setHistogramRange('monthly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      histogramRange === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Mensual
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de año - Solo visible en modo mensual */}
            {histogramRange === 'monthly' && (
              <div className="flex items-center gap-2 justify-end">
                <label className="text-sm font-medium text-slate-600">Año:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedYear(prev => prev - 1)}
                    className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    ◀
                  </button>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedYear(prev => prev + 1)}
                    disabled={selectedYear >= new Date().getFullYear()}
                    className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}
          </div>

          {histogramData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay datos disponibles</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full" style={{ minHeight: '320px' }}>
                <div className="flex items-end justify-between gap-1 px-2 pb-2">
                  {histogramData.map((item, index) => {
                    const heightPercentage = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '240px' }}>
                          {/* Valor - Siempre visible para evitar cortes */}
                          <div className="text-xs font-semibold text-slate-700 mb-2 min-h-[16px] flex items-center">
                            {item.count > 0 ? item.count : ''}
                          </div>
                          {/* Barra */}
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-500 cursor-pointer shadow-md"
                            style={{ height: `${heightPercentage}%`, minHeight: item.count > 0 ? '4px' : '0px' }}
                            title={`${item.label}: ${item.count} visitas`}
                          />
                        </div>
                        {/* Label */}
                        <div className="text-xs text-slate-600 text-center font-medium mt-1" style={{ 
                          writingMode: histogramRange === 'monthly' ? 'horizontal-tb' : 'horizontal-tb',
                          transform: histogramRange !== 'monthly' && histogramData.length > 20 ? 'rotate(-45deg)' : 'none',
                          transformOrigin: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Motivos de Visita */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Visitas por Motivo</h2>
            {Object.keys(stats.motivoStats).length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay datos disponibles</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.motivoStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([motivo, count]) => {
                    const percentage = ((count / stats.totalVisits) * 100).toFixed(1);
                    return (
                    <div key={motivo} className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{motivo}</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {count.toLocaleString('es-PY', { useGrouping: true }).replace(/,/g, '.')} ({percentage}%)
                            </span>
                        </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                          />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Datos Adicionales */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Información Adicional</h2>
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 hover:bg-slate-100 transition-colors">
                <p className="text-sm text-slate-600 mb-2 font-medium">Pico Histórico</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats.historicalPeakDate} - {stats.historicalPeakCount} {stats.historicalPeakCount === 1 ? 'visita' : 'visitas'}
                </p>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 hover:bg-slate-100 transition-colors">
                <p className="text-sm text-slate-600 mb-2 font-medium">Motivo Más Frecuente</p>
                <p className="text-2xl font-bold text-slate-800">{stats.mostFrequentMotive}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 hover:bg-slate-100 transition-colors">
                <p className="text-sm text-slate-600 mb-2 font-medium">Horario de Mayor Actividad</p>
                <p className="text-2xl font-bold text-slate-800">{stats.peakTimeRange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendario de Visitas por Día */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Visitas por Mes</h2>
          
          {/* Controles del calendario */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                const newMonth = new Date(selectedMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setSelectedMonth(newMonth);
                setSelectedDate(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              ← Anterior
            </button>
            <h3 className="text-lg font-semibold text-slate-800 capitalize">
              {selectedMonth.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => {
                const newMonth = new Date(selectedMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setSelectedMonth(newMonth);
                setSelectedDate(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              Siguiente →
            </button>
          </div>

          {/* Grid del calendario */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center font-semibold text-slate-600 py-2 text-sm">
                {day}
                  </div>
                ))}
            
            {(() => {
              const year = selectedMonth.getFullYear();
              const month = selectedMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const days = [];
              
              // Días vacíos antes del primer día
              for (let i = 0; i < firstDay; i++) {
                days.push(<div key={`empty-${i}`} className="p-3"></div>);
              }
              
              // Días del mes
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                const visitsCount = visits.filter(v => v.entryDate === dateStr).length;
                const hasVisits = visitsCount > 0;
                const isSelected = selectedDate === dateStr;
                
                days.push(
                  <button
                    key={day}
                    onClick={() => hasVisits ? setSelectedDate(isSelected ? null : dateStr) : null}
                    disabled={!hasVisits}
                    className={`p-3 rounded-lg text-center transition ${
                      hasVisits
                        ? isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-lg'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-sm">{day}</div>
                    {hasVisits && (
                      <div className="text-xs mt-1">{visitsCount}</div>
                    )}
                  </button>
                );
              }
              
              return days;
            })()}
          </div>

          {/* Información del día seleccionado */}
          {selectedDate && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Visitas del {selectedDate}
                  </h4>
                  <p className="text-2xl font-bold text-blue-700">
                    {visits.filter(v => v.entryDate === selectedDate).length} visitas
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    Exportar PDF
                  </button>
                  <button
                    onClick={printThermalReport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    Imprimir Térmica
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

