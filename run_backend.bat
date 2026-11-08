@echo off
title RoadGuard AI - FastAPI Backend Server
echo ========================================================
echo   ROADGUARD AI - Intelligent Road Monitoring Platform
echo   Starting FastAPI Backend Server on 127.0.0.1:8000
echo ========================================================
echo.
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
pause

