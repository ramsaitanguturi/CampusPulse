-- =====================================================================
-- CampusPulse — Schema Cleanup & Cascade Table Drop
-- Database Dialect: Oracle 21c SQL / PL/SQL
-- Target Schema: campuspulse@XEPDB1
-- File: backend/scripts/drop_tables.sql
--
-- =====================================================================
-- WARNING: DESTRUCTIVE ACTION - DROPS ALL USER TABLES
-- =====================================================================
-- This script queries USER_TABLES and executes:
--     DROP TABLE <table_name> CASCADE CONSTRAINTS;
-- for EVERY table belonging to the connected schema.
-- ALL table definitions, constraints, indexes, and stored records
-- will be PERMANENTLY DESTROYED.
--
-- BACKUP INSTRUCTIONS:
-- Before running this script, ensure you have exported schema data:
--     expdp campuspulse directory=DATA_PUMP_DIR dumpfile=campuspulse_tables_backup.dmp logfile=drop_backup.log
--
-- CONFIRMATION REQUIREMENT:
-- Confirm that the connected schema is the intended target and that
-- all valuable evaluation data is backed up before proceeding.
-- =====================================================================

WHENEVER SQLERROR EXIT SQL.SQLCODE;
WHENEVER OSERROR EXIT FAILURE;

PROMPT =====================================================================
PROMPT [WARNING] THIS SCRIPT IS DESTRUCTIVE!
PROMPT It will drop ALL user tables in the current schema with CASCADE CONSTRAINTS.
PROMPT Ensure backups are complete before proceeding.
PROMPT =====================================================================

PROMPT [DESTRUCTIVE ACTION] Dropping all user tables...
BEGIN
  FOR t IN (SELECT table_name FROM user_tables) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
    DBMS_OUTPUT.PUT_LINE('Dropped table: ' || t.table_name);
  END LOOP;
END;
/

PROMPT [SUCCESS] All tables in current schema have been dropped.
EXIT;
