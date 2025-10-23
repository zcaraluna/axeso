'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface Visit {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  entryDate: string;
  entryTime: string;
  motivoCategoria: string;
  motivoDescripcion: string;
  photo?: string;
  exitDate?: string;
  exitTime?: string;
  registeredBy: string;
  exitRegisteredBy?: string;
}

export default function RegistroEntrada() {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    fechaNacimiento: '',
    telefono: '',
    motivoCategoria: '',
    motivoDescripcion: ''
  });
  const [edad, setEdad] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const motivosCategoria = [
    'Consulta',
    'Entrega de Documentos',
    'Citación',
    'Denuncia',
    'Visita a Director',
    'Otro'
  ];

  useEffect(() => {
    if (authLoading) return; // Esperar a que termine la carga de autenticación
    
    if (!user) {
      router.push('/');
      return;
    }

    // Detectar cámaras disponibles pero NO iniciar automáticamente
    detectCamerasOnly();

    // Limpiar al desmontar
    return () => {
      stopCamera();
    };
  }, [user, authLoading, router]);

  const detectCamerasOnly = async () => {
    try {
      // Primero solicitar permisos temporalmente
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Obtener lista de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Cerrar el stream temporal
      tempStream.getTracks().forEach(track => track.stop());
      
      setCameras(videoDevices);
      
      // Buscar la cámara Logitech Brio 100 como predeterminada
      const brioCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('brio') || 
        device.label.toLowerCase().includes('logitech brio')
      );
      
      if (brioCamera) {
        // Si se encuentra la Brio, establecerla como seleccionada (pero no iniciarla)
        setSelectedCamera(brioCamera.deviceId);
      } else if (videoDevices.length > 0) {
        // Si no se encuentra, usar la primera cámara disponible
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error al detectar cámaras:', error);
      setCameraError('No se pudo acceder a las cámaras. Por favor, verifique los permisos.');
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError('');
      console.log('startCamera llamado con deviceId:', deviceId);
      
      // Detener cámara anterior si existe
      stopCamera();
      
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { 
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            }
      };
      
      console.log('Solicitando permisos con constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtenido:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        console.log('Cámara activada exitosamente');
      } else {
        console.error('videoRef.current es null');
        setCameraError('Error: Elemento de video no disponible');
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setCameraError(`No se pudo acceder a la cámara: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera(selectedCamera);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    setSelectedCamera(newCameraId);
    if (!photo) {
      startCamera(newCameraId);
    }
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'fechaNacimiento' && value) {
      const calculatedAge = calculateAge(value);
      setEdad(calculatedAge);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const visitData = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: formData.cedula,
        fechaNacimiento: formData.fechaNacimiento,
        edad: edad || 0,
        telefono: formData.telefono,
        entryDate: now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        entryTime: now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false }),
        motivoCategoria: formData.motivoCategoria,
        motivoDescripcion: formData.motivoDescripcion,
        photo: photo || undefined,
        userId: user.id
      };

      const response = await apiClient.createVisit(visitData);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data && typeof response.data === 'object' && 'id' in response.data) {
        // Redirigir a la página de resumen
        router.push(`/resumen-registro?id=${(response.data as { id: string }).id}`);
      }
    } catch (error) {
      console.error('Error creating visit:', error);
      setError('Error al registrar la visita');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-16">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition">
              aXeso - Policía Nacional (DCHPEF)
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm font-medium">
              Volver al Inicio
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Registro de Entrada</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombres" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombres *
                </label>
                <input
                  id="nombres"
                  name="nombres"
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleInputChange(e);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="apellidos" className="block text-sm font-medium text-slate-700 mb-2">
                  Apellidos *
                </label>
                <input
                  id="apellidos"
                  name="apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleInputChange(e);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="cedula" className="block text-sm font-medium text-slate-700 mb-2">
                  Número de Documento *
                </label>
                <input
                  id="cedula"
                  name="cedula"
                  type="text"
                  value={formData.cedula}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-slate-700 mb-2">
                  Número de Teléfono *
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="fechaNacimiento" className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha de Nacimiento *
                </label>
                <input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Edad
                </label>
                <input
                  type="text"
                  value={edad !== null ? `${edad} años` : ''}
                  disabled
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="motivoCategoria" className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo de Visita *
                </label>
                <select
                  id="motivoCategoria"
                  name="motivoCategoria"
                  value={formData.motivoCategoria}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  required
                >
                  <option value="">Seleccione un motivo</option>
                  {motivosCategoria.map(motivo => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="motivoDescripcion" className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción del Motivo *
                </label>
                <textarea
                  id="motivoDescripcion"
                  name="motivoDescripcion"
                  value={formData.motivoDescripcion}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900 resize-none"
                  required
                />
              </div>
            </div>

            {/* Sección de Cámara */}
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Fotografía del Visitante (Opcional)</h2>
              
              {cameraError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                  {cameraError}
                </div>
              )}

              {/* Selector de cámara */}
              {cameras.length > 1 && !photo && cameraActive && (
                <div className="mb-4">
                  <label htmlFor="cameraSelect" className="block text-sm font-medium text-slate-700 mb-2">
                    Seleccionar Cámara
                  </label>
                  <select
                    id="cameraSelect"
                    value={selectedCamera}
                    onChange={handleCameraChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-slate-900"
                  >
                    {cameras.map((camera, index) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Cámara ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col items-center">
                {!photo ? (
                  <div className="w-full max-w-md">
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ display: cameraActive ? 'block' : 'none' }}
                      />
                      {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                          <p className="text-white text-center px-4">Presiona el botón para activar la cámara</p>
                        </div>
                      )}
                    </div>
                    {cameraActive ? (
                      <div className="flex gap-3 mt-4">
                        <button
                          type="button"
                          onClick={takePhoto}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                        >
                          Capturar Foto
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Iniciando cámara con deviceId:', selectedCamera);
                          startCamera(selectedCamera || undefined);
                        }}
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                      >
                        Tomar Fotografía
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <img
                        src={photo}
                        alt="Foto del visitante"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                      >
                        Tomar Otra Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                      >
                        Eliminar Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? 'Registrando...' : 'Registrar Entrada'}
              </button>
              <Link href="/dashboard" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

