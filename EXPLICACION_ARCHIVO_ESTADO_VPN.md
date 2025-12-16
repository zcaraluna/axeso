# Explicación del Archivo de Estado de OpenVPN

## ¿Qué es el archivo `/var/log/openvpn-status.log`?

Este es el archivo que OpenVPN genera automáticamente para registrar todas las conexiones VPN activas. Es como un "registro en vivo" de quién está conectado en este momento.

## ¿Dónde está ubicado?

```
/var/log/openvpn-status.log
```

## ¿Cómo se genera?

OpenVPN lo genera automáticamente si está configurado en `/etc/openvpn/server.conf` con:

```
status /var/log/openvpn-status.log 10
```

El `10` significa que se actualiza cada 10 segundos.

## ¿Qué contiene?

El archivo contiene información sobre:
- **CLIENT LIST**: Lista de todos los clientes conectados actualmente
- **ROUTING TABLE**: Tabla de enrutamiento con información de última actividad (Last Ref)

### Ejemplo de contenido:

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

## ¿Cómo funciona la verificación?

Nuestro código (`app/api/vpn/check-status/route.ts`) hace lo siguiente:

1. **Lee el archivo** `/var/log/openvpn-status.log`
2. **Busca tu IP pública** (`181.91.85.248` en tu caso) en el archivo
3. **Verifica si está en CLIENT LIST** (si aparece, significa que estás conectado)
4. **Verifica Last Ref en ROUTING TABLE** (cuándo fue la última actividad)

## ¿Qué significa "si la IP no aparece en el archivo"?

Significa que cuando el código busca tu IP (`181.91.85.248`) en el archivo `/var/log/openvpn-status.log`:

- **Si la encuentra**: Estás conectado a la VPN
- **Si NO la encuentra**: Estás desconectado de la VPN

## ¿Por qué puede haber intermitencia?

El archivo se actualiza cada 10 segundos. Esto significa:

1. **Cuando te conectas**: Puede tardar hasta 10 segundos en aparecer tu IP
2. **Cuando te desconectas**: Puede tardar hasta 10 segundos en desaparecer tu IP
3. **Durante la actualización**: El archivo puede estar en un estado intermedio

## ¿Cómo verificar el archivo manualmente?

Puedes verificar directamente en el servidor:

```bash
# Ver el contenido completo del archivo
sudo cat /var/log/openvpn-status.log

# Buscar tu IP específicamente
sudo grep "181.91.85.248" /var/log/openvpn-status.log

# Ver si aparece en CLIENT LIST
sudo grep "CLIENT_LIST" /var/log/openvpn-status.log | grep "181.91.85.248"

# Ver si aparece en ROUTING TABLE
sudo grep "ROUTING_TABLE" /var/log/openvpn-status.log | grep "181.91.85.248"
```

## ¿Qué debería pasar cuando te desconectas?

1. Tu IP desaparece de `CLIENT_LIST`
2. Tu IP desaparece de `ROUTING_TABLE`
3. El código debería detectar que no está en CLIENT LIST y retornar `isActive: false`

## El problema de intermitencia

Si después de desconectarte:
- A veces el archivo aún tiene tu IP (porque no se ha actualizado)
- A veces el archivo ya no tiene tu IP (porque se actualizó)

Esto causa que el sistema a veces diga `true` y a veces `false`.

## Solución

El código ahora verifica:
1. Si la IP aparece en el archivo (búsqueda simple)
2. Si está en CLIENT LIST (requisito obligatorio)
3. Si tiene Last Ref reciente

Si NO está en CLIENT LIST → siempre retorna `false`, sin excepciones.

