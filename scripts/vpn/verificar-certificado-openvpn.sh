#!/bin/bash

# Script para verificar el estado de un certificado en OpenVPN
# Uso: sudo bash scripts/vpn/verificar-certificado-openvpn.sh <certificate_name>

set -e

CERT_NAME="${1:-ADMIN-GARV1}"
EASY_RSA_DIR="/etc/openvpn/easy-rsa"
KEYS_DIR="$EASY_RSA_DIR/pki"

echo "=========================================="
echo "VERIFICACIÓN DE CERTIFICADO OPENVPN"
echo "=========================================="
echo ""

echo "Certificado: $CERT_NAME"
echo ""

# Verificar si el certificado existe
echo "1. Verificando archivos del certificado:"
echo "-----------------------------------------"
if [ -f "$KEYS_DIR/issued/$CERT_NAME.crt" ]; then
    echo "  ✓ Certificado existe: $KEYS_DIR/issued/$CERT_NAME.crt"
    ls -lh "$KEYS_DIR/issued/$CERT_NAME.crt"
else
    echo "  ✗ Certificado NO existe: $KEYS_DIR/issued/$CERT_NAME.crt"
fi

if [ -f "$KEYS_DIR/private/$CERT_NAME.key" ]; then
    echo "  ✓ Clave privada existe: $KEYS_DIR/private/$CERT_NAME.key"
else
    echo "  ✗ Clave privada NO existe: $KEYS_DIR/private/$CERT_NAME.key"
fi
echo ""

# Verificar si está revocado
echo "2. Verificando si está revocado:"
echo "--------------------------------"
if [ -f "$KEYS_DIR/revoked/$CERT_NAME.crt" ]; then
    echo "  ✗ Certificado está REVOCADO"
    echo "  Archivo: $KEYS_DIR/revoked/$CERT_NAME.crt"
    echo "  Fecha de revocación:"
    ls -lh "$KEYS_DIR/revoked/$CERT_NAME.crt"
else
    echo "  ✓ Certificado NO está revocado"
fi
echo ""

# Verificar índice de revocación
if [ -f "$KEYS_DIR/index.txt" ]; then
    echo "3. Verificando índice de revocación:"
    echo "------------------------------------"
    if grep -q "^R.*$CERT_NAME" "$KEYS_DIR/index.txt"; then
        echo "  ✗ Certificado marcado como REVOCADO en index.txt"
        grep "$CERT_NAME" "$KEYS_DIR/index.txt"
    else
        echo "  ✓ Certificado NO está revocado en index.txt"
        grep "$CERT_NAME" "$KEYS_DIR/index.txt" || echo "  (No encontrado en index.txt)"
    fi
    echo ""
fi

# Verificar detalles del certificado
echo "4. Detalles del certificado:"
echo "---------------------------"
if [ -f "$KEYS_DIR/issued/$CERT_NAME.crt" ]; then
    openssl x509 -in "$KEYS_DIR/issued/$CERT_NAME.crt" -noout -subject -dates 2>/dev/null || echo "  No se pudo leer el certificado"
else
    echo "  Certificado no existe"
fi
echo ""

# Verificar archivo .ovpn
echo "5. Verificando archivo .ovpn:"
echo "-----------------------------"
OVPN_FILE="/etc/openvpn/client-configs/$CERT_NAME.ovpn"
if [ -f "$OVPN_FILE" ]; then
    echo "  ✓ Archivo .ovpn existe: $OVPN_FILE"
    echo "  Tamaño: $(ls -lh "$OVPN_FILE" | awk '{print $5}')"
    echo "  Contenido (primeras 10 líneas):"
    head -10 "$OVPN_FILE"
else
    echo "  ✗ Archivo .ovpn NO existe: $OVPN_FILE"
fi
echo ""

# Verificar conexiones activas
echo "6. Conexiones activas con este certificado:"
echo "-------------------------------------------"
if [ -f /var/log/openvpn-status.log ]; then
    if grep -q "$CERT_NAME" /var/log/openvpn-status.log; then
        echo "  ✓ Hay conexiones activas con este certificado:"
        grep "$CERT_NAME" /var/log/openvpn-status.log | head -5
    else
        echo "  No hay conexiones activas con este certificado"
    fi
else
    echo "  Archivo de estado no encontrado"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="

