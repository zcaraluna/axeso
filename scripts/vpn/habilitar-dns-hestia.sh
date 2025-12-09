#!/bin/bash

# Script para habilitar DNS en Hestia y verificar BIND
# Ejecutar como root: sudo bash scripts/vpn/habilitar-dns-hestia.sh

echo "=========================================="
echo "HABILITAR DNS EN HESTIA"
echo "=========================================="
echo ""

echo "1. Verificar si BIND está instalado:"
echo "------------------------------------"
if command -v named &> /dev/null || command -v bind9 &> /dev/null; then
    echo "✓ BIND está instalado"
    
    # Detectar el nombre del servicio
    if systemctl list-unit-files | grep -q "bind9.service"; then
        SERVICE_NAME="bind9"
    elif systemctl list-unit-files | grep -q "named.service"; then
        SERVICE_NAME="named"
    else
        SERVICE_NAME=""
    fi
    
    if [ -n "$SERVICE_NAME" ]; then
        echo "  Servicio detectado: $SERVICE_NAME"
        echo ""
        
        echo "2. Verificar estado de BIND:"
        echo "----------------------------"
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            echo "✓ BIND está corriendo"
        else
            echo "✗ BIND NO está corriendo"
            echo ""
            echo "3. Intentando iniciar BIND:"
            echo "--------------------------"
            systemctl start "$SERVICE_NAME"
            sleep 2
            
            if systemctl is-active --quiet "$SERVICE_NAME"; then
                echo "✓ BIND iniciado correctamente"
                
                # Habilitar para que inicie automáticamente
                systemctl enable "$SERVICE_NAME"
                echo "✓ BIND habilitado para iniciar automáticamente"
            else
                echo "✗ Error al iniciar BIND"
                echo ""
                echo "Revisando logs:"
                journalctl -u "$SERVICE_NAME" --no-pager -n 10
            fi
        fi
    else
        echo "✗ No se pudo detectar el servicio de BIND"
    fi
else
    echo "✗ BIND NO está instalado"
    echo ""
    echo "4. Verificar si Hestia puede instalar BIND:"
    echo "-------------------------------------------"
    if [ -f "/usr/local/hestia/bin/v-add-dns-domain" ]; then
        echo "✓ Hestia tiene comandos DNS disponibles"
        echo ""
        echo "Para habilitar DNS en Hestia, ejecuta:"
        echo "  /usr/local/hestia/bin/v-add-dns-domain cyberpol visitantes.cyberpol.com.py 144.202.77.18"
    else
        echo "✗ Comandos DNS de Hestia no disponibles"
    fi
fi
echo ""

echo "5. Verificar configuración DNS en Hestia:"
echo "-----------------------------------------"
if [ -f "/usr/local/hestia/bin/v-list-dns-domains" ]; then
    echo "Dominios DNS configurados:"
    /usr/local/hestia/bin/v-list-dns-domains cyberpol 2>/dev/null | grep -i visitantes || echo "  No se encontró el dominio"
fi
echo ""

echo "6. Verificar si el DNS está siendo manejado externamente:"
echo "--------------------------------------------------------"
echo "Servidores NS para cyberpol.com.py:"
dig NS cyberpol.com.py +short @8.8.8.8 2>/dev/null | head -5 || echo "  No se pueden resolver"
echo ""

echo "7. Probar resolución DNS después de iniciar BIND:"
echo "-------------------------------------------------"
if systemctl is-active --quiet bind9 2>/dev/null || systemctl is-active --quiet named 2>/dev/null; then
    sleep 2
    echo "Probando desde localhost:"
    dig @127.0.0.1 visitantes.cyberpol.com.py +short 2>/dev/null || echo "  Aún no responde (puede necesitar configuración)"
else
    echo "  BIND no está corriendo, no se puede probar"
fi
echo ""

echo "=========================================="
echo "VERIFICACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "IMPORTANTE:"
echo "  Si BIND no está instalado o no funciona, el DNS debe estar configurado"
echo "  en tu proveedor de dominio (donde compraste cyberpol.com.py)"
echo ""
echo "  Los servidores NS deben apuntar a:"
echo "    - ns1.com.py -> 144.202.77.18 (o la IP de tu servidor DNS)"
echo "    - ns2.com.py -> (IP del servidor DNS secundario)"
echo ""
echo "  O puedes usar DNS externos como:"
echo "    - Cloudflare (gratis)"
echo "    - Google Cloud DNS"
echo "    - AWS Route 53"
echo ""

