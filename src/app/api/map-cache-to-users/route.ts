import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting map-cache-to-users cron job')
    
    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, broad_field, niche, sub_niche, keywords')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    console.log(`Processing ${profiles?.length || 0} user profiles`)

    let suggested = 0
    let skipped = 0

    // Get cached articles
    const { data: cachedArticles, error: cacheError } = await supabaseAdmin
      .from('trending_articles_cache')
      .select('*')

    if (cacheError) {
      throw new Error(`Failed to fetch cached articles: ${cacheError.message}`)
    }

    console.log(`Found ${cachedArticles?.length || 0} cached articles`)

    for (const profile of profiles || []) {
      try {
        const userId = profile.id
        const userKeywords = profile.keywords ? profile.keywords.toLowerCase().split(',').map((k: string) => k.trim()) : []
        const userNiche = profile.niche?.toLowerCase() || ''
        const userSubNiche = profile.sub_niche?.toLowerCase() || ''
        const userBroadField = profile.broad_field?.toLowerCase() || ''

        // Filter articles that match user's interests
        const matchingArticles = cachedArticles?.filter(article => {
          const articleTitle = article.title?.toLowerCase() || ''
          const articleDesc = article.description?.toLowerCase() || ''
          const articleBroadField = article.broad_field?.toLowerCase() || ''

          // Must match broad field
          if (articleBroadField !== userBroadField) return false

          // Check for keyword matches in title or description
          const hasKeywordMatch = userKeywords.some((keyword: string) => 
            articleTitle.includes(keyword) || articleDesc.includes(keyword)
          )

          // Check for niche/sub-niche matches
          const hasNicheMatch = userNiche && (
            articleTitle.includes(userNiche) || articleDesc.includes(userNiche)
          )
          
          const hasSubNicheMatch = userSubNiche && (
            articleTitle.includes(userSubNiche) || articleDesc.includes(userSubNiche)
          )

          return hasKeywordMatch || hasNicheMatch || hasSubNicheMatch
        }) || []

        console.log(`Found ${matchingArticles.length} matching articles for user ${userId}`)

        // Insert suggestions (with conflict handling)
        for (const article of matchingArticles) {
          const { error: insertError } = await supabaseAdmin
            .from('article_suggestions')
            .upsert({
              user_id: userId,
              article_url: article.article_url,
              title: article.title,
              description: article.description,
              published_at: article.published_at,
              source_name: article.source_name,
              image_url: article.image_url,
              broad_field: article.broad_field,
              suggested_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,article_url'
            })

          if (insertError) {
            console.error(`Insert error for user ${userId}, article ${article.article_url}:`, insertError.message)
            skipped++
          } else {
            suggested++
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.id}:`, userError)
        continue
      }
    }

    console.log(`Map-cache-to-users completed: ${suggested} suggested, ${skipped} skipped`)
    
    return NextResponse.json({ 
      status: 'ok', 
      suggested, 
      skipped,
      n: profiles?.length || 0
    })

  } catch (error) {
    console.error('Map-cache-to-users error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 