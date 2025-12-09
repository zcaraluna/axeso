#!/bin/bash

# Script para corregir problemas de BIND
# Ejecutar como root: sudo bash scripts/vpn/corregir-bind.sh

echo "=========================================="
echo "CORRECCIÓN DE BIND"
echo "=========================================="
echo ""

echo "1. Crear directorio /var/cache/bind:"
echo "------------------------------------"
if [ ! -d "/var/cache/bind" ]; then
    mkdir -p /var/cache/bind
    echo "✓ Directorio creado"
else
    echo "✓ Directorio ya existe"
fi

# Configurar permisos
chown bind:bind /var/cache/bind
chmod 755 /var/cache/bind
echo "✓ Permisos configurados"
echo ""

echo "2. Verificar que named.conf.options existe:"
echo "-------------------------------------------"
if [ ! -f "/etc/bind/named.conf.options" ]; then
    echo "✗ /etc/bind/named.conf.options no existe"
    echo ""
    echo "Creando configuración básica..."
    cat > /etc/bind/named.conf.options << 'EOF'
options {
    directory "/var/cache/bind";
    recursion yes;
    allow-recursion { localnets; localhost; };
    listen-on { any; };
    allow-transfer { none; };
    forwarders {
        8.8.8.8;
        8.8.4.4;
    };
    dnssec-validation auto;
    auth-nxdomain no;
};
EOF
    chown root:bind /etc/bind/named.conf.options
    chmod 644 /etc/bind/named.conf.options
    echo "✓ Configuración básica creada"
else
    echo "✓ /etc/bind/named.conf.options existe"
    # Verificar que el directorio esté configurado correctamente
    if ! grep -q "directory.*\"/var/cache/bind\"" /etc/bind/named.conf.options; then
        echo "  Actualizando configuración..."
        sed -i 's|directory.*|directory "/var/cache/bind";|' /etc/bind/named.conf.options
        echo "✓ Configuración actualizada"
    fi
fi
echo ""

echo "3. Verificar named.conf.local:"
echo "-----------------------------"
if [ ! -f "/etc/bind/named.conf.local" ]; then
    echo "✗ /etc/bind/named.conf.local no existe"
    echo "  Creando archivo vacío..."
    touch /etc/bind/named.conf.local
    chown root:bind /etc/bind/named.conf.local
    chmod 644 /etc/bind/named.conf.local
    echo "✓ Archivo creado"
else
    echo "✓ /etc/bind/named.conf.local existe"
fi
echo ""

echo "4. Regenerar configuración DNS en Hestia:"
echo "-----------------------------------------"
if [ -f "/usr/local/hestia/bin/v-rebuild-dns-domains" ]; then
    echo "Regenerando configuración DNS para visitantes.cyberpol.com.py..."
    /usr/local/hestia/bin/v-rebuild-dns-domains cyberpol visitantes.cyberpol.com.py
    echo "✓ Configuración regenerada"
else
    echo "✗ Comando de Hestia no disponible"
fi
echo ""

echo "5. Verificar sintaxis de BIND:"
echo "-----------------------------"
if named-checkconf /etc/bind/named.conf 2>&1; then
    echo "✓ Sintaxis correcta"
else
    echo "✗ Error en sintaxis (ver arriba)"
fi
echo ""

echo "6. Intentar iniciar BIND:"
echo "-------------------------"
systemctl reset-failed named.service 2>/dev/null || true
systemctl start named.service

sleep 2

if systemctl is-active --quiet named.service; then
    echo "✓ BIND iniciado correctamente"
    
    # Habilitar para que inicie automáticamente
    systemctl enable named.service
    echo "✓ BIND habilitado para iniciar automáticamente"
    
    echo ""
    echo "7. Verificar que BIND responde:"
    echo "-------------------------------"
    sleep 1
    if dig @127.0.0.1 visitantes.cyberpol.com.py +short 2>/dev/null | grep -q "144.202.77.18"; then
        echo "✓ BIND responde correctamente"
        echo "  Resultado: $(dig @127.0.0.1 visitantes.cyberpol.com.py +short 2>/dev/null)"
    else
        echo "⚠ BIND está corriendo pero aún no resuelve el dominio"
        echo "  Esto puede ser normal si la zona aún no está configurada"
    fi
else
    echo "✗ Error al iniciar BIND"
    echo ""
    echo "Revisando logs:"
    journalctl -u named.service --no-pager -n 10
fi
echo ""

echo "=========================================="
echo "CORRECCIÓN COMPLETADA"
echo "=========================================="
echo ""

