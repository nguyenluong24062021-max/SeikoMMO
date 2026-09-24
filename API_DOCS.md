# API Documentation - Seiko MMO

## Base URL
```
http://localhost:3001
```

## Authentication

Tất cả endpoints (trừ register/login) yêu cầu JWT token trong header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth

#### 1. Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "buyer@test.com",
  "password": "password123",
  "name": "Buyer User",
  "role": "BUYER" // BUYER | SELLER | ADMIN
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "User registered successfully"
}
```

#### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "buyer@test.com",
  "password": "password123"
}
```

#### 3. Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

#### 4. Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Users

#### Get Profile
```http
GET /users/me
Authorization: Bearer <access_token>
```

### Shops

#### 1. Create Shop (SELLER, ADMIN only)
```http
POST /shops
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Gaming Shop",
  "description": "Best gaming accounts and tools"
}
```

#### 2. Get All Shops
```http
GET /shops
```

#### 3. Get My Shops (SELLER, ADMIN only)
```http
GET /shops/my-shops
Authorization: Bearer <access_token>
```

#### 4. Get Shop by ID
```http
GET /shops/:id
```

#### 5. Update Shop (SELLER owner or ADMIN)
```http
PATCH /shops/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "isActive": true
}
```

#### 6. Delete Shop (SELLER owner or ADMIN)
```http
DELETE /shops/:id
Authorization: Bearer <access_token>
```

### Products

#### 1. Create Product (SELLER owner or ADMIN)
```http
POST /products
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "League of Legends Account Level 30",
  "description": "Fresh unranked account",
  "type": "DIGITAL", // DIGITAL | TOOL | SEEDING
  "price": 50000,
  "shopId": "shop-uuid"
}
```

#### 2. Get All Products
```http
GET /products
GET /products?shopId=shop-uuid
```

#### 3. Get Product by ID
```http
GET /products/:id
```

#### 4. Update Product (SELLER owner or ADMIN)
```http
PATCH /products/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 60000,
  "isActive": true
}
```

#### 5. Delete Product (SELLER owner or ADMIN)
```http
DELETE /products/:id
Authorization: Bearer <access_token>
```

#### 6. Import Stock from JSON (SELLER owner or ADMIN)
```http
POST /products/stock/import
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "productId": "product-uuid",
  "keys": [
    "KEY-001-ABCD-1234",
    "KEY-002-EFGH-5678",
    "KEY-003-IJKL-9012"
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "failed": 0,
    "duplicates": 0
  },
  "message": "Imported 3 keys successfully"
}
```

#### 7. Import Stock from TXT/CSV File (SELLER owner or ADMIN)
```http
POST /products/stock/import-file
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- file: [file.txt or file.csv]
- productId: product-uuid
```

**TXT Format** (một key mỗi dòng):
```
KEY-001-ABCD-1234
KEY-002-EFGH-5678
KEY-003-IJKL-9012
```

**CSV Format** (key ở cột đầu tiên):
```
KEY-001-ABCD-1234
KEY-002-EFGH-5678
KEY-003-IJKL-9012
```

#### 8. Get Product Stocks (SELLER owner or ADMIN)
```http
GET /products/:id/stocks
Authorization: Bearer <access_token>
```

### Orders

#### 1. Create Order (BUYER, ADMIN)
```http
POST /orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "buyerId": "user-uuid",
    "totalAmount": 100000,
    "status": "PENDING",
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productName": "League of Legends Account",
        "quantity": 2,
        "price": 50000
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Order created successfully"
}
```

#### 2. Get All Orders (my orders or all if ADMIN with ?all=true)
```http
GET /orders
Authorization: Bearer <access_token>

# Admin xem tất cả orders
GET /orders?all=true
Authorization: Bearer <admin_access_token>
```

#### 3. Get Order by ID
```http
GET /orders/:id
Authorization: Bearer <access_token>
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You do not have permission...",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

## Testing Flow

### 1. Register Users
```bash
# Buyer
POST /auth/register
{ "email": "buyer@test.com", "password": "123456", "name": "Buyer", "role": "BUYER" }

# Seller
POST /auth/register
{ "email": "seller@test.com", "password": "123456", "name": "Seller", "role": "SELLER" }

# Admin
POST /auth/register
{ "email": "admin@test.com", "password": "123456", "name": "Admin", "role": "ADMIN" }
```

### 2. Seller Creates Shop & Product
```bash
# Login as seller
POST /auth/login
{ "email": "seller@test.com", "password": "123456" }

# Create shop
POST /shops
{ "name": "Test Shop", "description": "My shop" }

# Create product
POST /products
{ "name": "Test Product", "type": "DIGITAL", "price": 10000, "shopId": "<shop_id>" }
```

### 3. Import 100 Keys
```bash
# Create keys.txt with 100 keys
# Import
POST /products/stock/import-file
file: keys.txt
productId: <product_id>
```

### 4. Buyer Purchases
```bash
# Login as buyer
POST /auth/login
{ "email": "buyer@test.com", "password": "123456" }

# Create order
POST /orders
{ "items": [{ "productId": "<product_id>", "quantity": 2 }] }
```

### 5. Verify Stock Deduction
```bash
# Login as seller
# Check product stock
GET /products/<product_id>
# Should show availableStock: 98 (100 - 2)

# Check stocks detail
GET /products/<product_id>/stocks
# Should show 2 stocks with status: "SOLD"
```
