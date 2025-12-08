# Verificar Middleware con Standalone

Con `output: 'standalone'`, el middleware puede estar en:
- `.next/standalone/server.js` (incluido en el bundle)
- `.next/server/middleware.js` (puede no existir como archivo separado)

## Verificar si el middleware se está ejecutando

El middleware debería funcionar incluso con standalone. El problema puede ser otro.

## Pasos de diagnóstico

1. Verificar estructura de .next:
```bash
ls -la .next/standalone/
ls -la .next/server/
```

2. Probar acceso y ver logs:
```bash
pm2 logs axeso --lines 100
```

3. Acceder a `/dashboard` y ver si hay logs del middleware

4. Si no hay logs, el middleware no se está ejecutando por otra razón

