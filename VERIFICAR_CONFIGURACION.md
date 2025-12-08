# Verificación de Configuración .env

## ✅ Tu Configuración Actual

```env
NEXTAUTH_SECRET="pcyFs8zcqR8LtOMI7dmPYBQU+ryuCVLJ4m0WlFPSABQ="
NEXT_PUBLIC_SITE_URL="https://visitantes.cyberpol.com.py"
NODE_ENV=production
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/controldeacceso"

# Configuración VPN
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED=false
VPN_API_TOKEN=D+/3Wc2iphTmn9NleUolBnygvAzTMXx/dWuapqAj1ZY=
VPN_API_URL=http://localhost:3000
```

## ✅ Análisis de tu Configuración

### Variables Correctas ✅

1. **NEXTAUTH_SECRET**: ✅ Correcto - Token seguro para JWT
2. **NEXT_PUBLIC_SITE_URL**: ✅ Correcto - Tu dominio de producción
3. **NODE_ENV**: ✅ Correcto - production
4. **DATABASE_URL**: ✅ Correcto - Conexión a PostgreSQL local
5. **VPN_RANGE**: ✅ Correcto - Rango estándar de OpenVPN
6. **VPN_REQUIRED**: ✅ Correcto - `false` por ahora (cambiar a `true` cuando OpenVPN esté listo)
7. **VPN_API_TOKEN**: ✅ Correcto - Token seguro generado
8. **VPN_API_URL**: ⚠️ **Necesita verificación** (ver abajo)

## 🔍 Verificar VPN_API_URL

### ¿Por qué `localhost:3000`?

El `VPN_API_URL` se usa en el script `register-connection.ts` que se ejecuta **en el servidor** cuando un cliente se conecta a OpenVPN. Este script necesita comunicarse con tu aplicación Next.js.

### Cuándo `localhost:3000` es Correcto ✅

- ✅ Si Next.js corre directamente en el puerto 3000
- ✅ Si usas PM2 y la app corre en puerto 3000
- ✅ Si nginx hace proxy a `localhost:3000`
- ✅ El script se ejecuta en el mismo servidor donde corre Next.js

### Cuándo Necesitarías Cambiarlo ⚠️

- ⚠️ Si Next.js corre en otro puerto (ej: 3001, 8080)
- ⚠️ Si la app corre en un contenedor Docker con puerto diferente
- ⚠️ Si hay configuración especial de red

## 🧪 Cómo Verificar que es Correcto

### Método 1: Verificar Puerto en Uso

En el servidor, ejecuta:

```bash
# Ver qué proceso está usando el puerto 3000
sudo netstat -tlnp | grep :3000
# o
sudo ss -tlnp | grep :3000
# o
sudo lsof -i :3000
```

Deberías ver algo como:
```
tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
```

### Método 2: Verificar con PM2

Si usas PM2:

```bash
pm2 list
pm2 info axeso
```

Revisa el puerto en la información mostrada.

### Método 3: Probar Conexión Directa

En el servidor, prueba:

```bash
# Probar que la API responde en localhost:3000
curl http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

Si obtienes una respuesta (aunque sea un error de autenticación), el puerto es correcto.

### Método 4: Verificar Variables de Entorno de la App

Si la app está corriendo, verifica:

```bash
# Si usas PM2
pm2 env axeso | grep PORT

# O revisa el proceso directamente
ps aux | grep node
```

## 📝 Configuración Recomendada

### Escenario 1: Aplicación con PM2 (Puerto 3000 por defecto)

```env
VPN_API_URL=http://localhost:3000
```

✅ **Tu configuración actual es correcta**

### Escenario 2: Puerto Personalizado

Si configuraste `PORT=8080` en tu `.env`:

```env
PORT=8080
VPN_API_URL=http://localhost:8080
```

### Escenario 3: Docker o Contenedor

Si la app corre en Docker:

```env
VPN_API_URL=http://host.docker.internal:3000
# o la IP del contenedor
```

## ✅ Conclusión

**Tu configuración `VPN_API_URL=http://localhost:3000` es CORRECTA** si:

1. ✅ Next.js corre en el puerto 3000 (por defecto)
2. ✅ El script de OpenVPN se ejecuta en el mismo servidor
3. ✅ No hay configuración especial de puertos

## 🧪 Prueba Rápida

Para estar 100% seguro, ejecuta esto en tu servidor:

```bash
# 1. Verificar que algo escucha en puerto 3000
curl -I http://localhost:3000

# 2. Si la app está corriendo, deberías ver headers HTTP
# Si no está corriendo, verás "Connection refused"
```

## ⚠️ Nota Importante

El `VPN_API_URL` solo se usa cuando:
- Un cliente se conecta a OpenVPN
- El script `register-connection.ts` se ejecuta
- Necesita registrar la conexión en la base de datos

**No afecta el acceso normal de usuarios a la aplicación web.**

## 🚀 Siguiente Paso

Una vez verificado, puedes continuar con:

1. ✅ Configuración de variables de entorno - **COMPLETADO**
2. ⏭️ Instalar OpenVPN en el servidor
3. ⏭️ Generar certificados para computadoras

