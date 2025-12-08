# Guía Rápida de Implementación - OpenVPN (Opción A)

## ✅ Requisitos Confirmados

- **Opción A**: VPN obligatorio para todos los usuarios
- **Generación**: Manual por administrador
- **Asignación**: Por computadora/dispositivo (no por usuario individual)
- **Acceso**: Todos deben estar conectados a VPN para acceder

## 📋 Checklist de Implementación Rápida

### Fase 1: Preparación del Servidor (30-45 minutos)

#### 1.1 Instalar OpenVPN y dependencias

```bash
sudo apt update
sudo apt install -y openvpn easy-rsa
```

#### 1.2 Configurar easy-rsa (UNA SOLA VEZ)

```bash
cd /ruta/al/proyecto/scripts/vpn
sudo chmod +x setup-easy-rsa.sh
sudo ./setup-easy-rsa.sh
```

**⚠️ IMPORTANTE**: Guarda la contraseña de la CA en un lugar seguro.

#### 1.3 Configurar OpenVPN Server

Crear archivo de configuración:

```bash
sudo nano /etc/openvpn/server.conf
```

Contenido mínimo:

```
port 1194
proto udp
dev tun
ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh.pem
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
crl-verify /etc/openvpn/crl.pem
```

#### 1.4 Habilitar IP Forwarding

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 1.5 Configurar Firewall

```bash
sudo ufw allow 1194/udp
sudo ufw allow OpenSSH
sudo ufw enable
```

#### 1.6 Iniciar OpenVPN

```bash
sudo systemctl enable openvpn@server
sudo systemctl start openvpn@server
sudo systemctl status openvpn@server
```

### Fase 2: Base de Datos (5 minutos)

#### 2.1 Ejecutar Migración

```bash
cd /ruta/al/proyecto
npx prisma migrate dev --name add_vpn_tables
npx prisma generate
```

### Fase 3: Configuración de la Aplicación (5 minutos)

#### 3.1 Variables de Entorno

Editar `.env`:

```env
# VPN - Configuración
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED=true  # ✅ ACTIVAR VPN OBLIGATORIO
VPN_API_TOKEN=tu_token_secreto_aqui  # Generar con: openssl rand -base64 32
VPN_API_URL=http://localhost:3000
```

#### 3.2 Reiniciar Aplicación

```bash
pm2 restart axeso
# o si estás en desarrollo:
npm run dev
```

### Fase 4: Generar Certificados para Computadoras (Por cada computadora)

#### 4.1 Identificar Computadoras

Lista las computadoras que necesitan certificados:
- Recepción - PC 01
- Recepción - PC 02
- Oficina Administrativa - PC 01
- etc.

#### 4.2 Generar Certificado (Por cada computadora)

```bash
cd /ruta/al/proyecto/scripts/vpn
sudo chmod +x generate-certificate.sh

# Ejemplo para computadora de recepción
sudo ./generate-certificate.sh recepcion-pc-01 "" 365
```

**Formato**: `./generate-certificate.sh <nombre-certificado> <user_id_opcional> <dias>`

- `nombre-certificado`: Identificador único (ej: `recepcion-pc-01`)
- `user_id`: Dejar vacío `""` si no se asigna a usuario específico
- `dias`: Validez del certificado (365 = 1 año)

#### 4.3 Registrar en Base de Datos

**Opción A: Usar Interfaz Web** (Recomendado)
1. Acceder como admin a `/vpn`
2. Click en "Crear Certificado"
3. Completar:
   - **Nombre del Certificado**: `recepcion-pc-01` (debe coincidir con el generado)
   - **Nombre del Dispositivo**: `Recepción - PC 01`
   - **Ubicación**: `Recepción Principal`
   - **Validez**: 365 días
   - **Notas**: `Computadora de recepción principal`

**Opción B: Usar API**

```bash
curl -X POST http://localhost:3000/api/vpn/certificates \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateName": "recepcion-pc-01",
    "deviceName": "Recepción - PC 01",
    "location": "Recepción Principal",
    "validityDays": 365,
    "notes": "Computadora de recepción principal"
  }'
```

#### 4.4 Obtener Archivo .ovpn

El archivo estará en:
```
/etc/openvpn/client-configs/recepcion-pc-01.ovpn
```

**Transferir de forma segura** al dispositivo (USB, email encriptado, etc.)

### Fase 5: Instalar en Computadoras Cliente

#### 5.1 Instalar Cliente OpenVPN

**Windows:**
- Descargar desde: https://openvpn.net/community-downloads/
- Instalar y reiniciar

**Linux:**
```bash
sudo apt install openvpn
```

#### 5.2 Importar Certificado

**Windows:**
- Copiar archivo `.ovpn` a: `C:\Program Files\OpenVPN\config\`
- O hacer doble clic en el archivo `.ovpn`

**Linux:**
```bash
sudo cp recepcion-pc-01.ovpn /etc/openvpn/client/
```

#### 5.3 Conectar

**Windows:**
- Click derecho en icono de OpenVPN en la bandeja del sistema
- Seleccionar el perfil y "Connect"

**Linux:**
```bash
sudo systemctl start openvpn@client
# o
sudo openvpn --config /etc/openvpn/client/recepcion-pc-01.ovpn
```

### Fase 6: Verificación

#### 6.1 Verificar Conexión VPN

```bash
# En el servidor, ver conexiones activas
sudo cat /var/log/openvpn-status.log
```

#### 6.2 Probar Acceso a la Aplicación

1. Conectar VPN en la computadora cliente
2. Abrir navegador
3. Intentar acceder a la aplicación
4. Debe funcionar normalmente

Si no funciona:
- Verificar que `VPN_REQUIRED=true` en `.env`
- Verificar que la IP esté en el rango `10.8.0.0/24`
- Revisar logs: `sudo journalctl -u openvpn@server -n 50`

## 🔧 Comandos Útiles

### Ver Certificados Generados

```bash
ls -la /etc/openvpn/easy-rsa/pki/issued/
```

### Ver Archivos .ovpn

```bash
ls -la /etc/openvpn/client-configs/
```

### Revocar Certificado

```bash
cd /ruta/al/proyecto/scripts/vpn
sudo ./revoke-certificate.sh recepcion-pc-01
```

Luego actualizar en la interfaz web `/vpn` o usar API.

### Ver Logs de OpenVPN

```bash
sudo tail -f /var/log/openvpn.log
```

### Reiniciar OpenVPN

```bash
sudo systemctl restart openvpn@server
```

## 📊 Monitoreo

### Ver Conexiones Activas

```bash
sudo cat /var/log/openvpn-status.log
```

### Ver en la Interfaz Web

Acceder a `/vpn` como administrador para ver:
- Lista de certificados
- Estado de cada certificado
- Última conexión
- Historial de conexiones

## ⚠️ Importante

1. **Backup de la CA**: Si pierdes `/etc/openvpn/easy-rsa/pki/ca.crt` y la clave, todos los certificados serán inválidos
2. **Seguridad del .ovpn**: Los archivos `.ovpn` contienen credenciales. Transferir de forma segura
3. **Rotación**: Renovar certificados antes de que expiren
4. **Revocación**: Si una computadora es comprometida, revocar inmediatamente

## 🆘 Solución Rápida de Problemas

### No puedo conectarme a la VPN

```bash
# Verificar que OpenVPN esté corriendo
sudo systemctl status openvpn@server

# Ver logs
sudo journalctl -u openvpn@server -n 50
```

### La aplicación no permite acceso sin VPN

Verificar en `.env`:
```env
VPN_REQUIRED=true
VPN_RANGE=10.8.0.0/24
```

### El certificado no funciona

1. Verificar que el certificado no esté revocado
2. Verificar fecha de expiración
3. Regenerar si es necesario

## 📝 Lista de Computadoras

Mantén un registro de las computadoras con certificados:

| Certificado | Dispositivo | Ubicación | Fecha Emisión | Expiración | Estado |
|------------|-------------|-----------|---------------|------------|--------|
| recepcion-pc-01 | Recepción - PC 01 | Recepción Principal | 2024-01-15 | 2025-01-15 | Activo |
| recepcion-pc-02 | Recepción - PC 02 | Recepción Principal | 2024-01-15 | 2025-01-15 | Activo |
| ... | ... | ... | ... | ... | ... |

## ✅ Checklist Final

- [ ] OpenVPN instalado y configurado
- [ ] CA creada y respaldada
- [ ] Servidor OpenVPN corriendo
- [ ] Firewall configurado
- [ ] Migración de base de datos ejecutada
- [ ] Variables de entorno configuradas
- [ ] `VPN_REQUIRED=true` activado
- [ ] Certificados generados para todas las computadoras
- [ ] Certificados registrados en la base de datos
- [ ] Archivos .ovpn transferidos a las computadoras
- [ ] Cliente OpenVPN instalado en computadoras
- [ ] Conexión VPN probada
- [ ] Acceso a la aplicación verificado

## 🚀 Tiempo Estimado Total

- **Configuración inicial del servidor**: 30-45 minutos
- **Por cada computadora**: 10-15 minutos (generar + instalar)
- **Total para 5 computadoras**: ~2 horas


