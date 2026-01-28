import { createClient } from 'npm:@supabase/supabase-js@2.78.0';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  vendor_id: string;
  amount: number;
  description: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const zohoClientId = Deno.env.get('ZOHO_CLIENT_ID');
    const zohoClientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
    const zohoRefreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN');
    const zohoAccountId = Deno.env.get('ZOHO_ACCOUNT_ID');

    const TEST_MODE = !zohoClientId || !zohoClientSecret || !zohoRefreshToken || !zohoAccountId ||
                      zohoClientId.trim() === '' || zohoClientSecret.trim() === '' ||
                      zohoRefreshToken.trim() === '' || zohoAccountId.trim() === '';

    console.log('Payment mode:', TEST_MODE ? 'TEST' : 'PRODUCTION (Zoho)');
    if (!TEST_MODE) {
      console.log('Using Zoho Payments API with OAuth');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { vendor_id, amount, description }: PaymentRequest = await req.json();

    if (!vendor_id) {
      throw new Error('Vendor ID is required');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendor_id)
      .maybeSingle();

    if (vendorError || !vendor) {
      throw new Error('Vendor not found');
    }

    const paymentId = crypto.randomUUID();

    if (TEST_MODE) {
      console.log('Running in TEST_MODE - simulating payment');
      
      const { data: paymentTransaction, error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          id: paymentId,
          vendor_id: vendor_id,
          amount: amount,
          currency: 'INR',
          payment_gateway: 'test',
          gateway_transaction_id: `test_${paymentId}`,
          gateway_payment_id: `test_${paymentId}`,
          status: 'success',
          payment_url: null,
          description: description,
          metadata: { test_mode: true },
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to create payment transaction record');
      }

      await supabase
        .from('wallet_transactions')
        .insert({
          vendor_id: vendor_id,
          transaction_type: 'credit',
          amount: amount.toString(),
          description: description,
          payment_transaction_id: paymentId,
        });

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentId,
          test_mode: true,
          message: 'Test payment completed successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Getting Zoho access token...');
    console.log('Client ID:', zohoClientId?.substring(0, 10) + '...');
    console.log('Refresh Token:', zohoRefreshToken?.substring(0, 10) + '...');
    console.log('Account ID:', zohoAccountId);

    const accessToken = await getZohoAccessToken(zohoClientId!, zohoClientSecret!, zohoRefreshToken!);

    if (!accessToken) {
      console.error('Failed to get access token. This could be due to:');
      console.error('1. Expired refresh token (regenerate in Zoho Console)');
      console.error('2. Invalid OAuth credentials');
      console.error('3. Zoho API rate limiting');
      throw new Error('Failed to obtain Zoho access token. Your refresh token may have expired. Please regenerate it in the Zoho Console.');
    }

    console.log('Access token obtained successfully:', accessToken.substring(0, 20) + '...');

    const paymentData = {
      amount: amount,
      currency: 'INR',
      description: description,
      reference_id: paymentId,
      email: 'vendor@payment.com',
      notify_user: false,
    };

    console.log('Creating Zoho payment link with amount:', paymentData.amount);

    const zohoResponse = await fetch(`https://payments.zoho.in/api/v1/paymentlinks?account_id=${zohoAccountId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await zohoResponse.text();
    console.log('Zoho response status:', zohoResponse.status);
    console.log('Zoho response:', responseText);

    if (!zohoResponse.ok) {
      console.error('Zoho API Error:', responseText);
      throw new Error(`Zoho payment creation failed: ${responseText}`);
    }

    const zohoData = JSON.parse(responseText);
    console.log('Zoho API response code:', zohoData.code);

    if (zohoData.code !== 0) {
      throw new Error(`Zoho API returned error: ${zohoData.message || 'Unknown error'}`);
    }

    const paymentLink = zohoData.payment_links;
    const paymentUrl = paymentLink.url;

    console.log('Payment link created:', paymentLink.payment_link_id);
    console.log('Payment URL:', paymentUrl);

    const { data: paymentTransaction, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        id: paymentId,
        vendor_id: vendor_id,
        amount: amount,
        currency: 'INR',
        payment_gateway: 'zoho',
        gateway_transaction_id: paymentLink.payment_link_id,
        gateway_payment_id: paymentLink.payment_link_id,
        status: 'pending',
        payment_url: paymentUrl,
        description: description,
        metadata: zohoData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to create payment transaction record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        payment_url: paymentUrl,
        gateway_payment_id: paymentLink.payment_link_id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in initiate-zoho-payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment initiation failed',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function getZohoAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  retries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Refreshing Zoho access token (attempt ${attempt}/${retries})...`);

      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      });

      const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log('Token refresh response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to refresh Zoho access token. Status:', response.status);
        console.error('Error response:', errorText);

        if (attempt < retries) {
          console.log(`Retrying in ${attempt} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        return null;
      }

      const data = await response.json();
      console.log('Token refresh successful');
      return data.access_token;
    } catch (error) {
      console.error(`Error refreshing Zoho access token (attempt ${attempt}):`, error);
      if (attempt < retries) {
        console.log(`Retrying in ${attempt} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}
