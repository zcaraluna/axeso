# Integración de OpenVPN - Sistema de Control de Acceso

## ¿Qué es OpenVPN y por qué integrarlo?

OpenVPN es una solución de VPN (Red Privada Virtual) de código abierto que permite crear conexiones seguras y encriptadas entre clientes y servidores. En el contexto de un sistema de control de acceso para la Policía Nacional, integrar OpenVPN puede proporcionar:

1. **Acceso remoto seguro**: Personal autorizado puede acceder al sistema desde ubicaciones remotas de forma segura
2. **Control de acceso a nivel de red**: Solo usuarios conectados a la VPN pueden acceder a la aplicación
3. **Encriptación de tráfico**: Todo el tráfico entre cliente y servidor está encriptado
4. **Auditoría de conexiones**: Registro de quién se conecta y cuándo
5. **Cumplimiento de seguridad**: Cumple con estándares de seguridad para instituciones gubernamentales

## Consideraciones Importantes

### 1. Arquitectura del Sistema

**Opciones de Implementación:**

#### Opción A: OpenVPN como Requisito Previo (Recomendado)
- Los usuarios deben conectarse a OpenVPN antes de acceder a la aplicación web
- La aplicación verifica que la IP del cliente provenga de la red VPN
- **Ventaja**: Seguridad máxima, control total
- **Desventaja**: Requiere configuración de cliente VPN en cada dispositivo

#### Opción B: OpenVPN Integrado en la Aplicación
- La aplicación gestiona la conexión VPN automáticamente
- Certificados gestionados desde la interfaz web
- **Ventaja**: Experiencia de usuario más fluida
- **Desventaja**: Mayor complejidad técnica

#### Opción C: OpenVPN para Acceso Remoto Opcional
- Acceso local sin VPN, acceso remoto requiere VPN
- **Ventaja**: Flexibilidad
- **Desventaja**: Menor seguridad para acceso local

### 2. Requisitos Técnicos

**Servidor:**
- Servidor dedicado o VPS con Ubuntu/Debian
- Mínimo 1GB RAM adicional para OpenVPN
- Puerto UDP 1194 (o TCP 443 como alternativa)
- Certificados SSL/TLS (puede usar Let's Encrypt)
- IP estática o dominio dinámico

**Cliente:**
- Software OpenVPN instalado en dispositivos de usuarios
- Certificados de cliente (.ovpn files)
- Configuración de red adecuada

### 3. Seguridad

**Consideraciones de Seguridad:**
- **Certificados**: Usar certificados fuertes (RSA 2048+ o ECC)
- **Encriptación**: AES-256 para datos, TLS 1.2+ para control
- **Autenticación**: Certificados + usuario/contraseña (opcional)
- **Rotación de certificados**: Política de renovación periódica
- **Revocación**: Sistema para revocar certificados comprometidos
- **Logs**: Auditoría completa de conexiones

### 4. Base de Datos

**Nuevas Tablas Necesarias:**
- `vpn_certificates`: Almacenar información de certificados VPN
- `vpn_connections`: Registrar conexiones VPN (logs)
- `vpn_users`: Asociar usuarios del sistema con certificados VPN

### 5. Integración con el Sistema Actual

**Modificaciones Necesarias:**
- Middleware para verificar IP de origen (si proviene de VPN)
- API endpoints para gestión de certificados VPN
- Interfaz de administración para gestionar usuarios VPN
- Sistema de notificaciones para expiración de certificados

## Arquitectura Propuesta

```
┌─────────────┐
│   Cliente   │
│  (Navegador)│
└──────┬──────┘
       │ HTTPS
       │
┌──────▼──────────────────┐
│   Nginx (Reverse Proxy) │
│   - Verifica IP VPN     │
│   - SSL Termination     │
└──────┬───────────────────┘
       │
┌──────▼──────────────┐
│  Next.js App        │
│  - Verifica VPN     │
│  - Autenticación    │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│  PostgreSQL         │
│  - Datos VPN        │
│  - Logs conexiones  │
└─────────────────────┘

┌─────────────┐
│   Cliente   │
│  OpenVPN    │
└──────┬──────┘
       │ UDP 1194
       │
┌──────▼──────────────┐
│  OpenVPN Server     │
│  - Autenticación    │
│  - Asignación IP    │
└─────────────────────┘
```

## Plan de Implementación

### Fase 1: Configuración del Servidor OpenVPN

1. **Instalación de OpenVPN**
   ```bash
   sudo apt update
   sudo apt install openvpn easy-rsa -y
   ```

2. **Configuración de Certificados**
   - Crear Autoridad Certificadora (CA)
   - Generar certificado del servidor
   - Configurar parámetros de encriptación

3. **Configuración del Servidor**
   - Archivo de configuración del servidor
   - Red VPN (ej: 10.8.0.0/24)
   - Routing y firewall

### Fase 2: Integración con la Base de Datos

1. **Esquema de Base de Datos**
   - Tabla para certificados VPN
   - Tabla para logs de conexiones
   - Relación con tabla de usuarios

2. **API Endpoints**
   - GET /api/vpn/certificates - Listar certificados
   - POST /api/vpn/certificates - Crear certificado
   - DELETE /api/vpn/certificates/[id] - Revocar certificado
   - GET /api/vpn/connections - Ver logs de conexiones

### Fase 3: Verificación de IP en la Aplicación

1. **Middleware de Verificación**
   - Verificar que la IP del cliente esté en el rango VPN
   - Redirigir a página de instrucciones si no está conectado

2. **Interfaz de Usuario**
   - Página de estado de conexión VPN
   - Instrucciones de conexión
   - Descarga de archivos .ovpn

### Fase 4: Gestión de Certificados

1. **Panel de Administración**
   - Asignar certificados a usuarios
   - Revocar certificados
   - Ver estadísticas de conexión

2. **Automatización**
   - Generación automática de certificados
   - Notificaciones de expiración
   - Renovación automática

## Configuración Técnica Detallada

### 1. Instalación y Configuración del Servidor OpenVPN

**Archivo de configuración del servidor** (`/etc/openvpn/server.conf`):
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
```

### 2. Script de Generación de Certificados

Necesitaremos scripts para:
- Generar certificados de cliente
- Revocar certificados
- Listar certificados activos
- Exportar archivos .ovpn

### 3. Verificación de IP en Next.js

Middleware para verificar que la IP esté en el rango VPN:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  // Verificar si la IP está en el rango VPN (10.8.0.0/24)
  const isVpnIp = isIpInVpnRange(clientIp);
  
  if (!isVpnIp && !request.nextUrl.pathname.startsWith('/vpn-setup')) {
    return NextResponse.redirect(new URL('/vpn-setup', request.url));
  }
}
```

## Preguntas a Resolver

1. **¿Todos los usuarios necesitan VPN o solo acceso remoto?**
   - Si solo remoto: verificar IP solo para conexiones externas
   - Si todos: verificar siempre

2. **¿Qué nivel de automatización se requiere?**
   - Manual: Admin genera certificados manualmente
   - Semi-automático: Usuario solicita, admin aprueba
   - Automático: Sistema genera certificados automáticamente

3. **¿Necesitan certificados individuales o compartidos?**
   - Individual: Mayor seguridad, más gestión
   - Compartidos: Menos seguro, más simple

4. **¿Qué hacer con usuarios que no pueden conectarse?**
   - Página de instrucciones
   - Soporte técnico
   - Acceso de emergencia (con aprobación)

## Próximos Pasos

1. **Decidir arquitectura**: Elegir entre Opción A, B o C
2. **Configurar servidor OpenVPN**: Instalación y configuración inicial
3. **Diseñar esquema de base de datos**: Tablas para VPN
4. **Implementar verificación**: Middleware y lógica de verificación
5. **Crear interfaz de gestión**: Panel para administrar certificados
6. **Documentación de usuario**: Guía para conectar a VPN
7. **Pruebas**: Probar con usuarios reales

## Recursos Adicionales

- [Documentación oficial de OpenVPN](https://openvpn.net/community-resources/)
- [Guía de configuración de OpenVPN](https://www.digitalocean.com/community/tutorials/how-to-set-up-an-openvpn-server-on-ubuntu-20-04)
- [OpenVPN Access Server](https://openvpn.net/access-server/) (versión comercial con interfaz web)

## Notas de Seguridad

⚠️ **IMPORTANTE:**
- Los certificados VPN son credenciales de acceso muy sensibles
- Almacenar certificados de forma segura (encriptados)
- Implementar rotación periódica de certificados
- Monitorear conexiones sospechosas
- Mantener OpenVPN actualizado
- Usar contraseñas fuertes para la CA
- Hacer backup de la CA y certificados del servidor


