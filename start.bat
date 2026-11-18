@echo off
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

if not exist "storage\monah.db" (
  echo Generating demo library, this takes a couple of minutes...
  call npm run seed
)

start "" http://localhost:3000
call npm run dev
