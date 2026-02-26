# Chuks Kitchen API

Backend API for authentication, menu management, cart management, and order processing.

## System Overview

This service is an Express + MongoDB backend organized by feature modules:

- `auth`: signup, OTP verification, login, OTP resend
- `foods`: create/list/update/disable menu items
- `cart`: add/view/clear cart
- `orders`: create order from cart, fetch order, update status

High-level flow:

1. Client calls API route under `/api/...`.
2. Express route maps request to the feature controller.
3. Controller validates input and applies business rules.
4. Controller reads/writes MongoDB using Mongoose models.
5. Controller returns JSON response with proper status code.

## Architecture

- Entry point: `src/server.js`
  - Loads env config
  - Connects to MongoDB
  - Starts HTTP server
- App wiring: `src/app.js`
  - Configures `express.json()`
  - Mounts all route modules
- Feature modules:
  - Routes: `src/routes/*.js`
  - Controllers: `src/controllers/*.js`
  - Data models: `src/models/*.js`

## Data Models

### Food

- `id`
- `name`
- `description`
- `price`
- `isAvailable`

### Cart

- `user` (ObjectId)
- `items[]`
  - `food` (ObjectId ref Food)
  - `quantity`

One cart per user (enforced by unique `user` field).

### Order

- `user` (ObjectId)
- `items[]` snapshot:
  - `food`, `name`, `price`, `quantity`, `subtotal`
- `totalPrice`
- `status`
- `cancelledBy` (`customer` or `admin`)

Allowed statuses:

- `Pending`
- `Confirmed`
- `Preparing`
- `Out for Delivery`
- `Completed`
- `Cancelled`

## End-to-End Business Flow

### 1. Customer Access

- User signs up and logs in through `/api/auth` endpoints.
- Auth logic is already implemented in this codebase and kept separate from food/cart/order logic.

### 2. Menu Browsing

- Client calls `GET /api/foods` to fetch currently available meals.
- Admin simulation can add or modify meals with:
  - `POST /api/foods`
  - `PATCH /api/foods/:id`
  - `DELETE /api/foods/:id` (soft delete by setting `isAvailable = false`)

### 3. Cart Operations

- Add item: `POST /api/cart`
  - Validates `userId`, `foodId`, and `quantity`
  - Rejects unavailable food
  - If item exists, quantity is incremented
- View cart: `GET /api/cart/:userId`
- Clear cart: `DELETE /api/cart/:userId/clear`

### 4. Order Placement

- Client calls `POST /api/orders` with `userId`.
- System loads cart and validates:
  - Cart exists and is not empty
  - Every cart item is still available
- System recalculates totals from current food prices.
- System stores order with initial status `Pending`.
- System clears cart after successful order creation.

### 5. Order Tracking & Status Updates

- Fetch details: `GET /api/orders/:id`
- Update status: `PATCH /api/orders/:id/status`
  - Rejects invalid statuses
  - Supports cancellation by customer/admin using `status = "Cancelled"` and optional `actor = "admin"`
  - Blocks updates once order is terminal (`Completed` or `Cancelled`)

## Flow Explanation (From Diagrams)

Diagrams are located in `WorkFlow/`:

- `WorkFlow/user.png`
- `WorkFlow/order-placement.png`
- `WorkFlow/order-status.png`

### 1. User Flow (`user.png`)

1. User signs up (`POST /api/auth/signup`).
Why: account identity is needed to link cart/order history to a specific user.
2. If email exists, OTP is sent and user verifies (`POST /api/auth/verify-otp`).
Why: prevents fake/incorrect email accounts and secures login.
3. User logs in (`POST /api/auth/login`) and receives token.
Why: token-based auth is stateless and simple for API clients.
4. User fetches available menu (`GET /api/foods`).
Why: only available meals are shown to reduce failed checkouts.
5. User adds meal(s) to cart (`POST /api/cart`) and can view cart (`GET /api/cart/:userId`).
Why: cart allows batching multiple selections before checkout.

### 2. Order Placement Flow (`order-placement.png`)

1. User triggers checkout (`POST /api/orders`) using `userId`.
Why: order is always user-scoped.
2. Backend loads cart for that user.
Why: server-side source of truth avoids trusting client totals/items.
3. Backend validates cart is not empty.
Why: prevents invalid empty orders.
4. Backend rechecks each food item availability.
Why: food could have become unavailable after being added to cart.
5. Backend recalculates subtotal and total from current DB prices.
Why: prevents stale or tampered pricing from client payloads.
6. Backend stores order with `Pending` status.
Why: gives a clear start point for lifecycle transitions.
7. Backend clears the cart after successful creation.
Why: avoids duplicate re-order from stale cart state.

### 3. Order Status Flow (`order-status.png`)

1. Order starts as `Pending`.
2. Admin/operations can update status to:
`Confirmed` -> `Preparing` -> `Out for Delivery` -> `Completed`.
Why: explicit states make tracking and operations clearer.
3. Cancellation path is available via `Cancelled` (customer or admin).
Why: real-world operations require cancellation handling from both sides.
4. Terminal statuses (`Completed`, `Cancelled`) are locked.
Why: prevents accidental or invalid post-finalization updates.
5. Invalid statuses are rejected.
Why: enforces a strict and predictable lifecycle contract.

## Edge Cases Handled

- Attempt to add unavailable food to cart
- Food becomes unavailable after it was already in cart
- Empty cart order attempt
- Invalid order status transitions/input
- Customer cancellation
- Admin cancellation

## Edge Case Handling (Failures and Exceptions)

1. Invalid IDs (`userId`, `foodId`, `orderId`)
- Returns `400 Bad Request`.
- Prevents unnecessary DB queries and crashes from malformed ObjectIds.

2. Food not found or unavailable during cart add
- Not found: `404`.
- Unavailable: `409 Conflict`.
- Keeps cart aligned with real menu state.

3. Duplicate cart additions
- Existing item quantity is incremented, not duplicated.
- Simplifies cart management and reduces inconsistent line items.

4. Empty cart checkout
- Returns `400`.
- Prevents creating zero-value/no-item orders.

5. Food unavailable at checkout time
- Returns `409` with unavailable item details.
- Stops invalid orders and prompts user to review cart.

6. Invalid order status update
- Returns `400` with `allowedStatuses`.
- Makes API behavior explicit and easy for clients to correct.

7. Updates on terminal orders
- Returns `409`.
- Preserves consistency once an order is finalized.

8. Unexpected server/database errors
- Returns `500`.
- Errors are logged server-side for diagnosis.

## Assumptions

1. Authentication exists and is handled separately; food/cart/order endpoints currently do not enforce role checks in code.
2. `userId` is provided by client request payload/params and is trusted for this assignment scope.
3. Currency handling is simple numeric price (no tax, discount, rounding rules, or multi-currency).
4. Inventory is binary (`isAvailable`) instead of stock counts.
5. Payment processing is out of scope; order creation does not call a payment gateway.
6. Delivery address/contact and ETA tracking are out of scope.
7. Notification side effects (SMS/email/push on status change) are out of scope.
8. Status transition guard is basic validation + terminal lock, not a strict transition graph matrix.

## Scalability Thoughts (100 -> 10,000+ Users)

### Current design fit (up to low traffic)

- Modular route/controller/model design is good for rapid iteration.
- MongoDB + Mongoose is sufficient for moderate concurrent usage.

### Changes for 10,000+ users

1. Add proper auth middleware on protected routes
- Extract `userId` from JWT instead of body/params.
- Add role-based authorization for admin actions.

2. Add indexes and query optimization
- Ensure indexes for `Cart.user`, `Order.user`, `Order.status`, and food availability queries.
- Use projections/pagination for large lists.

3. Introduce caching
- Cache frequent reads such as available foods in Redis.
- Invalidate cache on food update/delete.

4. Harden consistency with transactions
- Use MongoDB transactions for checkout flow (`create order + clear cart`) to avoid partial writes.

5. Queue asynchronous work
- Move email/notification/audit tasks to background workers (BullMQ/RabbitMQ/SQS).

6. Improve reliability and observability
- Centralized logging, request IDs, metrics (latency/error rates), health checks, and tracing.

7. Scale deployment
- Run multiple stateless API instances behind a load balancer.
- Use managed MongoDB with replica set, backups, and read replicas as needed.

8. Add rate limiting and abuse controls
- Protect auth/order endpoints from brute-force and request floods.

9. Introduce API/versioning and contract governance
- Use `/api/v1` and schema-based validation/documentation to evolve safely.

## API Summary

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login`

### Foods

- `GET /api/foods`
- `POST /api/foods`
- `PATCH /api/foods/:id`
- `DELETE /api/foods/:id`

### Cart

- `POST /api/cart`
- `GET /api/cart/:userId`
- `DELETE /api/cart/:userId/clear`

### Orders

- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`

## Running Locally

From `src/`:

```bash
pnpm install
pnpm dev
```

Required environment variables in `src/.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET` (for auth)
- Redis/email-related variables used by auth module
