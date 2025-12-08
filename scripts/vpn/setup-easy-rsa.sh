#!/bin/bash

# Script para configurar easy-rsa para OpenVPN
# Este script debe ejecutarse una sola vez para inicializar la CA

set -e

EASY_RSA_DIR="/etc/openvpn/easy-rsa"
OPENVPN_DIR="/etc/openvpn"

echo "Configurando easy-rsa para OpenVPN..."

# Instalar easy-rsa si no está instalado
if [ ! -d "$EASY_RSA_DIR" ]; then
    echo "Instalando easy-rsa..."
    apt-get update
    apt-get install -y easy-rsa
fi

# Crear directorio de trabajo
mkdir -p "$EASY_RSA_DIR"
cd "$EASY_RSA_DIR"

# Copiar plantillas de easy-rsa
if [ ! -f "$EASY_RSA_DIR/vars" ]; then
    make-cadir "$EASY_RSA_DIR"
fi

# Configurar variables (ajustar según tu organización)
cat > "$EASY_RSA_DIR/vars" <<EOF
set_var EASYRSA_REQ_COUNTRY     "PY"
set_var EASYRSA_REQ_PROVINCE    "Asuncion"
set_var EASYRSA_REQ_CITY        "Asuncion"
set_var EASYRSA_REQ_ORG         "Policia Nacional"
set_var EASYRSA_REQ_EMAIL       "admin@policia.gov.py"
set_var EASYRSA_REQ_OU          "DCHPEF"
set_var EASYRSA_KEY_SIZE        2048
set_var EASYRSA_ALGO            rsa
set_var EASYRSA_CA_EXPIRE       3650
set_var EASYRSA_CERT_EXPIRE     365
set_var EASYRSA_CRL_DAYS        180
EOF

# Inicializar PKI
if [ ! -d "$EASY_RSA_DIR/pki" ]; then
    echo "Inicializando PKI..."
    ./easyrsa init-pki
fi

# Construir CA si no existe
if [ ! -f "$EASY_RSA_DIR/pki/ca.crt" ]; then
    echo "Creando Autoridad Certificadora (CA)..."
    echo "IMPORTANTE: Se te pedirá una contraseña para la CA. Guárdala de forma segura."
    ./easyrsa build-ca
fi

# Generar certificado del servidor si no existe
if [ ! -f "$EASY_RSA_DIR/pki/issued/server.crt" ]; then
    echo "Generando certificado del servidor..."
    ./easyrsa gen-req server nopass
    ./easyrsa sign-req server server
fi

# Generar parámetros Diffie-Hellman
if [ ! -f "$EASY_RSA_DIR/pki/dh.pem" ]; then
    echo "Generando parámetros Diffie-Hellman (esto puede tardar varios minutos)..."
    ./easyrsa gen-dh
fi

# Copiar certificados al directorio de OpenVPN
mkdir -p "$OPENVPN_DIR"
cp "$EASY_RSA_DIR/pki/ca.crt" "$OPENVPN_DIR/"
cp "$EASY_RSA_DIR/pki/issued/server.crt" "$OPENVPN_DIR/"
cp "$EASY_RSA_DIR/pki/private/server.key" "$OPENVPN_DIR/"
cp "$EASY_RSA_DIR/pki/dh.pem" "$OPENVPN_DIR/"

# Establecer permisos
chmod 600 "$OPENVPN_DIR/server.key"
chmod 644 "$OPENVPN_DIR/ca.crt"
chmod 644 "$OPENVPN_DIR/server.crt"
chmod 644 "$OPENVPN_DIR/dh.pem"

# Generar CRL inicial
./easyrsa gen-crl
cp "$EASY_RSA_DIR/pki/crl.pem" "$OPENVPN_DIR/"
chmod 644 "$OPENVPN_DIR/crl.pem"

echo ""
echo "Configuración completada exitosamente!"
echo ""
echo "Archivos generados:"
echo "  - CA: $OPENVPN_DIR/ca.crt"
echo "  - Certificado del servidor: $OPENVPN_DIR/server.crt"
echo "  - Clave del servidor: $OPENVPN_DIR/server.key"
echo "  - Parámetros DH: $OPENVPN_DIR/dh.pem"
echo ""
echo "Ahora puedes generar certificados de cliente usando:"
echo "  ./scripts/vpn/generate-certificate.sh <nombre> <user_id>"


