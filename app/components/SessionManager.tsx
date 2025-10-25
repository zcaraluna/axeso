'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeout } from '@/contexts/useTimeout';
import TimeoutNotification from './TimeoutNotification';

export default function SessionManager() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Configuración: 30 minutos de timeout, 5 minutos de advertencia
  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos
  const WARNING_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  const handleTimeout = () => {
    logout();
    setShowWarning(false);
  };

  const handleWarning = () => {
    setShowWarning(true);
    setTimeLeft(5 * 60); // 5 minutos en segundos
  };

  const handleExtendSession = () => {
    setShowWarning(false);
    // El hook useTimeout se reseteará automáticamente
  };

  const handleLogout = () => {
    logout();
    setShowWarning(false);
  };

  // Configurar timeout
  useTimeout({
    timeout: TIMEOUT_DURATION,
    warningTime: WARNING_DURATION,
    onTimeout: handleTimeout,
    onWarning: handleWarning
  });

  // Nota: Se removió la limpieza automática de sesión al cerrar/recargar
  // para evitar que el usuario se desloguee al recargar la página.
  // La sesión se mantendrá hasta que expire el token JWT (2 horas)
  // o hasta que el usuario haga logout manual.

  // Escuchar eventos de extensión de sesión
  useEffect(() => {
    const handleSessionExtended = () => {
      setShowWarning(false);
    };

    window.addEventListener('sessionExtended', handleSessionExtended);
    return () => window.removeEventListener('sessionExtended', handleSessionExtended);
  }, []);

  if (!user) return null;

  return (
    <TimeoutNotification
      show={showWarning}
      timeLeft={timeLeft}
      onExtend={handleExtendSession}
      onLogout={handleLogout}
    />
  );
}
