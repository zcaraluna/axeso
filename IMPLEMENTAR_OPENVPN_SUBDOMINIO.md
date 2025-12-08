# Implementar OpenVPN en un Nuevo Subdominio

Esta guía explica cómo implementar el control de acceso VPN en un nuevo subdominio (ej: `denuncias.cyberpol.com.py`).

## ✅ Prerequisitos

- OpenVPN ya está configurado y funcionando en el servidor
- El servidor OpenVPN está ejecutándose correctamente
- Los certificados se generan desde `/etc/openvpn/easy-rsa`

## 📋 Pasos de Implementación

### 1. Configurar Variables de Entorno

Edita el archivo `.env` del nuevo subdominio:

```bash
cd /home/cyberpol/web/denuncias.cyberpol.com.py/public_html
nano .env
```

Agrega estas variables:

```env
# Configuración VPN
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED=true
VPN_API_TOKEN=D+/3Wc2iphTmn9NleUolBnygvAzTMXx/dWuapqAj1ZY=
VPN_API_URL=http://localhost:3000
```

**IMPORTANTE**: Ajusta `VPN_API_URL` si el nuevo subdominio corre en un puerto diferente.

### 2. Configurar Nginx para Pasar Headers de IP

Edita la configuración SSL de nginx:

```bash
sudo nano /home/cyberpol/conf/web/denuncias.cyberpol.com.py/nginx.ssl.conf
```

Agrega estas líneas **dentro** de los bloques `location /` y `location @fallback` (después de `proxy_pass`):

```nginx
location / {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:PUERTO;
    
    # Headers para pasar la IP real del cliente (NECESARIO para VPN)
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # ... resto de la configuración
}

location @fallback {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:PUERTO;
    
    # Headers para pasar la IP real del cliente (NECESARIO para VPN)
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Reemplaza `PUERTO`** con el puerto donde corre la aplicación (ej: 3000, 3001, etc.)

Recargar nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Verificar que el Middleware Existe

Asegúrate de que el archivo `middleware.ts` existe en la raíz del proyecto:

```bash
ls -la middleware.ts
```

Si no existe, cópialo desde el otro proyecto o créalo con el contenido correcto.

### 4. Reconstruir la Aplicación

```bash
cd /home/cyberpol/web/denuncias.cyberpol.com.py/public_html
rm -rf .next
npm run build
pm2 restart NOMBRE_PROCESO --update-env
```

**Reemplaza `NOMBRE_PROCESO`** con el nombre del proceso PM2 para este subdominio.

### 5. Verificar que Funciona

1. **Sin VPN**: Intenta acceder a `https://denuncias.cyberpol.com.py/dashboard`
   - Deberías ser redirigido a `/vpn-setup` con el mensaje de acceso no autorizado

2. **Con VPN**: Conecta el VPN y accede nuevamente
   - Deberías poder acceder normalmente

3. **Verificar logs**:
   ```bash
   pm2 logs NOMBRE_PROCESO | grep "VPN Middleware"
   ```

## 🔧 Configuración del Servidor OpenVPN (Ya Hecho)

El servidor OpenVPN ya está configurado. Solo necesitas:

### Generar Certificados para el Nuevo Subdominio

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn
sudo ./generate-certificate.sh denuncias-pc-01 "" 365
```

El certificado se generará en: `/etc/openvpn/client-configs/denuncias-pc-01.ovpn`

### Configuración del Servidor OpenVPN

El servidor ya está configurado en `/etc/openvpn/server.conf` con:

```
port 1194
proto tcp
# ... resto de la configuración
# IMPORTANTE: user nobody y group nogroup están comentados
```

**NOTA**: El servidor OpenVPN debe ejecutarse como root (sin `user nobody`) para poder aceptar conexiones.

## ⚠️ Problemas Comunes y Soluciones

### El middleware no bloquea el acceso

1. Verificar que `VPN_REQUIRED=true` en `.env`
2. Verificar que nginx está pasando los headers `X-Real-IP` y `X-Forwarded-For`
3. Reconstruir la aplicación: `rm -rf .next && npm run build`
4. Reiniciar PM2: `pm2 restart NOMBRE_PROCESO --update-env`

### Los paquetes llegan pero OpenVPN no responde

1. Verificar que OpenVPN está ejecutándose: `sudo systemctl status openvpn@server`
2. Verificar que `user nobody` y `group nogroup` están comentados en `/etc/openvpn/server.conf`
3. Verificar reglas de iptables: `sudo iptables -L INPUT -n -v | grep 1194`

### El cliente no se puede conectar

1. Verificar que el archivo `.ovpn` tiene la IP correcta del servidor
2. Verificar que el puerto es correcto (1194 TCP)
3. Verificar que el certificado no está revocado
4. Verificar que el firewall del proveedor permite el puerto 1194

## 📝 Notas Importantes

- **Un solo servidor OpenVPN**: Todos los subdominios comparten el mismo servidor OpenVPN
- **Mismo rango VPN**: Todos usan el rango `10.8.0.0/24`
- **Certificados por computadora**: Los certificados son por computadora/dispositivo, no por usuario
- **Middleware compartido**: El mismo middleware funciona para todos los subdominios

## 🔐 Seguridad

- El servidor OpenVPN debe ejecutarse como root (común en servidores)
- Los certificados deben transferirse de forma segura
- El archivo `.ovpn` contiene credenciales sensibles
- Las reglas de iptables deben guardarse permanentemente


