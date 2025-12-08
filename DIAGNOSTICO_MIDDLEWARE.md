# Diagnóstico del Middleware VPN

## Problema
El middleware no se está ejecutando o no está bloqueando el acceso.

## Pasos de Diagnóstico

### 1. Verificar que el middleware se compiló

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
ls -la .next/server/middleware.js
```

Si el archivo no existe, el middleware no se compiló.

### 2. Verificar variables de entorno

El middleware necesita acceso a las variables de entorno. En Next.js, las variables deben estar disponibles en tiempo de compilación o usar `process.env` directamente.

Verifica que `.env` tenga:
```bash
cat .env | grep VPN
```

### 3. Reconstruir la aplicación

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
npm run build
pm2 restart axeso --update-env
```

### 4. Verificar logs con el nuevo logging

```bash
pm2 logs axeso --lines 100
```

Deberías ver:
```
[VPN Middleware] Ejecutándose para: /dashboard
[VPN Middleware] VPN_REQUIRED=true, vpnRequired=true
```

### 5. Si no ves logs del middleware

El middleware puede no estar ejecutándose. Verifica:

1. **Ubicación del archivo**: Debe estar en la raíz del proyecto como `middleware.ts`
2. **Compilación**: Debe estar en `.next/server/middleware.js` después del build
3. **Variables de entorno**: Deben estar disponibles en tiempo de ejecución

### 6. Verificar que PM2 está cargando las variables

```bash
pm2 env 0 | grep VPN
```

Si no aparecen, PM2 no está cargando las variables del `.env`.

### 7. Solución alternativa: Cargar variables manualmente

Si PM2 no carga las variables, puedes:

```bash
# Ver el archivo de ecosystem de PM2
pm2 show axeso

# O crear un archivo ecosystem.config.js
```

## Solución Rápida

1. **Reconstruir**:
   ```bash
   npm run build
   pm2 restart axeso --update-env
   ```

2. **Verificar logs**:
   ```bash
   pm2 logs axeso --lines 50
   ```

3. **Probar acceso**:
   - Acceder a `/dashboard` sin VPN
   - Debería redirigir a `/vpn-setup`
   - Verificar logs para ver si el middleware se ejecuta

