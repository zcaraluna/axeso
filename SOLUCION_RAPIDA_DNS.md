# Solución Rápida: Problema de DNS

## 🔴 Problema Detectado

El diagnóstico muestra que:
- ❌ El dominio `visitantes.cyberpol.com.py` **NO resuelve** a ninguna IP
- ❌ **NO existe** un registro A para el subdominio `visitantes` en Hestia CP
- ⚠️ Nginx está configurado para escuchar solo en `144.202.77.18:443` (debe ser `443`)

## ✅ Solución Paso a Paso

### Paso 1: Corregir Nginx y DNS (TODO EN UNO)

Ejecuta este script en el servidor que corrige Nginx y verifica DNS:

```bash
sudo bash scripts/corregir-dns-y-nginx.sh
```

Este script:
- ✅ Corrige `listen` en Nginx para escuchar en todas las interfaces
- ✅ Corrige `proxy_pass` para usar `localhost:3000`
- ✅ Verifica la configuración DNS actual
- ✅ Te indica exactamente qué hacer para crear el registro DNS

### Paso 2: Crear el Registro DNS en Hestia CP

**IMPORTANTE**: `visitantes.cyberpol.com.py` es un **subdominio** de `cyberpol.com.py`. El registro debe agregarse en la zona DNS de `cyberpol.com.py`, NO como dominio separado.

#### Opción A: Desde el Panel Web de Hestia

1. Accede a Hestia CP: `https://144.202.77.18:8083` (o la IP de tu servidor)
2. Inicia sesión con tus credenciales
3. Ve a **"DNS"** → **"DNS Domains"**
4. Busca y selecciona **"cyberpol.com.py"** (el dominio raíz)
5. Haz clic en **"Add Record"** o **"Agregar Registro"**
6. Completa el formulario:
   - **Tipo**: `A`
   - **Nombre**: `visitantes` (solo el subdominio, sin `.cyberpol.com.py`)
   - **Valor**: `144.202.77.18`
   - **TTL**: `3600` (o el valor por defecto)
7. Haz clic en **"Save"** o **"Guardar"**

#### Opción B: Desde la Línea de Comandos

```bash
/usr/local/hestia/bin/v-add-dns-record cyberpol cyberpol.com.py visitantes A 144.202.77.18
```

### Paso 3: Verificar que el DNS Funciona

Espera 1-2 minutos y luego verifica:

```bash
# Desde el servidor
dig visitantes.cyberpol.com.py +short
# Debe devolver: 144.202.77.18

# Desde servidores públicos
dig @8.8.8.8 visitantes.cyberpol.com.py +short
dig @1.1.1.1 visitantes.cyberpol.com.py +short
```

### Paso 4: Verificar que Nginx Está Escuchando Correctamente

```bash
# Debe mostrar que escucha en 0.0.0.0:443 (todas las interfaces)
ss -tlnp | grep nginx | grep 443
```

Deberías ver algo como:
```
LISTEN 0 511 0.0.0.0:443 0.0.0.0:* users:(("nginx",...))
```

Si ves `144.202.77.18:443`, ejecuta nuevamente el script de corrección.

### Paso 5: Probar Acceso

1. Espera 5-10 minutos para que el DNS se propague
2. Prueba acceder desde el navegador: `https://visitantes.cyberpol.com.py`
3. Si aún no funciona, verifica desde diferentes ubicaciones o usa un servicio online:
   - https://www.whatsmydns.net/#A/visitantes.cyberpol.com.py

## 🔍 Verificación Completa

Ejecuta el diagnóstico completo para verificar todo:

```bash
sudo bash scripts/diagnostico-dns-completo.sh
```

## ⚠️ Solución Temporal (Solo para Pruebas)

Si necesitas probar inmediatamente mientras se propaga el DNS, agrega el dominio al archivo `hosts` de Windows:

```powershell
# Ejecutar PowerShell como Administrador
.\scripts\fix-dns-windows.bat
```

O manualmente:
1. Abre `C:\Windows\System32\drivers\etc\hosts` como Administrador
2. Agrega esta línea al final:
   ```
   144.202.77.18    visitantes.cyberpol.com.py
   ```
3. Guarda y ejecuta: `ipconfig /flushdns`

**Nota**: Esto solo funciona en tu computadora. Otros usuarios seguirán sin poder acceder hasta que el DNS esté configurado correctamente.

## 📋 Checklist

- [ ] Ejecutado `scripts/corregir-dns-y-nginx.sh`
- [ ] Creado registro A para `visitantes` en Hestia CP (zona `cyberpol.com.py`)
- [ ] Verificado que DNS resuelve: `dig visitantes.cyberpol.com.py +short`
- [ ] Verificado que Nginx escucha en todas las interfaces: `ss -tlnp | grep nginx`
- [ ] Probado acceso desde navegador: `https://visitantes.cyberpol.com.py`

## 🚨 Si Aún No Funciona

1. **Verifica los logs de Nginx**:
   ```bash
   tail -f /var/log/apache2/domains/visitantes.cyberpol.com.py.error.log
   ```

2. **Verifica que Next.js está corriendo**:
   ```bash
   pm2 status
   ```

3. **Verifica el firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow 443/tcp
   ```

4. **Verifica que el certificado SSL existe**:
   ```bash
   ls -la /home/cyberpol/conf/web/visitantes.cyberpol.com.py/ssl/
   ```

