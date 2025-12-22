# Zoho Payments API Credentials Guide

⚠️ **IMPORTANT: This guide is outdated. Please see [ZOHO_OAUTH_SETUP_GUIDE.md](./ZOHO_OAUTH_SETUP_GUIDE.md) for the correct OAuth setup.**

## Required Credentials

Zoho Payments API requires **OAuth 2.0 authentication**, not simple API keys.

You need **3 OAuth credentials**:

1. **Client ID** - From Zoho API Console
2. **Client Secret** - From Zoho API Console
3. **Refresh Token** - Generated via OAuth flow

## How to Get Your Credentials

### Step 1: Access Zoho Payments Dashboard

1. Go to [Zoho Payments](https://payments.zoho.in/)
2. Log in with your Zoho account
3. If you don't have an account, sign up first

### Step 2: Get API Key

The API Key location depends on your Zoho Payments setup:

**Option A: Zoho Payments (India)**
1. Navigate to **Settings** → **API & Webhooks** → **API Keys**
2. If no API key exists, click **Generate API Key**
3. Copy the API Key (starts with something like `1000.xxx` or similar)

**Option B: Zoho Payment Gateway**
1. Go to **Settings** → **Developer Space** → **API Credentials**
2. Click on **Generate Credentials** if not already generated
3. Copy the **Client ID** or **API Key**

### Step 3: Get Signing Key

1. In the same section (API & Webhooks or Developer Space)
2. Look for **Signing Key**, **Secret Key**, or **Webhook Secret**
3. If not visible, you may need to generate it
4. Copy the Signing Key

### Step 4: Configure Webhook URL

**IMPORTANT**: You must configure the webhook URL in Zoho for payment notifications to work.

1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook** or **Configure Webhook**
3. Enter this URL:
   ```
   https://whubaypabojomdyfqxcf.supabase.co/functions/v1/zoho-payment-webhook
   ```
4. Select these events:
   - ✅ Payment Authorized
   - ✅ Payment Captured/Success
   - ✅ Payment Failed
   - ✅ Payment Cancelled
5. Save the webhook configuration

### Step 5: Update Environment Variables

1. Open the `.env` file in your project
2. Replace the placeholder values:

```env
ZOHO_PAYMENTS_API_KEY=your_actual_api_key_here
ZOHO_PAYMENTS_SIGNING_KEY=your_actual_signing_key_here
```

3. Save the file

### Step 6: Test the Integration

1. Start your app
2. Log in as a vendor
3. Go to Wallet → Add → Enter amount
4. You should be redirected to Zoho payment page
5. Complete a test payment
6. Verify wallet is credited automatically

## Troubleshooting

### "Invalid API Key" error
- Verify the API key is copied correctly (no extra spaces)
- Check if the API key has expired
- Ensure you're using the correct environment (test vs live)

### "Signature verification failed"
- Verify the signing key is correct
- Check if webhook is configured in Zoho dashboard
- Ensure webhook URL matches exactly

### Webhook not receiving events
- Confirm webhook URL is configured in Zoho
- Check that events are selected (authorized, captured, failed)
- Verify webhook URL is publicly accessible

### Payment successful but wallet not credited
- Check Supabase function logs for errors
- Verify `payment_transactions` table for status
- Check if webhook events are being received

## Support

If you need help:
1. Check Zoho Payments documentation: https://www.zoho.com/payments/api/
2. Contact Zoho Support for API credential issues
3. Check Supabase logs for webhook/function errors

## Security Notes

- Never commit API keys to version control
- Keep signing key confidential
- Use environment variables for all credentials
- Enable IP whitelisting if available in Zoho dashboard
- Regularly rotate API keys for security
