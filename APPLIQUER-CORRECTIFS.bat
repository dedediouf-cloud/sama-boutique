@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  APPLIQUER LES CORRECTIFS — SamaBoutique
REM ============================================================
REM  Double-clique sur ce fichier (ou lance-le dans PowerShell).
REM  Il applique les 2 correctifs avec l'option qui gère les
REM  fins de ligne Windows (--ignore-whitespace), puis publie.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   APPLICATION DES CORRECTIFS
echo ============================================================
echo.
echo   Dossier : %CD%
echo.

REM ---- Vérifications préalables ------------------------------
if not exist "package.json" (
  echo   [ERREUR] Ce script doit se trouver dans le dossier du projet
  echo            ^(celui qui contient package.json^).
  echo.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo   [ERREUR] Git n'est pas installe ou pas dans le PATH.
  echo.
  pause
  exit /b 1
)

if not exist "fix-mobile-motdepasse.patch" (
  echo   [ERREUR] Fichier manquant : fix-mobile-motdepasse.patch
  echo            Place-le dans ce dossier, puis relance.
  echo.
  pause
  exit /b 1
)

if not exist "fix-outils.patch" (
  echo   [ERREUR] Fichier manquant : fix-outils.patch
  echo            Place-le dans ce dossier, puis relance.
  echo.
  pause
  exit /b 1
)

REM ---- Etat du depot -----------------------------------------
echo   Etat actuel du depot :
git status --short
echo.

set /p REPONSE="  Continuer ? (o/n) : "
if /i not "%REPONSE%"=="o" (
  echo   Annule.
  pause
  exit /b 0
)

REM ---- Application des correctifs ----------------------------
echo.
echo ------------------------------------------------------------
echo   1/2  Correctif mobile + mot de passe
echo ------------------------------------------------------------
git apply --ignore-whitespace fix-mobile-motdepasse.patch
if errorlevel 1 (
  echo.
  echo   [ECHEC] Essaie : git apply --ignore-whitespace --reject fix-mobile-motdepasse.patch
  echo.
  pause
  exit /b 1
)
echo   OK

echo.
echo ------------------------------------------------------------
echo   2/2  Deploiement sans risque + outils
echo ------------------------------------------------------------
git apply --ignore-whitespace fix-outils.patch
if errorlevel 1 (
  echo.
  echo   [ECHEC] Essaie : git apply --ignore-whitespace --reject fix-outils.patch
  echo.
  pause
  exit /b 1
)
echo   OK

REM ---- Verification ------------------------------------------
echo.
echo ------------------------------------------------------------
echo   VERIFICATION
echo ------------------------------------------------------------
if exist "src\components\PasswordInput.tsx" (echo   [OK] Champ mot de passe cree) else (echo   [!!] PasswordInput.tsx absent)
if exist "scripts\verifier-schema.js" (echo   [OK] Outil de verification cree) else (echo   [!!] verifier-schema.js absent)
if exist "src\lib\backup\export.ts" (echo   [OK] Sauvegardes presentes) else (echo   [!!] sauvegardes absentes)

findstr /C:"--accept-data-loss" package.json >nul 2>nul
if errorlevel 1 (echo   [OK] --accept-data-loss retire) else (echo   [!!] --accept-data-loss ENCORE PRESENT)

echo.
echo   Fichiers modifies :
git status --short
echo.

REM ---- Publication ------------------------------------------
echo ------------------------------------------------------------
echo   PUBLICATION
echo ------------------------------------------------------------
set /p PUBLIER="  Publier sur Vercel maintenant ? (o/n) : "
if /i not "%PUBLIER%"=="o" (
  echo.
  echo   Correctifs appliques mais NON publies.
  echo   Pour publier plus tard :
  echo     git add -A
  echo     git commit -m "correctifs mobile + deploiement sans risque"
  echo     git push
  echo.
  pause
  exit /b 0
)

git add -A
git commit -m "correctifs mobile + deploiement sans risque"
git push

echo.
echo ============================================================
echo   TERMINE
echo ============================================================
echo.
echo   Apres le deploiement Vercel ^(1 a 2 minutes^) :
echo     1. Ouvre l'application sur ton telephone
echo     2. Fais Ctrl + Shift + R
echo     3. Ouvre le menu : tout doit defiler jusqu'a Deconnexion
echo     4. Sur la page de connexion : l'icone oeil affiche le mot de passe
echo.
pause
