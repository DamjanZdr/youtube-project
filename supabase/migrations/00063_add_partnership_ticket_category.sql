-- Add 'partnership' to support_ticket_category enum
-- This allows users to contact support about the partner program

ALTER TYPE support_ticket_category ADD VALUE IF NOT EXISTS 'partnership';
