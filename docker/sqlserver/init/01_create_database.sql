-- ============================================================
-- 01_create_database.sql
-- Creates the application database if it does not already exist
-- ============================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AgentDB')
BEGIN
    CREATE DATABASE AgentDB
        COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT 'Database AgentDB created.';
END
ELSE
BEGIN
    PRINT 'Database AgentDB already exists. Skipping.';
END
GO
