-- First, rename existing leaderboard table to breast_protector_leaderboard
ALTER TABLE IF EXISTS leaderboard 
RENAME TO breast_protector_leaderboard;

-- Create a base table template for game leaderboards
CREATE TABLE IF NOT EXISTS game_leaderboards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    game_id text NOT NULL,
    player_name text NOT NULL,
    high_score integer NOT NULL,
    last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_id uuid REFERENCES payments(id),
    UNIQUE(user_id, game_id, player_name)
);

-- Enable RLS
ALTER TABLE game_leaderboards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view leaderboards" ON game_leaderboards
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own scores" ON game_leaderboards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores" ON game_leaderboards
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON game_leaderboards TO authenticated;

-- Create an index for faster leaderboard queries
CREATE INDEX game_leaderboards_game_id_score_idx 
    ON game_leaderboards(game_id, high_score DESC);

-- Create a function to get top scores for a specific game
CREATE OR REPLACE FUNCTION get_game_leaderboard(game_name text, limit_count integer DEFAULT 10)
RETURNS TABLE (
    player_name text,
    high_score integer,
    last_updated timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT gl.player_name, gl.high_score, gl.last_updated
    FROM game_leaderboards gl
    WHERE gl.game_id = game_name
    ORDER BY gl.high_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 