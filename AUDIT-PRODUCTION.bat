@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  AUDIT DE LA PRODUCTION — SamaBoutique
REM ============================================================
REM  Vérifie s'il reste des comptes en "demo123" sur ta VRAIE
REM  base de production (Neon), pas sur ta base locale.
REM
REM  Ce script ne MODIFIE RIEN : il lit seulement.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   AUDIT DE LA PRODUCTION
echo ============================================================
echo.
echo   Ce script va verifier les comptes de ta base de PRODUCTION.
echo   Il ne modifie RIEN.
echo.
echo   Ouvre Vercel (Settings - Environment Variables) et copie
echo   la valeur de DATABASE_URL (celle marquee Production).
echo.
echo   Elle ressemble a :
echo     postgresql://neondb_owner:npg_XXXX@ep-xxxxx.neon.tech/neondb?sslmode=require
echo.
echo   IMPORTANT : utilise les GUILLEMETS DOUBLES " " autour de l'URL,
echo               pour les commandes ci-dessous.
echo.

if not exist "package.json" (
  echo   [ERREUR] Lance ce script depuis le dossier du projet.
  echo.
  pause
  exit /b 1
)

if not exist "scripts\audit-securite.js" (
  echo   [ERREUR] scripts\audit-securite.js introuvable.
  echo            Applique d'abord fix-outils.patch.
  echo.
  pause
  exit /b 1
)

echo.
set /p URL="  Colle ici ta DATABASE_URL de production : "

if "%URL%"=="" (
  echo.
  echo   [ANNULÉ] Aucune URL saisie.
  echo.
  pause
  exit /b 1
)

echo %URL% | findstr /C:"postgresql://" >nul
if errorlevel 1 (
  echo.
  echo   [ERREUR] L'URL ne commence pas par postgresql://
  echo.
  echo   Tu as peut-etre colle l'URL de developpement, qui ressemble a :
  echo     file:./dev.db
  echo.
  echo   Va dans Vercel - Settings - Environment Variables et prends
  echo   la ligne DATABASE_URL de la colonne "Production".
  echo.
  pause
  exit /b 1
)

echo.
echo ------------------------------------------------------------
echo   Etape 1/2 : preparation du client de base de donnees
echo ------------------------------------------------------------
call npx prisma generate --schema=prisma/schema.prod.prisma
if errorlevel 1 (
  echo.
  echo   [ERREUR] Impossible de preparer le client Prisma.
  echo.
  pause
  exit /b 1
)
echo   OK

echo.
echo ------------------------------------------------------------
echo   Etape 2/2 : analyse de la production
echo ------------------------------------------------------------
echo.
node scripts/audit-securite.js --complet "%URL%"

echo.
echo ------------------------------------------------------------
echo   Remise en etat pour le developpement local
echo ------------------------------------------------------------
call npx prisma generate --schema=prisma/schema.prisma >nul 2>nul
echo   OK (client local restaure)
echo.
echo ============================================================
echo   FIN
echo ============================================================
echo.
echo   LIS BIEN LE RAPPORT CI-DESSUS :
echo.
echo     - Si TOUT est vert (OK) : ta production est propre.
echo     - Si une ligne affiche CRITIQUE en rouge : il faut
echo       corriger ce compte (voir les instructions du rapport).
echo     - Si tu vois des boutiques que tu ne reconnais pas :
echo       note-les et traite-les en priorite.
echo.
echo   Pour relancer plus tard, double-clique simplement sur ce
echo   fichier a nouveau.
echo.
pause
