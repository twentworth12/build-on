-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id INTEGER NOT NULL CHECK (option_id IN (1, 2, 3)),
  voter_ip INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_votes_option_id ON votes(option_id);
CREATE INDEX idx_votes_voter_ip ON votes(voter_ip);
CREATE INDEX idx_votes_created_at ON votes(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read votes
CREATE POLICY "Anyone can read votes" ON votes FOR SELECT USING (true);

-- Create policy to allow anyone to insert votes (with rate limiting at app level)
CREATE POLICY "Anyone can insert votes" ON votes FOR INSERT WITH CHECK (true);

-- Create a view for vote counts
CREATE VIEW vote_counts AS
SELECT 
  option_id,
  COUNT(*) as count
FROM votes
GROUP BY option_id
ORDER BY option_id;

-- Grant permissions
GRANT SELECT ON vote_counts TO anon, authenticated;
GRANT SELECT, INSERT ON votes TO anon, authenticated;

-- Function to get current vote totals
CREATE OR REPLACE FUNCTION get_vote_totals()
RETURNS TABLE(option_id INTEGER, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    generate_series(1, 3) as option_id,
    COALESCE(vc.count, 0) as count
  FROM (
    SELECT option_id, COUNT(*) as count
    FROM votes 
    GROUP BY option_id
  ) vc 
  RIGHT JOIN generate_series(1, 3) gs ON vc.option_id = gs
  ORDER BY gs;
$$;