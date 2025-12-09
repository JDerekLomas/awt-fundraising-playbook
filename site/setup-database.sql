-- AWT Fundraising CRM Schema
-- Run this in Supabase SQL Editor

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT,
    email TEXT,
    phone TEXT,
    twitter TEXT,
    linkedin TEXT,
    instagram TEXT,
    website TEXT,
    category TEXT DEFAULT 'individual', -- individual, foundation, corporate, academic
    status TEXT DEFAULT 'prospect', -- prospect, contacted, meeting, proposal, committed, received
    priority INTEGER DEFAULT 3, -- 1-5, 5 being highest
    estimated_amount DECIMAL(12, 2) DEFAULT 0,
    hook TEXT, -- personal connection/pitch angle
    approach TEXT, -- how to approach them
    notes TEXT,
    tags TEXT[], -- array of tags for filtering
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions log
CREATE TABLE IF NOT EXISTS interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- email, call, meeting, social, other
    subject TEXT,
    notes TEXT,
    outcome TEXT, -- positive, neutral, negative, pending
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date DATE NOT NULL,
    priority INTEGER DEFAULT 3,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations/Pledges
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pledged', -- pledged, invoiced, received
    payment_method TEXT,
    notes TEXT,
    pledge_date DATE,
    received_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates tracking
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    template_name TEXT,
    sent_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) - disabled for now since this is a personal CRM
-- Enable later if multi-user access is needed

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contacts updated_at
DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Sample data for testing (uncomment to use)
/*
INSERT INTO contacts (name, organization, email, twitter, category, status, priority, estimated_amount, hook) VALUES
('Naval Ravikant', 'AngelList', 'via twitter', '@naval', 'individual', 'prospect', 5, 100000, 'Studies Stoicism, Buddhism - Renaissance texts fill gap in Western contemplative tradition'),
('Nat Friedman', 'GitHub (former CEO)', 'via twitter', '@natfriedman', 'individual', 'prospect', 5, 500000, 'Funded Vesuvius Challenge - already proven model for AI + ancient texts'),
('Tyler Cowen', 'Emergent Ventures', 'via EV form', '@tylercowen', 'foundation', 'prospect', 5, 50000, 'Renaissance scholar, fast grants, perfect fit');
*/
