'use client';

import { useState } from 'react';

export default function Footer() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 py-3 px-4 z-40">
        <div className="max-w-7xl mx-auto text-center">
          <button
            onClick={() => setShowModal(true)}
            className="text-slate-400 hover:text-neon-green text-sm transition-colors duration-200"
          >
            Powered by <span className="font-semibold text-neon-green">s1mple</span>
          </button>
        </div>
      </footer>

      {/* Modal de información del desarrollador */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[70]"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl shadow-2xl max-w-md w-full p-7 border-2 border-neon-green"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-block">
                <h2 className="text-3xl font-bold text-neon-green mb-2 tracking-wider">s1mple</h2>
                <div className="h-0.5 bg-gradient-to-r from-transparent via-neon-green to-transparent rounded-full"></div>
              </div>
              <p className="text-slate-400 text-sm mt-2">From BITCAN</p>
            </div>

            {/* Content */}
            <div className="space-y-3 mb-5">
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Desarrollador</p>
                <p className="text-sm font-semibold text-white">GUILLERMO ANDRÉS</p>
                <p className="text-sm font-semibold text-white">RECALDE VALDEZ</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Contacto</p>
                <p className="text-xs text-slate-300">recaldev.ga@bitcan.com.py</p>
                <p className="text-xs text-slate-300 mt-1">+595 973 408 754</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Servicios</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Desarrollo de sistemas de gestión y empresariales a medida
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Proyecto</p>
                <p className="text-sm font-semibold text-neon-green">aXeso</p>
                <p className="text-xs text-slate-400">Sistema de Control de Acceso</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Versión</p>
                <p className="text-sm font-semibold text-white">Beta 1.0.0</p>
                <p className="text-xs text-slate-400 mt-1">16/10/2025</p>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="text-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-neon-green text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

