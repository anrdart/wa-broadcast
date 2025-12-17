-- Session Pool Initialization Script
-- This script initializes the session_pool table with available WhatsApp API instances
-- Run this script in Supabase SQL Editor after creating the tables

-- Clear existing pool entries (optional - uncomment if needed)
-- DELETE FROM session_pool;

-- Insert pool records for each WhatsApp API instance (ports 3001-3005)
INSERT INTO session_pool (port, status, container_name, last_health_check, created_at, updated_at)
VALUES 
  (3001, 'available', 'whatsapp-api-1', NOW(), NOW(), NOW()),
  (3002, 'available', 'whatsapp-api-2', NOW(), NOW(), NOW()),
  (3003, 'available', 'whatsapp-api-3', NOW(), NOW(), NOW()),
  (3004, 'available', 'whatsapp-api-4', NOW(), NOW(), NOW()),
  (3005, 'available', 'whatsapp-api-5', NOW(), NOW(), NOW())
ON CONFLICT (port) DO UPDATE SET
  status = 'available',
  session_id = NULL,
  last_health_check = NOW(),
  updated_at = NOW();

-- Verify the pool initialization
SELECT 
  port, 
  status, 
  container_name, 
  session_id,
  last_health_check
FROM session_pool 
ORDER BY port;
