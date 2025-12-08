# Requisitos para Implementar OpenVPN - Resumen Ejecutivo

## ✅ Configuración Confirmada

- **Opción**: A - VPN obligatorio para todos
- **Generación**: Manual por administrador
- **Asignación**: Por computadora/dispositivo (no por usuario)
- **Acceso**: Todos deben estar conectados a VPN

## 📦 Lo que Necesitas Tener Listo

### 1. Servidor con Acceso Root/Sudo

- Ubuntu 20.04+ o Debian 11+
- Acceso SSH con permisos sudo
- Mínimo 1GB RAM adicional para OpenVPN
- Puerto UDP 1194 disponible (o TCP 443 como alternativa)

### 2. Lista de Computadoras

Prepara una lista de todas las computadoras que necesitan certificados:

| # | Nombre Certificado | Dispositivo | Ubicación | Responsable |
|---|-------------------|-------------|-----------|-------------|
| 1 | recepcion-pc-01 | Recepción - PC 01 | Recepción Principal | - |
| 2 | recepcion-pc-02 | Recepción - PC 02 | Recepción Principal | - |
| 3 | oficina-admin-01 | Oficina Admin - PC 01 | Oficina Administrativa | - |
| ... | ... | ... | ... | ... |

### 3. Acceso a la Base de Datos

- PostgreSQL corriendo
- Credenciales de acceso
- Permisos para crear tablas

### 4. Tiempo Estimado

- **Configuración inicial**: 30-45 minutos
- **Por cada computadora**: 10-15 minutos
- **Total para 5 computadoras**: ~2 horas

## 🚀 Pasos Rápidos (Resumen)

### Paso 1: Migración de Base de Datos (5 min)

```bash
npx prisma migrate dev --name add_vpn_tables
npx prisma generate
```

### Paso 2: Configurar Variables de Entorno (2 min)

Editar `.env`:
```env
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED=true
VPN_API_TOKEN=$(openssl rand -base64 32)
VPN_API_URL=http://localhost:3000
```

### Paso 3: Instalar OpenVPN en el Servidor (30 min)

```bash
sudo apt update
sudo apt install -y openvpn easy-rsa
cd scripts/vpn
sudo ./setup-easy-rsa.sh
# Configurar /etc/openvpn/server.conf
sudo systemctl start openvpn@server
```

### Paso 4: Generar Certificados (10-15 min por computadora)

```bash
# Por cada computadora:
sudo ./scripts/vpn/generate-certificate.sh recepcion-pc-01 "" 365

# Registrar en la interfaz web /vpn
```

### Paso 5: Instalar en Computadoras Cliente (10 min por computadora)

1. Instalar cliente OpenVPN
2. Copiar archivo .ovpn
3. Conectar a VPN
4. Probar acceso a la aplicación

## 📋 Checklist de Implementación

### Pre-requisitos
- [ ] Servidor con Ubuntu/Debian
- [ ] Acceso root/sudo
- [ ] PostgreSQL corriendo
- [ ] Lista de computadoras preparada
- [ ] Cliente OpenVPN descargado para cada computadora

### Configuración del Servidor
- [ ] OpenVPN instalado
- [ ] easy-rsa configurado
- [ ] CA creada y respaldada
- [ ] Servidor OpenVPN configurado
- [ ] Firewall configurado
- [ ] OpenVPN corriendo

### Base de Datos
- [ ] Migración ejecutada
- [ ] Tablas VPN creadas

### Aplicación
- [ ] Variables de entorno configuradas
- [ ] VPN_REQUIRED=true activado
- [ ] Aplicación reiniciada

### Certificados
- [ ] Certificado generado para cada computadora
- [ ] Certificados registrados en la base de datos
- [ ] Archivos .ovpn transferidos a las computadoras

### Instalación en Clientes
- [ ] Cliente OpenVPN instalado en cada computadora
- [ ] Certificados importados
- [ ] Conexión VPN probada
- [ ] Acceso a la aplicación verificado

## 📚 Documentación Disponible

1. **GUIA_RAPIDA_IMPLEMENTACION.md** - Guía paso a paso detallada
2. **OPENVPN_INTEGRACION.md** - Documentación técnica completa
3. **OPENVPN_PASOS_SIGUIENTES.md** - Guía extendida con troubleshooting
4. **scripts/vpn/README.md** - Documentación de scripts

## 🆘 Si Necesitas Ayuda

### Problemas Comunes

1. **No puedo conectarme a la VPN**
   - Verificar que OpenVPN esté corriendo: `sudo systemctl status openvpn@server`
   - Ver logs: `sudo journalctl -u openvpn@server -n 50`

2. **La aplicación no permite acceso**
   - Verificar `VPN_REQUIRED=true` en `.env`
   - Verificar que la IP esté en el rango `10.8.0.0/24`

3. **El certificado no funciona**
   - Verificar que no esté revocado
   - Verificar fecha de expiración
   - Regenerar si es necesario

## ⚠️ Importante

1. **Backup de la CA**: Si pierdes la CA, todos los certificados serán inválidos
2. **Seguridad**: Los archivos .ovpn contienen credenciales - transferir de forma segura
3. **Rotación**: Renovar certificados antes de que expiren
4. **Revocación**: Si una computadora es comprometida, revocar inmediatamente

## 📞 Siguiente Paso

**Lee y sigue la guía completa en: `GUIA_RAPIDA_IMPLEMENTACION.md`**


