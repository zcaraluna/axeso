# Análisis del Formato del Archivo de Estado OpenVPN

## Formato Detectado

Tu archivo `/var/log/openvpn-status.log` usa el formato **CSV con prefijo**:

```
TITLE,OpenVPN 2.5.11 x86_64-pc-linux-gnu [SSL (OpenSSL)] [LZO] [LZ4] [EPOLL] [PKCS11] [MH/PKTINFO] [AEAD] built on Sep 17 2024
TIME,2025-12-16 02:31:19,1765852279
HEADER,CLIENT_LIST,Common Name,Real Address,Virtual Address,Virtual IPv6 Address,Bytes Received,Bytes Sent,Connected Since,Connected Since (time_t),Username,Client ID,Peer ID,Data Channel Cipher
CLIENT_LIST,DCHPEF-1-ASU,181.91.85.248:30517,10.8.0.6,,10368718,23631301,2025-12-16 02:06:42,1765850802,UNDEF,49,1,AES-256-GCM
HEADER,ROUTING_TABLE,Virtual Address,Common Name,Real Address,Last Ref,Last Ref (time_t)
ROUTING_TABLE,10.8.0.6,DCHPEF-1-ASU,181.91.85.248:30517,2025-12-16 02:31:18,1765852278
GLOBAL_STATS,Max bcast/mcast queue length,1
END
```

## Estructura de CLIENT_LIST

**Línea de datos:**
```
CLIENT_LIST,DCHPEF-1-ASU,181.91.85.248:30517,10.8.0.6,,10368718,23631301,2025-12-16 02:06:42,1765850802,UNDEF,49,1,AES-256-GCM
```

**Después de quitar "CLIENT_LIST,":**
```
DCHPEF-1-ASU,181.91.85.248:30517,10.8.0.6,,10368718,23631301,2025-12-16 02:06:42,1765850802,UNDEF,49,1,AES-256-GCM
```

**Índices de campos:**
- `parts[0]` = `"DCHPEF-1-ASU"` → **Common Name** ✓
- `parts[1]` = `"181.91.85.248:30517"` → **Real Address** (IP pública) ✓
- `parts[2]` = `"10.8.0.6"` → **Virtual Address** (IP VPN) ✓
- `parts[3]` = `""` → Virtual IPv6 Address (vacío)
- `parts[4]` = `"10368718"` → Bytes Received
- `parts[5]` = `"23631301"` → Bytes Sent
- `parts[6]` = `"2025-12-16 02:06:42"` → **Connected Since** ✓
- `parts[7]` = `"1765850802"` → Connected Since (time_t)

## Estructura de ROUTING_TABLE

**Línea de datos:**
```
ROUTING_TABLE,10.8.0.6,DCHPEF-1-ASU,181.91.85.248:30517,2025-12-16 02:31:18,1765852278
```

**Después de quitar "ROUTING_TABLE,":**
```
10.8.0.6,DCHPEF-1-ASU,181.91.85.248:30517,2025-12-16 02:31:18,1765852278
```

**Índices de campos:**
- `parts[0]` = `"10.8.0.6"` → **Virtual Address** (IP VPN)
- `parts[1]` = `"DCHPEF-1-ASU"` → **Common Name**
- `parts[2]` = `"181.91.85.248:30517"` → **Real Address** (IP pública) ✓
- `parts[3]` = `"2025-12-16 02:31:18"` → **Last Ref** (última referencia) ✓
- `parts[4]` = `"1765852278"` → Last Ref (time_t)

## Verificación de la IP

**IP buscada:** `181.91.85.248`

**En CLIENT_LIST:**
- ✅ Aparece en `parts[1]` = `"181.91.85.248:30517"`
- ✅ Al extraer IP (sin puerto): `181.91.85.248` ✓ COINCIDE

**En ROUTING_TABLE:**
- ✅ Aparece en `parts[2]` = `"181.91.85.248:30517"`
- ✅ Al extraer IP (sin puerto): `181.91.85.248` ✓ COINCIDE
- ✅ Last Ref: `2025-12-16 02:31:18` (muy reciente, conexión activa)

## Estado de la Conexión

- **Connected Since:** `2025-12-16 02:06:42` (hace ~25 minutos)
- **Last Ref:** `2025-12-16 02:31:18` (hace ~0 segundos - muy reciente)
- **Estado:** ✅ **CONEXIÓN ACTIVA** (Last Ref es muy reciente)

## Conclusión

El formato del archivo es correcto y la IP `181.91.85.248` **SÍ está presente** en el archivo. El código actualizado debería detectarla correctamente.

Si aún no se detecta, puede ser por:
1. El código aún no se ha reiniciado después de los cambios
2. Hay un problema con el parsing de fechas
3. El timeout de verificación es muy corto

