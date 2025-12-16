# Solución: Detección VPN Intermitente

## 🔴 Problema Identificado

### Síntomas
- El sistema detecta conexiones VPN de forma **intermitente** (a veces `true`, a veces `false`)
- Después de desconectarse del VPN, el sistema sigue detectando la conexión como activa por varios minutos
- El estado alterna entre conectado y desconectado sin razón aparente

### Causa Raíz

El problema tenía **dos causas principales**:

1. **Formato del archivo de estado no reconocido**: 
   - El archivo `/var/log/openvpn-status.log` usa formato CSV con prefijos (`CLIENT_LIST,` y `ROUTING_TABLE,`)
   - El código original solo manejaba formato tradicional sin prefijos
   - Esto causaba que las IPs no se detectaran correctamente

2. **Lógica de detección demasiado permisiva**:
   - El código consideraba conexiones activas basándose solo en `Last Ref` aunque la IP ya no estuviera en `CLIENT LIST`
   - El umbral de tiempo era demasiado largo (15 segundos)
   - Esto causaba que conexiones desconectadas siguieran apareciendo como activas

## ✅ Solución Implementada

### Cambio 1: Soporte para Formato CSV con Prefijos

**Archivo:** `app/api/vpn/check-status/route.ts`

**Problema:** El código solo detectaba formato tradicional:
```
OpenVPN CLIENT LIST
cliente1,181.91.85.248:12345,10.8.0.2,...
```

**Solución:** Ahora detecta ambos formatos:

**Formato tradicional:**
```
OpenVPN CLIENT LIST
cliente1,181.91.85.248:12345,10.8.0.2,...
```

**Formato CSV con prefijos (OpenVPN 2.5+):**
```
HEADER,CLIENT_LIST,Common Name,Real Address,...
CLIENT_LIST,cliente1,181.91.85.248:12345,10.8.0.2,...
HEADER,ROUTING_TABLE,Virtual Address,Common Name,...
ROUTING_TABLE,10.8.0.2,cliente1,181.91.85.248:12345,2025-12-16 02:31:18,...
```

**Código agregado:**
```typescript
// Detectar líneas que empiezan con CLIENT_LIST,
if (trimmedLine.startsWith('CLIENT_LIST,')) {
  inClientList = true;
  // Procesar línea de datos (quitar prefijo "CLIENT_LIST,")
  const parts = trimmedLine.substring('CLIENT_LIST,'.length).split(',');
  // parts[1] = Real Address, parts[6] = Connected Since
  // ...
}

// Detectar líneas que empiezan con ROUTING_TABLE,
if (trimmedLine.startsWith('ROUTING_TABLE,')) {
  inRoutingTable = true;
  // Procesar línea de datos (quitar prefijo "ROUTING_TABLE,")
  const routingParts = trimmedLine.substring('ROUTING_TABLE,'.length).split(',');
  // routingParts[2] = Real Address, routingParts[3] = Last Ref
  // ...
}
```

### Cambio 2: Lógica Determinista de Detección

**Problema:** La lógica anterior era compleja y causaba intermitencia:
- Consideraba conexiones activas aunque no estuvieran en CLIENT LIST
- Múltiples condiciones que podían alternar resultados

**Solución:** Lógica simplificada y determinista:

```typescript
// REGLA PRINCIPAL: La conexión está activa SOLO si:
// 1. Está en CLIENT LIST (requisito obligatorio)
// 2. Y tiene Last Ref reciente (≤12s) O Connected Since reciente (≤20s)

// REGLA 1: Si NO está en CLIENT LIST → INACTIVA (sin excepciones)
if (!foundInClientList) {
  isActive = false;
}
// REGLA 2: Si está en CLIENT LIST, verificar Last Ref o Connected Since
else {
  if (routingTableLastRef) {
    // Last Ref ≤12s → ACTIVA
    isActive = timeSinceLastRef <= 12 * 1000;
  } else if (connectedSinceStr) {
    // Connected Since ≤20s Y archivo reciente → ACTIVA
    isActive = timeSinceConnection <= 20 * 1000 && fileIsRecent;
  } else {
    isActive = false;
  }
}
```

**Beneficios:**
- ✅ Elimina intermitencia: si desapareció de CLIENT LIST, está desconectado inmediatamente
- ✅ Más rápido: detecta desconexiones en 10-12 segundos (en lugar de 15+)
- ✅ Más claro: lógica simple y fácil de entender

### Cambio 3: Mejor Logging para Debugging

**Agregado:**
- Logs detallados de cada paso del análisis
- Información de debugging en la respuesta JSON:
  ```json
  {
    "debug": {
      "foundInClientList": true/false,
      "hasRoutingTableLastRef": true/false,
      "allClientListIps": ["181.91.85.248", ...],
      "allRoutingTableIps": ["181.91.85.248", ...],
      "clientListCount": 1,
      "routingTableCount": 1
    }
  }
  ```

## 📋 Pasos para Aplicar en Otro Subdominio

### Paso 1: Verificar Formato del Archivo de Estado

```bash
# En el servidor, verificar el formato del archivo
sudo cat /var/log/openvpn-status.log | head -20
```

**Si el archivo tiene formato CSV con prefijos** (como `CLIENT_LIST,` o `ROUTING_TABLE,`):
- ✅ Necesitas aplicar TODOS los cambios

**Si el archivo tiene formato tradicional** (sin prefijos):
- ⚠️ Solo necesitas aplicar el Cambio 2 (lógica determinista)
- El Cambio 1 es opcional pero recomendado para compatibilidad futura

### Paso 2: Copiar Archivos Actualizados

**Archivos a actualizar:**

1. **`app/api/vpn/check-status/route.ts`**
   - Copiar desde `controldeacceso/app/api/vpn/check-status/route.ts`
   - O aplicar los cambios manualmente según las secciones anteriores

2. **`lib/vpn-utils.ts`** (opcional, solo si tiene diferencias)
   - Verificar que tenga la misma lógica de `isVpnConnected()`

3. **`middleware.ts`** (opcional, solo si tiene diferencias)
   - Verificar que tenga la misma lógica de verificación VPN

### Paso 3: Verificar Variables de Entorno

Asegúrate de que el `.env` tenga:

```env
VPN_REQUIRED=true
VPN_RANGE=10.8.0.0/24
VPN_REQUIRED_DOMAINS=tu-subdominio.com
VPN_API_URL=http://localhost:PUERTO_DEL_SUBDOMINIO
VPN_API_TOKEN=TU_TOKEN
NEXT_PUBLIC_SITE_URL=https://tu-subdominio.com
```

**Importante:** `VPN_API_URL` debe apuntar al puerto correcto del subdominio.

### Paso 4: Reconstruir y Reiniciar

```bash
cd /ruta/al/subdominio/public_html

# Reconstruir la aplicación
npm run build

# Reiniciar PM2
pm2 restart nombre-del-proceso --update-env
```

### Paso 5: Verificar Funcionamiento

1. **Probar con VPN conectado:**
   ```bash
   curl https://tu-subdominio.com/api/debug-ip | jq .
   ```
   Debe mostrar: `"isVpnConnected": true`

2. **Probar sin VPN (desconectado):**
   - Desconecta el VPN
   - Espera 10-15 segundos
   - Accede a `/api/debug-ip`
   - Debe mostrar: `"isVpnConnected": false` de forma consistente

3. **Verificar logs:**
   ```bash
   pm2 logs nombre-del-proceso --lines 50 | grep -i "vpn status"
   ```
   Debe mostrar logs claros del proceso de verificación.

## 🔍 Verificación del Formato del Archivo

### Formato CSV con Prefijos (OpenVPN 2.5+)
```
TITLE,OpenVPN 2.5.11 x86_64-pc-linux-gnu...
TIME,2025-12-16 02:31:19,1765852279
HEADER,CLIENT_LIST,Common Name,Real Address,...
CLIENT_LIST,DCHPEF-1-ASU,181.91.85.248:30517,10.8.0.6,...
HEADER,ROUTING_TABLE,Virtual Address,Common Name,...
ROUTING_TABLE,10.8.0.6,DCHPEF-1-ASU,181.91.85.248:30517,2025-12-16 02:31:18,...
```

**Características:**
- Líneas empiezan con `CLIENT_LIST,` o `ROUTING_TABLE,`
- Headers empiezan con `HEADER,CLIENT_LIST` o `HEADER,ROUTING_TABLE`
- Índices diferentes: `Connected Since` está en índice 6 (no 5)

### Formato Tradicional (OpenVPN 2.4 y anteriores)
```
OpenVPN CLIENT LIST
Updated,2025-12-15 22:30:45
Common Name,Real Address,Virtual Address,...
cliente1,181.91.85.248:12345,10.8.0.2,...
ROUTING TABLE
Virtual Address,Common Name,Real Address,Last Ref
10.8.0.2,cliente1,181.91.85.248:12345,2025-12-15 22:30:45
```

**Características:**
- Headers son líneas completas: `OpenVPN CLIENT LIST` o `ROUTING TABLE`
- Líneas de datos no tienen prefijo
- Índices estándar: `Connected Since` está en índice 5

## 📝 Resumen de Cambios por Archivo

### `app/api/vpn/check-status/route.ts`

**Cambios principales:**

1. **Detección de formato CSV con prefijos:**
   ```typescript
   // Antes: solo detectaba formato tradicional
   if (trimmedLine === 'CLIENT LIST') { ... }
   
   // Ahora: detecta ambos formatos
   if (trimmedLine === 'CLIENT LIST' || trimmedLine.startsWith('CLIENT_LIST,')) { ... }
   ```

2. **Procesamiento de líneas con prefijo:**
   ```typescript
   // Procesar líneas que empiezan con CLIENT_LIST,
   if (trimmedLine.startsWith('CLIENT_LIST,')) {
     const parts = trimmedLine.substring('CLIENT_LIST,'.length).split(',');
     // parts[1] = Real Address, parts[6] = Connected Since
   }
   ```

3. **Lógica determinista:**
   ```typescript
   // Si NO está en CLIENT LIST → INACTIVA (sin excepciones)
   if (!foundInClientList) {
     isActive = false;
   } else {
     // Verificar Last Ref o Connected Since
   }
   ```

4. **Debugging mejorado:**
   ```typescript
   debug: {
     foundInClientList,
     allClientListIps,
     allRoutingTableIps,
     // ...
   }
   ```

## ⚠️ Consideraciones Importantes

1. **Delay de actualización del archivo:**
   - El archivo se actualiza cada 10 segundos (según configuración de OpenVPN)
   - Puede haber un delay de 10-12 segundos para detectar desconexiones
   - Esto es normal y esperado

2. **Compatibilidad:**
   - El código ahora maneja ambos formatos automáticamente
   - Funciona con OpenVPN 2.4 y 2.5+
   - No requiere cambios en la configuración de OpenVPN

3. **Performance:**
   - El timeout de verificación es de 1 segundo
   - Si el archivo es muy grande, puede tardar más
   - Considera aumentar el timeout si es necesario

## 🐛 Troubleshooting

### Problema: Sigue detectando conexiones desconectadas

**Solución:**
1. Verificar que el código actualizado está corriendo (reiniciar PM2)
2. Verificar que el archivo realmente se actualiza:
   ```bash
   sudo tail -f /var/log/openvpn-status.log
   ```
3. Verificar logs para ver qué está detectando:
   ```bash
   pm2 logs | grep "VPN Status"
   ```

### Problema: No detecta conexiones activas

**Solución:**
1. Verificar formato del archivo:
   ```bash
   sudo cat /var/log/openvpn-status.log | head -20
   ```
2. Verificar que la IP aparece en el archivo:
   ```bash
   sudo grep "TU_IP" /var/log/openvpn-status.log
   ```
3. Verificar logs de debugging:
   ```bash
   curl https://tu-subdominio.com/api/debug-ip | jq .debug
   ```

### Problema: Intermitencia persiste

**Solución:**
1. Verificar que aplicaste TODOS los cambios (especialmente la lógica determinista)
2. Verificar que no hay código antiguo en caché (limpiar `.next`)
3. Verificar logs para identificar qué condición está alternando

## ✅ Checklist de Implementación

- [ ] Verificar formato del archivo `/var/log/openvpn-status.log`
- [ ] Copiar `app/api/vpn/check-status/route.ts` actualizado
- [ ] Verificar variables de entorno en `.env`
- [ ] Reconstruir aplicación (`npm run build`)
- [ ] Reiniciar PM2 con `--update-env`
- [ ] Probar con VPN conectado
- [ ] Probar con VPN desconectado (esperar 10-15 segundos)
- [ ] Verificar que no hay intermitencia
- [ ] Revisar logs para confirmar funcionamiento

## 📚 Referencias

- Archivo de implementación: `app/api/vpn/check-status/route.ts`
- Documentación completa: `IMPLEMENTACION_VERIFICACION_VPN.md`
- Script de diagnóstico: `scripts/vpn/diagnosticar-vpn-visitantes.sh`

