#!/bin/bash

echo "🔍 Debugging Admin Pages Deployment Issues"
echo "========================================="

echo ""
echo "📋 Checking Environment Variables:"
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
else
    echo "✅ DATABASE_URL is set"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET is not set (will use default)"
else
    echo "✅ JWT_SECRET is set"
fi

echo ""
echo "🌐 Testing Database Connection:"
node -e "
const { Pool } = require('pg');

async function testConnection() {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT 1 as test');
        client.release();
        await pool.end();
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        return false;
    }
}

testConnection();
"

echo ""
echo "🚀 Testing API Endpoints (if server is running):"

# Test health endpoint
echo "Testing health endpoint..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/health || echo "❌ Health endpoint failed (server may not be running)"

# Test users endpoint
echo "Testing users endpoint..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/users || echo "❌ Users endpoint test (expected 401 without auth)"

echo ""
echo "💡 If pages are stuck in Vercel:"
echo "1. Check Vercel function logs in dashboard"
echo "2. Verify DATABASE_URL is set in Vercel environment variables"
echo "3. Verify JWT_SECRET is set in Vercel environment variables"
echo "4. Check if functions are timing out (increased to 30s)"
echo "5. Verify Neon database is accessible from Vercel region"
echo ""
echo "🔧 Recent fixes applied:"
echo "- Increased Vercel function timeout from 10s to 30s"
echo "- Added database connection retry logic"
echo "- Optimized PostgreSQL pool for serverless"
echo "- Added better error handling in API routes"
echo "- Enhanced loading states in admin pages"