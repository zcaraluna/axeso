# Configurar Servidor OpenVPN - Pasos Siguientes

La CA está lista. Ahora necesitas configurar el servidor OpenVPN.

## ✅ Paso 1: Verificar Archivos Generados

```bash
ls -la /etc/openvpn/ | grep -E "(ca.crt|server.crt|server.key|dh.pem|crl.pem)"
```

Deberías ver los 5 archivos necesarios.

## 🔧 Paso 2: Crear Configuración del Servidor

Crea el archivo de configuración:

```bash
sudo nano /etc/openvpn/server.conf
```

Copia y pega esta configuración:

```
port 1194
proto udp
dev tun
ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh.pem
server 10.8.0.0 255.255.255.0
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
keepalive 10 120
cipher AES-256-CBC
auth SHA256
comp-lzo
user nobody
group nogroup
persist-key
persist-tun
status /var/log/openvpn-status.log
log /var/log/openvpn.log
verb 3
crl-verify /etc/openvpn/crl.pem
```

Guarda con `Ctrl+O`, Enter, y sal con `Ctrl+X`.

## 🌐 Paso 3: Habilitar IP Forwarding

```bash
# Verificar si ya está habilitado
cat /proc/sys/net/ipv4/ip_forward

# Si muestra 0, habilitarlo
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verificar que ahora muestra 1
cat /proc/sys/net/ipv4/ip_forward
```

## 🔥 Paso 4: Configurar Firewall

```bash
# Verificar estado actual
sudo ufw status

# Permitir puerto OpenVPN
sudo ufw allow 1194/udp

# Asegurar que SSH esté permitido (importante!)
sudo ufw allow OpenSSH

# Habilitar firewall si no está habilitado
sudo ufw enable

# Verificar reglas
sudo ufw status numbered
```

## 🚀 Paso 5: Iniciar OpenVPN

```bash
# Habilitar servicio para que inicie automáticamente
sudo systemctl enable openvpn@server

# Iniciar servicio
sudo systemctl start openvpn@server

# Verificar estado
sudo systemctl status openvpn@server
```

Deberías ver `active (running)` en verde.

## ✅ Paso 6: Verificar que Funciona

```bash
# Ver conexiones activas (debería estar vacío por ahora)
sudo cat /var/log/openvpn-status.log

# Ver logs en tiempo real
sudo tail -f /var/log/openvpn.log
```

## 🎯 Siguiente Paso

Una vez que OpenVPN esté corriendo, puedes:
1. Generar certificados para las computadoras
2. Registrar certificados en la base de datos
3. Instalar certificados en las computadoras cliente

