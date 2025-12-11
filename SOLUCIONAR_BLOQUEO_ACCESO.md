# Solucionar Bloqueo de Acceso Después de Configurar NAT

## 🔍 Diagnóstico

Después de agregar las reglas de NAT para el VPN, el tráfico HTTP/HTTPS entrante podría estar bloqueado.

## ✅ Solución Rápida

### Paso 1: Verificar Reglas Actuales

```bash
# Ver todas las reglas de iptables
sudo iptables -L -n -v

# Ver reglas de NAT
sudo iptables -t nat -L -n -v

# Verificar si UFW está activo
sudo ufw status
```

### Paso 2: Asegurar que HTTP/HTTPS Estén Permitidos

Si usas **UFW**:

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar estado
sudo ufw status numbered
```

Si usas **iptables directamente** (sin UFW):

```bash
# Permitir HTTP (puerto 80)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Permitir HTTPS (puerto 443)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Guardar reglas
sudo netfilter-persistent save
```

### Paso 3: Verificar que las Reglas de NAT Estén Correctas

Las reglas de NAT que agregaste son correctas y **NO deberían** bloquear el tráfico entrante:

```bash
# Verificar regla NAT
sudo iptables -t nat -L POSTROUTING -n -v

# Deberías ver algo como:
# MASQUERADE  all  --  10.8.0.0/24  *  0.0.0.0/0
```

### Paso 4: Verificar Orden de las Reglas

El problema podría ser el **orden** de las reglas. Las reglas de INPUT deben estar **antes** de cualquier regla que bloquee:

```bash
# Ver reglas INPUT en orden
sudo iptables -L INPUT -n -v --line-numbers

# Si hay una regla DROP o REJECT al final, las reglas de ACCEPT deben estar antes
```

### Paso 5: Solución Completa (Si UFW está activo)

```bash
# 1. Verificar estado actual
sudo ufw status numbered

# 2. Asegurar que HTTP/HTTPS estén permitidos
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Asegurar que OpenVPN esté permitido
sudo ufw allow 1194/udp

# 4. Asegurar que SSH esté permitido (IMPORTANTE!)
sudo ufw allow OpenSSH
sudo ufw allow 22/tcp

# 5. Verificar estado final
sudo ufw status numbered

# 6. Si todo está bien, no necesitas recargar (las reglas se aplican inmediatamente)
```

### Paso 6: Solución Completa (Si NO usas UFW)

```bash
# 1. Verificar reglas actuales
sudo iptables -L INPUT -n -v --line-numbers

# 2. Agregar reglas para permitir tráfico entrante (si no existen)
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 2 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 3 -p tcp --dport 22 -j ACCEPT
sudo iptables -I INPUT 4 -p udp --dport 1194 -j ACCEPT

# 3. Verificar que se agregaron
sudo iptables -L INPUT -n -v --line-numbers

# 4. Guardar permanentemente
sudo netfilter-persistent save
```

## 🔧 Verificación Final

```bash
# 1. Verificar que el servidor web está escuchando
sudo ss -tlnp | grep -E ':(80|443|3000)'

# 2. Probar conexión local
curl -I http://localhost:3000

# 3. Verificar logs de nginx
sudo tail -f /var/log/nginx/error.log

# 4. Verificar que no hay reglas que bloqueen
sudo iptables -L INPUT -n -v | grep -E "(DROP|REJECT)"
```

## ⚠️ Si Aún No Funciona

Si después de estos pasos aún no funciona:

1. **Verificar que Nginx esté corriendo:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Verificar que la aplicación Next.js esté corriendo:**
   ```bash
   pm2 status
   pm2 logs axeso --lines 20
   ```

3. **Verificar conectividad desde fuera:**
   ```bash
   # Desde otra máquina, probar:
   curl -I https://visitantes.cyberpol.com.py
   ```

4. **Revisar logs del sistema:**
   ```bash
   sudo journalctl -u nginx -n 50
   sudo dmesg | tail -20
   ```

## 📝 Nota Importante

Las reglas de NAT que agregaste (`MASQUERADE`) **solo afectan el tráfico saliente** del VPN. No deberían bloquear el tráfico entrante HTTP/HTTPS. El problema probablemente es que:

1. UFW está bloqueando el tráfico entrante
2. Hay reglas de iptables que bloquean antes de permitir
3. El orden de las reglas es incorrecto

La solución más común es asegurar que los puertos 80 y 443 estén explícitamente permitidos en UFW o iptables.




