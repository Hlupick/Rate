# Builds the Android APK (Trusted Web Activity) and publishes it to the site.
#
# The wrapper project lives outside the repo: C:\Users\Stasg\monah-twa.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Version 1.0.1 -Deploy

param(
  [string]$Version = '',
  [switch]$Deploy,
  [string]$TwaDir = 'C:\Users\Stasg\monah-twa',
  [string]$ToolsDir = 'C:\Users\Stasg\tools'
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $TwaDir 'twa-manifest.json'
$passwordPath = Join-Path $TwaDir 'keystore-password.txt'

if (-not (Test-Path $manifestPath)) { throw "twa-manifest.json not found in $TwaDir" }
if (-not (Test-Path $passwordPath)) { throw "keystore-password.txt not found in $TwaDir" }

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$code = [int]$manifest.appVersionCode + 1
if ($Version) { $manifest.appVersion = $Version }
$manifest.appVersionCode = $code
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath

Write-Host "Building monah $($manifest.appVersion) ($code)..."

$env:JAVA_HOME = Join-Path $ToolsDir 'jdk17'
$env:ANDROID_HOME = Join-Path $ToolsDir 'android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ProgramFiles\nodejs;$env:Path"

$password = (Get-Content $passwordPath -Raw).Trim()
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $password
$env:BUBBLEWRAP_KEY_PASSWORD = $password

Push-Location $TwaDir
try {
  & "$env:ProgramFiles\nodejs\node.exe" (Join-Path $repo 'scripts\twa-generate.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'project generation failed' }

  & "$env:ProgramFiles\nodejs\npx.cmd" bubblewrap build
  if ($LASTEXITCODE -ne 0) { throw 'bubblewrap build failed' }
} finally {
  Pop-Location
}

$apk = Join-Path $TwaDir 'app-release-signed.apk'
if (-not (Test-Path $apk)) { throw "APK not found: $apk" }

$appDir = Join-Path $repo 'storage\app'
New-Item -ItemType Directory -Force -Path $appDir | Out-Null
Copy-Item $apk (Join-Path $appDir 'monah.apk') -Force

@{
  versionName = $manifest.appVersion
  versionCode = $code
  builtAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json | Set-Content (Join-Path $appDir 'build.json')

Write-Host "Published locally: $appDir\monah.apk ($([math]::Round((Get-Item $apk).Length / 1MB, 1)) MB)"

if ($Deploy) {
  ssh -i C:\Users\Stasg\.ssh\monah_deploy -o StrictHostKeyChecking=no root@2.56.118.173 "mkdir -p /root/monah/storage/app"
  scp -i C:\Users\Stasg\.ssh\monah_deploy -o StrictHostKeyChecking=no (Join-Path $appDir 'monah.apk') root@2.56.118.173:/root/monah/storage/app/monah.apk
  scp -i C:\Users\Stasg\.ssh\monah_deploy -o StrictHostKeyChecking=no (Join-Path $appDir 'build.json') root@2.56.118.173:/root/monah/storage/app/build.json
  Write-Host 'Uploaded to https://ratemusic.space/api/app/android'
}
