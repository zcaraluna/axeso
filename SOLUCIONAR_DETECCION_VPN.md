# Solucionar Problema de Detección VPN en visitantes.cyberpol.com.py

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Ejecutar Script de Diagnóstico

En el servidor, ejecuta:

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
sudo bash scripts/vpn/diagnosticar-vpn-visitantes.sh TU_IP_PUBLICA
```

**Reemplaza `TU_IP_PUBLICA` con tu IP pública actual** (puedes obtenerla con `curl ifconfig.me`).

Este script verificará:
- ✅ Si el archivo de estado existe y tiene permisos
- ✅ El formato del archivo
- ✅ Si tu IP aparece en el archivo
- ✅ Variables de entorno configuradas
- ✅ Endpoint de verificación funcionando

### Paso 2: Verificar IP Detectada

Accede a la página de debug desde tu navegador (con VPN conectado):

```
https://visitantes.cyberpol.com.py/api/debug-ip
```

Esto mostrará:
- `detectedIp`: La IP que detecta el sistema
- `isVpnConnected`: Si detecta la conexión VPN
- `vpnStatusInfo`: Información detallada del archivo de estado

### Paso 3: Verificar Archivo de Estado Manualmente

```bash
# Ver contenido completo del archivo
sudo cat /var/log/openvpn-status.log

# Buscar tu IP específica
sudo grep "TU_IP_PUBLICA" /var/log/openvpn-status.log

# Ver formato de las líneas con tu IP
sudo grep "TU_IP_PUBLICA" /var/log/openvpn-status.log | head -5
```

### Paso 4: Verificar Logs de la Aplicación

```bash
# Ver logs recientes
pm2 logs axeso --lines 100

# Buscar logs relacionados con VPN
pm2 logs axeso --lines 200 | grep -i "vpn\|middleware"
```

## 🐛 Problemas Comunes y Soluciones

### Problema 1: IP no aparece en el archivo de estado

**Síntomas:**
- El script de diagnóstico muestra "IP NO encontrada"
- `isVpnConnected: false` en `/api/debug-ip`

**Soluciones:**

1. **Verificar que OpenVPN está corriendo:**
   ```bash
   sudo systemctl status openvpn@server
   ```

2. **Verificar que estás conectado a la VPN:**
   ```bash
   # En tu computadora, verifica tu IP pública
   curl ifconfig.me
   
   # Debe ser diferente a tu IP normal
   ```

3. **Verificar configuración de OpenVPN:**
   ```bash
   sudo grep "^status" /etc/openvpn/server.conf
   # Debe mostrar: status /var/log/openvpn-status.log 10
   ```

4. **Reiniciar OpenVPN si es necesario:**
   ```bash
   sudo systemctl restart openvpn@server
   ```

### Problema 2: IP detectada incorrectamente

**Síntomas:**
- `detectedIp` en `/api/debug-ip` no coincide con tu IP pública
- El sistema busca una IP diferente en el archivo

**Soluciones:**

1. **Verificar headers de Nginx:**
   ```bash
   # Ver configuración de Nginx para visitantes.cyberpol.com.py
   sudo cat /home/cyberpol/web/visitantes.cyberpol.com.py/nginx.conf
   sudo cat /home/cyberpol/web/visitantes.cyberpol.com.py/nginx.ssl.conf
   ```

2. **Debe tener estos headers:**
   ```nginx
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```

3. **Si falta, agregar y reiniciar Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

### Problema 3: Formato del archivo diferente

**Síntomas:**
- El archivo existe pero el parsing no funciona
- Logs muestran "IP encontrada" pero `isActive: false`

**Solución:**

El código ahora maneja diferentes formatos, pero si el formato es muy diferente, puedes verificar:

```bash
# Ver formato exacto del archivo
sudo head -50 /var/log/openvpn-status.log

# Comparar con el formato esperado:
# OpenVPN CLIENT LIST
# Updated,2025-12-15 22:30:45
# Common Name,Real Address,Virtual Address,Bytes Received,Bytes Sent,Connected Since
# cliente1,181.91.85.248:12345,10.8.0.2,12345,67890,2025-12-15 22:25:30
```

Si el formato es diferente, puede ser necesario ajustar el código de parsing.

### Problema 4: Variables de entorno incorrectas

**Síntomas:**
- `VPN_REQUIRED_DOMAINS` no incluye el dominio
- `VPN_API_URL` apunta al puerto incorrecto

**Solución:**

1. **Verificar archivo .env:**
   ```bash
   cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
   cat .env | grep VPN
   ```

2. **Debe tener:**
   ```env
   VPN_REQUIRED=true
   VPN_RANGE=10.8.0.0/24
   VPN_REQUIRED_DOMAINS=visitantes.cyberpol.com.py
   VPN_API_URL=http://localhost:3000
   VPN_API_TOKEN=TU_TOKEN_AQUI
   NEXT_PUBLIC_SITE_URL=https://visitantes.cyberpol.com.py
   ```

3. **Si falta algo, agregar y reiniciar:**
   ```bash
   pm2 restart axeso --update-env
   ```

### Problema 5: Timeout en verificación

**Síntomas:**
- Logs muestran "AbortError" o timeout
- `isVpnConnected` siempre es `false`

**Solución:**

1. **Verificar que la aplicación responde:**
   ```bash
   curl http://localhost:3000/api/vpn/check-status?realIp=TU_IP
   ```

2. **Si no responde, verificar que la app está corriendo:**
   ```bash
   pm2 status
   pm2 logs axeso --lines 50
   ```

## 🔧 Mejoras Implementadas

### 1. Parsing Mejorado

El código ahora maneja:
- IPs con puerto: `181.91.85.248:12345`
- IPs sin puerto: `181.91.85.248`
- Diferentes formatos de secciones

### 2. Logging Mejorado

Se agregaron logs detallados para:
- Cuando se encuentra una IP en CLIENT LIST
- Cuando se encuentra una IP en ROUTING TABLE
- Estado de la conexión (activa/inactiva)
- Información de debugging

### 3. Script de Diagnóstico

El script `diagnosticar-vpn-visitantes.sh` verifica:
- Archivo de estado
- Formato del archivo
- Variables de entorno
- Endpoint de verificación
- Configuración de OpenVPN

## 📋 Checklist de Verificación

Ejecuta estos comandos en orden:

```bash
# 1. Verificar archivo de estado
sudo ls -lh /var/log/openvpn-status.log
sudo cat /var/log/openvpn-status.log | head -30

# 2. Verificar tu IP en el archivo
TU_IP=$(curl -s ifconfig.me)
sudo grep "$TU_IP" /var/log/openvpn-status.log

# 3. Verificar variables de entorno
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
cat .env | grep VPN

# 4. Probar endpoint directamente
API_URL=$(grep VPN_API_URL .env | cut -d'=' -f2 | tr -d '"')
curl "$API_URL/api/vpn/check-status?realIp=$TU_IP" | jq .

# 5. Ver logs de la aplicación
pm2 logs axeso --lines 100 | grep -i vpn

# 6. Ejecutar script de diagnóstico completo
sudo bash scripts/vpn/diagnosticar-vpn-visitantes.sh "$TU_IP"
```

## 🚀 Próximos Pasos

1. **Ejecuta el script de diagnóstico** con tu IP pública
2. **Revisa los resultados** y identifica el problema
3. **Aplica la solución** correspondiente
4. **Verifica** accediendo a `/api/debug-ip` con VPN conectado
5. **Si persiste el problema**, comparte los resultados del diagnóstico

## 📞 Información para Debugging

Si necesitas ayuda adicional, comparte:

1. **Salida del script de diagnóstico:**
   ```bash
   sudo bash scripts/vpn/diagnosticar-vpn-visitantes.sh TU_IP > diagnostico.txt 2>&1
   cat diagnostico.txt
   ```

2. **Salida de `/api/debug-ip`:**
   ```bash
   curl https://visitantes.cyberpol.com.py/api/debug-ip | jq .
   ```

3. **Primeras 50 líneas del archivo de estado:**
   ```bash
   sudo head -50 /var/log/openvpn-status.log
   ```

4. **Logs de la aplicación:**
   ```bash
   pm2 logs axeso --lines 100 | grep -i "vpn\|middleware\|status"
   ```

