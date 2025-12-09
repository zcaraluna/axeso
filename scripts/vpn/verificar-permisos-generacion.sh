#!/bin/bash

# Script para verificar que la aplicación Next.js puede ejecutar el script de generación
# Ejecutar como root: sudo bash scripts/vpn/verificar-permisos-generacion.sh

set -e

PROJECT_DIR="/home/cyberpol/web/visitantes.cyberpol.com.py/public_html"
SCRIPT_PATH="$PROJECT_DIR/scripts/vpn/generate-certificate.sh"
EASY_RSA_DIR="/etc/openvpn/easy-rsa"

echo "=========================================="
echo "VERIFICACIÓN: PERMISOS DE GENERACIÓN"
echo "=========================================="
echo ""

# 1. Verificar que el script existe y es ejecutable
echo "1. Verificando script de generación:"
echo "-------------------------------------"
if [ -f "$SCRIPT_PATH" ]; then
    echo "✓ Script existe: $SCRIPT_PATH"
    if [ -x "$SCRIPT_PATH" ]; then
        echo "  ✓ Es ejecutable"
    else
        echo "  ✗ NO es ejecutable (corrigiendo...)"
        chmod +x "$SCRIPT_PATH"
        echo "  ✓ Permisos corregidos"
    fi
else
    echo "✗ Script NO existe: $SCRIPT_PATH"
    exit 1
fi
echo ""

# 2. Verificar que easy-rsa está configurado
echo "2. Verificando easy-rsa:"
echo "------------------------"
if [ -d "$EASY_RSA_DIR" ]; then
    echo "✓ easy-rsa está configurado: $EASY_RSA_DIR"
    
    # Verificar que el script easyrsa existe
    if [ -f "$EASY_RSA_DIR/easyrsa" ]; then
        echo "  ✓ Script easyrsa existe"
        if [ -x "$EASY_RSA_DIR/easyrsa" ]; then
            echo "  ✓ Script easyrsa es ejecutable"
        else
            echo "  ✗ Script easyrsa NO es ejecutable"
        fi
    else
        echo "  ✗ Script easyrsa NO existe"
    fi
else
    echo "✗ easy-rsa NO está configurado"
    exit 1
fi
echo ""

# 3. Verificar permisos de sudo
echo "3. Verificando permisos de sudo:"
echo "---------------------------------"
# Verificar si el usuario de la aplicación (probablemente www-data o el usuario de PM2) puede ejecutar sudo
PM2_USER=$(pm2 jlist 2>/dev/null | grep -o '"username":"[^"]*' | head -1 | cut -d'"' -f4 || echo "root")

echo "Usuario de PM2: $PM2_USER"

# Verificar si puede ejecutar el script con sudo sin contraseña
if [ "$PM2_USER" = "root" ]; then
    echo "  ✓ Ejecutando como root, no necesita sudo"
else
    echo "  ⚠ Ejecutando como $PM2_USER, necesita permisos sudo"
    echo ""
    echo "  Para permitir ejecutar el script sin contraseña, agrega esto a /etc/sudoers:"
    echo "  (Ejecuta: sudo visudo)"
    echo ""
    echo "  $PM2_USER ALL=(ALL) NOPASSWD: $SCRIPT_PATH"
    echo ""
fi
echo ""

# 4. Probar ejecución del script (solo verificar sintaxis)
echo "4. Verificando sintaxis del script:"
echo "------------------------------------"
if bash -n "$SCRIPT_PATH" 2>&1; then
    echo "✓ Sintaxis correcta"
else
    echo "✗ Error de sintaxis"
    exit 1
fi
echo ""

# 5. Verificar directorio de salida
echo "5. Verificando directorio de salida:"
echo "-------------------------------------"
CLIENT_CONFIG_DIR="/etc/openvpn/client-configs"
if [ -d "$CLIENT_CONFIG_DIR" ]; then
    echo "✓ Directorio existe: $CLIENT_CONFIG_DIR"
    
    # Verificar permisos
    PERMS=$(stat -c "%a" "$CLIENT_CONFIG_DIR" 2>/dev/null || stat -f "%OLp" "$CLIENT_CONFIG_DIR" 2>/dev/null || echo "unknown")
    OWNER=$(stat -c "%U:%G" "$CLIENT_CONFIG_DIR" 2>/dev/null || stat -f "%Su:%Sg" "$CLIENT_CONFIG_DIR" 2>/dev/null || echo "unknown")
    echo "  Permisos: $PERMS"
    echo "  Propietario: $OWNER"
    
    # Verificar que es escribible
    if [ -w "$CLIENT_CONFIG_DIR" ]; then
        echo "  ✓ Es escribible"
    else
        echo "  ✗ NO es escribible"
        echo "  Solución: sudo chmod 755 $CLIENT_CONFIG_DIR"
    fi
else
    echo "⚠ Directorio NO existe, se creará automáticamente"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "RESUMEN:"
echo "--------"
echo "✓ Script de generación listo"
echo "✓ easy-rsa configurado"
if [ "$PM2_USER" != "root" ]; then
    echo "⚠ Necesitas configurar permisos sudo para $PM2_USER"
    echo ""
    echo "Para configurar permisos sudo:"
    echo "1. Ejecuta: sudo visudo"
    echo "2. Agrega esta línea al final:"
    echo "   $PM2_USER ALL=(ALL) NOPASSWD: $SCRIPT_PATH"
    echo "3. Guarda y cierra"
else
    echo "✓ Permisos correctos (ejecutando como root)"
fi
echo ""

