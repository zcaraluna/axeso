# Próximos Pasos para Implementar OpenVPN

## ✅ Lo que ya está implementado

1. **Esquema de Base de Datos**: Tablas para certificados VPN y conexiones
2. **API Endpoints**: Endpoints REST para gestionar certificados y conexiones
3. **Middleware de Verificación**: Verifica que los usuarios estén conectados a VPN
4. **Interfaz de Administración**: Panel para gestionar certificados VPN (`/vpn`)
5. **Páginas de Usuario**: Instrucciones y verificación de conexión VPN
6. **Scripts de Gestión**: Scripts para generar y revocar certificados

## 📋 Pasos para Activar OpenVPN

### Paso 1: Crear la Migración de Base de Datos

Ejecuta la migración de Prisma para crear las nuevas tablas:

```bash
npx prisma migrate dev --name add_vpn_tables
npx prisma generate
```

### Paso 2: Configurar Variables de Entorno

Edita tu archivo `.env` y agrega:

```env
# Configuración VPN
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED=false  # Cambiar a true cuando OpenVPN esté configurado
VPN_API_TOKEN=tu_token_secreto_aqui  # Generar con: openssl rand -base64 32
VPN_API_URL=http://localhost:3000
```

### Paso 3: Instalar y Configurar OpenVPN en el Servidor

#### 3.1 Instalar OpenVPN y easy-rsa

```bash
sudo apt update
sudo apt install openvpn easy-rsa -y
```

#### 3.2 Configurar easy-rsa (una sola vez)

```bash
cd scripts/vpn
sudo chmod +x setup-easy-rsa.sh
sudo ./setup-easy-rsa.sh
```

**IMPORTANTE**: Guarda la contraseña de la CA en un lugar seguro.

#### 3.3 Configurar el Servidor OpenVPN

Crea el archivo `/etc/openvpn/server.conf`:

```bash
sudo nano /etc/openvpn/server.conf
```

Contenido básico:

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

**Ajusta la ruta en `client-connect`** según la ubicación de tu proyecto.

#### 3.4 Habilitar IP Forwarding

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 3.5 Configurar Firewall

```bash
sudo ufw allow 1194/udp
sudo ufw allow OpenSSH
sudo ufw enable
```

#### 3.6 Iniciar OpenVPN

```bash
sudo systemctl enable openvpn@server
sudo systemctl start openvpn@server
sudo systemctl status openvpn@server
```

### Paso 4: Generar Certificados de Prueba

#### 4.1 Obtener un ID de usuario de la base de datos

```bash
# Conectarse a PostgreSQL
sudo -u postgres psql controldeacceso

# Listar usuarios
SELECT id, username, nombres, apellidos FROM users;
```

#### 4.2 Generar certificado

```bash
cd scripts/vpn
sudo chmod +x generate-certificate.sh
sudo ./generate-certificate.sh usuario1 clxxxxxxxxxxxxx 365
```

Reemplaza:
- `usuario1`: Nombre del certificado
- `clxxxxxxxxxxxxx`: ID del usuario de la base de datos

#### 4.3 Registrar certificado en la base de datos

Usa la interfaz web en `/vpn` o la API:

```bash
curl -X POST http://localhost:3000/api/vpn/certificates \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateName": "usuario1",
    "targetUserId": "clxxxxxxxxxxxxx",
    "validityDays": 365,
    "notes": "Certificado de prueba"
  }'
```

### Paso 5: Probar la Conexión

1. **Obtener el archivo .ovpn**: Está en `/etc/openvpn/client-configs/usuario1.ovpn`
2. **Transferir al cliente**: Usa un método seguro (USB, email encriptado, etc.)
3. **Importar en cliente OpenVPN**: Sigue las instrucciones en `/vpn-instructions`
4. **Conectarse**: Inicia la conexión VPN
5. **Verificar**: Intenta acceder a la aplicación web

### Paso 6: Activar Verificación VPN

Una vez que todo funcione, activa la verificación en `.env`:

```env
VPN_REQUIRED=true
```

Reinicia la aplicación:

```bash
pm2 restart axeso
# o
npm run dev
```

## 🔧 Configuración Adicional

### Registrar Conexiones Automáticamente

Para que las conexiones se registren automáticamente en la base de datos:

1. **Instalar Node.js** en el servidor (si no está instalado)
2. **Compilar el script TypeScript**:

```bash
npx tsc scripts/vpn/register-connection.ts
```

O usar ts-node:

```bash
npm install -g ts-node
```

3. **Verificar que el hook funcione**: Revisa los logs de OpenVPN:

```bash
sudo journalctl -u openvpn@server -f
```

### Agregar Enlace en el Dashboard

Agrega un enlace a la gestión de VPN en el dashboard (solo para admins):

Edita `app/dashboard/page.tsx` y agrega:

```tsx
{user.role === 'admin' && (
  <Link href="/vpn" className="...">
    Gestión VPN
  </Link>
)}
```

## 📊 Monitoreo

### Ver Conexiones Activas

```bash
sudo cat /var/log/openvpn-status.log
```

### Ver Logs de OpenVPN

```bash
sudo tail -f /var/log/openvpn.log
```

### Ver Conexiones en la Base de Datos

Usa la interfaz web en `/vpn` o consulta directamente:

```sql
SELECT * FROM vpn_connections ORDER BY connected_at DESC LIMIT 10;
```

## ⚠️ Consideraciones de Seguridad

1. **Protege los archivos de clave**: Solo root debe tener acceso
2. **Haz backup de la CA**: Si la pierdes, todos los certificados serán inválidos
3. **Rota certificados**: Renueva antes de que expiren
4. **Monitorea conexiones**: Revisa regularmente quién se conecta
5. **Revoca inmediatamente**: Si un certificado es comprometido

## 🆘 Solución de Problemas

### El certificado no se puede generar

- Verifica permisos en `/etc/openvpn/easy-rsa/`
- Verifica que easy-rsa esté configurado
- Verifica que el nombre no esté en uso

### No puedo conectarme a la VPN

- Verifica que OpenVPN esté corriendo: `sudo systemctl status openvpn@server`
- Verifica el firewall: `sudo ufw status`
- Verifica los logs: `sudo journalctl -u openvpn@server -n 50`

### La aplicación no verifica la VPN

- Verifica que `VPN_REQUIRED=true` en `.env`
- Verifica que `VPN_RANGE` sea correcto
- Verifica los headers de la request (puede necesitar configuración en nginx)

### Las conexiones no se registran

- Verifica que el hook `client-connect` esté en `server.conf`
- Verifica que Node.js esté instalado
- Verifica las variables de entorno `VPN_API_URL` y `VPN_API_TOKEN`
- Revisa los logs de OpenVPN

## 📚 Documentación Adicional

- [Documentación de OpenVPN](https://openvpn.net/community-resources/)
- [Guía de configuración](https://www.digitalocean.com/community/tutorials/how-to-set-up-an-openvpn-server-on-ubuntu-20-04)
- Ver `OPENVPN_INTEGRACION.md` para más detalles sobre la arquitectura


