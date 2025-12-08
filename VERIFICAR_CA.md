# Verificar Estado de la CA de OpenVPN

El directorio `/etc/openvpn/easy-rsa` ya existe. Necesitamos verificar si la CA está completa.

## 🔍 Verificar Estado Actual

Ejecuta estos comandos en el servidor:

```bash
# 1. Ver qué hay en el directorio
ls -la /etc/openvpn/easy-rsa/

# 2. Verificar si existe la CA
ls -la /etc/openvpn/easy-rsa/pki/ca.crt 2>/dev/null && echo "✅ CA existe" || echo "❌ CA no existe"

# 3. Verificar certificado del servidor
ls -la /etc/openvpn/server.crt 2>/dev/null && echo "✅ Certificado servidor existe" || echo "❌ Certificado servidor no existe"

# 4. Verificar archivos en /etc/openvpn
ls -la /etc/openvpn/
```

## 📋 Opciones

### Opción 1: Si la CA ya está completa ✅

Si ves que existen:
- `/etc/openvpn/easy-rsa/pki/ca.crt`
- `/etc/openvpn/easy-rsa/pki/issued/server.crt`
- `/etc/openvpn/ca.crt`
- `/etc/openvpn/server.crt`

**Entonces la CA ya está configurada** y puedes continuar directamente con la configuración del servidor OpenVPN.

### Opción 2: Si la CA está incompleta o vacía ⚠️

Si el directorio existe pero está vacío o incompleto:

```bash
# Hacer backup por seguridad
sudo cp -r /etc/openvpn/easy-rsa /etc/openvpn/easy-rsa.backup

# Eliminar el directorio incompleto
sudo rm -rf /etc/openvpn/easy-rsa

# Volver a ejecutar el script
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn
sudo ./setup-easy-rsa.sh
```

### Opción 3: Si quieres empezar desde cero 🔄

**⚠️ ADVERTENCIA**: Esto eliminará cualquier CA existente. Solo hazlo si estás seguro.

```bash
# Hacer backup completo
sudo cp -r /etc/openvpn /etc/openvpn.backup.$(date +%Y%m%d)

# Eliminar directorio easy-rsa
sudo rm -rf /etc/openvpn/easy-rsa

# Volver a ejecutar el script
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn
sudo ./setup-easy-rsa.sh
```

## 🚀 Continuar con la Configuración

Una vez que tengas la CA lista, continúa con:

1. Configurar el servidor OpenVPN (`/etc/openvpn/server.conf`)
2. Habilitar IP forwarding
3. Configurar firewall
4. Iniciar OpenVPN

