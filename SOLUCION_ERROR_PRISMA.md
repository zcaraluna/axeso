# Solución: Error de Prisma en el VPS

El error indica que Prisma no reconoce el modelo `vpnCertificate`. Esto significa que el cliente de Prisma no se ha regenerado después de la migración.

## 🔧 Solución

Ejecuta estos comandos en el VPS:

```bash
# 1. Ir al directorio del proyecto
cd /home/cyberpol/web/visitantes.cyberpol.com.py/public_html

# 2. Regenerar el cliente de Prisma
npx prisma generate

# 3. Verificar que la migración esté aplicada
npx prisma migrate status

# 4. Si la migración no está aplicada, aplicarla
npx prisma migrate deploy

# 5. Recompilar la aplicación
npm run build
```

## 📋 Verificar el Schema

También verifica que el schema tenga el modelo correcto:

```bash
# Ver el schema
cat prisma/schema.prisma | grep -A 20 "model VpnCertificate"
```

Deberías ver:
```
model VpnCertificate {
  id              String   @id @default(cuid())
  userId          String?
  ...
}
```

## ✅ Después de Regenerar

Una vez regenerado el cliente, el build debería funcionar correctamente.

