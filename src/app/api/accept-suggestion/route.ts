import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const suggestionId = url.searchParams.get('id')
    
    if (!suggestionId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing suggestion ID' },
        { status: 400 }
      )
    }

    console.log(`Accepting suggestion: ${suggestionId}`)

    // Get the suggestion details
    const { data: suggestion, error: fetchError } = await supabaseAdmin
      .from('article_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { status: 'error', message: 'Suggestion not found' },
        { status: 404 }
      )
    }

    // Copy to knowledge library
    const { error: insertError } = await supabaseAdmin
      .from('knowledge_library')
      .insert({
        user_id: suggestion.user_id,
        article_url: suggestion.article_url,
        title: suggestion.title,
        description: suggestion.description,
        published_at: suggestion.published_at,
        source_name: suggestion.source_name,
        image_url: suggestion.image_url,
        broad_field: suggestion.broad_field,
        added_at: new Date().toISOString()
      })

    if (insertError) {
      // Check if it's a duplicate (likely constraint violation)
      if (insertError.code === '23505') {
        console.log(`Article already in library for user ${suggestion.user_id}`)
      } else {
        throw new Error(`Failed to add to library: ${insertError.message}`)
      }
    }

    // Remove from suggestions
    const { error: deleteError } = await supabaseAdmin
      .from('article_suggestions')
      .delete()
      .eq('id', suggestionId)

    if (deleteError) {
      console.error('Error removing suggestion:', deleteError.message)
      // Don't fail the request since the article was already added to library
    }

    console.log(`Successfully accepted suggestion ${suggestionId}`)
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Suggestion accepted and added to knowledge library'
    })

  } catch (error) {
    console.error('Accept-suggestion error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 