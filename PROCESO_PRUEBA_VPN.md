# Proceso de Prueba de OpenVPN

## ⚠️ Importante: Orden Correcto de Pruebas

**NO actives `VPN_REQUIRED=true` hasta que hayas verificado que la conexión VPN funciona correctamente.**

## 📋 Proceso Recomendado

### Fase 1: Probar Conexión VPN (con VPN_REQUIRED=false)

**Estado actual**: `VPN_REQUIRED=false` en tu `.env`

1. **Instalar certificado en computadora cliente**
   - Obtener archivo `.ovpn`
   - Instalar cliente OpenVPN
   - Importar certificado
   - Conectar a VPN

2. **Verificar conexión VPN**
   ```bash
   # En el servidor - ver conexiones activas
   sudo cat /var/log/openvpn-status.log
   
   # Deberías ver algo como:
   # DCHPEF-ASU-1,144.202.77.18:12345,...
   ```

3. **Verificar IP asignada**
   - En la computadora cliente, verificar que tiene IP `10.8.0.x`
   - Windows: `ipconfig`
   - Linux: `ifconfig` o `ip addr`

4. **Probar acceso a la aplicación (sin restricción)**
   - Con VPN conectada, acceder a `https://visitantes.cyberpol.com.py`
   - Debería funcionar normalmente
   - Esto confirma que la VPN funciona

### Fase 2: Activar Verificación VPN (VPN_REQUIRED=true)

**Solo después de verificar que la VPN funciona:**

1. **Editar `.env` en el servidor**:
   ```bash
   nano /home/cyberpol/web/visitantes.cyberpol.com.py/public_html/.env
   ```

2. **Cambiar**:
   ```env
   VPN_REQUIRED=true  # Cambiar de false a true
   ```

3. **Reiniciar aplicación**:
   ```bash
   pm2 restart axeso --update-env
   ```

4. **Probar acceso**:
   - **Sin VPN**: Intentar acceder → Debería redirigir a `/vpn-setup`
   - **Con VPN**: Intentar acceder → Debería funcionar normalmente

## 🧪 Pruebas a Realizar

### Prueba 1: Acceso SIN VPN (VPN_REQUIRED=true)

1. Desconectar VPN en la computadora cliente
2. Intentar acceder a `https://visitantes.cyberpol.com.py`
3. **Resultado esperado**: Redirige a `/vpn-setup` con mensaje de conexión requerida

### Prueba 2: Acceso CON VPN (VPN_REQUIRED=true)

1. Conectar VPN en la computadora cliente
2. Esperar unos segundos para que se establezca la conexión
3. Intentar acceder a `https://visitantes.cyberpol.com.py`
4. **Resultado esperado**: Acceso normal a la aplicación

### Prueba 3: Verificar Registro de Conexión

1. Conectar VPN
2. Ir a `/vpn` como usuario "garv"
3. Buscar certificado `DCHPEF-ASU-1`
4. **Verificar**:
   - Último uso: Fecha/hora actual
   - IP: `10.8.0.x`
   - Conexiones: Contador incrementado

## ⚠️ Advertencias

### Si Activas VPN_REQUIRED=true Antes de Probar:

- ❌ No podrás acceder a la aplicación sin VPN
- ❌ Si la VPN no funciona, estarás bloqueado
- ❌ Tendrás que desactivar manualmente desde el servidor

### Si Algo Sale Mal:

1. **Desactivar verificación temporalmente**:
   ```bash
   # En el servidor
   nano .env
   # Cambiar VPN_REQUIRED=false
   pm2 restart axeso --update-env
   ```

2. **Verificar logs**:
   ```bash
   pm2 logs axeso
   sudo tail -f /var/log/openvpn.log
   ```

## ✅ Checklist Antes de Activar VPN_REQUIRED=true

- [ ] Certificado generado y registrado en BD
- [ ] Archivo `.ovpn` obtenido
- [ ] Cliente OpenVPN instalado en computadora cliente
- [ ] Certificado importado en cliente
- [ ] Conexión VPN establecida exitosamente
- [ ] IP VPN asignada (`10.8.0.x`)
- [ ] Acceso a aplicación funciona CON VPN (con VPN_REQUIRED=false)
- [ ] Conexión aparece en logs del servidor
- [ ] Conexión aparece en `/vpn` (último uso, IP, etc.)

## 🚀 Orden Recomendado

1. **Primero**: Probar todo con `VPN_REQUIRED=false`
2. **Verificar**: Que VPN funciona correctamente
3. **Luego**: Activar `VPN_REQUIRED=true`
4. **Finalmente**: Probar acceso con y sin VPN

