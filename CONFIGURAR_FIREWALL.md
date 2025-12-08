# Configurar Firewall para OpenVPN

UFW no está instalado. Tienes dos opciones:

## Opción 1: Instalar UFW (Recomendado - Más Simple)

```bash
# Instalar UFW
sudo apt update
sudo apt install -y ufw

# Configurar reglas
sudo ufw allow 1194/udp
sudo ufw allow OpenSSH
sudo ufw allow 22/tcp  # SSH alternativo
sudo ufw enable

# Verificar estado
sudo ufw status numbered
```

## Opción 2: Usar iptables Directamente

Si prefieres usar iptables directamente (ya está instalado):

```bash
# Permitir OpenVPN (puerto 1194 UDP)
sudo iptables -A INPUT -p udp --dport 1194 -j ACCEPT

# Permitir SSH (puerto 22 TCP)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Guardar reglas (depende de tu sistema)
# Para Ubuntu/Debian con iptables-persistent:
sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# O si usas otro método:
sudo iptables-save > /etc/iptables/rules.v4
```

## Verificar Firewall Actual

Primero, verifica qué firewall está activo:

```bash
# Ver reglas iptables actuales
sudo iptables -L -n -v

# Ver si hay algún firewall activo
sudo systemctl status firewalld 2>/dev/null || echo "firewalld no está instalado"
```

## Recomendación

**Instala UFW** - Es más simple y fácil de gestionar:

```bash
sudo apt update
sudo apt install -y ufw
sudo ufw allow 1194/udp
sudo ufw allow OpenSSH
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

