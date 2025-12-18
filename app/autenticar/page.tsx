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
            router.push('/')
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
        credentials: 'include',
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

      router.push('/')
    } catch (err) {
      setError('Error de conexión. Por favor, intente nuevamente.')
      setLoading(false)
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white text-xl">Verificando autorización...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Autenticación de Dispositivo
            </h1>
            <p className="text-slate-600 text-sm">
              Ingrese el código de activación proporcionado por el administrador
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="codigo" className="block text-sm font-medium text-slate-700 mb-2">
                Código de Activación
              </label>
              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-lg font-mono tracking-wider text-slate-900"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={64}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? 'Autenticando...' : 'Autenticar Dispositivo'}
            </button>

            <div className="text-center text-sm text-slate-500">
              <p>
                Este código solo puede ser utilizado una vez.
                <br />
                Contacte al administrador si necesita un nuevo código.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

