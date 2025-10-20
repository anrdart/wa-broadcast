/**
 * Supabase Setup and Initialization Utilities
 * 
 * Helper functions to verify and initialize Supabase integration
 */

import { checkSupabaseConnection } from './supabase-helpers'
import { supabase } from '@/services/supabase'

/**
 * Initialize Supabase and verify connection
 */
export async function initializeSupabase(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  console.log('🔄 Initializing Supabase connection...')

  // Check environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    return {
      success: false,
      message: '❌ Supabase URL not configured',
      details: {
        solution: 'Create a .env file in the frontend directory and add VITE_SUPABASE_URL',
        example: 'VITE_SUPABASE_URL=https://your-project.supabase.co'
      }
    }
  }

  if (!supabaseKey || supabaseKey === 'your-anon-key') {
    return {
      success: false,
      message: '❌ Supabase anon key not configured',
      details: {
        solution: 'Add VITE_SUPABASE_ANON_KEY to your .env file',
        example: 'VITE_SUPABASE_ANON_KEY=eyJhbGc...'
      }
    }
  }

  // Test connection
  const connectionTest = await checkSupabaseConnection()

  if (!connectionTest.connected) {
    return {
      success: false,
      message: `❌ ${connectionTest.message}`,
      details: {
        supabaseUrl,
        keyPrefix: supabaseKey.substring(0, 20) + '...'
      }
    }
  }

  // Verify tables exist
  const tableCheck = await verifyDatabaseTables()

  if (!tableCheck.success) {
    return {
      success: false,
      message: '❌ Database tables not found',
      details: tableCheck.details
    }
  }

  console.log('✅ Supabase initialized successfully!')
  
  return {
    success: true,
    message: '✅ Supabase is ready!',
    details: {
      url: supabaseUrl,
      tablesVerified: tableCheck.details?.tables
    }
  }
}

/**
 * Verify that all required database tables exist
 */
async function verifyDatabaseTables(): Promise<{
  success: boolean
  details?: any
}> {
  const requiredTables = [
    'contacts',
    'chat_messages',
    'broadcasts',
    'scheduled_messages',
    'activity_logs'
  ]

  const tableStatus: Record<string, boolean> = {}

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)

      tableStatus[table] = !error
    } catch {
      tableStatus[table] = false
    }
  }

  const allTablesExist = Object.values(tableStatus).every(status => status)

  return {
    success: allTablesExist,
    details: {
      tables: tableStatus,
      missing: Object.entries(tableStatus)
        .filter(([_, exists]) => !exists)
        .map(([table]) => table)
    }
  }
}

/**
 * Get Supabase project info
 */
export function getSupabaseInfo() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  let projectId = 'not-configured'
  
  if (url && url !== 'https://your-project.supabase.co') {
    const match = url.match(/https:\/\/(.+?)\.supabase\.co/)
    if (match) {
      projectId = match[1]
    }
  }

  return {
    projectId,
    url,
    isConfigured: url !== 'https://your-project.supabase.co' && key !== 'your-anon-key',
    dashboardUrl: url !== 'https://your-project.supabase.co' 
      ? `https://supabase.com/dashboard/project/${projectId}`
      : null
  }
}

/**
 * Print setup instructions to console
 */
export function printSetupInstructions() {
  const info = getSupabaseInfo()

  if (info.isConfigured) {
    console.log(`
✅ Supabase is configured!

Project ID: ${info.projectId}
Dashboard: ${info.dashboardUrl}

Next steps:
1. Verify database schema is created
2. Check Row Level Security policies
3. Test CRUD operations
    `)
  } else {
    console.log(`
⚠️  Supabase NOT configured

To set up Supabase:

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from SUPABASE_SCHEMA.md
3. Get your API credentials from Settings > API
4. Create frontend/.env file:

   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_BACKEND_WS_URL=ws://localhost:3000

5. Restart your dev server

For detailed instructions, see: SUPABASE_INTEGRATION_GUIDE.md
    `)
  }
}

/**
 * Run database health check
 */
export async function runDatabaseHealthCheck(): Promise<{
  healthy: boolean
  checks: Record<string, boolean>
  message: string
}> {
  const checks: Record<string, boolean> = {}

  // Check 1: Connection
  try {
    const connectionTest = await checkSupabaseConnection()
    checks.connection = connectionTest.connected
  } catch {
    checks.connection = false
  }

  // Check 2: Tables exist
  try {
    const tableCheck = await verifyDatabaseTables()
    checks.tablesExist = tableCheck.success
  } catch {
    checks.tablesExist = false
  }

  // Check 3: Can write data
  try {
    const testLog = {
      activity_type: 'health_check',
      description: 'Database health check test',
      metadata: { timestamp: new Date().toISOString() }
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert([testLog])

    checks.canWrite = !error

    // Clean up test log
    if (!error) {
      await supabase
        .from('activity_logs')
        .delete()
        .eq('activity_type', 'health_check')
    }
  } catch {
    checks.canWrite = false
  }

  // Check 4: Can read data
  try {
    const { error } = await supabase
      .from('contacts')
      .select('count')
      .limit(1)

    checks.canRead = !error
  } catch {
    checks.canRead = false
  }

  const healthy = Object.values(checks).every(check => check)

  return {
    healthy,
    checks,
    message: healthy 
      ? '✅ All database health checks passed!' 
      : '❌ Some database health checks failed'
  }
}
