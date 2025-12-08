# Debug del Middleware VPN

Si el middleware no está bloqueando el acceso, sigue estos pasos para diagnosticar:

## 🔍 Paso 1: Verificar que el Middleware se Ejecuta

Agrega logs temporales para ver qué está pasando:

```bash
# Ver logs de PM2 en tiempo real
pm2 logs axeso --lines 50
```

Deberías ver logs como:
```
[VPN Middleware] Path: /dashboard, IP: 181.91.85.248, VPN Range: 10.8.0.0/24, Connected: false
[VPN Middleware] Bloqueando acceso - IP: 181.91.85.248 no está en rango VPN 10.8.0.0/24
```

## 🔍 Paso 2: Verificar Headers que Pasa Nginx

El problema puede ser que nginx no está pasando los headers correctos. Verifica la configuración de nginx:

```bash
# Ver configuración actual de nginx
sudo cat /etc/nginx/sites-available/axeso
# o
sudo cat /etc/nginx/sites-enabled/axeso
```

Asegúrate de que tenga:
```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## 🔍 Paso 3: Probar Directamente

Prueba acceder directamente a Next.js (sin nginx) para ver si el problema es nginx:

```bash
# Temporalmente, acceder a http://tu-servidor:3000
# Esto te dirá si el problema es nginx o el middleware
```

## 🔍 Paso 4: Verificar IP Real

Agrega un endpoint de prueba para ver qué IP está recibiendo:

```typescript
// app/api/debug-ip/route.ts
export async function GET(request: NextRequest) {
  const headers = {
    'x-real-ip': request.headers.get('x-real-ip'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
  };
  
  return NextResponse.json({
    headers,
    detectedIp: getClientIp(request),
    isVpn: isVpnConnected(request)
  });
}
```

Luego accede a: `https://visitantes.cyberpol.com.py/api/debug-ip`

## 🔧 Solución Rápida: Verificar Configuración de Nginx

Si nginx no está configurado correctamente, actualiza la configuración:

```bash
sudo nano /etc/nginx/sites-available/axeso
```

Asegúrate de que en el bloque `location /` tenga:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

Luego:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

