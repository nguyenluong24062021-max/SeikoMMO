@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo    Wallet and Payment Flow Test - SeikoMMO Marketplace
echo ======================================================================
echo.
echo This script tests:
echo   1. User registration (Buyer + Seller)
echo   2. Seller creates shop and product
echo   3. Seller imports 100 keys
echo   4. Buyer deposits 500,000 VND
echo   5. Buyer purchases 2 keys (200,000 VND)
echo   6. Verify balances (Buyer: 300k, Seller: 180k after 10%% commission)
echo   7. Verify stock deduction (98 keys remaining)
echo   8. Try payout (should fail due to 24h hold)
echo.
echo Prerequisites:
echo   - API server running on http://localhost:3001
echo   - Database migrated
echo   - curl installed
echo   - jq installed (optional, for JSON parsing)
echo.
pause
echo.

set API_URL=http://localhost:3001

echo [1/8] Registering Buyer...
curl -s -X POST "%API_URL%/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"buyer@test.com\",\"password\":\"password123\",\"name\":\"Test Buyer\",\"role\":\"BUYER\"}" > buyer_response.json
echo Done. Check buyer_response.json for token.
echo.

echo [2/8] Registering Seller...
curl -s -X POST "%API_URL%/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"seller@test.com\",\"password\":\"password123\",\"name\":\"Test Seller\",\"role\":\"SELLER\"}" > seller_response.json
echo Done. Check seller_response.json for token.
echo.

echo [3/8] Please extract tokens from JSON files and continue manually:
echo   - Extract BUYER_TOKEN from buyer_response.json
echo   - Extract SELLER_TOKEN from seller_response.json
echo   - Use Postman or curl to complete the following steps:
echo.
echo     a. POST %API_URL%/shops (with SELLER_TOKEN)
echo        Body: {"name":"Premium Shop","description":"Test shop"}
echo.
echo     b. POST %API_URL%/products (with SELLER_TOKEN)
echo        Body: {"name":"Premium Key","type":"DIGITAL","price":100000,"shopId":"<SHOP_ID>"}
echo.
echo     c. POST %API_URL%/products/stock/import (with SELLER_TOKEN)
echo        Body: {"productId":"<PRODUCT_ID>","keys":[... 100 keys from keys-sample.txt]}
echo.
echo     d. POST %API_URL%/wallet/deposit (with BUYER_TOKEN)
echo        Body: {"amount":500000}
echo.
echo     e. POST %API_URL%/wallet/deposit/confirm (with BUYER_TOKEN)
echo        Body: {"transactionId":"<TRANSACTION_ID>","amount":500000}
echo.
echo     f. GET %API_URL%/wallet/me (with BUYER_TOKEN)
echo        - Should show balance: 500000
echo.
echo     g. POST %API_URL%/orders (with BUYER_TOKEN)
echo        Body: {"items":[{"productId":"<PRODUCT_ID>","quantity":2}]}
echo.
echo     h. GET %API_URL%/wallet/me (with BUYER_TOKEN and SELLER_TOKEN)
echo        - Buyer should show: 300000
echo        - Seller should show: 180000 (90%% after commission)
echo.
echo     i. GET %API_URL%/products/<PRODUCT_ID>
echo        - Should show availableStock: 98
echo.
echo     j. POST %API_URL%/payouts (with SELLER_TOKEN)
echo        Body: {"amount":100000}
echo        - Should FAIL with "funds on hold" message
echo.
echo For automated testing on Windows with PowerShell, use test-wallet-flow.ps1 instead.
echo For Linux/Mac, use test-wallet-flow.sh
echo.
pause
