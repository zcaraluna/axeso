# Guía Completa: Replicar Sistema de Autenticación de Dispositivos

Esta guía te permitirá implementar exactamente el mismo sistema de autenticación de dispositivos con códigos de un solo uso en otro proyecto Next.js.

## 📋 Resumen del Sistema

El sistema permite autorizar computadoras/dispositivos mediante códigos únicos generados por el desarrollador. Una vez autorizado un dispositivo, los usuarios pueden hacer login normalmente. El sistema:

- ✅ Requiere código de activación para nuevos dispositivos
- ✅ Almacena fingerprint único basado en User-Agent
- ✅ Permite reautorizar dispositivos con códigos nuevos
- ✅ Permite gestionar dispositivos y códigos desde interfaz web (superadmin)
- ✅ Valida contra base de datos en cada request

---

## 🗂️ Estructura de Archivos

### Archivos a Crear

```
scripts/
  migrations/
    008_add_dispositivos_autorizados.sql
    009_add_nombre_codigos_dispositivos.sql
  generar-codigo-activacion.js

lib/
  auth.ts (modificar - agregar funciones)

app/
  api/
    autenticar/
      route.ts (nuevo)
    verificar-dispositivo/
      route.ts (nuevo)
    dispositivos/
      route.ts (nuevo)
  
  autenticar/
    page.tsx (nuevo)
  
  gestion-dispositivos/
    page.tsx (nuevo)

middleware.ts (modificar)
```

---

## 📝 Paso 1: Migraciones de Base de Datos

### 1.1 Crear migración base: `scripts/migrations/008_add_dispositivos_autorizados.sql`

```sql
-- Tabla de códigos de activación (códigos de un solo uso para autorizar dispositivos)
CREATE TABLE IF NOT EXISTS codigos_activacion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    usado_en TIMESTAMP NULL,
    dispositivo_fingerprint VARCHAR(255) NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    expira_en TIMESTAMP NULL,
    CONSTRAINT codigo_no_vacio CHECK (LENGTH(codigo) > 0)
);

-- Tabla de dispositivos autorizados (computadoras que ya fueron autenticadas)
CREATE TABLE IF NOT EXISTS dispositivos_autorizados (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(255) UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    codigo_activacion_id INTEGER REFERENCES codigos_activacion(id) ON DELETE SET NULL,
    autorizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fingerprint_no_vacio CHECK (LENGTH(fingerprint) > 0)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_codigos_activacion_codigo ON codigos_activacion(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_activacion_usado ON codigos_activacion(usado);
CREATE INDEX IF NOT EXISTS idx_dispositivos_fingerprint ON dispositivos_autorizados(fingerprint);
CREATE INDEX IF NOT EXISTS idx_dispositivos_activo ON dispositivos_autorizados(activo);
CREATE INDEX IF NOT EXISTS idx_dispositivos_ultimo_acceso ON dispositivos_autorizados(ultimo_acceso);
```

### 1.2 Crear migración de campos adicionales: `scripts/migrations/009_add_nombre_codigos_dispositivos.sql`

```sql
-- Agregar campo nombre/descripción a códigos de activación
ALTER TABLE codigos_activacion 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(200) NULL,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Agregar campo nombre/descripción a dispositivos autorizados
ALTER TABLE dispositivos_autorizados 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(200) NULL;

-- Comentarios para documentación
COMMENT ON COLUMN codigos_activacion.nombre IS 'Nombre o descripción del código (ej: Oficina Central, Sucursal X)';
COMMENT ON COLUMN codigos_activacion.activo IS 'Indica si el código está activo (false = eliminado/desactivado)';
COMMENT ON COLUMN dispositivos_autorizados.nombre IS 'Nombre heredado del código de activación usado';

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_codigos_activacion_activo ON codigos_activacion(activo);
CREATE INDEX IF NOT EXISTS idx_codigos_activacion_nombre ON codigos_activacion(nombre);
```

**NOTA IMPORTANTE**: Si tu tabla de usuarios tiene otro nombre o estructura, ajusta las referencias en la migración (línea `creado_por INTEGER REFERENCES usuarios(id)`).

---

## 📝 Paso 2: Funciones Helper en `lib/auth.ts`

### 2.1 Agregar estas funciones al final de `lib/auth.ts`:

```typescript
/**
 * Genera un fingerprint único para un dispositivo basado en user agent
 */
export function generarFingerprint(userAgent: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

/**
 * Valida un código de activación y lo marca como usado
 */
export async function validarCodigoActivacion(
  codigo: string,
  fingerprint: string,
  userAgent: string,
  ipAddress?: string
): Promise<{ valido: boolean; mensaje?: string }> {
  try {
    // Normalizar el código ingresado (eliminar guiones y convertir a mayúsculas)
    const codigoNormalizado = codigo.replace(/-/g, '').toUpperCase();
    
    // Buscar el código normalizando ambos lados
    const result = await pool.query(
      `SELECT id, usado, expira_en, codigo, nombre, activo 
       FROM codigos_activacion 
       WHERE REPLACE(UPPER(codigo), '-', '') = $1`,
      [codigoNormalizado]
    );

    if (result.rows.length === 0) {
      return { valido: false, mensaje: 'Código de activación inválido' };
    }

    const codigoActivacion = result.rows[0];

    // Verificar si el código está activo
    if (codigoActivacion.activo === false) {
      return { valido: false, mensaje: 'Este código ha sido desactivado' };
    }

    // Verificar si ya fue usado
    if (codigoActivacion.usado) {
      return { valido: false, mensaje: 'Este código ya fue utilizado' };
    }

    // Verificar expiración
    if (codigoActivacion.expira_en && new Date(codigoActivacion.expira_en) < new Date()) {
      return { valido: false, mensaje: 'Este código ha expirado' };
    }

    // Verificar si el dispositivo ya está autorizado
    const dispositivoExistente = await pool.query(
      'SELECT id FROM dispositivos_autorizados WHERE fingerprint = $1 AND activo = TRUE',
      [fingerprint]
    );

    // Marcar código como usado y registrar/actualizar dispositivo
    await pool.query('BEGIN');

    try {
      // Marcar código como usado
      await pool.query(
        'UPDATE codigos_activacion SET usado = TRUE, usado_en = CURRENT_TIMESTAMP, dispositivo_fingerprint = $1 WHERE id = $2',
        [fingerprint, codigoActivacion.id]
      );

      if (dispositivoExistente.rows.length > 0) {
        // Dispositivo ya existe, actualizar (reautorización)
        await pool.query(
          `UPDATE dispositivos_autorizados 
           SET user_agent = $1, 
               ip_address = $2, 
               codigo_activacion_id = $3, 
               nombre = COALESCE($4, nombre),
               autorizado_en = CURRENT_TIMESTAMP,
               ultimo_acceso = CURRENT_TIMESTAMP,
               activo = TRUE
           WHERE fingerprint = $5`,
          [userAgent, ipAddress || null, codigoActivacion.id, codigoActivacion.nombre || null, fingerprint]
        );
      } else {
        // Nuevo dispositivo, insertarlo
        await pool.query(
          'INSERT INTO dispositivos_autorizados (fingerprint, user_agent, ip_address, codigo_activacion_id, nombre) VALUES ($1, $2, $3, $4, $5)',
          [fingerprint, userAgent, ipAddress || null, codigoActivacion.id, codigoActivacion.nombre || null]
        );
      }

      await pool.query('COMMIT');
      return { valido: true };
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error validando código de activación:', error);
    return { valido: false, mensaje: 'Error del servidor al validar el código' };
  }
}

/**
 * Verifica si un dispositivo está autorizado
 */
export async function verificarDispositivoAutorizado(
  fingerprint: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT id FROM dispositivos_autorizados WHERE fingerprint = $1 AND activo = TRUE',
      [fingerprint]
    );

    if (result.rows.length > 0) {
      // Actualizar último acceso
      await pool.query(
        'UPDATE dispositivos_autorizados SET ultimo_acceso = CURRENT_TIMESTAMP WHERE fingerprint = $1',
        [fingerprint]
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verificando dispositivo autorizado:', error);
    return false;
  }
}

/**
 * Genera un código de activación nuevo
 */
export async function generarCodigoActivacion(
  diasExpiracion: number = 30,
  nombre?: string
): Promise<string> {
  try {
    const crypto = require('crypto');
    const codigo = crypto.randomBytes(16).toString('hex').toUpperCase();

    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + diasExpiracion);

    await pool.query(
      'INSERT INTO codigos_activacion (codigo, expira_en, nombre) VALUES ($1, $2, $3)',
      [codigo, fechaExpiracion, nombre || null]
    );

    return codigo;
  } catch (error) {
    console.error('Error generando código de activación:', error);
    throw error;
  }
}

/**
 * Desactiva un código de activación
 */
export async function desactivarCodigoActivacion(codigoId: number): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE codigos_activacion SET activo = FALSE WHERE id = $1',
      [codigoId]
    );
    return true;
  } catch (error) {
    console.error('Error desactivando código de activación:', error);
    return false;
  }
}

/**
 * Desactiva un dispositivo autorizado
 */
export async function desactivarDispositivo(dispositivoId: number): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE dispositivos_autorizados SET activo = FALSE WHERE id = $1',
      [dispositivoId]
    );
    return true;
  } catch (error) {
    console.error('Error desactivando dispositivo:', error);
    return false;
  }
}

/**
 * Obtiene todos los dispositivos autorizados
 */
export async function obtenerDispositivosAutorizados() {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.fingerprint,
        d.nombre,
        d.user_agent,
        d.ip_address,
        d.autorizado_en,
        d.ultimo_acceso,
        d.activo,
        c.codigo as codigo_activacion,
        c.usado as codigo_usado,
        c.expira_en as codigo_expira_en,
        c.activo as codigo_activo
      FROM dispositivos_autorizados d
      LEFT JOIN codigos_activacion c ON d.codigo_activacion_id = c.id
      ORDER BY d.autorizado_en DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo dispositivos autorizados:', error);
    throw error;
  }
}

/**
 * Obtiene todos los códigos de activación
 */
export async function obtenerCodigosActivacion() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        codigo,
        nombre,
        usado,
        usado_en,
        dispositivo_fingerprint,
        creado_en,
        expira_en,
        activo
      FROM codigos_activacion
      ORDER BY creado_en DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo códigos de activación:', error);
    throw error;
  }
}
```

**IMPORTANTE**: Asegúrate de importar `pool` de tu archivo de base de datos al inicio de `lib/auth.ts`:

```typescript
import pool from './db'; // o la ruta correcta a tu conexión de BD
```

---

## 📝 Paso 3: API Routes

### 3.1 `app/api/autenticar/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validarCodigoActivacion, generarFingerprint } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { codigo } = await request.json();

    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
      return NextResponse.json(
        { error: 'El código de activación es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del dispositivo
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'desconocido';

    // Generar fingerprint del dispositivo
    const fingerprint = generarFingerprint(userAgent);

    // Validar el código
    const resultado = await validarCodigoActivacion(
      codigo.trim().toUpperCase(),
      fingerprint,
      userAgent,
      ipAddress
    );

    if (!resultado.valido) {
      return NextResponse.json(
        { error: resultado.mensaje || 'Código de activación inválido' },
        { status: 401 }
      );
    }

    // Retornar éxito con el fingerprint y establecer cookie
    const response = NextResponse.json({
      success: true,
      mensaje: 'Dispositivo autorizado correctamente',
      fingerprint: fingerprint,
    });

    // Establecer cookie con el fingerprint (válida por 1 año)
    response.cookies.set('device_fingerprint', fingerprint, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60, // 1 año
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error en autenticación de dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor al procesar la autenticación' },
      { status: 500 }
    );
  }
}
```

### 3.2 `app/api/verificar-dispositivo/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verificarDispositivoAutorizado, generarFingerprint } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { fingerprint } = await request.json();

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Fingerprint requerido' },
        { status: 400 }
      );
    }

    const estaAutorizado = await verificarDispositivoAutorizado(fingerprint);

    if (!estaAutorizado) {
      return NextResponse.json(
        { error: 'Dispositivo no autorizado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      autorizado: true,
    });
  } catch (error) {
    console.error('Error verificando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

// GET endpoint para verificar usando la cookie del request
export async function GET(request: NextRequest) {
  try {
    const fingerprintCookie = request.cookies.get('device_fingerprint')?.value;
    
    if (!fingerprintCookie) {
      return NextResponse.json({
        autorizado: false,
        fingerprint: null,
      });
    }

    const estaAutorizado = await verificarDispositivoAutorizado(fingerprintCookie);

    if (!estaAutorizado) {
      const response = NextResponse.json({
        autorizado: false,
        fingerprint: fingerprintCookie,
      });
      response.cookies.delete('device_fingerprint');
      return response;
    }

    return NextResponse.json({
      autorizado: true,
      fingerprint: fingerprintCookie,
    });
  } catch (error) {
    console.error('Error verificando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error del servidor', autorizado: false, fingerprint: null },
      { status: 500 }
    );
  }
}
```

### 3.3 `app/api/dispositivos/route.ts` (Opcional - solo si quieres gestión web)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { obtenerDispositivosAutorizados, obtenerCodigosActivacion, desactivarDispositivo, desactivarCodigoActivacion } from '@/lib/auth';

// GET: Obtener todos los dispositivos y códigos
export async function GET(request: NextRequest) {
  try {
    const usuarioRol = request.nextUrl.searchParams.get('usuario_rol');

    // Verificar que sea superadmin (ajustar según tu sistema de roles)
    if (!usuarioRol || usuarioRol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo superadmin puede acceder.' },
        { status: 403 }
      );
    }

    const [dispositivos, codigos] = await Promise.all([
      obtenerDispositivosAutorizados(),
      obtenerCodigosActivacion(),
    ]);

    // Calcular días restantes para códigos no usados
    const codigosConDiasRestantes = codigos.map((codigo: any) => {
      let diasRestantes = null;
      if (!codigo.usado && codigo.expira_en) {
        const fechaExpiracion = new Date(codigo.expira_en);
        const ahora = new Date();
        const diferencia = fechaExpiracion.getTime() - ahora.getTime();
        diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
      }
      return {
        ...codigo,
        dias_restantes: diasRestantes,
        esta_expirado: codigo.expira_en ? new Date(codigo.expira_en) < new Date() : false,
      };
    });

    return NextResponse.json({
      dispositivos,
      codigos: codigosConDiasRestantes,
    });
  } catch (error) {
    console.error('Error obteniendo dispositivos y códigos:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}

// POST: Desactivar dispositivo o código
export async function POST(request: NextRequest) {
  try {
    const { tipo, id, usuario_rol } = await request.json();

    if (!usuario_rol || usuario_rol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo superadmin puede acceder.' },
        { status: 403 }
      );
    }

    const { tipo, id } = await request.json();

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Tipo e ID son requeridos' },
        { status: 400 }
      );
    }

    let resultado = false;
    if (tipo === 'dispositivo') {
      resultado = await desactivarDispositivo(id);
    } else if (tipo === 'codigo') {
      resultado = await desactivarCodigoActivacion(id);
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Debe ser "dispositivo" o "codigo"' },
        { status: 400 }
      );
    }

    if (resultado) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Error al desactivar' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error desactivando:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
```

---

## 📝 Paso 4: Middleware

### 4.1 Modificar `middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware para verificar autorización de dispositivos
 * 
 * Verifica que el dispositivo tenga la cookie de autorización.
 * La validación real contra la base de datos se hace en las rutas API protegidas.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que NO requieren autorización de dispositivo
  const rutasPublicas = [
    '/autenticar',
    '/api/autenticar',
    '/api/verificar-dispositivo',
    '/api/auth/login', // Ajustar según tu ruta de login
  ];

  // Verificar si es una ruta pública
  const esRutaPublica = rutasPublicas.some(ruta => 
    pathname === ruta || pathname.startsWith(ruta)
  );

  if (esRutaPublica) {
    return NextResponse.next();
  }

  // Obtener el fingerprint de la cookie
  const fingerprint = request.cookies.get('device_fingerprint')?.value;

  // Si no tiene fingerprint, redirigir a /autenticar
  if (!fingerprint) {
    if (pathname !== '/autenticar') {
      const url = request.nextUrl.clone();
      url.pathname = '/autenticar';
      return NextResponse.redirect(url);
    }
  }

  // Permitir el acceso - la validación real se hace en las rutas API
  return NextResponse.next();
}

// Configurar qué rutas deben pasar por el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
```

**IMPORTANTE**: Ajusta la ruta `/api/auth/login` según tu sistema de autenticación.

---

## 📝 Paso 5: Página de Autenticación

### 5.1 Crear `app/autenticar/page.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function AutenticarPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(true)

  // Verificar si el dispositivo ya está autorizado
  useEffect(() => {
    const verificarAutorizacion = async () => {
      try {
        const response = await fetch('/api/verificar-dispositivo', {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.autorizado && data.fingerprint) {
            localStorage.setItem('device_fingerprint', data.fingerprint)
            router.push('/') // Ajustar según tu ruta de inicio
            return
          }
        }
        
        localStorage.removeItem('device_fingerprint')
        setVerificando(false)
      } catch (err) {
        console.error('Error verificando autorización:', err)
        localStorage.removeItem('device_fingerprint')
        setVerificando(false)
      }
    }

    verificarAutorizacion()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/autenticar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al autenticar el dispositivo')
        setLoading(false)
        return
      }

      if (data.fingerprint) {
        localStorage.setItem('device_fingerprint', data.fingerprint)
      }

      router.push('/') // Ajustar según tu ruta de inicio
    } catch (err) {
      setError('Error de conexión. Por favor, intente nuevamente.')
      setLoading(false)
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autorización...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Autenticación de Dispositivo
          </h1>
          <p className="text-gray-600">
            Ingrese el código de activación proporcionado por el administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-2">
              Código de Activación
            </label>
            <input
              id="codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-lg font-mono tracking-wider"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={64}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Autenticando...' : 'Autenticar Dispositivo'}
          </button>

          <div className="text-center text-sm text-gray-500">
            <p>
              Este código solo puede ser utilizado una vez.
              <br />
              Contacte al administrador si necesita un nuevo código.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## 📝 Paso 6: Script de Generación de Códigos

### 6.1 Crear `scripts/generar-codigo-activacion.js`:

```javascript
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function generarCodigoActivacion(diasExpiracion = 30, nombre = null) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ Error: DATABASE_URL no está configurado en .env.local');
      process.exit(1);
    }

    console.log('✅ Conectando a la base de datos...');

    try {
      await pool.query('SELECT 1');
    } catch (connError) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('Verifica que PostgreSQL esté ejecutándose y que DATABASE_URL sea correcto');
      process.exit(1);
    }

    const codigo = crypto.randomBytes(16).toString('hex').toUpperCase();
    const codigoFormateado = codigo.match(/.{1,4}/g).join('-');

    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + diasExpiracion);

    await pool.query(
      'INSERT INTO codigos_activacion (codigo, expira_en, nombre) VALUES ($1, $2, $3)',
      [codigo, fechaExpiracion, nombre]
    );

    console.log('\n✅ ¡Código de activación generado exitosamente!');
    console.log('\n📋 Detalles del código:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (nombre) {
      console.log(`Nombre:        ${nombre}`);
    }
    console.log(`Código:        ${codigoFormateado}`);
    console.log(`                ${codigo} (sin guiones también válido)`);
    console.log(`Expira en:     ${fechaExpiracion.toLocaleDateString('es-PY')}`);
    console.log(`Días válido:   ${diasExpiracion}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   • Este código solo puede ser usado UNA VEZ');
    console.log('   • Guárdalo de forma segura');
    console.log('   • Compártelo solo con quien necesita autorizar un dispositivo');
    console.log('   • El usuario debe ingresarlo en: /autenticar');
    console.log('   • Puede ingresarse con o sin guiones\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error generando código de activación:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.detail) {
      console.error('Detalle:', error.detail);
    }
    await pool.end();
    process.exit(1);
  }
}

const diasExpiracion = process.argv[2] ? parseInt(process.argv[2]) : 30;
const nombre = process.argv[3] || null;

if (isNaN(diasExpiracion) || diasExpiracion < 1) {
  console.error('❌ Error: Los días de expiración deben ser un número positivo');
  console.error('Uso: node scripts/generar-codigo-activacion.js [dias_expiracion] [nombre]');
  console.error('Ejemplo: node scripts/generar-codigo-activacion.js 30 "Oficina Central"');
  process.exit(1);
}

generarCodigoActivacion(diasExpiracion, nombre);
```

---

## 📝 Paso 7: Pasos de Implementación

### 7.1 Ejecutar Migraciones

```bash
# Primera migración
node scripts/run-migration.js 008_add_dispositivos_autorizados.sql

# Segunda migración
node scripts/run-migration.js 009_add_nombre_codigos_dispositivos.sql
```

### 7.2 Generar Primer Código

```bash
# Código básico (30 días)
node scripts/generar-codigo-activacion.js

# Código con nombre y días personalizados
node scripts/generar-codigo-activacion.js 30 "Oficina Central"
```

### 7.3 Probar el Sistema

1. Acceder a la aplicación (debe redirigir a `/autenticar`)
2. Ingresar el código generado
3. Debe redirigir al login/inicio
4. Las siguientes veces debe funcionar normalmente

---

## ⚠️ Puntos Importantes a Verificar

1. **Rutas de autenticación**: Ajusta las rutas en el middleware según tu sistema:
   - `/api/auth/login` → tu ruta de login real
   - `/` → tu ruta de inicio después de autenticar

2. **Roles de usuario**: Si usas diferentes nombres de roles, ajusta las validaciones en:
   - `app/api/dispositivos/route.ts` (cambiar `'superadmin'` por tu rol)

3. **Tabla de usuarios**: Si tu tabla de usuarios tiene otro nombre, ajusta la referencia en la migración 008.

4. **Estilos**: Los estilos usan Tailwind CSS. Si no lo usas, adapta las clases CSS.

5. **Importaciones**: Verifica que las rutas de importación sean correctas según tu estructura de proyecto.

---

## 🔍 Testing

### Escenarios a Probar:

1. ✅ Dispositivo nuevo → redirige a `/autenticar`
2. ✅ Código válido → autoriza y permite acceso
3. ✅ Código usado → rechaza
4. ✅ Código expirado → rechaza
5. ✅ Código desactivado → rechaza
6. ✅ Borrar cookies → redirige a `/autenticar`
7. ✅ Reautorizar con código nuevo → funciona

---

## 📚 Archivos de Referencia

Si necesitas ver la implementación completa, consulta estos archivos en el proyecto original:
- `lib/auth.ts` - Todas las funciones
- `middleware.ts` - Lógica de redirección
- `app/api/autenticar/route.ts` - Endpoint de autenticación
- `app/autenticar/page.tsx` - Página de autenticación

---

¡Listo! Con esta guía puedes replicar el sistema fielmente en cualquier proyecto Next.js con PostgreSQL.

