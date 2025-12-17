/**
 * Session Pool Initialization Script
 * 
 * This script initializes the session_pool table with available WhatsApp API instances.
 * Run with: npx tsx scripts/init-session-pool.ts
 * 
 * Requirements: 2.1 - WHEN a new session is requested THEN the System SHALL allocate 
 * an available WhatsApp API instance from the session pool
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Pool configuration - ports 3001-3005 as per design
const POOL_INSTANCES = [
  { port: 3001, container_name: 'whatsapp-api-1' },
  { port: 3002, container_name: 'whatsapp-api-2' },
  { port: 3003, container_name: 'whatsapp-api-3' },
  { port: 3004, container_name: 'whatsapp-api-4' },
  { port: 3005, container_name: 'whatsapp-api-5' },
]

async function initializeSessionPool() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('🚀 Initializing session pool...')
  console.log(`📊 Creating ${POOL_INSTANCES.length} pool instances (ports 3001-3005)`)

  for (const instance of POOL_INSTANCES) {
    const { data, error } = await supabase
      .from('session_pool')
      .upsert({
        port: instance.port,
        status: 'available',
        container_name: instance.container_name,
        session_id: null,
        last_health_check: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'port'
      })
      .select()

    if (error) {
      console.error(`❌ Failed to initialize port ${instance.port}:`, error.message)
    } else {
      console.log(`✅ Port ${instance.port} (${instance.container_name}) initialized`)
    }
  }

  // Verify initialization
  const { data: poolStatus, error: statusError } = await supabase
    .from('session_pool')
    .select('port, status, container_name, session_id')
    .order('port')

  if (statusError) {
    console.error('❌ Failed to verify pool status:', statusError.message)
  } else {
    console.log('\n📋 Session Pool Status:')
    console.table(poolStatus)
  }

  console.log('\n✅ Session pool initialization complete!')
}

// Run the initialization
initializeSessionPool().catch(console.error)
