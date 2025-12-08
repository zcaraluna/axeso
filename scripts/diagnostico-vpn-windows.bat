@echo off
REM Diagnóstico de VPN en Windows
REM Ejecutar como Administrador

echo ==========================================
echo DIAGNOSTICO DE VPN
echo ==========================================
echo.

echo 1. Verificando interfaces de red...
echo ------------------------------------
ipconfig | findstr /C:"IPv4" /C:"10.8.0"
echo.

echo 2. Verificando rutas VPN...
echo ---------------------------
route print | findstr "10.8.0"
echo.

echo 3. Verificando ruta por defecto...
echo -----------------------------------
route print 0.0.0.0
echo.

echo 4. Probando conectividad a través de VPN...
echo -------------------------------------------
ping -n 2 10.8.0.1
echo.

echo 5. Verificando tu IP pública actual...
echo --------------------------------------
curl -s https://api.ipify.org
echo.

echo 6. Verificando acceso al servidor...
echo ------------------------------------
curl -s -k https://visitantes.cyberpol.com.py/api/debug-ip | findstr "detectedIp"
echo.

pause


