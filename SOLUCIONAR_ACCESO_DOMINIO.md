# Solución: No se puede acceder por dominio pero sí por IP

## 🔍 Problema Identificado

No puedes acceder a `visitantes.cyberpol.com.py` desde el navegador, pero sí puedes acceder usando `144.202.77.18:3000`. Esto indica un problema de **DNS** o configuración de **Nginx**.

## 📋 Diagnóstico

### Problema Principal: DNS

El dominio `visitantes.cyberpol.com.py` no está resolviendo correctamente a la IP `144.202.77.18` en los navegadores.

### Problemas Secundarios en Nginx

1. **Listen limitado a IP específica**: Nginx está configurado para escuchar solo en `144.202.77.18:443` en lugar de todas las interfaces (`0.0.0.0:443` o simplemente `443`)
2. **Proxy_pass usando IP externa**: El `proxy_pass` está usando `http://144.202.77.18:3000` en lugar de `http://localhost:3000`

## ✅ Soluciones

### Paso 1: Diagnosticar el Problema

Ejecuta el script de diagnóstico completo en el servidor:

```bash
sudo bash scripts/diagnostico-dns-completo.sh
```

Este script verificará:
- Resolución DNS desde el servidor
- Resolución DNS desde servidores públicos (Google, Cloudflare, OpenDNS)
- Configuración de Nginx
- Estado de Next.js
- Logs de error

### Paso 2: Corregir Configuración de Nginx

Ejecuta el script de corrección en el servidor:

```bash
sudo bash scripts/corregir-acceso-web.sh
```

Este script:
- Cambiará `listen 144.202.77.18:443` a `listen 443` (todas las interfaces)
- Cambiará `proxy_pass http://144.202.77.18:3000` a `http://localhost:3000`
- Verificará la sintaxis de Nginx
- Recargará Nginx

### Paso 3: Verificar y Configurar DNS

#### Opción A: Si usas un proveedor de dominio externo

1. Accede al panel de control de tu proveedor de dominio (donde compraste `cyberpol.com.py`)
2. Busca la sección de "DNS" o "Zona DNS"
3. Verifica que existe un registro **A** para `visitantes.cyberpol.com.py` que apunte a `144.202.77.18`
4. Si no existe, créalo:
   - **Tipo**: A
   - **Nombre/Host**: `visitantes` (o `visitantes.cyberpol.com.py` dependiendo del proveedor)
   - **Valor/IP**: `144.202.77.18`
   - **TTL**: 3600 (o el valor por defecto)

#### Opción B: Si usas Hestia CP para gestionar DNS

**⚠️ PROBLEMA DETECTADO**: El diagnóstico muestra que NO existe un registro A para el subdominio `visitantes` en la zona DNS de `cyberpol.com.py`.

**Solución:**

1. Accede a Hestia CP: `https://tu-servidor:8083`
2. Ve a **"DNS"** → **"DNS Domains"**
3. Selecciona **"cyberpol.com.py"** (NO `visitantes.cyberpol.com.py`)
4. Agrega un nuevo registro:
   - **Tipo**: A
   - **Nombre**: `visitantes` (solo el subdominio, sin el dominio completo)
   - **Valor/IP**: `144.202.77.18`
   - **TTL**: 3600
5. Guarda los cambios

**O desde la línea de comandos (en el servidor):**
```bash
/usr/local/hestia/bin/v-add-dns-record cyberpol cyberpol.com.py visitantes A 144.202.77.18
```

**Nota importante**: `visitantes.cyberpol.com.py` es un **subdominio** de `cyberpol.com.py`, por lo que el registro A debe agregarse en la zona DNS de `cyberpol.com.py`, no como un dominio separado.

#### Opción C: Si usas BIND directamente

1. Verifica la zona DNS:
   ```bash
   sudo cat /etc/bind/db.cyberpol.com.py
   ```
2. Asegúrate de que existe:
   ```
   visitantes    IN    A    144.202.77.18
   ```
3. Recarga BIND:
   ```bash
   sudo systemctl reload bind9
   ```

### Paso 4: Verificar Propagación DNS

Después de configurar el DNS, puede tardar entre unos minutos y 48 horas en propagarse. Verifica con:

```bash
# Desde el servidor
dig visitantes.cyberpol.com.py +short

# Desde tu computadora (Windows)
nslookup visitantes.cyberpol.com.py

# O desde un servicio online
# https://www.whatsmydns.net/#A/visitantes.cyberpol.com.py
```

### Paso 5: Solución Temporal (Solo para Pruebas)

Si necesitas probar inmediatamente mientras se propaga el DNS, puedes agregar el dominio al archivo `hosts` de Windows:

**En Windows (ejecutar como Administrador):**

```powershell
# Abrir PowerShell como Administrador
notepad C:\Windows\System32\drivers\etc\hosts

# Agregar esta línea al final:
144.202.77.18    visitantes.cyberpol.com.py

# Guardar y cerrar
# Limpiar cache DNS:
ipconfig /flushdns
```

O usar el script incluido:

```powershell
# Ejecutar PowerShell como Administrador
.\scripts\fix-dns-windows.bat
```

**⚠️ IMPORTANTE**: Esto solo funciona en tu computadora. Otros usuarios seguirán sin poder acceder hasta que el DNS esté configurado correctamente.

## 🔧 Verificaciones Adicionales

### Verificar que Nginx está escuchando correctamente

```bash
sudo ss -tlnp | grep nginx
```

Deberías ver algo como:
```
LISTEN 0 511 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=1234,fd=6))
```

Si ves `144.202.77.18:443` en lugar de `0.0.0.0:443`, ejecuta el script de corrección.

### Verificar que Next.js está corriendo

```bash
pm2 status
```

Deberías ver tu aplicación corriendo en el puerto 3000.

### Verificar firewall

```bash
sudo ufw status
```

Asegúrate de que el puerto 443 esté permitido:
```bash
sudo ufw allow 443/tcp
```

### Ver logs de Nginx

```bash
# Logs de error
sudo tail -f /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log

# Logs de acceso
sudo tail -f /var/log/apache2/domains/visitantes.cyberpol.com.py.log
```

## 📝 Checklist de Solución

- [ ] Ejecutado script de diagnóstico
- [ ] Ejecutado script de corrección de Nginx
- [ ] Verificado/corregido registro DNS A para `visitantes.cyberpol.com.py`
- [ ] Verificado que DNS resuelve correctamente (desde servidores públicos)
- [ ] Verificado que Nginx está escuchando en todas las interfaces
- [ ] Verificado que Next.js está corriendo
- [ ] Verificado que el firewall permite puerto 443
- [ ] Probado acceso desde navegador (esperar propagación DNS si es necesario)

## 🚨 Problemas Comunes

### "El DNS resuelve pero aún no puedo acceder"

1. Verifica que Nginx esté escuchando en todas las interfaces (no solo en la IP específica)
2. Verifica que el firewall permita conexiones en puerto 443
3. Verifica los logs de Nginx para ver errores específicos

### "Puedo acceder por IP pero no por dominio"

Esto es un problema de DNS. Verifica:
1. Que el registro A existe y apunta a la IP correcta
2. Que los servidores de nombres (NS) están configurados correctamente
3. Que has esperado suficiente tiempo para la propagación DNS (puede tardar hasta 48 horas)

### "Nginx da error 502 Bad Gateway"

1. Verifica que Next.js está corriendo: `pm2 status`
2. Verifica que Next.js responde: `curl http://localhost:3000`
3. Verifica que `proxy_pass` apunta a `localhost:3000` (no a la IP externa)

## 📞 Soporte Adicional

Si después de seguir estos pasos aún tienes problemas:

1. Ejecuta el diagnóstico completo y guarda la salida
2. Verifica los logs de Nginx
3. Verifica los logs de PM2: `pm2 logs`
4. Verifica la configuración DNS con herramientas online como:
   - https://www.whatsmydns.net
   - https://dnschecker.org

