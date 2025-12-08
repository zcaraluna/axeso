'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VpnSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientIp, setClientIp] = useState<string>('');

  useEffect(() => {
    const ip = searchParams.get('ip') || 'No detectada';
    setClientIp(ip);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Conexión VPN Requerida
          </h1>
          <p className="text-slate-600">
            Para acceder al sistema, debe estar conectado a la red VPN
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Información de Conexión
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">IP Detectada:</span>
              <span className="font-mono text-slate-800">{clientIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Estado:</span>
              <span className="text-red-600 font-semibold">No conectado a VPN</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Instrucciones para Conectarse
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-slate-700">
            <li>
              Asegúrese de tener instalado el cliente OpenVPN en su dispositivo
            </li>
            <li>
              Contacte al administrador del sistema para obtener su archivo de configuración (.ovpn)
            </li>
            <li>
              Importe el archivo .ovpn en su cliente OpenVPN
            </li>
            <li>
              Conéctese a la VPN usando sus credenciales
            </li>
            <li>
              Una vez conectado, recargue esta página o intente acceder nuevamente
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">
            ¿Necesita ayuda?
          </h3>
          <p className="text-blue-700 text-sm">
            Si tiene problemas para conectarse a la VPN, contacte al administrador del sistema
            o consulte la documentación en{' '}
            <Link href="/vpn-instructions" className="underline font-semibold">
              Instrucciones de VPN
            </Link>
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.refresh()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Verificar Conexión
          </button>
          <Link
            href="/vpn-instructions"
            className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 text-center"
          >
            Ver Instrucciones
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-800 text-sm underline"
          >
            Volver al inicio de sesión
          </Link>
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


