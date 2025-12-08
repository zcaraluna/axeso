# Solución: Agregar Headers de IP en Nginx (HestiaCP)

Estás usando HestiaCP, que genera la configuración de nginx automáticamente. Necesitamos agregar los headers de IP.

## ⚠️ Problema: No se puede duplicar `location /`

Nginx no permite tener dos bloques `location /` en el mismo contexto. Necesitamos modificar el archivo principal directamente.

## 🔧 Solución: Modificar el Archivo Principal

### Paso 1: Editar el Archivo de Configuración SSL

```bash
sudo nano /home/cyberpol/conf/web/visitantes.cyberpol.com.py/nginx.ssl.conf
```

### Paso 2: Agregar Headers en `location /`

Busca el bloque `location /` y agrega estas líneas **después** de `proxy_pass`:

```nginx
location / {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:3000;
    
    # AGREGAR ESTAS LÍNEAS (después de proxy_pass):
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # ... resto de la configuración existente
}
```

### Paso 3: Agregar Headers en `location @fallback`

Busca el bloque `location @fallback` y agrega las mismas líneas:

```nginx
location @fallback {
    proxy_ssl_server_name on;
    proxy_ssl_name $host;
    proxy_pass http://144.202.77.18:3000;
    
    # AGREGAR ESTAS LÍNEAS (después de proxy_pass):
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Paso 4: Verificar y Recargar

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ⚠️ Advertencia sobre HestiaCP

**IMPORTANTE**: Si HestiaCP regenera la configuración, estos cambios se perderán. 

**Opciones**:
1. **Hacer backup** del archivo modificado
2. **Desactivar regeneración automática** en HestiaCP (si es posible)
3. **Crear un script** que reaplique los cambios después de regenerar

## 🔍 Verificar que Funciona

Después de agregar la configuración:

1. Acceder a: `https://visitantes.cyberpol.com.py/api/debug-ip`
2. Deberías ver la IP real del cliente en la respuesta
3. Si la IP NO está en el rango `10.8.0.0/24`, debería bloquear el acceso

