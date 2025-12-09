'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VpnSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  
  const redirectPath = searchParams.get('redirect') || '/';
  const clientIp = searchParams.get('ip') || 'unknown';

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const checkVpnStatus = async () => {
      try {
        setIsChecking(true);
        const response = await fetch('/api/debug-ip', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.isVpnConnected === true) {
            // VPN detectada, redirigir
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            
            // Redirigir a la página original o al login
            const targetPath = redirectPath && redirectPath !== '/' ? redirectPath : '/';
            router.push(targetPath);
            return;
          }
        }
      } catch (error) {
        console.error('Error verificando VPN:', error);
      } finally {
        setIsChecking(false);
        setCheckCount(prev => prev + 1);
      }
    };

    // Verificar inmediatamente al cargar
    checkVpnStatus();

    // Verificar cada 3 segundos
    intervalId = setInterval(checkVpnStatus, 3000);

    // Limpiar después de 5 minutos (100 verificaciones)
    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
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
            Acceso No Autorizado
          </h1>
          <p className="text-slate-600 mb-4">
            No se puede acceder al sistema desde esta computadora. Se requiere conexión VPN autorizada.
          </p>
          
          {clientIp && clientIp !== 'unknown' && (
            <p className="text-sm text-slate-500 mb-4">
              IP detectada: {clientIp}
            </p>
          )}
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              {isChecking ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verificando conexión VPN...</span>
                </>
              ) : (
                <span className="text-slate-500">
                  Verificando automáticamente cada 3 segundos...
                </span>
              )}
            </div>
            {checkCount > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                Verificaciones realizadas: {checkCount}
              </p>
            )}
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
            >
              Recargar Página
            </button>
          </div>
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


