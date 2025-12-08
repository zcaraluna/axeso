# Solución: Problema con output: standalone

## Problema
Con `output: 'standalone'` en `next.config.ts`:
- El middleware se compila pero en una ubicación diferente
- PM2 necesita usar `node .next/standalone/server.js` en lugar de `npm start`
- Causa errores de archivos faltantes

## Solución Aplicada
Se comentó `output: 'standalone'` en `next.config.ts`.

## Pasos para Aplicar

### 1. Reconstruir la aplicación

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
rm -rf .next
npm run build
```

### 2. Verificar que el middleware se compiló

```bash
ls -la .next/server/middleware.js
```

Ahora debería existir.

### 3. Reiniciar PM2

```bash
pm2 restart axeso --update-env
```

### 4. Verificar logs

```bash
pm2 logs axeso --lines 50
```

Intenta acceder a `/dashboard` y deberías ver logs del middleware.

## Nota sobre Standalone

`output: 'standalone'` es útil para:
- Docker containers
- Despliegues minimalistas

Pero no es necesario para un VPS normal y causa complicaciones con:
- Middleware
- Comandos de inicio
- Estructura de archivos

Si en el futuro necesitas standalone, deberás:
1. Cambiar PM2 para usar: `node .next/standalone/server.js`
2. Ajustar rutas de archivos estáticos
3. Configurar variables de entorno correctamente

