# Scripts de Gestión de OpenVPN

Este directorio contiene scripts para gestionar certificados y conexiones OpenVPN.

## Configuración Inicial

### 1. Configurar easy-rsa

Ejecuta una sola vez para inicializar la Autoridad Certificadora (CA):

```bash
sudo chmod +x scripts/vpn/setup-easy-rsa.sh
sudo ./scripts/vpn/setup-easy-rsa.sh
```

**IMPORTANTE**: Guarda de forma segura la contraseña de la CA que se te pedirá.

### 2. Configurar OpenVPN Server

Asegúrate de que tu archivo `/etc/openvpn/server.conf` incluya:

```
port 1194
proto udp
dev tun
ca ca.crt
cert server.crt
key server.key
dh dh.pem
server 10.8.0.0 255.255.255.0
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
keepalive 10 120
cipher AES-256-CBC
auth SHA256
comp-lzo
user nobody
group nogroup
persist-key
persist-tun
status /var/log/openvpn-status.log
log /var/log/openvpn.log
verb 3
crl-verify crl.pem
client-connect "/usr/bin/node /ruta/completa/al/proyecto/scripts/vpn/register-connection.ts"
```

## Uso de los Scripts

### Generar un Certificado

```bash
sudo chmod +x scripts/vpn/generate-certificate.sh
sudo ./scripts/vpn/generate-certificate.sh <nombre_certificado> <user_id> [dias_validez]
```

Ejemplo:
```bash
sudo ./scripts/vpn/generate-certificate.sh usuario1 clxxxxxxxxxxxxx 365
```

Esto generará:
- Certificado en `/etc/openvpn/easy-rsa/pki/issued/<nombre>.crt`
- Clave privada en `/etc/openvpn/easy-rsa/pki/private/<nombre>.key`
- Archivo .ovpn en `/etc/openvpn/client-configs/<nombre>.ovpn`

**Después de generar el certificado**, debes registrarlo en la base de datos usando la API o la interfaz web de administración.

### Revocar un Certificado

```bash
sudo chmod +x scripts/vpn/revoke-certificate.sh
sudo ./scripts/vpn/revoke-certificate.sh <nombre_certificado>
```

Ejemplo:
```bash
sudo ./scripts/vpn/revoke-certificate.sh usuario1
```

Esto:
- Revoca el certificado en la CA
- Actualiza la lista de revocación (CRL)
- Reinicia OpenVPN para aplicar los cambios

**Después de revocar**, actualiza el estado en la base de datos usando la API o la interfaz web.

### Registrar Conexiones

El script `register-connection.ts` se ejecuta automáticamente cuando un cliente se conecta a la VPN (usando el hook `client-connect` de OpenVPN).

Para que funcione, necesitas:

1. **Configurar variables de entorno** en el sistema o en el servicio de OpenVPN:

```bash
# En /etc/systemd/system/openvpn@server.service.d/override.conf
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=tu_token_secreto_aqui"
```

2. **Instalar Node.js** en el servidor si no está instalado

3. **Compilar TypeScript** o usar ts-node:

```bash
npm install -g ts-node
```

O compilar el script:
```bash
npx tsc scripts/vpn/register-connection.ts
```

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Rango de IPs de la VPN (por defecto 10.8.0.0/24)
VPN_RANGE=10.8.0.0/24

# Habilitar verificación VPN (true/false)
VPN_REQUIRED=true

# Token para la API de conexiones VPN
VPN_API_TOKEN=tu_token_secreto_muy_largo_y_seguro

# URL de la API (para el script de registro)
VPN_API_URL=http://localhost:3000
```

## Seguridad

⚠️ **IMPORTANTE**:

1. **Protege los archivos de clave privada**: Solo root debe tener acceso
2. **Protege la contraseña de la CA**: Guárdala en un lugar seguro
3. **Haz backup de la CA**: Si pierdes la CA, todos los certificados serán inválidos
4. **Rota certificados periódicamente**: Renueva certificados antes de que expiren
5. **Monitorea conexiones**: Revisa regularmente quién se conecta a la VPN
6. **Revoca inmediatamente**: Si un certificado es comprometido, revócalo de inmediato

## Backup

Haz backup regular de:

```bash
/etc/openvpn/easy-rsa/pki/        # Toda la PKI
/etc/openvpn/ca.crt                # Certificado de la CA
/etc/openvpn/server.crt             # Certificado del servidor
/etc/openvpn/server.key             # Clave del servidor (MUY SENSIBLE)
/etc/openvpn/dh.pem                 # Parámetros Diffie-Hellman
```

## Solución de Problemas

### El certificado no se puede generar

- Verifica que easy-rsa esté configurado correctamente
- Verifica permisos en `/etc/openvpn/easy-rsa/`
- Verifica que el nombre del certificado no esté en uso

### Las conexiones no se registran

- Verifica que el hook `client-connect` esté configurado en `server.conf`
- Verifica que Node.js esté instalado y accesible
- Verifica las variables de entorno `VPN_API_URL` y `VPN_API_TOKEN`
- Revisa los logs de OpenVPN: `sudo journalctl -u openvpn@server -f`

### El certificado revocado aún puede conectarse

- Verifica que `crl-verify crl.pem` esté en `server.conf`
- Reinicia OpenVPN: `sudo systemctl restart openvpn@server`
- Verifica que el CRL esté actualizado: `openssl crl -in /etc/openvpn/crl.pem -text -noout`


