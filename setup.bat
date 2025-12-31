@echo off
echo Fixing Next.js dynamic route folders...

if exist "app\requests\__id__" (
  rename "app\requests\__id__" "[id]"
  echo Renamed app/requests/[id]
)

if exist "app\api\requests\__id__" (
  rename "app\api\requests\__id__" "[id]"
  echo Renamed app/api/requests/[id]
)

if exist "app\api\auth\__nextauth__" (
  rename "app\api\auth\__nextauth__" "[...nextauth]"
  echo Renamed app/api/auth/[...nextauth]
)

echo.
echo Done! Now run:
echo    npm install
echo    npm run dev
pause
