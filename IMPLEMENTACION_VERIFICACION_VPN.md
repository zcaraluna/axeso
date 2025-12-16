# Implementación de Verificación VPN - Proyecto controldeacceso

Este documento describe **exactamente** cómo está implementada la verificación VPN en el proyecto `controldeacceso` para que puedas replicarla en otro subdominio.

## 📁 Archivo de Estado de OpenVPN

### Ruta del archivo
```
/var/log/openvpn-status.log
```

### Configuración en OpenVPN
El archivo se genera automáticamente si en `/etc/openvpn/server.conf` tienes:
```
status /var/log/openvpn-status.log
```

O con actualización más frecuente (recomendado):
```
status /var/log/openvpn-status.log 10
```
(El `10` indica que se actualiza cada 10 segundos)

## 📄 Formato del Archivo de Estado

El archivo tiene el siguiente formato:
```
OpenVPN CLIENT LIST
Updated,2025-12-15 22:30:45
Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
cliente1,181.91.85.248:12345,10.8.0.2,12345,67890,2025-12-15 22:25:30
ROUTING TABLE
Virtual Address,Common Name,Real Address,Last Ref
10.8.0.2,cliente1,181.91.85.248:12345,2025-12-15 22:30:45
GLOBAL STATS
...
END
```

## 🔍 Cómo se Parsea el Archivo

El parsing se realiza en `app/api/vpn/check-status/route.ts`. La lógica es:

### 1. Lectura del archivo
```typescript
const statusFile = '/var/log/openvpn-status.log';
const content = await readFile(statusFile, 'utf-8');
const lines = content.split('\n');
```

### 2. Búsqueda en CLIENT LIST
- Busca la sección `OpenVPN CLIENT LIST` o `CLIENT LIST`
- Para cada línea que no sea comentario o encabezado:
  - Separa por comas: `parts = line.split(',')`
  - Extrae `Real Address` de `parts[1]`
  - Si contiene `:`, extrae la IP: `ipFromAddress = addr.split(':')[0]`
  - Compara con la IP del cliente: `ipFromAddress === realIp`

### 3. Búsqueda en ROUTING TABLE
- Busca la sección `ROUTING TABLE`
- Para cada línea que contenga la IP del cliente:
  - Extrae `Last Ref` de `routingParts[3]`
  - Parsea como fecha: `routingTableLastRef = new Date(lastRefStr)`

### 4. Determinación de Conexión Activa

**Estrategia de verificación (en orden de prioridad):**

1. **Si tiene `Last Ref` en ROUTING TABLE:**
   - Calcula tiempo desde `Last Ref`: `timeSinceLastRef = now - routingTableLastRef.getTime()`
   - **Conexión activa si:** `timeSinceLastRef <= 15 * 1000` (15 segundos)
   - ⚠️ **IMPORTANTE:** Este es el método más confiable porque `Last Ref` se actualiza con cada paquete

2. **Si NO tiene `Last Ref` pero está en CLIENT LIST:**
   - Extrae `Connected Since` de `parts[5]`
   - Parsea como fecha: `connectedSince = new Date(connectedSinceStr)`
   - Calcula tiempo desde conexión: `timeSinceConnection = now - connectedSince.getTime()`
   - Calcula tiempo desde actualización del archivo: `timeSinceFileUpdate = now - fileUpdatedAt.getTime()`
   - **Conexión activa si:** `timeSinceConnection <= 20 * 1000` Y `timeSinceFileUpdate <= 15 * 1000`
   - ⚠️ Esto cubre conexiones muy nuevas que aún no tienen `Last Ref`

3. **Si NO está en CLIENT LIST y NO tiene Last Ref:**
   - **Conexión NO activa**

### Código clave del parsing:
```typescript
// Buscar en CLIENT LIST
if (inClientList && trimmedLine && !trimmedLine.startsWith('#') && 
    !trimmedLine.startsWith('Updated,') && !trimmedLine.startsWith('Common Name,')) {
  const parts = trimmedLine.split(',');
  if (parts.length >= 2) {
    const addr = parts[1].trim();
    if (addr.includes(':')) {
      const ipFromAddress = addr.split(':')[0];
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ipFromAddress) && ipFromAddress === realIp) {
        foundInClientList = true;
        commonName = parts[0]?.trim() || '';
        realAddress = addr;
        virtualAddress = parts[2]?.trim() || '';
        connectedSinceStr = parts[5]?.trim() || '';
        break;
      }
    }
  }
}

// Buscar Last Ref en ROUTING TABLE
if (inRoutingTable && trimmedLine && 
    !trimmedLine.startsWith('Virtual Address,') && trimmedLine.includes(realIp)) {
  const routingParts = trimmedLine.split(',');
  if (routingParts.length >= 4) {
    const routingRealAddress = routingParts[2]?.trim();
    if (routingRealAddress && routingRealAddress.includes(':')) {
      const routingIpFromAddress = routingRealAddress.split(':')[0];
      if (routingIpFromAddress === realIp) {
        const lastRefStr = routingParts[3]?.trim();
        if (lastRefStr) {
          routingTableLastRef = new Date(lastRefStr);
        }
        break;
      }
    }
  }
}
```

## 🔐 Variables de Entorno

### Variables requeridas en `.env`:

```env
# Rango de IPs de la VPN (por defecto 10.8.0.0/24)
VPN_RANGE=10.8.0.0/24

# Habilitar verificación VPN (true para requerir VPN, false para permitir acceso sin VPN)
VPN_REQUIRED=true

# Dominios/subdominios que requieren VPN (opcional, separados por comas)
# Si está configurado, solo estos dominios requerirán VPN cuando VPN_REQUIRED=true
VPN_REQUIRED_DOMAINS=visitantes.cyberpol.com.py

# Token para la API de conexiones VPN (generar con: openssl rand -base64 32)
VPN_API_TOKEN=D+/3Wc2iphTmn9NleUolBnygvAzTMXx/dWuapqAj1ZY=

# URL de la API para scripts de VPN (usualmente http://localhost:3000)
VPN_API_URL=http://localhost:3000

# URL pública del sitio (usado para determinar dominio cuando se accede por localhost)
NEXT_PUBLIC_SITE_URL=https://visitantes.cyberpol.com.py
```

### Uso de cada variable:

- **`VPN_RANGE`**: Rango de red VPN. Se usa para verificación rápida de IPs en el rango `10.8.0.0/24`
- **`VPN_REQUIRED`**: Activa/desactiva la verificación VPN globalmente
- **`VPN_REQUIRED_DOMAINS`**: Lista de dominios que requieren VPN (permite tener múltiples subdominios, algunos con VPN y otros sin)
- **`VPN_API_TOKEN`**: Token de autenticación para endpoints internos de VPN
- **`VPN_API_URL`**: URL base para llamadas internas a la API (usualmente `http://localhost:PUERTO`)
- **`NEXT_PUBLIC_SITE_URL`**: Dominio real del sitio (usado cuando Nginx pasa `localhost` como Host)

## 🌐 Obtención de IP del Cliente desde Headers de Nginx

La función `getClientIp()` en `lib/vpn-utils.ts` extrae la IP en este orden de prioridad:

### 1. `x-real-ip` (Prioridad más alta)
```typescript
const realIp = request.headers.get('x-real-ip');
if (realIp) {
  return realIp.trim();
}
```

### 2. `x-forwarded-for` (Si no hay x-real-ip)
```typescript
const forwardedFor = request.headers.get('x-forwarded-for');
if (forwardedFor) {
  const ips = forwardedFor.split(',').map(ip => ip.trim());
  return ips[0]; // Toma la primera IP (IP original del cliente)
}
```

### 3. `cf-connecting-ip` (Cloudflare)
```typescript
const cfConnectingIp = request.headers.get('cf-connecting-ip');
if (cfConnectingIp) {
  return cfConnectingIp.trim();
}
```

### 4. Fallback
```typescript
return 'unknown'; // Solo en desarrollo
```

### ⚠️ Configuración de Nginx requerida:

Para que funcione correctamente, Nginx debe pasar estos headers:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**IMPORTANTE:** `X-Real-IP` debe contener la IP pública del cliente (no la IP de la VPN). Si el cliente está conectado por VPN, `$remote_addr` en Nginx será la IP pública del cliente, no la IP VPN.

## 🔄 Flujo de Verificación VPN

### 1. Middleware (`middleware.ts`)

El middleware se ejecuta en cada request y:

1. **Verifica si VPN está habilitado:**
   ```typescript
   const vpnRequired = process.env.VPN_REQUIRED === 'true';
   if (!vpnRequired) {
     return NextResponse.next(); // Permitir acceso
   }
   ```

2. **Verifica dominio específico (si `VPN_REQUIRED_DOMAINS` está configurado):**
   ```typescript
   const vpnRequiredDomains = process.env.VPN_REQUIRED_DOMAINS;
   if (vpnRequiredDomains) {
     const allowedDomains = vpnRequiredDomains.split(',').map(d => d.trim().toLowerCase());
     const currentHost = hostname.toLowerCase();
     // Si es localhost, usar NEXT_PUBLIC_SITE_URL
     if (isLocalhost) {
       const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
       currentHost = new URL(siteUrl).hostname.toLowerCase();
     }
     // Verificar si el dominio requiere VPN
     const requiresVpn = allowedDomains.some(domain => 
       currentHost === domain || currentHost.endsWith('.' + domain)
     );
     if (!requiresVpn) {
       return NextResponse.next(); // Permitir acceso
     }
   }
   ```

3. **Obtiene IP del cliente:**
   ```typescript
   const clientIp = getClientIp(request);
   ```

4. **Verifica conexión VPN:**
   ```typescript
   const isConnected = await isVpnConnected(request);
   ```

5. **Bloquea o permite acceso:**
   ```typescript
   if (!isConnected) {
     // Redirigir a página de instrucciones VPN
     return NextResponse.redirect('/vpn-setup?redirect=' + pathname + '&ip=' + clientIp);
   }
   return NextResponse.next(); // Permitir acceso
   ```

### 2. Función `isVpnConnected()` (`lib/vpn-utils.ts`)

Esta función tiene dos métodos de verificación:

#### Método 1: Verificación por rango IP (rápido)
```typescript
const clientIp = getClientIp(request);
const vpnRange = process.env.VPN_RANGE || '10.8.0.0/24';

if (isIpInVpnRange(clientIp, vpnRange)) {
  return true; // IP está en rango VPN, conexión activa
}
```

#### Método 2: Verificación por archivo de estado (más confiable)
```typescript
// Si no está en rango VPN, verificar usando el archivo de estado
const apiUrl = process.env.VPN_API_URL || 'http://127.0.0.1:3000';
const checkUrl = `${apiUrl}/api/vpn/check-status?realIp=${encodeURIComponent(clientIp)}`;

const response = await fetch(checkUrl, {
  signal: controller.signal,
  cache: 'no-store',
  timeout: 1000
});

if (response.ok) {
  const data = await response.json();
  return data.isActive === true;
}
```

#### Método 3: Fallback a base de datos (si archivo no funciona)
```typescript
// Si el archivo de estado no funciona, verificar en BD
const apiToken = process.env.VPN_API_TOKEN;
const checkUrlDb = `${apiUrl}/api/vpn/connections?check=true&realIp=${encodeURIComponent(clientIp)}`;

const response = await fetch(checkUrlDb, {
  headers: {
    'x-api-token': apiToken,
  }
});

if (response.ok) {
  const data = await response.json();
  return data.isActive === true;
}
```

## 🎯 Lógica Especial del Middleware

### 1. Manejo de `localhost` en producción

Cuando Nginx pasa `localhost` como `Host`, el middleware usa `NEXT_PUBLIC_SITE_URL`:

```typescript
const isLocalhost = currentHost.startsWith('localhost') || 
                    currentHost.startsWith('127.0.0.1') || 
                    currentHost === 'localhost';

if (isLocalhost) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL_BASE;
  if (siteUrl) {
    const url = new URL(siteUrl);
    currentHost = url.hostname.toLowerCase();
  } else if (process.env.NODE_ENV === 'development') {
    return NextResponse.next(); // Permitir en desarrollo
  }
}
```

### 2. Rutas públicas (no requieren VPN)

```typescript
const isPublicPath = 
  pathname === '/favicon.ico' ||
  pathname.startsWith('/vpn-setup') ||
  pathname.startsWith('/_next/') ||
  pathname.startsWith('/api/vpn/connections') ||
  pathname.startsWith('/api/vpn/check-status') ||
  pathname.startsWith('/api/debug-ip');
```

### 3. Timeout de verificación

La verificación tiene un timeout de 1 segundo para evitar bloqueos:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 1000);
```

### 4. Manejo de errores

Si hay un error en la verificación, el middleware **permite el acceso** para no romper la aplicación:

```typescript
catch (error) {
  console.error(`[VPN Middleware] ERROR:`, error);
  return NextResponse.next(); // Permitir acceso en caso de error
}
```

## 🔧 Archivos Clave de la Implementación

1. **`middleware.ts`**: Middleware principal que intercepta requests
2. **`lib/vpn-utils.ts`**: Funciones utilitarias (`isVpnConnected`, `getClientIp`, `isIpInVpnRange`)
3. **`app/api/vpn/check-status/route.ts`**: Endpoint que lee y parsea el archivo de estado
4. **`app/api/vpn/connections/route.ts`**: Endpoint alternativo que verifica en base de datos

## ✅ Checklist para Replicar en Otro Subdominio

1. **Archivo de estado de OpenVPN:**
   - [ ] Verificar que `/var/log/openvpn-status.log` existe
   - [ ] Verificar permisos de lectura (debe ser legible por el usuario que corre Next.js)
   - [ ] Verificar que OpenVPN está configurado con `status /var/log/openvpn-status.log 10`

2. **Variables de entorno:**
   - [ ] `VPN_RANGE=10.8.0.0/24` (ajustar si tu VPN usa otro rango)
   - [ ] `VPN_REQUIRED=true` (activar cuando esté listo)
   - [ ] `VPN_REQUIRED_DOMAINS=tu-subdominio.com` (si solo algunos dominios requieren VPN)
   - [ ] `VPN_API_URL=http://localhost:PUERTO` (ajustar al puerto del nuevo subdominio)
   - [ ] `VPN_API_TOKEN=...` (mismo token o generar uno nuevo)
   - [ ] `NEXT_PUBLIC_SITE_URL=https://tu-subdominio.com`

3. **Nginx:**
   - [ ] Configurar `proxy_set_header X-Real-IP $remote_addr;`
   - [ ] Configurar `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
   - [ ] Verificar que `$remote_addr` contiene la IP pública del cliente

4. **Código:**
   - [ ] Copiar `middleware.ts`
   - [ ] Copiar `lib/vpn-utils.ts`
   - [ ] Copiar `app/api/vpn/check-status/route.ts`
   - [ ] Verificar que el path del archivo sea `/var/log/openvpn-status.log`

5. **Pruebas:**
   - [ ] Probar acceso SIN VPN (debe redirigir a `/vpn-setup`)
   - [ ] Probar acceso CON VPN (debe permitir acceso)
   - [ ] Verificar logs del middleware para debugging
   - [ ] Probar endpoint `/api/debug-ip` para verificar IP detectada

## 🐛 Problemas Comunes y Soluciones

### Problema: No detecta conexiones VPN

**Posibles causas:**

1. **Archivo de estado no existe o no tiene permisos:**
   ```bash
   sudo ls -la /var/log/openvpn-status.log
   sudo chmod 644 /var/log/openvpn-status.log
   ```

2. **OpenVPN no está configurado para generar el archivo:**
   ```bash
   sudo grep "status" /etc/openvpn/server.conf
   # Debe mostrar: status /var/log/openvpn-status.log
   ```

3. **IP del cliente no coincide:**
   - Verificar con `/api/debug-ip` qué IP se está detectando
   - Comparar con la IP en `/var/log/openvpn-status.log`

4. **Timeout muy corto:**
   - El timeout es de 1 segundo, si el servidor es lento puede fallar
   - Verificar logs del middleware

5. **`VPN_API_URL` incorrecto:**
   - Si el nuevo subdominio corre en otro puerto, ajustar `VPN_API_URL`
   - Ejemplo: `VPN_API_URL=http://localhost:6368`

### Problema: Detecta VPN pero bloquea acceso

**Posibles causas:**

1. **`VPN_REQUIRED_DOMAINS` no incluye el dominio:**
   - Verificar que el dominio está en la lista
   - Verificar que `NEXT_PUBLIC_SITE_URL` está configurado correctamente

2. **Host header incorrecto:**
   - Verificar logs del middleware: `[VPN Middleware] INICIO - Host: ...`
   - Si muestra `localhost`, verificar `NEXT_PUBLIC_SITE_URL`

## 📝 Notas Importantes

1. **El archivo de estado se actualiza cada 10 segundos** (si está configurado así), por lo que hay un pequeño delay en la detección de conexiones nuevas.

2. **`Last Ref` es más confiable que `CLIENT LIST`** porque se actualiza con cada paquete, mientras que `CLIENT LIST` puede tener delays.

3. **El umbral de 15 segundos para `Last Ref`** es seguro porque el archivo se actualiza cada 10 segundos.

4. **En desarrollo, `localhost` siempre permite acceso** para facilitar el desarrollo local.

5. **Si hay un error en la verificación, se permite el acceso** para evitar romper la aplicación. Esto es intencional para evitar bloqueos por errores temporales.


