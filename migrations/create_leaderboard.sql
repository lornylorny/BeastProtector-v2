-- Create leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    game_id text NOT NULL,
    high_score float NOT NULL,
    player_name text,
    last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow users to view all scores
CREATE POLICY "View scores" ON public.leaderboard
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own scores
CREATE POLICY "Insert own scores" ON public.leaderboard
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Allow users to update their own scores
CREATE POLICY "Update own scores" ON public.leaderboard
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Create index for faster score queries
CREATE INDEX IF NOT EXISTS leaderboard_game_id_score_idx 
    ON public.leaderboard (game_id, high_score DESC);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.leaderboard TO authenticated; 