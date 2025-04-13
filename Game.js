// Check plays remaining (call this before game starts)
async function checkPlays() {
    const user = supabase.auth.user();
    const { data } = await supabase
      .from('payments')
      .select('plays_remaining,id')
      .eq('user_id', user.id)
      .gt('plays_remaining', 0)
      .order('created_at', { descending: true });
    
    return data?.[0] || null;
  }
  
  // Submit score (call when game ends)
  async function submitScore(score) {
    const payment = await checkPlays();
    if (!payment) return false;
    
    const { error } = await supabase.from('plays').insert({
      user_id: supabase.auth.user().id,
      game_id: 'level1',
      score: score,
      payment_id: payment.id
    });
    
    return !error;
  }