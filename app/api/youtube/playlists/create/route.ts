/**
 * YouTube Create Playlist API
 * Creates a new playlist on YouTube
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createPlaylist, refreshAccessToken } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { organizationId, title, description } = await request.json();
    
    if (!organizationId || !title) {
      return NextResponse.json({ error: 'Missing organization ID or title' }, { status: 400 });
    }
    
    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    
    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get YouTube connection
    const { data: connection } = await adminClient
      .from('youtube_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (!connection) {
      return NextResponse.json({ error: 'No YouTube channel connected' }, { status: 404 });
    }
    
    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) <= new Date()) {
      try {
        const newTokens = await refreshAccessToken(connection.refresh_token);
        accessToken = newTokens.access_token!;
        
        await adminClient
          .from('youtube_connections')
          .update({
            access_token: accessToken,
            token_expires_at: new Date(newTokens.expiry_date || Date.now() + 3600000).toISOString(),
          })
          .eq('id', connection.id);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ error: 'YouTube connection expired' }, { status: 401 });
      }
    }
    
    // Create playlist on YouTube
    const playlist = await createPlaylist(accessToken, title, description || '');
    
    return NextResponse.json({ 
      success: true, 
      playlist: {
        id: playlist.id,
        title: playlist.title,
        itemCount: 0,
      }
    });
    
  } catch (error: any) {
    console.error('YouTube create playlist error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create playlist' }, { status: 500 });
  }
}
