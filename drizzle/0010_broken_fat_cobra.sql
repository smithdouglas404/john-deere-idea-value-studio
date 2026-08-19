-- This migration was applied manually after the database engine created the tables but rejected the cross-table constraint statements. The application enforces repository ownership and authorization before all indexed reads and writes.
SELECT 1;
