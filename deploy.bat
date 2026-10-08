@echo off
setlocal
cd /d "%~dp0"

echo Building Ebny Bitak...
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. Nothing was deployed.
  pause
  exit /b 1
)

echo.
echo Deploying hosting, Firestore, and Storage to sayed-26f44...
where firebase >nul 2>&1
if errorlevel 1 (
  call npx --yes firebase-tools deploy --only hosting,firestore,storage --project sayed-26f44
) else (
  call firebase deploy --only hosting,firestore,storage --project sayed-26f44
)
if errorlevel 1 (
  echo.
  echo Deploy failed.
  pause
  exit /b 1
)

echo.
echo Deploy finished: https://sayed-26f44.web.app
pause
