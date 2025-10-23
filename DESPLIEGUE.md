# Guía de Despliegue - Sistema de Control de Acceso aXeso

## Despliegue en VPS Ubuntu (Recomendado para Producción)

### Requisitos del Servidor
- Ubuntu 20.04 LTS o superior
- Mínimo 2GB RAM
- 20GB espacio en disco
- Acceso root/sudo

### Despliegue Automatizado

#### 1. Preparar el Servidor

```bash
# Conectar al VPS
ssh usuario@tu-servidor.com

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Git
sudo apt install git -y
```

#### 2. Clonar y Desplegar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/controldeacceso.git
cd controldeacceso

# Ejecutar script de despliegue automático
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 3. Configurar Variables de Entorno

```bash
# Editar archivo de configuración
nano .env.local

# Configurar con datos reales:
DATABASE_URL="postgresql://controldeacceso:tu_password_seguro@localhost:5432/controldeacceso"
NEXTAUTH_SECRET="tu-jwt-secret-super-seguro-cambiar-en-produccion"
NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
```

#### 4. Configurar Nginx

```bash
# Copiar configuración de nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/axeso

# Editar con tu dominio
sudo nano /etc/nginx/sites-available/axeso

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/axeso /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Configurar renovación automática
sudo crontab -e
# Añadir línea: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Gestión y Mantenimiento

### Comandos Útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs axeso

# Reiniciar aplicación
pm2 restart axeso

# Detener aplicación
pm2 stop axeso

# Ver logs de nginx
sudo tail -f /var/log/nginx/axeso_access.log
sudo tail -f /var/log/nginx/axeso_error.log
```

### Actualización de la Aplicación

```bash
# Usar script de actualización automática
./scripts/update.sh

# O manualmente:
pm2 stop axeso
git pull origin main
npm ci --production
npx prisma migrate deploy
npm run build
pm2 restart axeso
```

### Backup de Base de Datos

```bash
# Backup manual
./scripts/backup.sh

# Configurar backup automático diario
sudo crontab -e
# Añadir línea: 0 2 * * * /ruta/completa/al/proyecto/scripts/backup.sh
```

### Monitoreo

```bash
# Ver uso de recursos
pm2 monit

# Ver logs de sistema
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

## Seguridad para Producción

### Configuración de Firewall

```bash
# Configurar UFW (Uncomplicated Firewall)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

### Variables de Entorno Críticas

```bash
# Editar .env.local con valores seguros
nano .env.local

# Cambiar estos valores:
DATABASE_URL="postgresql://controldeacceso:PASSWORD_SEGURO@localhost:5432/controldeacceso"
NEXTAUTH_SECRET="GENERAR_SECRET_SEGURO_DE_32_CARACTERES"
NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
```

### Generar Secret Seguro

```bash
# Generar secret seguro para JWT
openssl rand -base64 32
```

## Solución de Problemas

### La aplicación no inicia

```bash
# Verificar logs
pm2 logs axeso

# Verificar puerto
sudo netstat -tlnp | grep :3000

# Verificar base de datos
sudo -u postgres psql -c "\l"
```

### Error de base de datos

```bash
# Verificar conexión
sudo -u postgres psql -d controldeacceso

# Verificar migraciones
npx prisma migrate status

# Aplicar migraciones
npx prisma migrate deploy
```

### Error de permisos

```bash
# Verificar permisos de archivos
ls -la

# Corregir permisos
chmod +x scripts/*.sh
chown -R $USER:$USER .
```

## Checklist de Despliegue

- [ ] Servidor Ubuntu actualizado
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL instalado y configurado
- [ ] Variables de entorno configuradas
- [ ] Aplicación compilada y funcionando
- [ ] PM2 configurado y ejecutándose
- [ ] Nginx configurado y funcionando
- [ ] SSL configurado con Let's Encrypt
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoreo configurado


