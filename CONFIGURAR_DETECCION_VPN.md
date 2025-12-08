# Configurar Detección de VPN

Para que la página detecte cuando estás conectado por VPN, necesitas configurar el hook de OpenVPN que registra las conexiones.

## Pasos para Configurar

### 1. Configurar el hook en OpenVPN

Ejecuta en el servidor:

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
sudo bash scripts/vpn/configurar-openvpn-hooks.sh
```

Este script:
- Agrega `client-connect` a la configuración de OpenVPN
- Configura las variables de entorno necesarias
- Verifica que todo esté correcto

### 2. Configurar Variables de Entorno

Edita el archivo de override de systemd:

```bash
sudo nano /etc/systemd/system/openvpn@server.service.d/override.conf
```

Asegúrate de que tenga:

```ini
[Service]
Environment="VPN_API_URL=http://localhost:3000"
Environment="VPN_API_TOKEN=TU_TOKEN_AQUI"
Environment="NODE_ENV=production"
```

**IMPORTANTE**: Reemplaza `TU_TOKEN_AQUI` con el valor de `VPN_API_TOKEN` de tu archivo `.env`.

### 3. Recargar y Reiniciar

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Reiniciar OpenVPN
sudo systemctl restart openvpn@server

# Verificar que está corriendo
sudo systemctl status openvpn@server
```

### 4. Verificar que Funciona

1. **Conéctate a la VPN** desde tu computadora
2. **Verifica los logs** de OpenVPN:
   ```bash
   sudo journalctl -u openvpn@server -f
   ```
   Deberías ver: `Conexión registrada: ADMIN-GARV1 -> 10.8.0.6`

3. **Verifica en la base de datos**:
   ```bash
   # Conectarse a PostgreSQL
   sudo -u postgres psql controldeacceso
   
   # Ver conexiones recientes
   SELECT * FROM vpn_connections ORDER BY "connectedAt" DESC LIMIT 5;
   ```

4. **Prueba el acceso**:
   - Visita: `https://visitantes.cyberpol.com.py/api/debug-ip`
   - Debería mostrar: `isVpnConnected: true`

## Cómo Funciona

1. **Cuando te conectas a VPN**: OpenVPN ejecuta el script `register-connection.ts` que registra tu conexión en la base de datos con:
   - `ipAddress`: Tu IP VPN (10.8.0.6)
   - `realIpAddress`: Tu IP pública (181.91.85.248)

2. **Cuando accedes a la página**: El middleware verifica:
   - Primero: ¿Tu IP está en el rango VPN (10.8.0.0/24)? → NO
   - Segundo: ¿Hay una conexión VPN activa registrada para tu IP pública? → SÍ
   - Resultado: Permite el acceso

## Solución de Problemas

### El script no se ejecuta

Verifica que:
- El hook esté en `/etc/openvpn/server.conf`: `grep client-connect /etc/openvpn/server.conf`
- Node.js esté instalado: `which node`
- ts-node esté instalado: `which ts-node` o `npm list -g ts-node`

### Las conexiones no se registran

Verifica los logs:
```bash
sudo journalctl -u openvpn@server -n 50
```

Busca errores relacionados con el script.

### La página no detecta la conexión

1. Verifica que hay una conexión activa en la BD:
   ```sql
   SELECT * FROM vpn_connections WHERE "realIpAddress" = 'TU_IP_PUBLICA' ORDER BY "connectedAt" DESC LIMIT 1;
   ```

2. Verifica que `VPN_API_TOKEN` esté configurado correctamente en ambos lugares:
   - En `.env` de la aplicación
   - En el override de systemd

3. Prueba el endpoint manualmente:
   ```bash
   curl -H "X-API-Token: TU_TOKEN" "http://localhost:3000/api/vpn/connections?check=true&realIp=TU_IP_PUBLICA"
   ```

