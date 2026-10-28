@echo off
title Backend AbbySoft Textil (FastAPI)
echo ==============================================
echo   Iniciando Backend AbbySoft Textil (FastAPI)
echo   Puerto: http://localhost:8000
echo   Documentacion Swagger: http://localhost:8000/docs
echo ==============================================
cd /d "%~dp0backend"
call .venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
