@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  CREER LA BOUTIQUE DE DEMONSTRATION  (version robuste)
REM ============================================================
REM
REM  POURQUOI CETTE VERSION ?
REM  La version precedente te demandait de coller l'URL dans la
REM  fenetre noire. Probleme : les mots de passe Neon contiennent
REM  souvent des caracteres ( % ! ^ & ) que Windows interprete,
REM  ce qui abime l'URL en silence.
REM
REM  ICI, tu colles l'URL dans le BLOC-NOTES (un vrai fichier).
REM  Windows ne touche jamais au contenu d'un fichier : l'URL
REM  arrive intacte.
REM ============================================================

cd /d "%~dp0"

set "FICHIER=url-production.txt"

echo.
echo ============================================================
echo   BOUTIQUE DE DEMONSTRATION
echo ============================================================
echo.

if not exist "package.json" (
  echo   [ERREUR] Lance ce script depuis le dossier du projet.
  echo.
  pause
  exit /b 1
)

if not exist "scripts\creer-boutique-demo.js" (
  echo   [ERREUR] scripts\creer-boutique-demo.js introuvable.
  echo            Applique d'abord fix-page-accueil.patch.
  echo.
  pause
  exit /b 1
)

REM ---- On cree le fichier s'il n'existe pas --------------------
if not exist "%FICHIER%" (
  (
    echo # ============================================================
    echo #  COLLE TON URL DE PRODUCTION CI-DESSOUS  ^(une seule ligne^)
    echo # ============================================================
    echo #
    echo #  Ou la trouver ?
    echo #    Vercel  -^>  ton projet  -^>  Settings
    echo #            -^>  Environment Variables
    echo #            -^>  la ligne DATABASE_URL de la colonne Production
    echo #
    echo #  Elle ressemble a :
    echo #    postgresql://neondb_owner:npg_XXXX@ep-xxxxx.neon.tech/neondb?sslmode=require
    echo #
    echo #  Les lignes qui commencent par # sont ignorees.
    echo #  Ecris ton URL sur la PREMIERE ligne libre, puis enregistre.
    echo #
    echo ============================================================
  ) > "%FICHIER%"
)

echo   ETAPE 1 sur 4
echo   ------------------------------------------------------------
echo   Le Bloc-notes va s'ouvrir avec le fichier :
echo        %FICHIER%
echo.
echo   Colle ton URL de PRODUCTION sur la premiere ligne libre,
echo   puis fais  Ctrl + S  pour enregistrer,
echo   puis FERME le Bloc-notes.
echo.
pause

start /wait notepad "%FICHIER%"

echo.
echo   ETAPE 2 sur 4
echo   ------------------------------------------------------------
echo   Preparation du client de base de donnees...
call npx prisma generate --schema=prisma/schema.prod.prisma
if errorlevel 1 (
  echo.
  echo   [ERREUR] Preparation impossible.
  echo.
  pause
  exit /b 1
)
echo   OK

echo.
echo   ETAPE 3 sur 4
echo   ------------------------------------------------------------
echo   Creation de la boutique de demonstration...
echo.
node scripts/creer-boutique-demo.js --fichier-url=%FICHIER%

if errorlevel 1 (
  echo.
  echo   [ECHEC] Lis le message ci-dessus.
  echo.
  echo   Causes les plus frequentes :
  echo     - l'URL collee n'est pas celle de la PRODUCTION
  echo     - la base Neon est en veille (ouvre le tableau de bord
  echo       Neon une fois, puis relance)
  echo     - l'URL est incomplete (copie-collee coupee)
  echo.
  echo   Relance ce script pour reessayer.
  echo.
  call npx prisma generate --schema=prisma/schema.prisma >nul 2>nul
  pause
  exit /b 1
)

echo.
echo   ETAPE 4 sur 4
echo   ------------------------------------------------------------
echo   Verification...
echo.
node scripts/creer-boutique-demo.js --verifier --fichier-url=%FICHIER%

call npx prisma generate --schema=prisma/schema.prisma >nul 2>nul

echo.
echo ============================================================
echo   TERMINE
echo ============================================================
echo.
echo   A VERIFIER SUR TON SITE (rafraichis la page) :
echo.
echo     1. Le bouton doit dire  « Voir la demo du catalogue »
echo        (avant il disait « Voir les fonctionnalites »)
echo     2. Clique dessus : tu dois voir les 22 produits
echo.
echo   Pas besoin de redeployer : la page relit la base a
echo   chaque visite.
echo.
echo   Ton URL reste enregistree dans %FICHIER%
echo   (tu peux relancer ce script quand tu veux).
echo.
pause
