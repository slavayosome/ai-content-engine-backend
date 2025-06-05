import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import fetch from 'node-fetch'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting fetch-trending cron job')
    
    // Get unique broad_fields from profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('broad_field')
      .not('broad_field', 'is', null)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const uniqueBroadFields = [...new Set(profiles?.map(p => p.broad_field) || [])]
    console.log(`Found ${uniqueBroadFields.length} unique broad fields:`, uniqueBroadFields)

    let saved = 0
    let skipped = 0

    // Get last fetch time for rate limiting
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    for (const broadField of uniqueBroadFields) {
      try {
        // Fetch articles from NewsAPI
        const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(broadField)}&from=${oneDayAgo}&sortBy=popularity&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`
        
        const response = await fetch(newsApiUrl)
        if (!response.ok) {
          console.error(`NewsAPI error for ${broadField}: ${response.status}`)
          continue
        }

        const newsData = await response.json() as any
        const articles = newsData.articles || []

        console.log(`Fetched ${articles.length} articles for ${broadField}`)

        // Upsert articles into cache
        for (const article of articles) {
          if (!article.url || !article.title) continue

          const { error: upsertError } = await supabaseAdmin
            .from('trending_articles_cache')
            .upsert({
              broad_field: broadField,
              article_url: article.url,
              title: article.title,
              description: article.description || '',
              published_at: article.publishedAt,
              source_name: article.source?.name || '',
              image_url: article.urlToImage,
              fetched_at: new Date().toISOString()
            }, {
              onConflict: 'broad_field,article_url'
            })

          if (upsertError) {
            console.error(`Upsert error for ${article.url}:`, upsertError.message)
            skipped++
          } else {
            saved++
          }
        }
      } catch (fieldError) {
        console.error(`Error processing ${broadField}:`, fieldError)
        continue
      }
    }

    console.log(`Fetch-trending completed: ${saved} saved, ${skipped} skipped`)
    
    return NextResponse.json({ 
      status: 'ok', 
      saved, 
      skipped,
      n: uniqueBroadFields.length
    })

  } catch (error) {
    console.error('Fetch-trending error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 