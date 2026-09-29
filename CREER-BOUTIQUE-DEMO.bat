@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  BOUTIQUE DE DÉMONSTRATION — SamaBoutique
REM ============================================================
REM  Crée (ou remplit) la boutique de démonstration.
REM  C'est vers elle que pointe le bouton
REM    « Voir la démo du catalogue »  de la page d'accueil.
REM
REM  Sans elle, ce bouton afficherait une page vide.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   BOUTIQUE DE DEMONSTRATION
echo ============================================================
echo.
echo   Ce script cree une boutique de demonstration avec
echo   22 produits realistes (riz, huile, savon, boissons...).
echo.
echo   Elle sera visible sur :  /catalog/demo
echo.
echo   ATTENTION : il faut la creer sur la MEME base que ton site
echo   en ligne, sinon la demonstration ne s'affichera pas.
echo   -> utilise l'URL de PRODUCTION (Neon).
echo.

if not exist "package.json" (
  echo   [ERREUR] Lance ce script depuis le dossier du projet.
  echo.
  pause
  exit /b 1
)

if not exist "scripts\creer-boutique-demo.js" (
  echo   [ERREUR] scripts\creer-boutique-demo.js introuvable.
  echo            Applique d'abord le correctif de la page d'accueil.
  echo.
  pause
  exit /b 1
)

echo   Ouvre Vercel (Settings - Environment Variables) et copie
echo   la valeur de DATABASE_URL (colonne Production).
echo.
set /p URL="  Colle ici ta DATABASE_URL de production : "

if "%URL%"=="" (
  echo.
  echo   [ANNULE] Aucune URL saisie.
  echo.
  pause
  exit /b 1
)

echo %URL% | findstr /C:"postgresql://" >nul
if errorlevel 1 (
  echo.
  echo   [ATTENTION] Cette URL ne commence pas par postgresql://
  echo.
  echo   Tu as peut-etre colle l'URL locale, qui ressemble a :
  echo     file:./dev.db
  echo.
  set /p CONTINUER="  Continuer quand meme ? (o/n) : "
  if /i not "!CONTINUER!"=="o" (
    echo   Annule.
    pause
    exit /b 0
  )
)

echo.
echo ------------------------------------------------------------
echo   Etape 1/3 : preparation du client de base de donnees
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
echo   Etape 2/3 : creation de la boutique de demonstration
echo ------------------------------------------------------------
echo.
node scripts/creer-boutique-demo.js "%URL%"
if errorlevel 1 (
  echo.
  echo   [ERREUR] La creation a echoue. Lis le message ci-dessus.
  echo.
  pause
  exit /b 1
)

echo.
echo ------------------------------------------------------------
echo   Etape 3/3 : remise en etat pour le developpement local
echo ------------------------------------------------------------
call npx prisma generate --schema=prisma/schema.prisma >nul 2>nul
echo   OK (client local restaure)

echo.
echo ============================================================
echo   TERMINE
echo ============================================================
echo.
echo   A VERIFIER MAINTENANT :
echo.
echo     1. Ouvre ton site
echo     2. Sur la page d'accueil, le bouton
echo        « Voir la demo du catalogue » doit etre visible
echo     3. Clique dessus : tu dois voir les 22 produits
echo.
echo   Si le bouton affiche « Fonctionnalites » au lieu de la demo,
echo   c'est que la boutique n'a pas ete creee sur la bonne base :
echo   relance ce script avec l'URL de PRODUCTION.
echo.
pause
