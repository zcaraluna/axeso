# Ejecutar Setup de CA - Pasos Corregidos

El directorio `/etc/openvpn/easy-rsa/` existe pero está vacío. Necesitamos crear la CA desde cero.

## 🔧 Pasos Corregidos

### Paso 1: Dar Permisos de Ejecución

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn
chmod +x setup-easy-rsa.sh
```

### Paso 2: Eliminar el Directorio Vacío

Como el directorio existe pero está vacío, es mejor eliminarlo para que el script lo cree correctamente:

```bash
sudo rm -rf /etc/openvpn/easy-rsa
```

### Paso 3: Ejecutar el Script

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn
sudo ./setup-easy-rsa.sh
```

## 📋 Lo que Hará el Script

1. ✅ Instalará easy-rsa (si no está instalado)
2. ✅ Creará el directorio `/etc/openvpn/easy-rsa/`
3. ✅ Copiará las plantillas de easy-rsa
4. ✅ Configurará las variables (país, organización, etc.)
5. ✅ Inicializará la PKI
6. ✅ Creará la CA (te pedirá una contraseña - **GUÁRDALA**)
7. ✅ Generará el certificado del servidor
8. ✅ Generará parámetros Diffie-Hellman (puede tardar varios minutos)
9. ✅ Copiará los archivos a `/etc/openvpn/`

## ⚠️ Importante Durante la Ejecución

Cuando el script te pida:
- **Contraseña de la CA**: Elige una contraseña segura y guárdala en un lugar seguro
- **Confirmar contraseña**: Vuelve a ingresarla

## ✅ Verificar que Funcionó

Después de ejecutar el script, verifica:

```bash
# Verificar archivos generados
ls -la /etc/openvpn/ | grep -E "(ca.crt|server.crt|server.key|dh.pem|crl.pem)"

# Deberías ver:
# - ca.crt
# - server.crt  
# - server.key
# - dh.pem
# - crl.pem
```

## 🚀 Comandos Completos (Copia y Pega)

```bash
# 1. Ir al directorio del script
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/scripts/vpn

# 2. Dar permisos de ejecución
chmod +x setup-easy-rsa.sh

# 3. Eliminar directorio vacío
sudo rm -rf /etc/openvpn/easy-rsa

# 4. Ejecutar el script
sudo ./setup-easy-rsa.sh
```

El script te guiará paso a paso. Cuando termine, tendrás la CA lista para generar certificados.

