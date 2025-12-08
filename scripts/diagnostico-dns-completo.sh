#!/bin/bash

# Script para diagnóstico completo de problemas DNS y acceso web
# Ejecutar como root: sudo bash scripts/diagnostico-dns-completo.sh

echo "=========================================="
echo "DIAGNÓSTICO COMPLETO DNS Y ACCESO WEB"
echo "=========================================="
echo ""

DOMAIN="visitantes.cyberpol.com.py"
IP="144.202.77.18"

echo "1. Verificar resolución DNS desde el servidor:"
echo "----------------------------------------------"
echo "Con dig:"
dig +short $DOMAIN
echo ""
echo "Con nslookup:"
nslookup $DOMAIN 2>&1 | tail -5
echo ""

echo "2. Verificar resolución DNS desde servidores públicos:"
echo "-------------------------------------------------------"
echo "Desde Google DNS (8.8.8.8):"
dig @8.8.8.8 +short $DOMAIN
echo ""
echo "Desde Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 +short $DOMAIN
echo ""
echo "Desde OpenDNS (208.67.222.222):"
dig @208.67.222.222 +short $DOMAIN
echo ""

echo "3. Verificar que el DNS resuelve a la IP correcta:"
echo "---------------------------------------------------"
RESOLVED_IP=$(dig +short $DOMAIN | tail -1)
if [ "$RESOLVED_IP" = "$IP" ]; then
    echo "  ✓ DNS resuelve correctamente: $RESOLVED_IP"
else
    echo "  ✗ DNS NO resuelve correctamente"
    echo "    Resuelto: $RESOLVED_IP"
    echo "    Esperado: $IP"
fi
echo ""

echo "4. Verificar servidores de nombres (NS) del dominio:"
echo "-----------------------------------------------------"
dig NS $DOMAIN +short
echo ""

echo "5. Verificar servidores de nombres del dominio raíz:"
echo "----------------------------------------------------"
dig NS cyberpol.com.py +short
echo ""

echo "6. Estado de Nginx:"
echo "-------------------"
systemctl status nginx --no-pager | head -10
echo ""

echo "7. Verificar en qué IPs y puertos está escuchando Nginx:"
echo "--------------------------------------------------------"
ss -tlnp | grep nginx | grep -E ":80|:443"
echo ""

echo "8. Verificar configuración de listen en nginx.ssl.conf:"
echo "-------------------------------------------------------"
grep "listen" /home/cyberpol/conf/web/$DOMAIN/nginx.ssl.conf | head -3
echo ""

echo "9. Verificar configuración de proxy_pass:"
echo "------------------------------------------"
grep "proxy_pass" /home/cyberpol/conf/web/$DOMAIN/nginx.ssl.conf | head -3
echo ""

echo "10. Probar Next.js directamente:"
echo "----------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/debug-ip || echo "  ✗ No responde"
echo ""

echo "11. Probar acceso HTTPS local con el dominio:"
echo "----------------------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -k -H "Host: $DOMAIN" https://127.0.0.1/ || echo "  ✗ No responde"
echo ""

echo "12. Probar acceso HTTPS por IP externa:"
echo "----------------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -k -H "Host: $DOMAIN" https://$IP/ || echo "  ✗ No responde"
echo ""

echo "13. Verificar sintaxis de Nginx:"
echo "--------------------------------"
nginx -t 2>&1
echo ""

echo "14. Ver logs de error recientes de Nginx:"
echo "------------------------------------------"
tail -10 /var/log/apache2/domains/$DOMAIN.error.log 2>/dev/null || echo "  No se encontraron logs"
echo ""

echo "15. Verificar si hay configuración DNS en Hestia:"
echo "-------------------------------------------------"
if [ -f "/usr/local/hestia/data/users/cyberpol/dns/$DOMAIN.conf" ]; then
    echo "  ✓ Archivo DNS encontrado en Hestia"
    cat /usr/local/hestia/data/users/cyberpol/dns/$DOMAIN.conf | head -10
else
    echo "  ✗ No se encontró configuración DNS en Hestia"
fi
echo ""

echo "=========================================="
echo "RESUMEN DEL DIAGNÓSTICO"
echo "=========================================="
echo ""
echo "Si el DNS no resuelve desde servidores públicos:"
echo "  → El problema está en la configuración DNS del proveedor de dominio"
echo "  → Verifica que el registro A apunte a $IP"
echo "  → Verifica que los servidores de nombres (NS) estén configurados"
echo ""
echo "Si el DNS resuelve pero no puedes acceder:"
echo "  → Verifica que Nginx esté escuchando en todas las interfaces (0.0.0.0:443)"
echo "  → Verifica que el firewall permita conexiones en puerto 443"
echo "  → Verifica que Next.js esté corriendo en puerto 3000"
echo ""
echo "Si puedes acceder por IP pero no por dominio:"
echo "  → El problema es DNS (el navegador no puede resolver el dominio)"
echo "  → Solución temporal: agregar al archivo hosts de Windows"
echo "  → Solución permanente: configurar DNS correctamente en el proveedor"
echo ""

