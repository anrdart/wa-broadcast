import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseAnonKey = config.public.supabaseAnonKey as string

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in runtime config')
  }

  const supabase: SupabaseClient = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )

  return {
    provide: {
      supabase
    }
  }
})
