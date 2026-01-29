#!/bin/bash

# Setup Database Performance Indexes
# This script applies the indexes defined in database-indexes.sql

if [ -f .env ]; then
  export $(cat .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set in .env or environment."
  exit 1
fi

echo "🚀 Applying database performance indexes..."

# Use psql to run the SQL file
# If you don't have psql, you can copy the contents of database-indexes.sql 
# and run it in your database console (e.g., Neon, Supabase, pgAdmin).

if command -v psql &> /dev/null
then
    psql "$DATABASE_URL" -f database-indexes.sql
    echo "✅ Indexes applied successfully!"
else
    echo "⚠️ Warning: 'psql' command not found."
    echo "Please run the content of 'database-indexes.sql' manually in your database console."
fi
