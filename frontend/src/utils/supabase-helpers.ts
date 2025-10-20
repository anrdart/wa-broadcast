/**
 * Supabase Helper Utilities
 * 
 * Additional helper functions for working with Supabase database
 */

import { supabase, supabaseService } from '@/services/supabase'

/**
 * Check if Supabase is properly configured
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean
  message: string
}> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    // Check if environment variables are set
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      return {
        connected: false,
        message: 'Supabase URL not configured. Please update your .env file.'
      }
    }

    if (!supabaseKey || supabaseKey === 'your-anon-key') {
      return {
        connected: false,
        message: 'Supabase anon key not configured. Please update your .env file.'
      }
    }

    // Test connection by querying a table
    const { error } = await supabase
      .from('contacts')
      .select('count')
      .limit(1)

    if (error) {
      return {
        connected: false,
        message: `Connection failed: ${error.message}`
      }
    }

    return {
      connected: true,
      message: 'Successfully connected to Supabase!'
    }
  } catch (error) {
    return {
      connected: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Batch save contacts to Supabase
 */
export async function batchSaveContacts(contacts: Array<{
  id: string
  name?: string
  number: string
  is_my_contact: boolean
  is_from_csv: boolean
}>) {
  const BATCH_SIZE = 100
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)
    
    try {
      const { error } = await supabase
        .from('contacts')
        .upsert(batch)

      if (error) {
        results.failed += batch.length
        results.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`)
      } else {
        results.successful += batch.length
      }
    } catch (error) {
      results.failed += batch.length
      results.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}

/**
 * Export contacts to JSON
 */
export async function exportContactsToJSON(): Promise<string> {
  const contacts = await supabaseService.getContacts()
  return JSON.stringify(contacts, null, 2)
}

/**
 * Export contacts to CSV
 */
export async function exportContactsToCSV(): Promise<string> {
  const contacts = await supabaseService.getContacts()
  
  if (!contacts || contacts.length === 0) {
    return 'No contacts to export'
  }

  const headers = ['ID', 'Name', 'Number', 'Is My Contact', 'Is From CSV', 'Created At']
  const rows = contacts.map((c: any) => [
    c.id,
    c.name || '',
    c.number,
    c.is_my_contact ? 'Yes' : 'No',
    c.is_from_csv ? 'Yes' : 'No',
    c.created_at
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Import contacts from CSV string
 */
export async function importContactsFromCSV(csvContent: string): Promise<{
  imported: number
  failed: number
  errors: string[]
}> {
  const results = {
    imported: 0,
    failed: 0,
    errors: [] as string[]
  }

  try {
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      results.errors.push('CSV file is empty or has no data rows')
      return results
    }
    
    const headers = lines[0]!.split(',').map(h => h.trim().replace(/"/g, ''))
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]!.split(',').map(v => v.trim().replace(/"/g, ''))
      
      try {
        await supabaseService.saveContact({
          id: values[0] || `imported-${Date.now()}-${i}`,
          name: values[1] || undefined,
          number: values[2] || '',
          is_my_contact: values[3]?.toLowerCase() === 'yes',
          is_from_csv: true
        })
        results.imported++
      } catch (error) {
        results.failed++
        results.errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Failed to import'}`)
      }
    }
  } catch (error) {
    results.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return results
}

/**
 * Clean up old activity logs (keep last N days)
 */
export async function cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const { data, error } = await supabase
    .from('activity_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select()

  if (error) {
    throw error
  }

  return data?.length || 0
}

/**
 * Get broadcast statistics
 */
export async function getBroadcastStats(): Promise<{
  total: number
  successful: number
  failed: number
  averageSuccessRate: number
}> {
  const broadcasts = await supabaseService.getBroadcasts()
  
  if (!broadcasts || broadcasts.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      averageSuccessRate: 0
    }
  }

  const totalSuccessful = broadcasts.reduce((sum: number, b: any) => sum + (b.successful || 0), 0)
  const totalFailed = broadcasts.reduce((sum: number, b: any) => sum + (b.failed || 0), 0)
  const totalMessages = totalSuccessful + totalFailed

  return {
    total: broadcasts.length,
    successful: totalSuccessful,
    failed: totalFailed,
    averageSuccessRate: totalMessages > 0 ? (totalSuccessful / totalMessages) * 100 : 0
  }
}

/**
 * Get chat statistics for a contact
 */
export async function getContactChatStats(contactId: string): Promise<{
  totalMessages: number
  sentByMe: number
  receivedFromContact: number
  lastMessageAt: string | null
}> {
  const messages = await supabaseService.getChatMessages(contactId)
  
  if (!messages || messages.length === 0) {
    return {
      totalMessages: 0,
      sentByMe: 0,
      receivedFromContact: 0,
      lastMessageAt: null
    }
  }

  const sentByMe = messages.filter((m: any) => m.is_outgoing).length
  const receivedFromContact = messages.length - sentByMe
  const lastMessage = messages[messages.length - 1]

  return {
    totalMessages: messages.length,
    sentByMe,
    receivedFromContact,
    lastMessageAt: lastMessage?.timestamp || null
  }
}

/**
 * Search contacts by name or number
 */
export async function searchContacts(query: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .or(`name.ilike.%${query}%,number.ilike.%${query}%`)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get upcoming scheduled messages
 */
export async function getUpcomingScheduledMessages(hours: number = 24): Promise<any[]> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', futureDate.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Mark messages as read for a contact
 */
export async function markMessagesAsRead(contactId: string): Promise<number> {
  const { data, error } = await supabase
    .from('chat_messages')
    .update({ read: true })
    .eq('contact_id', contactId)
    .eq('read', false)
    .select()

  if (error) {
    throw error
  }

  return data?.length || 0
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(): Promise<number> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .eq('is_outgoing', false)

  if (error) {
    throw error
  }

  return count || 0
}

/**
 * Download helper - Create downloadable file from content
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
