# Configurar CA de OpenVPN Manualmente

El directorio `/etc/openvpn/easy-rsa` existe pero está vacío. Vamos a configurarlo manualmente.

## 🔧 Pasos para Configurar la CA

### Paso 1: Verificar que easy-rsa esté instalado

```bash
which easyrsa
dpkg -l | grep easy-rsa
```

### Paso 2: Crear el directorio de trabajo

```bash
# El directorio ya existe pero está vacío, así que podemos continuar
cd /etc/openvpn/easy-rsa
```

### Paso 3: Inicializar easy-rsa

```bash
# Copiar plantillas de easy-rsa
/usr/bin/make-cadir /etc/openvpn/easy-rsa

# O si eso no funciona, copiar manualmente desde /usr/share/easy-rsa
cp -r /usr/share/easy-rsa/* /etc/openvpn/easy-rsa/
```

### Paso 4: Configurar variables

```bash
cd /etc/openvpn/easy-rsa

# Crear archivo vars con configuración
cat > vars <<'EOF'
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

# Cargar las variables
source ./vars
```

### Paso 5: Inicializar PKI

```bash
cd /etc/openvpn/easy-rsa
./easyrsa init-pki
```

### Paso 6: Crear la CA

```bash
cd /etc/openvpn/easy-rsa
./easyrsa build-ca
```

**⚠️ IMPORTANTE**: Te pedirá una contraseña para la CA. **Guárdala en un lugar seguro**.

### Paso 7: Generar certificado del servidor

```bash
cd /etc/openvpn/easy-rsa
./easyrsa gen-req server nopass
./easyrsa sign-req server server
```

### Paso 8: Generar parámetros Diffie-Hellman

```bash
cd /etc/openvpn/easy-rsa
./easyrsa gen-dh
```

**⏱️ Esto puede tardar varios minutos** (5-15 minutos dependiendo del servidor).

### Paso 9: Copiar archivos a /etc/openvpn

```bash
# Copiar certificados
cp /etc/openvpn/easy-rsa/pki/ca.crt /etc/openvpn/
cp /etc/openvpn/easy-rsa/pki/issued/server.crt /etc/openvpn/
cp /etc/openvpn/easy-rsa/pki/private/server.key /etc/openvpn/
cp /etc/openvpn/easy-rsa/pki/dh.pem /etc/openvpn/

# Establecer permisos
chmod 600 /etc/openvpn/server.key
chmod 644 /etc/openvpn/ca.crt
chmod 644 /etc/openvpn/server.crt
chmod 644 /etc/openvpn/dh.pem
```

### Paso 10: Generar CRL (Lista de Revocación)

```bash
cd /etc/openvpn/easy-rsa
./easyrsa gen-crl
cp /etc/openvpn/easy-rsa/pki/crl.pem /etc/openvpn/
chmod 644 /etc/openvpn/crl.pem
```

### Paso 11: Verificar que todo esté listo

```bash
ls -la /etc/openvpn/ | grep -E "(ca.crt|server.crt|server.key|dh.pem|crl.pem)"
```

Deberías ver estos 5 archivos:
- `ca.crt`
- `server.crt`
- `server.key`
- `dh.pem`
- `crl.pem`

## ✅ Una vez completado

Puedes continuar con la configuración del servidor OpenVPN.

