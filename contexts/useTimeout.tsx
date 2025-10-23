'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface UseTimeoutOptions {
  timeout: number; // en milisegundos
  warningTime: number; // en milisegundos
  onTimeout: () => void;
  onWarning: () => void;
}

export function useTimeout({
  timeout,
  warningTime,
  onTimeout,
  onWarning
}: UseTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const resetTimeout = useCallback(() => {
    // Limpiar timeouts existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Solo activar si hay usuario logueado
    if (user) {
      // Timeout de advertencia
      warningTimeoutRef.current = setTimeout(() => {
        onWarning();
      }, timeout - warningTime);

      // Timeout principal
      timeoutRef.current = setTimeout(() => {
        onTimeout();
      }, timeout);
    }
  }, [user, timeout, warningTime, onTimeout, onWarning]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Inicializar timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
      clearTimeouts();
    };
  }, [resetTimeout, clearTimeouts]);

  // Limpiar timeouts cuando el usuario se desloguea
  useEffect(() => {
    if (!user) {
      clearTimeouts();
    }
  }, [user, clearTimeouts]);

  return {
    resetTimeout,
    clearTimeouts
  };
}
