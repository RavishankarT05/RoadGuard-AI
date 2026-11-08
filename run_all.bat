@echo off
echo ========================================================
echo   ROADGUARD AI - Launching Full-Stack Application
echo ========================================================
echo.
echo Launching Backend server in a separate terminal...
start "RoadGuard AI Backend" cmd /c "run_backend.bat"
timeout /t 3 /nobreak >nul
echo Launching Frontend dev server in a separate terminal...
start "RoadGuard AI Frontend" cmd /c "run_frontend.bat"
echo.
echo ========================================================
echo   Application Launched!
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ========================================================

