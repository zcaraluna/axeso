# Cómo Funciona el Archivo de Estado de OpenVPN

## ¿Se elimina el archivo?

**NO**, el archivo **NO se elimina**. Lo que hace OpenVPN es **sobrescribirlo** completamente cada cierto tiempo.

## ¿Cómo se actualiza?

OpenVPN actualiza el archivo automáticamente según la configuración en `/etc/openvpn/server.conf`:

```
status /var/log/openvpn-status.log 10
```

El `10` al final significa que se actualiza **cada 10 segundos**.

## Proceso de actualización

1. **OpenVPN lee el estado actual** de todas las conexiones
2. **Escribe el contenido completo** al archivo (sobrescribe todo)
3. **Espera 10 segundos**
4. **Repite el proceso**

## ¿Qué significa esto?

- El archivo **siempre existe** (no se elimina)
- El contenido **cambia completamente** cada 10 segundos
- Si te conectas, tu IP **aparecerá** en la próxima actualización (máximo 10 segundos)
- Si te desconectas, tu IP **desaparecerá** en la próxima actualización (máximo 10 segundos)

## Ejemplo del proceso

### Segundo 0: Te conectas a la VPN
```
Archivo: (vacío o sin tu IP)
```

### Segundo 10: OpenVPN actualiza el archivo
```
Archivo: CLIENT_LIST,tu-nombre,181.91.85.248:30517,10.8.0.6,...
         ROUTING_TABLE,10.8.0.6,tu-nombre,181.91.85.248:30517,2025-12-16 02:40:10,...
```
✅ Tu IP ahora aparece

### Segundo 20: OpenVPN actualiza de nuevo
```
Archivo: CLIENT_LIST,tu-nombre,181.91.85.248:30517,10.8.0.6,...
         ROUTING_TABLE,10.8.0.6,tu-nombre,181.91.85.248:30517,2025-12-16 02:40:20,...
```
✅ Tu IP sigue apareciendo (Last Ref actualizado)

### Segundo 25: Te desconectas de la VPN
```
Archivo: CLIENT_LIST,tu-nombre,181.91.85.248:30517,10.8.0.6,...
         ROUTING_TABLE,10.8.0.6,tu-nombre,181.91.85.248:30517,2025-12-16 02:40:20,...
```
⚠️ Tu IP aún aparece (archivo no se ha actualizado)

### Segundo 30: OpenVPN actualiza el archivo
```
Archivo: (sin tu IP, solo otras conexiones si las hay)
```
❌ Tu IP desapareció

## ¿Por qué hay intermitencia?

El delay de hasta 10 segundos causa que:

1. **Cuando te desconectas**: Tu IP puede seguir apareciendo hasta 10 segundos después
2. **Cuando te conectas**: Tu IP puede tardar hasta 10 segundos en aparecer

## Verificar la frecuencia de actualización

Puedes verificar cada cuánto se actualiza:

```bash
# Ver la configuración de OpenVPN
sudo grep "^status" /etc/openvpn/server.conf

# Ver el archivo en tiempo real (actualiza cada 10 segundos)
sudo watch -n 1 cat /var/log/openvpn-status.log

# O ver la última modificación del archivo
sudo stat /var/log/openvpn-status.log
```

## Solución al problema de intermitencia

El código ahora:
1. **Lee el archivo** cada vez que se verifica
2. **Busca tu IP** en CLIENT LIST
3. **Si NO está en CLIENT LIST** → retorna `false` inmediatamente
4. **Si está en CLIENT LIST** → verifica Last Ref para confirmar que es reciente

Esto reduce la intermitencia porque:
- Si desapareciste de CLIENT LIST, se detecta inmediatamente
- No depende solo de Last Ref (que puede estar desactualizado)

## Resumen

- ✅ El archivo **se actualiza automáticamente** cada 10 segundos
- ❌ El archivo **NO se elimina**, solo se sobrescribe
- ⏱️ Hay un **delay máximo de 10 segundos** para detectar cambios
- 🔄 OpenVPN **escribe el contenido completo** cada vez que actualiza

