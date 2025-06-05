import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const suggestionId = url.searchParams.get('id')
    
    if (!suggestionId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing suggestion ID' },
        { status: 400 }
      )
    }

    console.log(`Declining suggestion: ${suggestionId}`)

    // Remove the suggestion
    const { error: deleteError, count } = await supabaseAdmin
      .from('article_suggestions')
      .delete()
      .eq('id', suggestionId)

    if (deleteError) {
      throw new Error(`Failed to decline suggestion: ${deleteError.message}`)
    }

    if (count === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Suggestion not found' },
        { status: 404 }
      )
    }

    console.log(`Successfully declined suggestion ${suggestionId}`)
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Suggestion declined and removed'
    })

  } catch (error) {
    console.error('Decline-suggestion error:', error)
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 