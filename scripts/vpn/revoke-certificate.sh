#!/bin/bash

# Script para revocar certificados OpenVPN
# Uso: ./revoke-certificate.sh <certificate_name>

set -e

CERT_NAME=$1

if [ -z "$CERT_NAME" ]; then
    echo "Uso: $0 <certificate_name>"
    echo "Ejemplo: $0 usuario1"
    exit 1
fi

# Directorios
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
OPENVPN_DIR="/etc/openvpn"
KEYS_DIR="$EASY_RSA_DIR/pki"
CRL_FILE="$KEYS_DIR/crl.pem"

# Verificar que easy-rsa esté configurado
if [ ! -d "$EASY_RSA_DIR" ]; then
    echo "Error: easy-rsa no está configurado en $EASY_RSA_DIR"
    exit 1
fi

cd "$EASY_RSA_DIR"

# Verificar que el certificado exista
if [ ! -f "$KEYS_DIR/issued/$CERT_NAME.crt" ]; then
    echo "Error: El certificado $CERT_NAME no existe"
    exit 1
fi

# Revocar certificado
echo "Revocando certificado $CERT_NAME..."
./easyrsa --batch revoke "$CERT_NAME"

# Generar/actualizar CRL (Certificate Revocation List)
echo "Generando lista de revocación..."
./easyrsa gen-crl

# Copiar CRL al directorio de OpenVPN
cp "$KEYS_DIR/crl.pem" "$OPENVPN_DIR/crl.pem"
chmod 644 "$OPENVPN_DIR/crl.pem"

# Reiniciar OpenVPN para aplicar cambios
if systemctl is-active --quiet openvpn@server; then
    echo "Reiniciando OpenVPN..."
    systemctl restart openvpn@server
fi

echo "Certificado $CERT_NAME revocado exitosamente"
echo ""
echo "NOTA: Debes actualizar el estado del certificado en la base de datos usando la API:"
echo "DELETE /api/vpn/certificates/<id>"
echo ""
echo "El certificado ya no podrá conectarse a la VPN."


