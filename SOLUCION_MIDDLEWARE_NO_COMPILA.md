# Solución: Middleware No Se Está Compilando

## Problema
El archivo `.next/server/middleware.js` no existe, lo que significa que Next.js no está compilando el middleware.

## Pasos de Solución

### 1. Verificar que middleware.ts existe en el servidor

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
ls -la middleware.ts
```

Si no existe, necesitas copiarlo desde tu repositorio local.

### 2. Verificar que no hay errores de compilación

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
npm run build 2>&1 | tee build.log
```

Revisa el archivo `build.log` para ver si hay errores relacionados con el middleware.

### 3. Verificar la estructura del proyecto

El middleware debe estar en la **raíz del proyecto**, al mismo nivel que `package.json`:

```
public_html/
├── middleware.ts  ← DEBE ESTAR AQUÍ
├── package.json
├── next.config.ts
├── app/
├── lib/
└── ...
```

### 4. Limpiar y reconstruir

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html
rm -rf .next
npm run build
```

### 5. Verificar que se compiló

```bash
ls -la .next/server/middleware.js
```

Si ahora existe, el middleware se compiló correctamente.

### 6. Reiniciar PM2

```bash
pm2 restart axeso --update-env
```

### 7. Verificar logs

```bash
pm2 logs axeso --lines 50
```

Intenta acceder a `/dashboard` y deberías ver logs del middleware.

## Posibles Causas

1. **El archivo middleware.ts no está en el servidor**: Necesitas hacer `git pull` o copiarlo manualmente
2. **Error de compilación**: El build falla silenciosamente
3. **Configuración incorrecta**: Next.js no detecta el middleware
4. **Cache corrupto**: El directorio `.next` tiene archivos corruptos

## Solución Rápida

```bash
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html

# 1. Verificar que middleware.ts existe
ls -la middleware.ts

# 2. Si no existe, hacer pull o copiarlo
git pull

# 3. Limpiar y reconstruir
rm -rf .next
npm run build

# 4. Verificar compilación
ls -la .next/server/middleware.js

# 5. Reiniciar
pm2 restart axeso --update-env

# 6. Ver logs
pm2 logs axeso --lines 50
```

