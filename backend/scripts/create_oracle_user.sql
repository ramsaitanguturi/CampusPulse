-- =====================================================================
-- CampusPulse — Dedicated User & Schema Provisioning
-- Database Dialect: Oracle 21c SQL / PL/SQL
-- Target Container: XEPDB1
-- File: backend/scripts/create_oracle_user.sql
--
-- =====================================================================
-- WARNING: DESTRUCTIVE ACTION - DROPS USER AND ALL SCHEMA OBJECTS
-- =====================================================================
-- Executing this script will DROP the 'campuspulse' user and ALL of its
-- associated database objects (tables, views, triggers, sequences, indexes,
-- and all stored data) via:
--     DROP USER campuspulse CASCADE;
--
-- BACKUP INSTRUCTIONS:
-- If the 'campuspulse' schema already exists and contains data you wish to
-- preserve, perform an Oracle Data Pump Export before running this script:
--     expdp campuspulse directory=DATA_PUMP_DIR dumpfile=campuspulse_backup.dmp logfile=backup.log
-- Or generate a SQL export using Oracle SQL Developer.
--
-- CONFIRMATION REQUIREMENT:
-- Run this script ONLY if you have confirmed that all necessary backups
-- are complete and you intend to drop existing data and reinitialize the
-- campuspulse user schema from scratch.
-- =====================================================================

WHENEVER SQLERROR EXIT SQL.SQLCODE;
WHENEVER OSERROR EXIT FAILURE;

ALTER SESSION SET CONTAINER = XEPDB1;

PROMPT =====================================================================
PROMPT [WARNING] THIS SCRIPT PERFORMS A DESTRUCTIVE SCHEMA RESET!
PROMPT It will drop the user 'campuspulse' and cascade-drop all stored data.
PROMPT Ensure backups (e.g. expdp) are completed before proceeding.
PROMPT =====================================================================

-- Secure credential entry: prompt without echoing to terminal
PROMPT Please enter a secure password for the new 'campuspulse' user.
PROMPT (Password characters will not be displayed on screen)
ACCEPT campuspulse_password CHAR PROMPT 'Enter password for campuspulse: ' HIDE

-- 1. Drop existing user if present (Destructive cascade)
PROMPT [DESTRUCTIVE] Dropping existing campuspulse user (if exists)...
BEGIN
   EXECUTE IMMEDIATE 'DROP USER campuspulse CASCADE';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -1918 THEN
         RAISE;
      END IF;
END;
/

-- 2. Create user campuspulse with securely supplied credentials
PROMPT Creating user campuspulse in pluggable database XEPDB1...
CREATE USER campuspulse IDENTIFIED BY "&campuspulse_password"
DEFAULT TABLESPACE USERS
TEMPORARY TABLESPACE TEMP
QUOTA UNLIMITED ON USERS;

-- 3. Grant required enterprise privileges
PROMPT Granting schema management and runtime privileges...
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE TABLE, CREATE SEQUENCE TO campuspulse;

-- 4. Secure cleanup of credential variable from SQL*Plus memory
UNDEFINE campuspulse_password;

PROMPT [SUCCESS] Dedicated user 'campuspulse' successfully provisioned in XEPDB1.
EXIT;
