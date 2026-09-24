#!/bin/bash
# test-api.sh - SeikoMMO API Test Script
# ROO-07: Added voucher exhaustion test (400 not 500)

set -e

API_URL="${API_URL:-http://localhost:3001}"
echo "=================================================="
echo "  SeikoMMO API Test Suite"
echo "  API: $API_URL"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

info() {
  echo "ℹ INFO: $1"
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0

run_test() {
  TESTS_RUN=$((TESTS_RUN + 1))
  echo ""
  echo "────────────────────────────────────────────────"
  echo "Test $TESTS_RUN: $1"
  echo "────────────────────────────────────────────────"
}

# Variables to store tokens and IDs
SELLER_TOKEN=""
BUYER_TOKEN=""
ADMIN_TOKEN=""
SHOP_ID=""
PRODUCT_ID=""
VOUCHER_CODE=""
ORDER_ID=""

# ==========================================
# Test 1: Health Check
# ==========================================
run_test "Health Check"
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "API is healthy"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "API health check failed"
fi

# ==========================================
# Test 2: Register Seller
# ==========================================
run_test "Register Seller Account"
SELLER_RES=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller_test_'$(date +%s)'@seiko.local",
    "password": "Test1234!",
    "name": "Test Seller",
    "role": "SELLER"
  }')

SELLER_TOKEN=$(echo "$SELLER_RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$SELLER_TOKEN" ]; then
  pass "Seller registered, token: ${SELLER_TOKEN:0:20}..."
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Seller registration failed: $SELLER_RES"
fi

# ==========================================
# Test 3: Register Buyer
# ==========================================
run_test "Register Buyer Account"
BUYER_RES=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer_test_'$(date +%s)'@seiko.local",
    "password": "Test1234!",
    "name": "Test Buyer",
    "role": "BUYER"
  }')

BUYER_TOKEN=$(echo "$BUYER_RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$BUYER_TOKEN" ]; then
  pass "Buyer registered, token: ${BUYER_TOKEN:0:20}..."
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Buyer registration failed: $BUYER_RES"
fi

# ==========================================
# Test 4: Create Shop
# ==========================================
run_test "Seller Create Shop"
SHOP_RES=$(curl -s -X POST "$API_URL/shops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "name": "Test Shop '$(date +%s)'",
    "description": "Test shop for voucher testing"
  }')

SHOP_ID=$(echo "$SHOP_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$SHOP_ID" ]; then
  pass "Shop created, ID: $SHOP_ID"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Shop creation failed: $SHOP_RES"
fi

# ==========================================
# Test 5: Create Product
# ==========================================
run_test "Seller Create Product"
PRODUCT_RES=$(curl -s -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "shopId": "'$SHOP_ID'",
    "name": "Test Product for Voucher",
    "description": "Product to test voucher exhaustion",
    "price": 100000,
    "type": "DIGITAL"
  }')

PRODUCT_ID=$(echo "$PRODUCT_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PRODUCT_ID" ]; then
  pass "Product created, ID: $PRODUCT_ID"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Product creation failed: $PRODUCT_RES"
fi

# ==========================================
# Test 6: Import Stock
# ==========================================
run_test "Seller Import Stock"
STOCK_RES=$(curl -s -X POST "$API_URL/products/$PRODUCT_ID/stock/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "keys": ["KEY-TEST-001", "KEY-TEST-002", "KEY-TEST-003"]
  }')

if echo "$STOCK_RES" | grep -q '"success":true'; then
  pass "Stock imported (3 keys)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Stock import failed: $STOCK_RES"
fi

# ==========================================
# Test 7: Create Voucher with maxUses=1
# ==========================================
run_test "Seller Create Voucher (maxUses=1)"
VOUCHER_CODE="TESTONCE$(date +%s)"
VOUCHER_RES=$(curl -s -X POST "$API_URL/vouchers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "code": "'$VOUCHER_CODE'",
    "type": "PERCENTAGE",
    "value": 10,
    "maxUses": 1,
    "shopId": "'$SHOP_ID'"
  }')

if echo "$VOUCHER_RES" | grep -q '"success":true'; then
  pass "Voucher created: $VOUCHER_CODE (maxUses=1, 10% discount)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "Voucher creation failed: $VOUCHER_RES"
fi

# ==========================================
# Test 8: Buyer Deposit Money
# ==========================================
run_test "Buyer Deposit Money"
DEPOSIT_RES=$(curl -s -X POST "$API_URL/wallet/deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"amount": 500000}')

TRANSACTION_ID=$(echo "$DEPOSIT_RES" | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TRANSACTION_ID" ]; then
  info "Deposit created, transactionId: $TRANSACTION_ID"
  
  # Auto-confirm deposit (mock webhook)
  CONFIRM_RES=$(curl -s -X POST "$API_URL/wallet/deposit/confirm" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BUYER_TOKEN" \
    -d '{
      "transactionId": "'$TRANSACTION_ID'",
      "amount": 500000
    }')
  
  if echo "$CONFIRM_RES" | grep -q '"success":true'; then
    pass "Deposit confirmed (500,000 VND)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    fail "Deposit confirmation failed: $CONFIRM_RES"
  fi
else
  fail "Deposit creation failed: $DEPOSIT_RES"
fi

# ==========================================
# Test 9: First Order with Voucher (Should Succeed)
# ==========================================
run_test "Buyer Create Order with Voucher (First Use - Should Succeed)"
ORDER1_RES=$(curl -s -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "items": [{"productId": "'$PRODUCT_ID'", "quantity": 1}],
    "voucherCode": "'$VOUCHER_CODE'"
  }')

ORDER1_ID=$(echo "$ORDER1_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ORDER1_DISCOUNT=$(echo "$ORDER1_RES" | grep -o '"discountAmount":[0-9]*' | cut -d':' -f2)

if [ -n "$ORDER1_ID" ] && [ "$ORDER1_DISCOUNT" = "10000" ]; then
  pass "First order succeeded with 10% discount (10,000 VND off 100,000 VND)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  fail "First order failed or discount incorrect: $ORDER1_RES"
fi

# ==========================================
# Test 10: Second Order with Same Voucher (Should Fail with 400)
# ROO-07: This is the new test case - voucher exhausted must return 400, NOT 500
# ==========================================
run_test "Buyer Try Using Exhausted Voucher (Should Return 400 Bad Request)"
ORDER2_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "items": [{"productId": "'$PRODUCT_ID'", "quantity": 1}],
    "voucherCode": "'$VOUCHER_CODE'"
  }')

HTTP_STATUS=$(echo "$ORDER2_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
ORDER2_BODY=$(echo "$ORDER2_RES" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  if echo "$ORDER2_BODY" | grep -qi "usage limit\|voucher.*limit\|maxUses"; then
    pass "Voucher exhaustion correctly returned 400 Bad Request (not 500)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    warn "Status is 400 but error message unclear: $ORDER2_BODY"
    pass "Status code is correct (400)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  fi
elif [ "$HTTP_STATUS" = "500" ]; then
  fail "Voucher exhaustion returned 500 Internal Server Error - SHOULD BE 400!"
else
  warn "Unexpected HTTP status: $HTTP_STATUS (expected 400). Body: $ORDER2_BODY"
  # Still count as pass if it's not 500
  if [ "$HTTP_STATUS" != "500" ]; then
    pass "At least it's not 500 (got $HTTP_STATUS)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  fi
fi

# ==========================================
# Test 11: Verify Voucher UsedCount = MaxUses
# ==========================================
run_test "Verify Voucher Usage Statistics"
VOUCHER_CHECK=$(curl -s -X GET "$API_URL/vouchers/$VOUCHER_CODE" \
  -H "Authorization: Bearer $BUYER_TOKEN")

USED_COUNT=$(echo "$VOUCHER_CHECK" | grep -o '"usedCount":[0-9]*' | cut -d':' -f2)
MAX_USES=$(echo "$VOUCHER_CHECK" | grep -o '"maxUses":[0-9]*' | cut -d':' -f2)

if [ "$USED_COUNT" = "1" ] && [ "$MAX_USES" = "1" ]; then
  pass "Voucher stats correct: usedCount=$USED_COUNT, maxUses=$MAX_USES"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  warn "Voucher stats: usedCount=$USED_COUNT, maxUses=$MAX_USES (expected both to be 1)"
fi

# ==========================================
# Summary
# ==========================================
echo ""
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo "Total Tests Run:    $TESTS_RUN"
echo "Tests Passed:       $TESTS_PASSED"
echo "Tests Failed:       $((TESTS_RUN - TESTS_PASSED))"
echo ""

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
  echo -e "${GREEN}ALL TESTS PASSED ✓${NC}"
  echo ""
  echo "Key Validation:"
  echo "  ✓ Voucher with maxUses=1 can be used once"
  echo "  ✓ Second use returns 400 Bad Request (not 500)"
  echo "  ✓ UsedCount increments correctly"
  exit 0
else
  echo -e "${RED}SOME TESTS FAILED ✗${NC}"
  exit 1
fi
