-- Broadcasto Database Schema
-- Created for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- Table: contacts
-- ====================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_blocked BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- ====================================
-- Table: chat_messages
-- ====================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'contact')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    media_url TEXT,
    media_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed'))
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_contact ON chat_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);

-- ====================================
-- Table: broadcasts
-- ====================================
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50),
    target_contacts UUID[] NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    total_recipients INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at DESC);

-- ====================================
-- Table: scheduled_messages
-- ====================================
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    CHECK (
        (contact_id IS NOT NULL AND broadcast_id IS NULL) OR
        (contact_id IS NULL AND broadcast_id IS NOT NULL)
    )
);

-- Indexes for scheduled_messages
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_time ON scheduled_messages(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_contact ON scheduled_messages(contact_id);

-- ====================================
-- Table: activity_logs
-- ====================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'info' CHECK (status IN ('info', 'success', 'warning', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING GIN(metadata);

-- ====================================
-- Functions: Auto-update updated_at
-- ====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contacts table
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- Row Level Security (RLS) Policies
-- ====================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public access policies (for development - adjust for production)
-- These policies allow all operations for authenticated and anon users
-- You should customize these based on your security requirements

-- Contacts policies
CREATE POLICY "Enable all access for contacts" ON contacts
    FOR ALL USING (true) WITH CHECK (true);

-- Chat messages policies
CREATE POLICY "Enable all access for chat_messages" ON chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- Broadcasts policies
CREATE POLICY "Enable all access for broadcasts" ON broadcasts
    FOR ALL USING (true) WITH CHECK (true);

-- Scheduled messages policies
CREATE POLICY "Enable all access for scheduled_messages" ON scheduled_messages
    FOR ALL USING (true) WITH CHECK (true);

-- Activity logs policies
CREATE POLICY "Enable all access for activity_logs" ON activity_logs
    FOR ALL USING (true) WITH CHECK (true);

-- ====================================
-- Sample Data (Optional - for testing)
-- ====================================

-- Insert sample contact
INSERT INTO contacts (phone_number, name, tags, notes)
VALUES 
    ('+6281234567890', 'John Doe', ARRAY['customer', 'vip'], 'Test contact 1'),
    ('+6289876543210', 'Jane Smith', ARRAY['customer'], 'Test contact 2')
ON CONFLICT (phone_number) DO NOTHING;

-- Insert sample activity log
INSERT INTO activity_logs (activity_type, description, status, metadata)
VALUES 
    ('system', 'Database initialized successfully', 'success', '{"version": "1.0", "method": "schema.sql"}'::jsonb)
ON CONFLICT DO NOTHING;
