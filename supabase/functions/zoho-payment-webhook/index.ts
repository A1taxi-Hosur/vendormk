import { createClient } from 'npm:@supabase/supabase-js@2.78.0';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Zoho-Signature',
};

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
    const zohoSigningKey = Deno.env.get('ZOHO_PAYMENTS_SIGNING_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.text();
    const zohoSignature = req.headers.get('X-Zoho-Signature');

    if (zohoSignature) {
      const isValid = await verifySignature(requestBody, zohoSignature, zohoSigningKey);
      if (!isValid) {
        console.error('Invalid signature');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const webhookData = JSON.parse(requestBody);
    console.log('Zoho webhook received:', webhookData);

    const gatewayPaymentId = webhookData.payment?.payment_id || webhookData.payment_id || webhookData.payment?.id || webhookData.id;
    const referenceId = webhookData.payment?.reference_id || webhookData.reference_id;
    const paymentStatus = webhookData.payment?.status || webhookData.status;
    const amount = webhookData.payment?.amount || webhookData.amount;

    console.log('Webhook data - Payment ID:', gatewayPaymentId, 'Reference ID:', referenceId, 'Status:', paymentStatus);

    if (!referenceId && !gatewayPaymentId) {
      console.error('Missing both reference ID and payment ID in webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment identifiers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let paymentTransaction = null;
    let fetchError = null;

    if (referenceId) {
      const result = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', referenceId)
        .maybeSingle();

      paymentTransaction = result.data;
      fetchError = result.error;

      if (paymentTransaction) {
        console.log('Found payment by reference_id:', referenceId);

        if (!paymentTransaction.gateway_payment_id || paymentTransaction.gateway_payment_id.startsWith('29094000000')) {
          await supabase
            .from('payment_transactions')
            .update({ gateway_payment_id: gatewayPaymentId || paymentTransaction.gateway_payment_id })
            .eq('id', referenceId);
        }
      }
    }

    if (!paymentTransaction && gatewayPaymentId) {
      const result = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('gateway_payment_id', gatewayPaymentId)
        .maybeSingle();

      paymentTransaction = result.data;
      fetchError = result.error;

      if (paymentTransaction) {
        console.log('Found payment by gateway_payment_id:', gatewayPaymentId);
      }
    }

    if (fetchError || !paymentTransaction) {
      console.error('Payment transaction not found:', gatewayPaymentId, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newStatus = 'pending';
    if (paymentStatus === 'authorized' || paymentStatus === 'captured' || paymentStatus === 'success') {
      newStatus = 'success';
    } else if (paymentStatus === 'failed') {
      newStatus = 'failed';
    } else if (paymentStatus === 'cancelled' || paymentStatus === 'canceled') {
      newStatus = 'cancelled';
    }

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        completed_at: newStatus === 'success' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        metadata: webhookData,
      })
      .eq('id', paymentTransaction.id);

    if (updateError) {
      console.error('Error updating payment transaction:', updateError);
      throw updateError;
    }

    if (newStatus === 'success') {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('vendor_id', paymentTransaction.vendor_id)
        .maybeSingle();

      if (walletError || !wallet) {
        console.error('Wallet not found for vendor:', paymentTransaction.vendor_id);
        return new Response(
          JSON.stringify({ success: false, error: 'Wallet not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actualAmount = amount ? amount / 100 : paymentTransaction.amount;

      const { data: walletTransaction, error: walletTxError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          vendor_id: paymentTransaction.vendor_id,
          transaction_type: 'credit',
          amount: actualAmount,
          description: `${paymentTransaction.description} (Payment ID: ${gatewayPaymentId})`,
          reference: gatewayPaymentId,
          transaction_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (walletTxError) {
        console.error('Error creating wallet transaction:', walletTxError);
        throw walletTxError;
      }

      const { error: linkError } = await supabase
        .from('payment_transactions')
        .update({ wallet_transaction_id: walletTransaction.id })
        .eq('id', paymentTransaction.id);

      if (linkError) {
        console.error('Error linking wallet transaction:', linkError);
      }

      console.log('Payment successful, wallet credited:', actualAmount);
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in zoho-payment-webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function verifySignature(
  payload: string,
  signature: string,
  key: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    return await crypto.subtle.verify('HMAC', cryptoKey, signatureBytes, messageData);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
