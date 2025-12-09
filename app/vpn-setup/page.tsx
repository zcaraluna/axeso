'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VpnSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const redirectPath = searchParams.get('redirect') || '/';
  const clientIp = searchParams.get('ip') || 'N/A';

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkVpnStatus = async () => {
      try {
        const response = await fetch('/api/debug-ip', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.isVpnConnected === true) {
            clearInterval(intervalId);
            const targetPath = redirectPath && redirectPath !== '/' ? redirectPath : '/';
            router.push(targetPath);
          }
        }
      } catch (error) {
        console.error('Error verificando VPN:', error);
      }
    };

    // Verificar inmediatamente al cargar
    checkVpnStatus();

    // Verificar cada 3 segundos
    intervalId = setInterval(checkVpnStatus, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [redirectPath, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            ACCESO NO AUTORIZADO
          </h1>
          <p className="text-slate-600 mb-4">
            No se puede acceder al sistema desde este equipo. Se requiere conexión VPN autorizada.
          </p>
          <p className="text-sm text-slate-500">
            IP detectada: <span className="font-semibold">{clientIp}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VpnSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    }>
      <VpnSetupContent />
    </Suspense>
  );
}
