-- Migration: Add database_starter column to labs table for ITCS255
-- This column stores SQL initialization code that runs before all tests

ALTER TABLE labs ADD COLUMN IF NOT EXISTS database_starter TEXT DEFAULT NULL;

COMMENT ON COLUMN labs.database_starter IS 'SQL code to initialize database environment (e.g., CREATE DATABASE, CREATE TABLE statements)';
