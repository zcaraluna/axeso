# Pasos Después de Registrar el Certificado en /vpn

Una vez que has registrado el certificado en la interfaz web, sigue estos pasos:

## ✅ Paso 1: Verificar que el Certificado Está Registrado

En la página `/vpn`, deberías ver el certificado en la lista con:
- Estado: **Activo**
- Nombre del certificado: `DCHPEF-ASU-1`
- Nombre del dispositivo: El que ingresaste
- Ubicación: La que ingresaste

## 📁 Paso 2: Obtener el Archivo .ovpn

El archivo `.ovpn` ya fue generado cuando ejecutaste el script. Está en:

```bash
/etc/openvpn/client-configs/DCHPEF-ASU-1.ovpn
```

### Opción A: Ver el Contenido del Archivo

```bash
sudo cat /etc/openvpn/client-configs/DCHPEF-ASU-1.ovpn
```

### Opción B: Copiar a un Lugar Accesible

```bash
# Copiar a tu directorio home
sudo cp /etc/openvpn/client-configs/DCHPEF-ASU-1.ovpn ~/DCHPEF-ASU-1.ovpn
sudo chmod 644 ~/DCHPEF-ASU-1.ovpn

# Ahora puedes descargarlo por SFTP o copiarlo
```

### Opción C: Descargar por SFTP/SCP

Si tienes acceso SFTP desde tu máquina local:

```bash
# Desde tu máquina local (Windows/Mac/Linux)
scp root@tu-servidor:/etc/openvpn/client-configs/DCHPEF-ASU-1.ovpn ./
```

## 🔐 Paso 3: Transferir el Archivo de Forma Segura

**IMPORTANTE**: El archivo `.ovpn` contiene credenciales sensibles. Transfiérelo de forma segura:

- ✅ USB encriptado
- ✅ Email encriptado
- ✅ SFTP/SCP
- ✅ Servicio de transferencia segura
- ❌ NO por email sin encriptar
- ❌ NO por servicios de almacenamiento público sin encriptar

## 💻 Paso 4: Instalar en la Computadora Cliente

### Windows

1. **Instalar OpenVPN Client** (si no está instalado):
   - Descargar desde: https://openvpn.net/community-downloads/
   - Instalar y reiniciar

2. **Importar el Certificado**:
   - Copiar el archivo `DCHPEF-ASU-1.ovpn` a:
     ```
     C:\Program Files\OpenVPN\config\
     ```
   - O hacer doble clic en el archivo `.ovpn`

3. **Conectar**:
   - Click derecho en el icono de OpenVPN en la bandeja del sistema
   - Seleccionar "DCHPEF-ASU-1" y "Connect"

### Linux

```bash
# Instalar OpenVPN (si no está instalado)
sudo apt install openvpn

# Copiar el archivo
sudo cp DCHPEF-ASU-1.ovpn /etc/openvpn/client/

# Conectar
sudo openvpn --config /etc/openvpn/client/DCHPEF-ASU-1.ovpn
```

O usar NetworkManager:
```bash
sudo nmcli connection import type openvpn file DCHPEF-ASU-1.ovpn
```

## ✅ Paso 5: Verificar la Conexión

### En el Servidor

```bash
# Ver conexiones activas
sudo cat /var/log/openvpn-status.log

# Ver logs en tiempo real
sudo tail -f /var/log/openvpn.log
```

Deberías ver algo como:
```
CLIENT LIST
Updated,2025-12-08 15:45:00
Common Name,Real Address,Bytes Received,Bytes Sent,Connected Since
DCHPEF-ASU-1,144.202.77.18:12345,1234,5678,2025-12-08 15:44:30
```

### En la Computadora Cliente

1. **Verificar IP VPN**:
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   # o
   ip addr
   ```

   Deberías ver una interfaz `tun0` o similar con IP `10.8.0.x`

2. **Probar Acceso a la Aplicación**:
   - Abrir navegador
   - Ir a: `https://visitantes.cyberpol.com.py`
   - Debería funcionar normalmente (si `VPN_REQUIRED=true`)

## 🔍 Paso 6: Verificar en la Interfaz Web

1. Ir a `/vpn` como usuario "garv"
2. Buscar el certificado `DCHPEF-ASU-1`
3. Verificar que:
   - **Último Uso**: Muestra la fecha/hora actual
   - **IP**: Muestra la IP asignada (ej: `10.8.0.4`)
   - **Conexiones**: El contador aumenta

## 🎯 Resumen del Flujo Completo

1. ✅ Generar certificado: `sudo ./generate-certificate.sh DCHPEF-ASU-1 "" 365`
2. ✅ Registrar en BD: Desde `/vpn` → "Crear Certificado"
3. ⏭️ Obtener archivo `.ovpn`
4. ⏭️ Transferir a computadora cliente
5. ⏭️ Instalar cliente OpenVPN
6. ⏭️ Importar archivo `.ovpn`
7. ⏭️ Conectar a VPN
8. ⏭️ Verificar acceso a la aplicación

## 🆘 Si Hay Problemas

### No puedo conectarme a la VPN

```bash
# Ver logs en el servidor
sudo tail -n 50 /var/log/openvpn.log

# Verificar que OpenVPN esté corriendo
sudo systemctl status openvpn@server
```

### La aplicación no permite acceso

- Verificar que `VPN_REQUIRED=true` en `.env` (si quieres activar la verificación)
- Verificar que la IP esté en el rango `10.8.0.0/24`
- Ver logs del middleware

### El certificado no aparece en la lista

- Verificar que se registró correctamente en `/vpn`
- Verificar en la base de datos:
  ```sql
  SELECT * FROM vpn_certificates WHERE certificate_name = 'DCHPEF-ASU-1';
  ```

