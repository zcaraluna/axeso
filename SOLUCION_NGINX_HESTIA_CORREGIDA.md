# Solución Corregida: Headers de IP en Nginx (HestiaCP)

El problema es que no puedes duplicar `location /`. Necesitamos agregar los headers de otra manera.

## 🔧 Solución: Agregar Headers en el Bloque Server

### Opción 1: Archivo de Configuración en el Bloque Server

```bash
sudo nano /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf_custom
```

Pega este contenido (sin bloques location):

```nginx
# Headers para pasar la IP real del cliente a Next.js
# Estos headers se aplican a todos los location blocks
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Opción 2: Modificar el Archivo Principal (Temporal)

Si la Opción 1 no funciona, puedes modificar directamente el archivo principal:

```bash
sudo nano /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf
```

Agregar estas líneas dentro del bloque `location /` (después de `proxy_pass`):

```nginx
location / {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:3000;
    
    # AGREGAR ESTAS LÍNEAS:
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # ... resto de la configuración
}
```

Y también en `location @fallback`:

```nginx
location @fallback {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:3000;
    
    # AGREGAR ESTAS LÍNEAS:
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Paso 2: Recargar Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ⚠️ Advertencia sobre HestiaCP

Si HestiaCP regenera la configuración, estos cambios se perderán. En ese caso, necesitarás:
1. Hacer un backup del archivo modificado
2. O configurar HestiaCP para que no regenere automáticamente
3. O usar un script que reaplique los cambios después de regenerar

