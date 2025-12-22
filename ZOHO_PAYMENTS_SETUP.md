# Zoho Payments Integration Guide

## Overview
This app now integrates with Zoho Payments to allow vendors to add credit to their wallet directly from their bank account.

## Setup Instructions

### 1. Configure Environment Variables

Replace the placeholder values in `.env` with your actual Zoho Payments credentials:

```
ZOHO_PAYMENTS_API_KEY=your_actual_zoho_api_key
ZOHO_PAYMENTS_SIGNING_KEY=your_actual_zoho_signing_key
```

### 2. Configure Webhook in Zoho Dashboard

1. Log in to your Zoho Payments dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook with the following URL:
   ```
   https://whubaypabojomdyfqxcf.supabase.co/functions/v1/zoho-payment-webhook
   ```
4. Select the following events to listen to:
   - Payment Authorized
   - Payment Captured
   - Payment Failed
   - Payment Cancelled

### 3. Test the Integration

1. Log in to the vendor app
2. Navigate to the Wallet tab
3. Click the "Add" button
4. Enter an amount and description
5. Click "Add Credit"
6. You'll be redirected to the Zoho payment page
7. Complete the test payment
8. After payment, you'll be redirected back to the app
9. The wallet balance will be automatically updated

## Payment Flow

1. **Initiation**: Vendor clicks "Add Credit" in the wallet
2. **API Call**: App calls `initiate-zoho-payment` edge function
3. **Payment Creation**: Edge function creates a payment with Zoho
4. **Redirect**: User is redirected to Zoho payment page
5. **Payment**: User completes payment via bank/UPI/card
6. **Webhook**: Zoho sends webhook to `zoho-payment-webhook`
7. **Verification**: Webhook verifies payment signature
8. **Credit**: Wallet is automatically credited on success

## Database Schema

### payment_transactions Table
Tracks all payment attempts and their status:
- `id`: Unique payment transaction ID
- `vendor_id`: Reference to vendor
- `wallet_transaction_id`: Linked wallet transaction (after success)
- `amount`: Payment amount
- `status`: pending, processing, success, failed, cancelled
- `payment_url`: URL for payment
- `gateway_transaction_id`: Zoho transaction ID

## Security Features

1. **Signature Verification**: All webhook requests are verified using HMAC SHA-256
2. **Row Level Security**: Payment transactions can only be viewed by their owner
3. **Secure Keys**: API keys stored as environment variables, never exposed to client
4. **JWT Authentication**: Payment initiation requires valid JWT token

## Troubleshooting

### Payment not reflecting in wallet
- Check Supabase logs for webhook errors
- Verify webhook URL is correctly configured in Zoho dashboard
- Check `payment_transactions` table for payment status

### Payment initiation fails
- Verify API key and signing key are correct
- Check network connectivity
- Review edge function logs in Supabase

### Webhook signature verification fails
- Ensure signing key matches Zoho dashboard
- Check webhook payload format
- Review edge function logs

## API Endpoints

### Initiate Payment
```
POST /functions/v1/initiate-zoho-payment
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 5000,
  "description": "Wallet top-up"
}
```

### Webhook Handler
```
POST /functions/v1/zoho-payment-webhook
X-Zoho-Signature: <signature>
Content-Type: application/json

{
  "payment": {
    "id": "pay_xxx",
    "status": "captured",
    "amount": 500000,
    "receipt": "uuid"
  }
}
```

## Notes

- All amounts are in INR (Indian Rupees)
- Zoho API expects amounts in paise (multiply by 100)
- Wallet transactions are created only after successful payment
- Payment status is tracked in `payment_transactions` table
- Failed payments can be retried by initiating a new payment
