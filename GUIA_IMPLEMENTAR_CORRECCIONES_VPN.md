# Guía: Implementar Correcciones de Intermitencia VPN

Esta guía describe los cambios exactos necesarios para corregir la intermitencia en la verificación VPN. Copia estos cambios a otro proyecto.

## 📋 Resumen de Cambios

1. **Eliminar verificación redundante** en `app/api/vpn/check-status/route.ts`
2. **Aumentar umbrales de tiempo** (12s→15s, 20s→30s)
3. **Aumentar timeouts** (1s→2s) en `lib/vpn-utils.ts`
4. **Agregar verificación de consistencia** del archivo
5. **Mejorar logging de errores**
6. **Mejorar lógica de fallback** para conexiones nuevas

---

## 🔧 Cambio 1: Verificación de Consistencia del Archivo

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Justo antes de leer el archivo (antes de `const content = await readFile(...)`)

**ANTES:**
```typescript
try {
  const content = await readFile(statusFile, 'utf-8');
  
  // Log para debugging
  console.log(`[VPN Status] Verificando IP: ${realIp}`);
```

**DESPUÉS:**
```typescript
try {
  // Obtener información del archivo ANTES de leerlo para verificar consistencia
  const statsBefore = await stat(statusFile);
  const mtimeBefore = statsBefore.mtime.getTime();
  
  const content = await readFile(statusFile, 'utf-8');
  
  // Verificar que el archivo no cambió mientras se leía (consistencia)
  const statsAfter = await stat(statusFile);
  const mtimeAfter = statsAfter.mtime.getTime();
  const fileChangedDuringRead = mtimeBefore !== mtimeAfter;
  
  // Log para debugging
  console.log(`[VPN Status] Verificando IP: ${realIp}`);
  console.log(`[VPN Status] Archivo existe, tamaño: ${content.length} bytes`);
  if (fileChangedDuringRead) {
    console.log(`[VPN Status] ⚠️ Archivo cambió durante la lectura (mtime antes: ${mtimeBefore}, después: ${mtimeAfter})`);
  }
```

**NOTA:** Asegúrate de que `stat` esté importado al inicio del archivo:
```typescript
import { readFile, stat } from 'fs/promises';
```

---

## 🔧 Cambio 2: Eliminar Verificación Redundante

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar código que tenga algo como esto (justo antes de la sección "REGLA 1"):

**BUSCAR Y ELIMINAR:**
```typescript
// VERIFICACIÓN ADICIONAL: Si la IP no aparece en el archivo en absoluto, forzar inactiva
const ipAppearsInFile = content.includes(realIp);
if (!ipAppearsInFile) {
  isActive = false;
  foundInClientList = false;
  routingTableLastRef = null;
  console.log(`[VPN Status] ⚠️⚠️⚠️ IP ${realIp} NO aparece en el archivo en absoluto → FORZANDO INACTIVA`);
}
```

**ELIMINAR COMPLETAMENTE** ese bloque de código. Debe quedar solo el comentario "REGLA 1" sin esa verificación adicional.

---

## 🔧 Cambio 3: Aumentar Umbral de `fileIsRecent`

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar línea que dice `const fileIsRecent = timeSinceFileUpdate <= 20 * 1000;`

**ANTES:**
```typescript
// Verificar que el archivo se actualizó recientemente
const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
const fileIsRecent = timeSinceFileUpdate <= 20 * 1000; // 20 segundos
```

**DESPUÉS:**
```typescript
// Verificar que el archivo se actualizó recientemente
const timeSinceFileUpdate = now - fileUpdatedAt.getTime();
// Aumentado a 30 segundos para dar más tolerancia al delay de actualización
// El archivo se actualiza cada 10s, así que 30s es un margen seguro
const fileIsRecent = timeSinceFileUpdate <= 30 * 1000; // 30 segundos
```

---

## 🔧 Cambio 4: Aumentar Umbral de `Last Ref`

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar línea que dice `isActive = timeSinceLastRef <= 12 * 1000;` (dentro de la sección "Si está en CLIENT LIST, verificar Last Ref")

**ANTES:**
```typescript
if (routingTableLastRef) {
  const timeSinceLastRef = now - routingTableLastRef.getTime();
  const lastRefSeconds = Math.floor(timeSinceLastRef / 1000);
  
  // Está en CLIENT LIST y tiene Last Ref: activa si Last Ref ≤12s
  isActive = timeSinceLastRef <= 12 * 1000;
  console.log(`[VPN Status] Last Ref hace ${lastRefSeconds}s (umbral: 12s) → activa: ${isActive}`);
}
```

**DESPUÉS:**
```typescript
if (routingTableLastRef) {
  const timeSinceLastRef = now - routingTableLastRef.getTime();
  const lastRefSeconds = Math.floor(timeSinceLastRef / 1000);
  
  // Está en CLIENT LIST y tiene Last Ref: activa si Last Ref ≤15s
  // Aumentado de 12s a 15s para dar margen al delay de actualización del archivo (10s)
  // Esto previene falsos negativos cuando el archivo está siendo actualizado
  isActive = timeSinceLastRef <= 15 * 1000;
  console.log(`[VPN Status] Last Ref hace ${lastRefSeconds}s (umbral: 15s) → activa: ${isActive}`);
}
```

---

## 🔧 Cambio 5: Aumentar Umbral de `Connected Since`

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar la sección `else if (connectedSinceStr)` dentro de "Si está en CLIENT LIST"

**ANTES:**
```typescript
} else if (connectedSinceStr) {
  // Está en CLIENT LIST pero NO tiene Last Ref: usar Connected Since
  try {
    const connectedSince = new Date(connectedSinceStr);
    const timeSinceConnection = now - connectedSince.getTime();
    const connectionSeconds = Math.floor(timeSinceConnection / 1000);
    
    // Solo activa si Connected Since es reciente (≤20s) Y el archivo se actualizó recientemente
    isActive = timeSinceConnection <= 20 * 1000 && fileIsRecent;
    console.log(`[VPN Status] Connected Since hace ${connectionSeconds}s (umbral: 20s), archivo reciente: ${fileIsRecent} → activa: ${isActive}`);
  } catch (error) {
    isActive = false;
    console.log(`[VPN Status] ❌ Error parseando Connected Since: ${error} → INACTIVA`);
  }
}
```

**DESPUÉS:**
```typescript
} else if (connectedSinceStr) {
  // Está en CLIENT LIST pero NO tiene Last Ref: usar Connected Since
  try {
    const connectedSince = new Date(connectedSinceStr);
    const timeSinceConnection = now - connectedSince.getTime();
    const connectionSeconds = Math.floor(timeSinceConnection / 1000);
    
    // Solo activa si Connected Since es reciente (≤30s) Y el archivo se actualizó recientemente
    // Aumentado de 20s a 30s para dar más margen de tolerancia
    // Si el archivo es reciente (≤30s), confiamos más en Connected Since
    const fileIsRecentExtended = timeSinceFileUpdate <= 30 * 1000;
    isActive = timeSinceConnection <= 30 * 1000 && fileIsRecentExtended;
    console.log(`[VPN Status] Connected Since hace ${connectionSeconds}s (umbral: 30s), archivo reciente: ${fileIsRecentExtended} → activa: ${isActive}`);
  } catch (error) {
    isActive = false;
    console.log(`[VPN Status] ❌ Error parseando Connected Since: ${error} → INACTIVA`);
  }
}
```

---

## 🔧 Cambio 6: Mejorar Lógica de Fallback para Conexiones Nuevas

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar la sección `else` final dentro de "Si está en CLIENT LIST" (después del `else if (connectedSinceStr)`)

**ANTES:**
```typescript
} else {
  // Está en CLIENT LIST pero sin Last Ref ni Connected Since → INACTIVA por seguridad
  isActive = false;
  console.log(`[VPN Status] ❌ En CLIENT LIST pero sin Last Ref ni Connected Since → INACTIVA`);
}
```

**DESPUÉS:**
```typescript
} else {
  // Está en CLIENT LIST pero sin Last Ref ni Connected Since
  // Si el archivo es reciente, considerar activa (puede ser conexión muy nueva)
  // Si el archivo es antiguo, inactiva por seguridad
  isActive = fileIsRecent && timeSinceFileUpdate <= 15 * 1000;
  console.log(`[VPN Status] ⚠️ En CLIENT LIST pero sin Last Ref ni Connected Since, archivo reciente: ${fileIsRecent} (${Math.floor(timeSinceFileUpdate / 1000)}s) → activa: ${isActive}`);
}
```

---

## 🔧 Cambio 7: Agregar `fileChangedDuringRead` al Debug Output

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar el objeto `debug` en la respuesta JSON (cerca del final de la función)

**ANTES:**
```typescript
// Obtener información de última actualización del archivo
const stats = await stat(statusFile);
const lastModified = stats.mtime;

const response = NextResponse.json({ 
  isActive: found,
  realIp,
  connectionInfo,
  checkedAt: new Date().toISOString(),
  fileLastModified: lastModified.toISOString(),
  fileAgeSeconds: Math.floor((Date.now() - lastModified.getTime()) / 1000),
  debug: {
    foundInClientList,
    hasRoutingTableLastRef: routingTableLastRef !== null,
    routingTableLastRef: routingTableLastRef?.toISOString() || null,
    fileUpdatedAt: fileUpdatedAt?.toISOString() || null,
    searchedIp: realIp,
    allClientListIps,
    allRoutingTableIps,
    clientListCount: allClientListIps.length,
    routingTableCount: allRoutingTableIps.length,
  }
});
```

**DESPUÉS:**
```typescript
// Obtener información de última actualización del archivo (ya tenemos statsAfter)
const lastModified = statsAfter.mtime;

const response = NextResponse.json({ 
  isActive: found,
  realIp,
  connectionInfo,
  checkedAt: new Date().toISOString(),
  fileLastModified: lastModified.toISOString(),
  fileAgeSeconds: Math.floor((Date.now() - lastModified.getTime()) / 1000),
  debug: {
    foundInClientList,
    hasRoutingTableLastRef: routingTableLastRef !== null,
    routingTableLastRef: routingTableLastRef?.toISOString() || null,
    fileUpdatedAt: fileUpdatedAt?.toISOString() || null,
    fileChangedDuringRead, // Indica si el archivo cambió mientras se leía
    searchedIp: realIp,
    allClientListIps,
    allRoutingTableIps,
    clientListCount: allClientListIps.length,
    routingTableCount: allRoutingTableIps.length,
  }
});
```

**NOTA:** Cambiar `const stats = await stat(statusFile);` por usar `statsAfter` que ya tenemos del Cambio 1.

---

## 🔧 Cambio 8: Aumentar Timeout en `lib/vpn-utils.ts`

**Archivo:** `lib/vpn-utils.ts`

**Ubicación 1:** Buscar el primer timeout (dentro de la función `isVpnConnected`, cerca del inicio)

**ANTES:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 1000);

try {
  const response = await fetch(checkUrl, {
    signal: controller.signal,
    cache: 'no-store',
  });
  
  clearTimeout(timeoutId);
  
  if (response.ok) {
    const data = await response.json();
    console.log(`[VPN Utils] Verificación para IP ${clientIp}:`, data);
    return data.isActive === true;
  }
} catch (fetchError) {
  clearTimeout(timeoutId);
  // Si es timeout, no es crítico
  if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
    console.error('[VPN Utils] Error verificando estado:', fetchError.message);
  }
}
```

**DESPUÉS:**
```typescript
const controller = new AbortController();
// Aumentado timeout de 1s a 2s para dar más tiempo si el servidor está bajo carga
// o si el archivo de estado es grande
const timeoutId = setTimeout(() => controller.abort(), 2000);

try {
  const response = await fetch(checkUrl, {
    signal: controller.signal,
    cache: 'no-store',
  });
  
  clearTimeout(timeoutId);
  
  if (response.ok) {
    const data = await response.json();
    console.log(`[VPN Utils] Verificación para IP ${clientIp}:`, data);
    return data.isActive === true;
  } else {
    console.warn(`[VPN Utils] Verificación falló para IP ${clientIp}, status: ${response.status}`);
  }
} catch (fetchError) {
  clearTimeout(timeoutId);
  // Si es timeout, loguearlo pero no es crítico (puede ser carga del servidor)
  if (fetchError instanceof Error) {
    if (fetchError.name === 'AbortError') {
      console.warn(`[VPN Utils] Timeout verificando estado VPN para IP ${clientIp} (2s)`);
    } else {
      console.error('[VPN Utils] Error verificando estado:', fetchError.message);
    }
  }
}
```

**Ubicación 2:** Buscar el segundo timeout (en el fallback a BD, dentro del mismo archivo)

**ANTES:**
```typescript
const controller2 = new AbortController();
const timeoutId2 = setTimeout(() => controller2.abort(), 1000);
```

**DESPUÉS:**
```typescript
const controller2 = new AbortController();
// Aumentado timeout para consistencia con el primer intento
const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
```

---

## 📝 Actualizar Comentario de REGLA PRINCIPAL

**Archivo:** `app/api/vpn/check-status/route.ts`

**Ubicación:** Buscar el comentario que dice "REGLA PRINCIPAL: La conexión está activa SOLO si:"

**ANTES:**
```typescript
// REGLA PRINCIPAL: La conexión está activa SOLO si:
// 1. Está en CLIENT LIST (requisito obligatorio)
// 2. Y tiene Last Ref reciente (≤12s) O Connected Since reciente (≤20s)
```

**DESPUÉS:**
```typescript
// REGLA PRINCIPAL: La conexión está activa SOLO si:
// 1. Está en CLIENT LIST (requisito obligatorio)
// 2. Y tiene Last Ref reciente (≤15s) O Connected Since reciente (≤30s)
```

**También actualizar el comentario de REGLA 1:**

**ANTES:**
```typescript
// REGLA 1: Si NO está en CLIENT LIST → INACTIVA (sin excepciones)
```

**DESPUÉS:**
```typescript
// REGLA 1: Si NO está en CLIENT LIST → INACTIVA (sin excepciones)
// NOTA: Confiamos en el parsing estructurado, NO en búsqueda simple de strings
// porque la IP podría aparecer en comentarios u otras secciones que no cuentan
```

---

## ✅ Checklist de Verificación

Después de aplicar los cambios, verifica:

- [ ] `stat` está importado en `check-status/route.ts`
- [ ] Se eliminó la verificación redundante con `content.includes(realIp)`
- [ ] `fileIsRecent` usa 30 segundos (30 * 1000)
- [ ] `Last Ref` usa 15 segundos (15 * 1000)
- [ ] `Connected Since` usa 30 segundos (30 * 1000)
- [ ] Los timeouts en `vpn-utils.ts` son 2000ms (2 segundos)
- [ ] Se agregó `fileChangedDuringRead` al debug output
- [ ] La lógica de fallback maneja conexiones nuevas con `fileIsRecent`
- [ ] Se mejoró el logging de errores con warnings específicos

---

## 🧪 Probar los Cambios

1. **Compilar y reiniciar:**
   ```bash
   npm run build
   pm2 restart <tu-proceso> --update-env
   ```

2. **Verificar logs:**
   ```bash
   pm2 logs | grep "VPN Status"
   ```

3. **Probar conectando/desconectando VPN:**
   - La detección debería ser más estable
   - No debería haber intermitencia durante conexión estable

---

## 📌 Notas Finales

- Todos los umbrales de tiempo fueron aumentados para dar margen al delay de actualización del archivo (10 segundos)
- Los timeouts aumentados a 2s siguen siendo razonables y evitan bloqueos largos
- La verificación de consistencia solo detecta el problema, no lo resuelve automáticamente (se loguea para análisis)
- Si la intermitencia persiste, revisa los logs para identificar patrones específicos


