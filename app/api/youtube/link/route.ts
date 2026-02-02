/**
 * Link YouTube Video API
 * Link or unlink a YouTube video to a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVideoDetails, refreshAccessToken } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { projectId, videoId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }
    
    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .single();
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    
    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // If unlinking (no videoId)
    if (!videoId) {
      await adminClient
        .from('projects')
        .update({
          youtube_video_id: null,
          youtube_video_published_at: null,
          youtube_last_synced_at: null,
        })
        .eq('id', projectId);
      
      return NextResponse.json({ success: true, message: 'Video unlinked' });
    }
    
    // Get YouTube connection to verify video belongs to connected channel
    const { data: connection } = await adminClient
      .from('youtube_connections')
      .select('*')
      .eq('organization_id', project.organization_id)
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
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ error: 'YouTube connection expired, please reconnect' }, { status: 401 });
      }
    }
    
    // Verify video exists and get details
    let videoDetails;
    try {
      videoDetails = await getVideoDetails(accessToken, videoId);
    } catch (videoError) {
      return NextResponse.json({ error: 'Video not found or not accessible' }, { status: 404 });
    }
    
    // Link the video
    await adminClient
      .from('projects')
      .update({
        youtube_video_id: videoId,
        youtube_video_published_at: videoDetails.publishedAt,
        youtube_last_synced_at: null,
      })
      .eq('id', projectId);
    
    return NextResponse.json({ 
      success: true, 
      video: videoDetails,
      message: 'Video linked successfully' 
    });
    
  } catch (error: any) {
    console.error('YouTube link error:', error);
    return NextResponse.json({ error: error.message || 'Failed to link video' }, { status: 500 });
  }
}
