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

# Generar certificado
echo "Generando certificado para $CERT_NAME..."
./easyrsa --batch build-client-full "$CERT_NAME" nopass

# Crear directorio de configuración de cliente si no existe
mkdir -p "$CLIENT_CONFIG_DIR"

# Obtener configuración del servidor
SERVER_IP=$(grep -E "^remote " "$OPENVPN_DIR/server.conf" | head -1 | awk '{print $2}' || echo "TU_SERVIDOR_IP")
SERVER_PORT=$(grep -E "^port " "$OPENVPN_DIR/server.conf" | head -1 | awk '{print $2}' || echo "1194")
PROTO=$(grep -E "^proto " "$OPENVPN_DIR/server.conf" | head -1 | awk '{print $2}' || echo "udp")

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
# Configuración de cifrado (compatible con OpenVPN 2.5+)
cipher AES-256-CBC
data-ciphers AES-256-GCM:AES-128-GCM:AES-256-CBC:AES-128-CBC
auth SHA256
# Deshabilitar DCO en Windows (causa problemas)
disable-dco
# Comprimir datos
comp-lzo
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

