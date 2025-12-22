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
    const zohoApiKey = Deno.env.get('ZOHO_PAYMENTS_API_KEY')!;
    const zohoSigningKey = Deno.env.get('ZOHO_PAYMENTS_SIGNING_KEY')!;

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
    const callbackUrl = `${supabaseUrl}/functions/v1/zoho-payment-webhook`;

    const paymentData = {
      amount: amount * 100,
      currency: 'INR',
      receipt: paymentId,
      notes: {
        vendor_id: vendor_id,
        description: description,
      },
    };

    const timestamp = Date.now().toString();
    const signature = await generateSignature(
      JSON.stringify(paymentData) + timestamp,
      zohoSigningKey
    );

    const zohoResponse = await fetch('https://payments.zoho.in/api/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${zohoApiKey}`,
        'Content-Type': 'application/json',
        'X-Zoho-Signature': signature,
        'X-Zoho-Timestamp': timestamp,
      },
      body: JSON.stringify(paymentData),
    });

    if (!zohoResponse.ok) {
      const errorText = await zohoResponse.text();
      console.error('Zoho API Error:', errorText);
      throw new Error(`Zoho payment creation failed: ${errorText}`);
    }

    const zohoData = await zohoResponse.json();

    const { data: paymentTransaction, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        id: paymentId,
        vendor_id: vendor_id,
        amount: amount,
        currency: 'INR',
        payment_gateway: 'zoho',
        gateway_transaction_id: zohoData.payment_id || zohoData.id,
        gateway_payment_id: zohoData.payment_id || zohoData.id,
        status: 'pending',
        payment_url: zohoData.payment_url || zohoData.url,
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
        payment_url: zohoData.payment_url || zohoData.url,
        gateway_payment_id: zohoData.payment_id || zohoData.id,
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

async function generateSignature(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
