/**
 * YouTube Channel Branding API
 * Push channel branding settings to YouTube
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { 
  updateChannelBranding, 
  updateChannelBanner,
  refreshAccessToken,
  getChannelBranding,
} from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    
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
    
    // Get YouTube connection
    const { data: connection } = await adminClient
      .from('youtube_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (!connection) {
      return NextResponse.json({ connected: false });
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
            token_expires_at: new Date(Date.now() + (newTokens.expiry_date || 3600000)).toISOString(),
          })
          .eq('id', connection.id);
      } catch {
        return NextResponse.json({ error: 'Failed to refresh YouTube token' }, { status: 401 });
      }
    }
    
    // Get current channel branding from YouTube
    const branding = await getChannelBranding(accessToken);
    
    return NextResponse.json({ 
      connected: true,
      channelId: connection.channel_id,
      channelTitle: connection.channel_title,
      branding,
    });
  } catch (error) {
    console.error('Error getting channel branding:', error);
    return NextResponse.json({ error: 'Failed to get channel branding' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      organizationId, 
      name,
      description,
      bannerUrl,
    } = await request.json();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }
    
    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, role')
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
            token_expires_at: new Date(Date.now() + (newTokens.expiry_date || 3600000)).toISOString(),
          })
          .eq('id', connection.id);
      } catch {
        return NextResponse.json({ error: 'Failed to refresh YouTube token' }, { status: 401 });
      }
    }
    
    const results: { name?: boolean; description?: boolean; banner?: boolean } = {};
    const errors: string[] = [];
    
    // Update name and description if provided
    if (name || description) {
      try {
        await updateChannelBranding(accessToken, {
          title: name,
          description: description,
        });
        if (name) results.name = true;
        if (description) results.description = true;
      } catch (error: unknown) {
        console.error('Error updating channel branding:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to update name/description: ${errorMessage}`);
      }
    }
    
    // Update banner if provided
    if (bannerUrl) {
      try {
        // Fetch the image from the URL
        const imageResponse = await fetch(bannerUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch banner image');
        }
        
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        await updateChannelBanner(accessToken, buffer, contentType);
        results.banner = true;
      } catch (error: unknown) {
        console.error('Error updating channel banner:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to update banner: ${errorMessage}`);
      }
    }
    
    // Note: Handle and icon cannot be updated via the YouTube API
    // Handle: Set during channel creation, can only be changed in YouTube Studio
    // Icon: Set via Google account profile picture, not YouTube API
    
    if (errors.length > 0 && Object.keys(results).length === 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      results,
      errors: errors.length > 0 ? errors : undefined,
      warnings: [
        'Channel handle cannot be changed via API',
        'Channel icon is set via your Google account profile picture',
      ],
    });
  } catch (error) {
    console.error('Error pushing channel branding:', error);
    return NextResponse.json({ error: 'Failed to update channel branding' }, { status: 500 });
  }
}
