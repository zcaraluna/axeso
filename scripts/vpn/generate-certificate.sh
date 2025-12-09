#!/bin/bash

# Script para generar certificados OpenVPN
# Uso: ./generate-certificate.sh <certificate_name> [user_id] [validity_days]
# NOTA: user_id es opcional. Si se omite, el certificado es por computadora/dispositivo.

set -e

CERT_NAME=$1
USER_ID=$2
VALIDITY_DAYS=${3:-365}

if [ -z "$CERT_NAME" ]; then
    echo "Uso: $0 <certificate_name> [user_id] [validity_days]"
    echo "Ejemplo (por computadora): $0 recepcion-pc-01 \"\" 365"
    echo "Ejemplo (por usuario): $0 usuario1 clxxxxxxxxxxxxx 365"
    exit 1
fi

# Directorios (ajustar según tu instalación)
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
OPENVPN_DIR="/etc/openvpn"
CLIENT_CONFIG_DIR="/etc/openvpn/client-configs"
KEYS_DIR="$EASY_RSA_DIR/pki"

# Verificar que easy-rsa esté configurado
if [ ! -d "$EASY_RSA_DIR" ]; then
    echo "Error: easy-rsa no está configurado en $EASY_RSA_DIR"
    echo "Ejecuta primero: ./scripts/vpn/setup-easy-rsa.sh"
    exit 1
fi

cd "$EASY_RSA_DIR"

# Verificar que el certificado no exista
if [ -f "$KEYS_DIR/issued/$CERT_NAME.crt" ]; then
    echo "Error: El certificado $CERT_NAME ya existe"
    exit 1
fi

# Verificar si se proporciona contraseña desde variable de entorno (para uso no interactivo)
PASSWORD=""
PASSWORD_FILE=""

if [ -n "$CERT_PASSWORD" ]; then
    # Contraseña proporcionada desde variable de entorno (uso no interactivo)
    USE_PASSWORD="y"
    PASSWORD="$CERT_PASSWORD"
    
    # Verificar longitud mínima
    if [ ${#PASSWORD} -lt 8 ]; then
        echo "Error: La contraseña debe tener al menos 8 caracteres"
        exit 1
    fi
    echo "Usando contraseña desde variable de entorno CERT_PASSWORD"
elif [ -t 0 ]; then
    # Solo preguntar si hay terminal interactivo
    echo ""
    echo "¿Deseas agregar una contraseña al certificado? (s/n)"
    echo "NOTA: La contraseña protege el certificado si se copia a otra computadora"
    read -r USE_PASSWORD
    
    if [ "$USE_PASSWORD" = "s" ] || [ "$USE_PASSWORD" = "S" ] || [ "$USE_PASSWORD" = "y" ] || [ "$USE_PASSWORD" = "Y" ]; then
        # Pedir contraseña
        echo "Ingresa la contraseña para el certificado (mínimo 8 caracteres):"
        read -s PASSWORD
        echo ""
        
        # Verificar longitud mínima
        if [ ${#PASSWORD} -lt 8 ]; then
            echo "Error: La contraseña debe tener al menos 8 caracteres"
            exit 1
        fi
        
        # Confirmar contraseña
        echo "Confirma la contraseña:"
        read -s PASSWORD_CONFIRM
        echo ""
        
        if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
            echo "Error: Las contraseñas no coinciden"
            exit 1
        fi
    else
        USE_PASSWORD="n"
    fi
else
    # No hay terminal interactivo, no usar contraseña
    USE_PASSWORD="n"
fi

if [ "$USE_PASSWORD" = "s" ] || [ "$USE_PASSWORD" = "S" ] || [ "$USE_PASSWORD" = "y" ] || [ "$USE_PASSWORD" = "Y" ]; then
    # Crear archivo temporal con la contraseña
    PASSWORD_FILE=$(mktemp)
    echo "$PASSWORD" > "$PASSWORD_FILE"
    chmod 600 "$PASSWORD_FILE"
    
    # Generar certificado CON contraseña
    echo "Generando certificado para $CERT_NAME con contraseña..."
    ./easyrsa --batch --passout=file:"$PASSWORD_FILE" build-client-full "$CERT_NAME"
    
    # Limpiar archivo temporal
    rm -f "$PASSWORD_FILE"
    
    echo ""
    echo "✓ Certificado generado con contraseña"
    echo "  IMPORTANTE: Guarda esta contraseña de forma segura. Se pedirá al conectar."
else
    # Generar certificado SIN contraseña
    echo "Generando certificado para $CERT_NAME sin contraseña..."
    ./easyrsa --batch build-client-full "$CERT_NAME" nopass
    echo ""
    echo "✓ Certificado generado sin contraseña"
fi

# Crear directorio de configuración de cliente si no existe
mkdir -p "$CLIENT_CONFIG_DIR"

# Obtener configuración del servidor
SERVER_PORT=$(grep -E "^port " "$OPENVPN_DIR/server.conf" | head -1 | awk '{print $2}' || echo "1194")
PROTO=$(grep -E "^proto " "$OPENVPN_DIR/server.conf" | head -1 | awk '{print $2}' || echo "udp")

# Obtener la IP pública del servidor
# IP fija del servidor (ajustar según tu caso)
DEFAULT_SERVER_IP="144.202.77.18"

# Intentar obtener desde la interfaz de red principal
SERVER_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)

# Si no se encuentra, intentar desde hostname
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
fi

# Si aún no se encuentra, usar la IP por defecto
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="$DEFAULT_SERVER_IP"
    echo "ADVERTENCIA: No se pudo detectar la IP del servidor automáticamente"
    echo "Usando IP por defecto: $SERVER_IP"
else
    # Verificar que la IP detectada sea la correcta
    if [ "$SERVER_IP" != "$DEFAULT_SERVER_IP" ]; then
        # Si no hay terminal interactivo, usar la IP por defecto automáticamente
        if [ ! -t 0 ]; then
            SERVER_IP="$DEFAULT_SERVER_IP"
            echo "Usando IP por defecto (modo no interactivo): $SERVER_IP"
        else
            echo "ADVERTENCIA: IP detectada ($SERVER_IP) difiere de la IP por defecto ($DEFAULT_SERVER_IP)"
            echo "¿Usar IP detectada ($SERVER_IP) o IP por defecto ($DEFAULT_SERVER_IP)? [d]efault/[d]etected: "
            read -r choice
            if [ "$choice" != "d" ] && [ "$choice" != "D" ]; then
                SERVER_IP="$DEFAULT_SERVER_IP"
            fi
        fi
    fi
fi

echo "Usando IP del servidor: $SERVER_IP"

# Crear archivo .ovpn
OVPN_FILE="$CLIENT_CONFIG_DIR/$CERT_NAME.ovpn"
cat > "$OVPN_FILE" <<EOF
client
dev tun
proto $PROTO
remote $SERVER_IP $SERVER_PORT
resolv-retry infinite
nobind
persist-key
persist-tun
ca [inline]
cert [inline]
key [inline]
EOF

# Si tiene contraseña, agregar comentario informativo
# NOTA: OpenVPN pedirá la contraseña automáticamente cuando la clave privada esté protegida
# No necesitamos 'askpass' porque OpenVPN detecta automáticamente que la clave tiene passphrase
if [ -n "$PASSWORD" ]; then
    echo "# El certificado está protegido con contraseña" >> "$OVPN_FILE"
    echo "# OpenVPN pedirá la contraseña automáticamente al conectar" >> "$OVPN_FILE"
    echo "# IMPORTANTE: Guarda esta contraseña de forma segura" >> "$OVPN_FILE"
fi

cat >> "$OVPN_FILE" <<EOF
# Configuración de cifrado (compatible con OpenVPN 2.5+)
cipher AES-256-CBC
data-ciphers AES-256-GCM:AES-128-GCM:AES-256-CBC:AES-128-CBC
auth SHA256
# Deshabilitar DCO en Windows (causa problemas)
disable-dco
# Comprimir datos
comp-lzo
# Enrutar todo el tráfico a través de VPN (requiere permisos de administrador)
# Si redirect-gateway no funciona, puedes descomentar la línea siguiente para enrutar solo el servidor
# NOTA: La ruta específica puede causar problemas de conectividad a internet
# redirect-gateway def1
# route $SERVER_IP 255.255.255.255
# Logging
verb 3
mute 20
EOF

# Agregar certificados al archivo .ovpn
echo "" >> "$OVPN_FILE"
echo "<ca>" >> "$OVPN_FILE"
cat "$KEYS_DIR/ca.crt" >> "$OVPN_FILE"
echo "</ca>" >> "$OVPN_FILE"

echo "" >> "$OVPN_FILE"
echo "<cert>" >> "$OVPN_FILE"
cat "$KEYS_DIR/issued/$CERT_NAME.crt" >> "$OVPN_FILE"
echo "</cert>" >> "$OVPN_FILE"

echo "" >> "$OVPN_FILE"
echo "<key>" >> "$OVPN_FILE"
cat "$KEYS_DIR/private/$CERT_NAME.key" >> "$OVPN_FILE"
echo "</key>" >> "$OVPN_FILE"

# Establecer permisos
chmod 600 "$OVPN_FILE"

echo "Certificado generado exitosamente: $OVPN_FILE"
echo ""
echo "NOTA: Debes registrar este certificado en la base de datos:"
echo ""
if [ -z "$USER_ID" ] || [ "$USER_ID" = "" ]; then
    echo "  Este es un certificado por COMPUTADORA/DISPOSITIVO"
    echo "  Usa la interfaz web en /vpn o la API con:"
    echo "    - certificateName: $CERT_NAME"
    echo "    - deviceName: (nombre descriptivo del dispositivo)"
    echo "    - location: (ubicación física, opcional)"
    echo "    - validityDays: $VALIDITY_DAYS"
else
    echo "  Este certificado está asignado al usuario: $USER_ID"
    echo "  Usa la interfaz web en /vpn o la API con:"
    echo "    - certificateName: $CERT_NAME"
    echo "    - targetUserId: $USER_ID"
    echo "    - deviceName: (nombre descriptivo del dispositivo)"
    echo "    - validityDays: $VALIDITY_DAYS"
fi
echo ""
echo "Luego, entrega el archivo $OVPN_FILE al responsable de forma segura."

