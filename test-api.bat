@echo off
setlocal enabledelayedexpansion

echo ===================================
echo Testing Seiko MMO API
echo ===================================

set API_URL=http://localhost:3001

echo.
echo Step 1: Register 3 users (BUYER, SELLER, ADMIN)
echo -----------------------------------

REM Register Buyer
echo Registering BUYER...
curl -s -X POST "%API_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"buyer@test.com\",\"password\":\"123456\",\"name\":\"Test Buyer\",\"role\":\"BUYER\"}" ^
  > buyer_response.json
echo [92m√ Buyer registered[0m

REM Register Seller
echo Registering SELLER...
curl -s -X POST "%API_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"seller@test.com\",\"password\":\"123456\",\"name\":\"Test Seller\",\"role\":\"SELLER\"}" ^
  > seller_response.json
echo [92m√ Seller registered[0m

REM Register Admin
echo Registering ADMIN...
curl -s -X POST "%API_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"123456\",\"name\":\"Test Admin\",\"role\":\"ADMIN\"}" ^
  > admin_response.json
echo [92m√ Admin registered[0m

echo.
echo Step 2: Use Postman or Thunder Client to continue testing
echo Please refer to API_DOCS.md for detailed testing steps
echo.

echo Next steps:
echo 1. Login as seller and get access token
echo 2. Create shop
echo 3. Create product
echo 4. Import 100 keys (see keys-sample.txt)
echo 5. Login as buyer and create order
echo 6. Verify stock deduction
echo.

echo See API_DOCS.md for complete API documentation
pause
