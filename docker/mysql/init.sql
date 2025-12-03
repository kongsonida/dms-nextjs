-- MySQL initialization script for DMS
-- This script runs when the container is first created

-- Create database if not exists (already created by MYSQL_DATABASE env var)
-- CREATE DATABASE IF NOT EXISTS dms;

-- Use the database
USE dms;

-- Enable full-text search for documents
-- This will be handled by Prisma migrations, but we ensure the charset is correct
ALTER DATABASE dms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON dms.* TO 'dms_user'@'%';
FLUSH PRIVILEGES;
