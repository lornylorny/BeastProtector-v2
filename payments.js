// After successful Stripe payment
async function recordPayment(stripeSessionId, userId) {
    const { error } = await supabase.from('payments').insert({
      user_id: userId,
      stripe_payment_id: stripeSessionId,
      plays_remaining: 3
    });
    
    if (!error) {
      localStorage.setItem('currentPaymentId', payment.data[0].id);
    }
  }