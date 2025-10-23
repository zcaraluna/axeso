'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TimeoutNotificationProps {
  show: boolean;
  timeLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function TimeoutNotification({
  show,
  timeLeft,
  onExtend,
  onLogout
}: TimeoutNotificationProps) {
  const [countdown, setCountdown] = useState(timeLeft);
  const { logout } = useAuth();

  useEffect(() => {
    setCountdown(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (!show || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, countdown, onLogout]);

  if (!show) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sesión por expirar
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            Tu sesión expirará en{' '}
            <span className="font-mono font-bold text-red-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </p>
          
          <p className="text-xs text-gray-400 mb-6">
            Por seguridad, la sesión se cerrará automáticamente.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={onExtend}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Extender sesión
            </button>
            <button
              onClick={() => {
                logout();
                onLogout();
              }}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
