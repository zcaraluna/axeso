@echo off
REM Script para agregar el dominio al archivo hosts de Windows
REM Ejecutar como Administrador: Ejecutar PowerShell como Administrador y luego: .\scripts\fix-dns-windows.bat

echo ==========================================
echo CONFIGURAR DNS LOCAL EN WINDOWS
echo ==========================================
echo.

set DOMAIN=visitantes.cyberpol.com.py
set IP=144.202.77.18
set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts

echo Verificando si el dominio ya existe en hosts...
findstr /C:"%DOMAIN%" %HOSTS_FILE% >nul 2>&1
if %errorlevel% equ 0 (
    echo El dominio ya existe en hosts.
    echo Eliminando entrada antigua...
    powershell -Command "(Get-Content '%HOSTS_FILE%') | Where-Object { $_ -notmatch '%DOMAIN%' } | Set-Content '%HOSTS_FILE%'"
)

echo.
echo Agregando entrada al archivo hosts...
echo %IP%    %DOMAIN% >> %HOSTS_FILE%

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo CONFIGURACION COMPLETADA
    echo ==========================================
    echo.
    echo Entrada agregada: %IP%    %DOMAIN%
    echo.
    echo Limpiando cache DNS...
    ipconfig /flushdns
    echo.
    echo Ahora prueba acceder a: https://%DOMAIN%
    echo.
) else (
    echo.
    echo ERROR: No se pudo agregar la entrada.
    echo Asegurate de ejecutar este script como Administrador.
    echo.
)

pause

