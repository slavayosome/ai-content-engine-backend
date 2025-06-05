import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting purge-cache cron job')
    
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

    // Purge old cache entries (>24h)
    const { error: cacheError, count: purgedCache } = await supabaseAdmin
      .from('trending_articles_cache')
      .delete()
      .lt('fetched_at', twentyFourHoursAgo)

    if (cacheError) {
      console.error('Error purging cache:', cacheError.message)
    } else {
      console.log(`Purged ${purgedCache || 0} cache entries older than 24h`)
    }

    // Purge old suggestions (>48h)
    const { error: suggestionsError, count: purgedSuggestions } = await supabaseAdmin
      .from('article_suggestions')
      .delete()
      .lt('suggested_at', fortyEightHoursAgo)

    if (suggestionsError) {
      console.error('Error purging suggestions:', suggestionsError.message)
    } else {
      console.log(`Purged ${purgedSuggestions || 0} suggestions older than 48h`)
    }

    console.log('Purge-cache completed successfully')
    
    return NextResponse.json({ 
      status: 'ok',
      purged_cache: purgedCache || 0,
      purged_suggestions: purgedSuggestions || 0
    })

  } catch (error) {
    console.error('Purge-cache error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 