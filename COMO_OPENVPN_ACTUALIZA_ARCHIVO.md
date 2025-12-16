# Cómo OpenVPN Actualiza el Archivo de Estado

## El archivo NO "sabe" nada

El archivo `/var/log/openvpn-status.log` es solo un **archivo de texto**. No tiene inteligencia propia. Es OpenVPN (el proceso/servicio) quien **escribe** en él.

## ¿Cómo funciona realmente?

### 1. OpenVPN mantiene un estado interno en memoria

OpenVPN tiene en su **memoria RAM** una lista de todas las conexiones activas:

```
En memoria de OpenVPN:
- Conexión 1: IP 181.91.85.248, conectada desde 02:06:42
- Conexión 2: IP 192.168.1.100, conectada desde 02:10:15
- Conexión 3: IP 10.0.0.50, conectada desde 02:15:30
```

### 2. Cuando alguien se conecta

```
Cliente se conecta → OpenVPN agrega a su lista en memoria
```

### 3. Cuando alguien se desconecta

```
Cliente se desconecta → OpenVPN ELIMINA de su lista en memoria
```

### 4. Cada 10 segundos, OpenVPN escribe el archivo

OpenVPN toma su **lista actual en memoria** y escribe TODO el contenido al archivo:

```bash
# Lo que OpenVPN hace internamente:
1. Lee su lista de conexiones activas (en memoria)
2. Genera el contenido del archivo con esa lista
3. Escribe/sobrescribe el archivo completo
```

## Proceso paso a paso

### Segundo 0: Tienes 3 conexiones activas
```
Memoria de OpenVPN: [IP1, IP2, IP3]
Archivo: CLIENT_LIST,IP1,...
         CLIENT_LIST,IP2,...
         CLIENT_LIST,IP3,...
```

### Segundo 5: IP2 se desconecta
```
Memoria de OpenVPN: [IP1, IP3]  ← IP2 eliminada de la memoria
Archivo: CLIENT_LIST,IP1,...    ← Archivo aún tiene IP2 (no se ha actualizado)
         CLIENT_LIST,IP2,...
         CLIENT_LIST,IP3,...
```

### Segundo 10: OpenVPN actualiza el archivo
```
Memoria de OpenVPN: [IP1, IP3]
Archivo: CLIENT_LIST,IP1,...    ← Archivo actualizado, IP2 desapareció
         CLIENT_LIST,IP3,...
```

## ¿Cómo sabe OpenVPN quién está conectado?

OpenVPN sabe quién está conectado porque:

1. **Mantiene conexiones TCP/UDP activas** con cada cliente
2. **Recibe paquetes** de cada cliente conectado
3. **Actualiza Last Ref** cada vez que recibe un paquete
4. **Elimina de su lista** cuando la conexión se cierra

## Flujo completo

```
┌─────────────────┐
│   Cliente VPN   │
│  (tu computadora)│
└────────┬────────┘
         │ Conecta/Desconecta
         ▼
┌─────────────────┐
│  Servidor       │
│  OpenVPN        │
│  (proceso)      │
└────────┬────────┘
         │ Mantiene estado en memoria
         │ [IP1, IP2, IP3...]
         │
         │ Cada 10 segundos
         ▼
┌─────────────────┐
│  Archivo        │
│  openvpn-status │
│  .log           │
└─────────────────┘
```

## Código interno de OpenVPN (simplificado)

```c
// Pseudocódigo de lo que hace OpenVPN internamente

void update_status_file() {
    // 1. Obtener lista de conexiones activas (de memoria)
    List<Connection> active_connections = get_active_connections();
    
    // 2. Generar contenido del archivo
    String content = "TITLE,OpenVPN...\n";
    content += "TIME," + current_time() + "\n";
    content += "HEADER,CLIENT_LIST,...\n";
    
    // 3. Escribir cada conexión activa
    for (Connection conn : active_connections) {
        content += "CLIENT_LIST," + conn.common_name + "," + 
                   conn.real_ip + "," + conn.virtual_ip + "\n";
    }
    
    // 4. Escribir ROUTING TABLE
    content += "HEADER,ROUTING_TABLE,...\n";
    for (Connection conn : active_connections) {
        content += "ROUTING_TABLE," + conn.virtual_ip + "," + 
                   conn.common_name + "," + conn.real_ip + "," + 
                   conn.last_ref + "\n";
    }
    
    // 5. Sobrescribir el archivo completo
    write_file("/var/log/openvpn-status.log", content);
}
```

## Puntos clave

1. ✅ **OpenVPN mantiene el estado en memoria** (no en el archivo)
2. ✅ **El archivo es solo una "foto"** del estado actual
3. ✅ **OpenVPN escribe el archivo completo** cada 10 segundos
4. ✅ **Si una IP desaparece de la memoria** → desaparece del archivo en la próxima escritura
5. ✅ **El archivo no "sabe" nada** → es solo texto que OpenVPN escribe

## Resumen

- **OpenVPN** (el proceso) mantiene una lista en memoria de conexiones activas
- Cuando alguien se desconecta, OpenVPN **elimina de su memoria**
- Cada 10 segundos, OpenVPN **escribe el archivo completo** con lo que tiene en memoria
- Si tu IP no está en la memoria de OpenVPN → no aparecerá en el archivo

El archivo es solo un **reflejo** del estado interno de OpenVPN, no tiene lógica propia.


