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

    const TEST_MODE = true;

    console.log('FORCED TEST_MODE: Payment system running in test mode');

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

    throw new Error('Production Zoho payment mode not yet configured');
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
