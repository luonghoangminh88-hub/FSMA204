-- VEXIM U.S. Agent Management System
-- Allows system admins to configure default VEXIM agent info
-- that auto-fills when users opt-in to use VEXIM as their U.S. Agent

-- Create vexim_us_agent table (singleton - only 1 row)
CREATE TABLE IF NOT EXISTS vexim_us_agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  agent_company TEXT,
  agent_address TEXT NOT NULL,
  agent_city TEXT NOT NULL,
  agent_state TEXT NOT NULL,
  agent_zip TEXT NOT NULL,
  agent_phone TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  
  -- Service details
  service_description TEXT DEFAULT 'VEXIM provides FDA-compliant U.S. Agent services with automatic renewal management',
  default_contract_duration_years INTEGER DEFAULT 1 CHECK (default_contract_duration_years BETWEEN 1 AND 5),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default VEXIM agent data
INSERT INTO vexim_us_agent (
  agent_name,
  agent_company,
  agent_address,
  agent_city,
  agent_state,
  agent_zip,
  agent_phone,
  agent_email,
  service_description,
  default_contract_duration_years
) VALUES (
  'VEXIM Compliance Services',
  'VEXIM Corporation',
  '123 FDA Compliance Drive',
  'Rockville',
  'MD',
  '20850',
  '+1 (301) 555-0100',
  'fda-agent@vexim.com',
  'VEXIM provides FDA-compliant U.S. Agent services with automatic renewal management and 24/7 support',
  1
) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE vexim_us_agent ENABLE ROW LEVEL SECURITY;

-- System admins can update
CREATE POLICY "system_admins_can_update_vexim_agent"
  ON vexim_us_agent
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- All authenticated users can read (needed for auto-fill)
CREATE POLICY "authenticated_users_can_read_vexim_agent"
  ON vexim_us_agent
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION update_vexim_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vexim_agent_timestamp
  BEFORE UPDATE ON vexim_us_agent
  FOR EACH ROW
  EXECUTE FUNCTION update_vexim_agent_timestamp();

-- Add index
CREATE INDEX IF NOT EXISTS idx_vexim_us_agent_active ON vexim_us_agent(is_active);

COMMENT ON TABLE vexim_us_agent IS 'Stores VEXIM default U.S. Agent information for auto-fill when organizations opt-in';
COMMENT ON COLUMN vexim_us_agent.default_contract_duration_years IS 'Default contract duration (1-5 years) offered to organizations';
