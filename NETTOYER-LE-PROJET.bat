@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  NETTOYAGE DU PROJET — SamaBoutique
REM ============================================================
REM  Retire les fichiers de travail qui ont été appliqués :
REM    - les fichiers .patch (déjà appliqués, donc inutiles)
REM    - le script d'application lui-même
REM    - un fichier texte oublié dans src/app/login
REM
REM  Aucun fichier de l'application n'est supprimé.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   NETTOYAGE DU PROJET
echo ============================================================
echo.

if not exist "package.json" (
  echo   [ERREUR] Lance ce script depuis le dossier du projet.
  echo.
  pause
  exit /b 1
)

echo   Fichiers qui vont etre retires :
echo.
set COMPTE=0
for %%F in (fix-audit-v2.patch fix-audit-v3.patch fix-essai-vercel.patch fix-mobile-motdepasse.patch fix-outils.patch fix-performance.patch fix-route-account.patch fix-sauvegardes.patch fix-securite-seed.patch fix-superadmin-page.patch fix-superadmin-page.patch.txt APPLIQUER-CORRECTIFS.bat src\app\login\page.tsx.txt) do (
  if exist "%%F" (
    echo     - %%F
    set /a COMPTE+=1
  )
)

echo.
echo   %COMPTE% fichier^(s^) a retirer.
echo.
echo   Ces fichiers sont DEJA APPLIQUES : tes correctifs restent en place.
echo   Ils sont aussi conserves dans l'historique git et dans le dossier
echo   de telechargement, donc rien n'est perdu.
echo.
set /p REPONSE="  Continuer ? (o/n) : "
if /i not "%REPONSE%"=="o" (
  echo   Annule.
  pause
  exit /b 0
)

echo.
git rm -q --ignore-unmatch fix-audit-v2.patch fix-audit-v3.patch fix-essai-vercel.patch fix-mobile-motdepasse.patch fix-outils.patch fix-performance.patch fix-route-account.patch fix-sauvegardes.patch fix-securite-seed.patch fix-superadmin-page.patch 2>nul
if exist "fix-superadmin-page.patch.txt" del /q "fix-superadmin-page.patch.txt"
if exist "APPLIQUER-CORRECTIFS.bat" del /q "APPLIQUER-CORRECTIFS.bat"
if exist "src\app\login\page.tsx.txt" git rm -q --ignore-unmatch "src/app/login/page.tsx.txt"
if exist "src\app\login\page.tsx.txt" del /q "src\app\login\page.tsx.txt"

echo.
echo   Fichiers restants a la racine :
echo.
dir /b *.patch *.bat 2>nul
echo   ^(aucun si rien ne s'affiche ci-dessus^)
echo.

echo ------------------------------------------------------------
echo   VERIFICATION que l'application est intacte
echo ------------------------------------------------------------
if exist "src\components\PasswordInput.tsx" (echo   [OK] champ mot de passe) else (echo   [!!] PasswordInput.tsx MANQUANT)
if exist "scripts\verifier-schema.js"   (echo   [OK] outil de verification) else (echo   [!!] verifier-schema.js MANQUANT)
if exist "src\lib\backup\export.ts"     (echo   [OK] sauvegardes) else (echo   [!!] sauvegardes MANQUANTES)
findstr /C:"--accept-data-loss" package.json >nul 2>nul
if errorlevel 1 (echo   [OK] --accept-data-loss retire) else (echo   [!!] --accept-data-loss ENCORE PRESENT)

echo.
set /p PUBLIER="  Publier ce nettoyage ? (o/n) : "
if /i not "%PUBLIER%"=="o" (
  echo.
  echo   Nettoyage fait localement mais NON publie.
  echo     git add -A ^&^& git commit -m "nettoyage: retrait des fichiers de travail" ^&^& git push
  echo.
  pause
  exit /b 0
)

git add -A
git commit -m "nettoyage: retrait des fichiers de travail deja appliques"
git push

echo.
echo ============================================================
echo   TERMINE
echo ============================================================
echo.
pause
