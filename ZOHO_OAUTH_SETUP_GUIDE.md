# Zoho Payments OAuth Setup Guide

The "Not Authorised" error occurs because Zoho Payments requires OAuth authentication, not simple API keys. Follow these steps to set up OAuth properly.

## Step 1: Register Your Application with Zoho

1. Go to [Zoho API Console](https://api-console.zoho.in/)
2. Click on **"Add Client"**
3. Select **"Self Client"** (this is required for Zoho Payments)
4. Give your client a name (e.g., "My Payment App")
5. Click **"Create"**

You will receive:
- **Client ID**
- **Client Secret**

Save these credentials somewhere safe.

## Step 2: Generate Authorization Code

1. Still in the API Console, find your newly created Self Client
2. Click on the **"Generate Code"** button
3. In the **Scope** field, enter the required Zoho Payments scopes for Payment Links:
   ```
   ZohoPay.payments.CREATE,ZohoPay.payments.READ,ZohoPay.payments.UPDATE
   ```
4. Set the **Time Duration** (the authorization code expires in 3 minutes by default)
5. Click **"Generate"**
6. Copy the **Authorization Code** that appears

## Step 3: Exchange Authorization Code for Refresh Token

You need to make a POST request to exchange the authorization code for a refresh token. You can use curl, Postman, or any HTTP client.

### Using curl:

```bash
curl -X POST https://accounts.zoho.in/oauth/v2/token \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=authorization_code"
```

Replace:
- `YOUR_AUTHORIZATION_CODE` with the code from Step 2
- `YOUR_CLIENT_ID` with your Client ID
- `YOUR_CLIENT_SECRET` with your Client Secret

### Response:

You'll receive a JSON response like:

```json
{
  "access_token": "1000.xxxx.yyyy",
  "refresh_token": "1000.zzzz.aaaa",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Important**: Save the `refresh_token` - this is permanent and will be used to generate new access tokens.

## Step 4: Get Your Zoho Account ID

1. Log in to [Zoho Payments](https://payments.zoho.in/)
2. Go to **Settings** → **Developer Space**
3. You'll see your **Account ID** displayed on this page
4. Copy this Account ID - you'll need it in the next step

## Step 5: Configure Supabase Secrets

Now you need to add all the OAuth credentials and Account ID:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. **Add four secrets**:

   | Secret Name | Value |
   |------------|-------|
   | `ZOHO_CLIENT_ID` | Your Client ID from Step 1 |
   | `ZOHO_CLIENT_SECRET` | Your Client Secret from Step 1 |
   | `ZOHO_REFRESH_TOKEN` | Your Refresh Token from Step 3 |
   | `ZOHO_ACCOUNT_ID` | Your Account ID from Step 4 |

## Step 6: Test the Integration

1. Go back to your app's Wallet tab
2. Click **"Add Credit"**
3. Enter an amount and description
4. Click **"Add Credit"**

The system will now:
1. Use your refresh token to get a fresh access token
2. Create a payment link using Zoho Payments API
3. Open the payment link in your browser
4. You complete the payment on Zoho's secure payment page
5. Your wallet is automatically credited after successful payment (via webhook)

## Important Notes

- **Payment Links API**: This app uses Zoho Payment Links (not Payment Sessions) which generates direct URLs that work in mobile apps
- **Refresh Token**: This token is permanent and doesn't expire. Keep it secure!
- **Access Token**: Generated automatically each time a payment is initiated (expires in 1 hour)
- **Account ID**: Your Zoho Payments Account ID is required for all API calls
- **Scopes**: Make sure you include the correct ZohoPay scopes (CREATE, READ, UPDATE) when generating the authorization code
- **Self Client**: Only Self Client applications work with Zoho Payments API

## Troubleshooting

### "Not Authorised" Error
- Make sure you're using OAuth credentials (Client ID, Client Secret, Refresh Token), not API keys
- Verify that the refresh token was generated with the correct scopes
- Check that all four secrets are properly set in Supabase (including ZOHO_ACCOUNT_ID)
- Ensure the Account ID matches your Zoho Payments account

### "Invalid Scope" Error
- Ensure you included `ZohoPay.payments.CREATE,ZohoPay.payments.READ,ZohoPay.payments.UPDATE` in the scope when generating the authorization code
- Note: We use **Payment Links API** which requires ZohoPay scopes (not ZohoPayments)

### "Invalid Grant" Error
- The authorization code expired (they expire in 3 minutes)
- Generate a new authorization code and try again

## References

- [Zoho Payments API Documentation](https://www.zoho.com/in/payments/api/v1/introduction/)
- [Zoho Self Client OAuth](https://www.zoho.com/accounts/protocol/oauth/self-client/authorization-code-flow.html)
- [Zoho OAuth Token Refresh](https://www.zoho.com/accounts/protocol/oauth/web-apps/access-token-expiry.html)
