-- First ensure the user exists in auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
    '873d7094-5966-4823-b9aa-9878986beac0',
    'mr.lorne.campbell@gmail.com',
    '{"name": "Lorne Campbell"}'
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing foreign key constraint
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- Recreate foreign key constraint as deferrable
ALTER TABLE leaderboard 
ADD CONSTRAINT leaderboard_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE 
DEFERRABLE INITIALLY DEFERRED;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON leaderboard;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own scores" ON leaderboard;
DROP POLICY IF EXISTS "Allow users to update their own scores" ON leaderboard;
DROP POLICY IF EXISTS "Allow users to delete their own scores" ON leaderboard;

-- Make payment_id nullable
ALTER TABLE leaderboard ALTER COLUMN payment_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON leaderboard
    FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert their own scores" ON leaderboard
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own scores" ON leaderboard
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own scores" ON leaderboard
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON leaderboard TO authenticated;
GRANT INSERT ON leaderboard TO authenticated;
GRANT UPDATE ON leaderboard TO authenticated;
GRANT DELETE ON leaderboard TO authenticated;
-- Grant public read access for anonymous users
GRANT SELECT ON leaderboard TO anon;

-- Drop existing primary key constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
              WHERE table_name = 'leaderboard' AND constraint_type = 'PRIMARY KEY') THEN
        ALTER TABLE leaderboard DROP CONSTRAINT leaderboard_pkey;
    END IF;
END $$;

-- Add id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'leaderboard' AND column_name = 'id') THEN
        ALTER TABLE leaderboard ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Set id as primary key
ALTER TABLE leaderboard ADD PRIMARY KEY (id);

-- Ensure the id column has the correct default
ALTER TABLE leaderboard 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Reset the sequence if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'leaderboard_id_seq') THEN
        ALTER SEQUENCE leaderboard_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Ensure player_name column exists and is not null
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'leaderboard' AND column_name = 'player_name') THEN
        ALTER TABLE leaderboard ADD COLUMN player_name TEXT NOT NULL;
    END IF;
END $$; 