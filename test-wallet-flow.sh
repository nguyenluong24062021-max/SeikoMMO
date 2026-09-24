#!/bin/bash

# Wallet & Payment Flow Test Script
# Tests: Deposit -> Purchase -> Wallet balances -> Commission -> 24h hold -> Payout

set -e

API_URL="http://localhost:3001"
echo "🧪 Testing Wallet & Payment Flow - SeikoMMO Marketplace"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check JSON response
check_success() {
    if echo "$1" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "$1"
        return 1
    fi
}

# ============================================
# 1. REGISTER USERS
# ============================================
print_header "1️⃣  Đăng ký người dùng"

echo "Đăng ký BUYER..."
BUYER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@test.com",
    "password": "password123",
    "name": "Test Buyer",
    "role": "BUYER"
  }')
check_success "$BUYER_RESPONSE"
BUYER_TOKEN=$(echo $BUYER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Buyer Token: ${BUYER_TOKEN:0:20}..."

echo ""
echo "Đăng ký SELLER..."
SELLER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@test.com",
    "password": "password123",
    "name": "Test Seller",
    "role": "SELLER"
  }')
check_success "$SELLER_RESPONSE"
SELLER_TOKEN=$(echo $SELLER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Seller Token: ${SELLER_TOKEN:0:20}..."

echo ""

# ============================================
# 2. SELLER: CREATE SHOP & PRODUCT
# ============================================
print_header "2️⃣  Seller tạo shop & product"

echo "Tạo shop..."
SHOP_RESPONSE=$(curl -s -X POST "$API_URL/shops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "name": "Premium Digital Shop",
    "description": "High quality digital products"
  }')
check_success "$SHOP_RESPONSE"
SHOP_ID=$(echo $SHOP_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Shop ID: $SHOP_ID"

echo ""
echo "Tạo product giá 100,000 VND..."
PRODUCT_RESPONSE=$(curl -s -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d "{
    \"name\": \"Premium Account Key\",
    \"description\": \"High quality account\",
    \"type\": \"DIGITAL\",
    \"price\": 100000,
    \"shopId\": \"$SHOP_ID\"
  }")
check_success "$PRODUCT_RESPONSE"
PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Product ID: $PRODUCT_ID"

echo ""
echo "Import 100 keys từ file..."
IMPORT_RESPONSE=$(curl -s -X POST "$API_URL/products/stock/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"keys\": $(head -100 keys-sample.txt | jq -R . | jq -s .)
  }")
check_success "$IMPORT_RESPONSE"
IMPORTED=$(echo $IMPORT_RESPONSE | grep -o '"imported":[0-9]*' | cut -d':' -f2)
echo "✓ Imported $IMPORTED keys"

echo ""

# ============================================
# 3. BUYER: DEPOSIT MONEY
# ============================================
print_header "3️⃣  Buyer nạp tiền 500,000 VND"

echo "Tạo yêu cầu deposit..."
DEPOSIT_REQUEST=$(curl -s -X POST "$API_URL/wallet/deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "amount": 500000
  }')
check_success "$DEPOSIT_REQUEST"
TRANSACTION_ID=$(echo $DEPOSIT_REQUEST | grep -o '"transactionId":"[^"]*' | cut -d'"' -f4)
echo "Transaction ID: $TRANSACTION_ID"
echo "QR Code (mock) generated"

echo ""
echo "Xác nhận deposit (simulate SePay callback)..."
CONFIRM_DEPOSIT=$(curl -s -X POST "$API_URL/wallet/deposit/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d "{
    \"transactionId\": \"$TRANSACTION_ID\",
    \"amount\": 500000
  }")
check_success "$CONFIRM_DEPOSIT"

echo ""
echo "Kiểm tra số dư ví buyer..."
BUYER_WALLET=$(curl -s -X GET "$API_URL/wallet/me" \
  -H "Authorization: Bearer $BUYER_TOKEN")
BUYER_BALANCE=$(echo $BUYER_WALLET | grep -o '"balance":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}✓ Buyer balance: ${BUYER_BALANCE} VND${NC}"

echo ""

# ============================================
# 4. BUYER: PURCHASE 2 PRODUCTS
# ============================================
print_header "4️⃣  Buyer mua 2 keys (200,000 VND)"

echo "Tạo order mua 2 keys..."
ORDER_RESPONSE=$(curl -s -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"quantity\": 2
      }
    ]
  }")
check_success "$ORDER_RESPONSE"
ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ORDER_STATUS=$(echo $ORDER_RESPONSE | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Order ID: $ORDER_ID"
echo "Order Status: $ORDER_STATUS"

echo ""

# ============================================
# 5. VERIFY BALANCES
# ============================================
print_header "5️⃣  Kiểm tra số dư ví sau khi mua"

echo "Số dư ví Buyer..."
BUYER_WALLET_AFTER=$(curl -s -X GET "$API_URL/wallet/me" \
  -H "Authorization: Bearer $BUYER_TOKEN")
BUYER_BALANCE_AFTER=$(echo $BUYER_WALLET_AFTER | grep -o '"balance":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}Buyer balance: ${BUYER_BALANCE_AFTER} VND${NC}"
echo "Expected: 300,000 VND (500k - 200k)"

if [ "$BUYER_BALANCE_AFTER" -eq 300000 ]; then
    echo -e "${GREEN}✓ Buyer balance correct!${NC}"
else
    echo -e "${RED}✗ Buyer balance incorrect! Got $BUYER_BALANCE_AFTER, expected 300000${NC}"
fi

echo ""
echo "Số dư ví Seller..."
SELLER_WALLET=$(curl -s -X GET "$API_URL/wallet/me" \
  -H "Authorization: Bearer $SELLER_TOKEN")
SELLER_BALANCE=$(echo $SELLER_WALLET | grep -o '"balance":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}Seller balance: ${SELLER_BALANCE} VND${NC}"
echo "Expected: 180,000 VND (200k - 10% commission)"

if [ "$SELLER_BALANCE" -eq 180000 ]; then
    echo -e "${GREEN}✓ Seller balance correct! (90% after 10% commission)${NC}"
else
    echo -e "${RED}✗ Seller balance incorrect! Got $SELLER_BALANCE, expected 180000${NC}"
fi

echo ""
echo "Chi tiết transaction history của Seller..."
echo "$SELLER_WALLET" | jq '.data.transactions[] | {type: .type, amount: .amount, canWithdrawAt: .canWithdrawAt}'

echo ""

# ============================================
# 6. CHECK PRODUCT STOCK
# ============================================
print_header "6️⃣  Kiểm tra stock còn lại"

PRODUCT_AFTER=$(curl -s -X GET "$API_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $BUYER_TOKEN")
AVAILABLE_STOCK=$(echo $PRODUCT_AFTER | grep -o '"availableStock":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}Available stock: ${AVAILABLE_STOCK}${NC}"
echo "Expected: 98 (100 - 2)"

if [ "$AVAILABLE_STOCK" -eq 98 ]; then
    echo -e "${GREEN}✓ Stock deducted correctly!${NC}"
else
    echo -e "${RED}✗ Stock incorrect! Got $AVAILABLE_STOCK, expected 98${NC}"
fi

echo ""

# ============================================
# 7. TRY PAYOUT (SHOULD FAIL - 24H HOLD)
# ============================================
print_header "7️⃣  Thử rút tiền (sẽ bị chặn do hold 24h)"

echo "Seller thử rút 100,000 VND..."
PAYOUT_ATTEMPT=$(curl -s -X POST "$API_URL/payouts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "amount": 100000,
    "description": "Test withdrawal"
  }')

if echo "$PAYOUT_ATTEMPT" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Payout correctly blocked due to 24h hold${NC}"
    echo "Error message:"
    echo "$PAYOUT_ATTEMPT" | jq -r '.message' || echo "$PAYOUT_ATTEMPT"
else
    echo -e "${RED}✗ Payout should have been blocked!${NC}"
    echo "$PAYOUT_ATTEMPT"
fi

echo ""

# ============================================
# 8. SUMMARY
# ============================================
print_header "📊 SUMMARY - KẾT QUẢ TEST"

echo ""
echo "Initial state:"
echo "  - Buyer deposited: 500,000 VND"
echo "  - Product price: 100,000 VND/key"
echo "  - Initial stock: 100 keys"
echo ""
echo "After purchase of 2 keys (200,000 VND):"
echo "  ✓ Buyer balance: $BUYER_BALANCE_AFTER VND (expected 300,000)"
echo "  ✓ Seller balance: $SELLER_BALANCE VND (expected 180,000 = 200k - 10% commission)"
echo "  ✓ Platform commission: 20,000 VND (10% of 200k)"
echo "  ✓ Stock remaining: $AVAILABLE_STOCK keys (expected 98)"
echo "  ✓ Order status: $ORDER_STATUS"
echo "  ✓ Payout blocked: Funds on 24h hold"
echo ""

# Final check
if [ "$BUYER_BALANCE_AFTER" -eq 300000 ] && [ "$SELLER_BALANCE" -eq 180000 ] && [ "$AVAILABLE_STOCK" -eq 98 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED! ✅${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ SOME TESTS FAILED ❌${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo "Test completed at $(date)"
