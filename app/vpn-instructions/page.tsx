'use client';

import Link from 'next/link';

export default function VpnInstructionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition">
              aXeso - Policía Nacional (DCHPEF)
            </Link>
            <Link href="/vpn-setup" className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm font-medium">
              Verificar Conexión
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">
            Instrucciones de Conexión VPN
          </h1>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                ¿Qué es OpenVPN?
              </h2>
              <p className="text-slate-700 mb-4">
                OpenVPN es una solución de Red Privada Virtual (VPN) que permite conectarse de forma segura
                a la red interna del sistema. Para acceder al sistema de control de acceso, debe estar
                conectado a través de esta VPN.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Instalación del Cliente OpenVPN
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Windows
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4">
                    <li>Descargue OpenVPN desde{' '}
                      <a href="https://openvpn.net/community-downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        openvpn.net
                      </a>
                    </li>
                    <li>Ejecute el instalador y siga las instrucciones</li>
                    <li>Reinicie su computadora si es necesario</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    macOS
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4">
                    <li>Instale usando Homebrew: <code className="bg-slate-100 px-2 py-1 rounded">brew install openvpn</code></li>
                    <li>O descargue Tunnelblick desde{' '}
                      <a href="https://tunnelblick.net/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        tunnelblick.net
                      </a>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Linux
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4">
                    <li>Ubuntu/Debian: <code className="bg-slate-100 px-2 py-1 rounded">sudo apt install openvpn</code></li>
                    <li>Fedora: <code className="bg-slate-100 px-2 py-1 rounded">sudo dnf install openvpn</code></li>
                    <li>Arch: <code className="bg-slate-100 px-2 py-1 rounded">sudo pacman -S openvpn</code></li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Android / iOS
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4">
                    <li>Instale &quot;OpenVPN Connect&quot; desde Google Play Store o App Store</li>
                    <li>La aplicación está disponible de forma gratuita</li>
                  </ol>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Configuración del Cliente
              </h2>
              <ol className="list-decimal list-inside space-y-3 text-slate-700 ml-4">
                <li>
                  <strong>Obtenga su archivo de configuración:</strong> Contacte al administrador del sistema
                  para obtener su archivo .ovpn personalizado
                </li>
                <li>
                  <strong>Importe el archivo:</strong>
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Windows:</strong> Copie el archivo .ovpn a <code className="bg-slate-100 px-1 rounded">C:\Program Files\OpenVPN\config\</code></li>
                    <li><strong>macOS (Tunnelblick):</strong> Haga doble clic en el archivo .ovpn</li>
                    <li><strong>Linux:</strong> Copie a <code className="bg-slate-100 px-1 rounded">/etc/openvpn/client/</code></li>
                    <li><strong>Android/iOS:</strong> Abra el archivo desde la app OpenVPN Connect</li>
                  </ul>
                </li>
                <li>
                  <strong>Conéctese:</strong> Inicie el cliente OpenVPN y seleccione su perfil de conexión
                </li>
                <li>
                  <strong>Ingrese sus credenciales:</strong> Si se le solicita, ingrese su usuario y contraseña
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Verificación de Conexión
              </h2>
              <p className="text-slate-700 mb-4">
                Una vez conectado a la VPN, debería poder acceder al sistema normalmente. Si aún tiene problemas:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Verifique que el cliente OpenVPN muestre &quot;Connected&quot; o &quot;Conectado&quot;</li>
                <li>Verifique que su IP esté en el rango de la VPN (10.8.0.x)</li>
                <li>Intente recargar la página del sistema</li>
                <li>Contacte al administrador si el problema persiste</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Solución de Problemas Comunes
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Error: &quot;Cannot resolve hostname&quot;
                </h3>
                <p className="text-yellow-700 text-sm">
                  Verifique que el servidor VPN esté accesible y que su conexión a internet funcione correctamente.
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Error: &quot;Authentication failed&quot;
                </h3>
                <p className="text-yellow-700 text-sm">
                  Verifique que sus credenciales sean correctas. Si el problema persiste, contacte al administrador
                  para verificar que su certificado no haya sido revocado.
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  La conexión se cae frecuentemente
                </h3>
                <p className="text-yellow-700 text-sm">
                  Esto puede deberse a problemas de red. Verifique su conexión a internet y contacte al
                  administrador si el problema persiste.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">
                Seguridad
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-2 text-blue-700">
                  <li>Nunca comparta su archivo .ovpn con otras personas</li>
                  <li>Mantenga su certificado VPN seguro y protegido</li>
                  <li>Si sospecha que su certificado fue comprometido, contacte al administrador inmediatamente</li>
                  <li>Desconéctese de la VPN cuando no esté usando el sistema</li>
                </ul>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <Link
              href="/vpn-setup"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Verificar Mi Conexión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


