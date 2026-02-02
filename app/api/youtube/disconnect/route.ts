/**
 * YouTube Disconnect API
 * Remove YouTube channel connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { organizationId } = await request.json();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }
    
    // Verify user is owner of the organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, owner_id')
      .eq('id', organizationId)
      .single();
    
    if (!org || org.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete the connection
    const { error: deleteError } = await adminClient
      .from('youtube_connections')
      .delete()
      .eq('organization_id', organizationId);
    
    if (deleteError) {
      console.error('Failed to delete YouTube connection:', deleteError);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }
    
    // Also clear any linked videos in projects
    await adminClient
      .from('projects')
      .update({ 
        youtube_video_id: null,
        youtube_video_published_at: null,
        youtube_last_synced_at: null,
      })
      .eq('organization_id', organizationId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('YouTube disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
