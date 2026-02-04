/**
 * YouTube Channel Stats API
 * Fetches live subscriber count and video count from YouTube
 * and syncs it to the local channels table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getChannelStatistics, refreshAccessToken } from '@/lib/youtube/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
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
    
    // Get YouTube connection with tokens
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
    const tokenExpiry = new Date(connection.token_expires_at);
    
    if (tokenExpiry < new Date()) {
      // Token expired, refresh it
      const newTokens = await refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.access_token!;
      
      // Update the stored token
      await adminClient
        .from('youtube_connections')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(newTokens.expiry_date!).toISOString(),
        })
        .eq('id', connection.id);
    }
    
    // Fetch channel statistics from YouTube API
    const stats = await getChannelStatistics(accessToken);
    
    // Update the channels table with the live stats
    const { error: updateError } = await adminClient
      .from('channels')
      .update({
        subscriber_count: stats.subscriberCount,
        video_count: stats.videoCount,
      })
      .eq('organization_id', organizationId);
    
    if (updateError) {
      console.error('Failed to update channel stats:', updateError);
    }
    
    return NextResponse.json({
      subscriberCount: stats.subscriberCount,
      videoCount: stats.videoCount,
      viewCount: stats.viewCount,
      hiddenSubscriberCount: stats.hiddenSubscriberCount,
    });
    
  } catch (error) {
    console.error('YouTube stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch channel stats' }, { status: 500 });
  }
}
