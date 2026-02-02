/**
 * YouTube OAuth Callback Handler
 * Handles the OAuth redirect after user authorizes access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTokensFromCode, getMyChannel } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Contains organizationId
  const error = searchParams.get('error');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (error) {
    console.error('YouTube OAuth error:', error);
    return NextResponse.redirect(
      `${baseUrl}/studio/${state}/channel?error=oauth_denied`
    );
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/hub?error=invalid_oauth_request`
    );
  }
  
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/auth/login`);
    }
    
    // Parse state - format: "orgId:studioSlug"
    const [organizationId, studioSlug] = state.split(':');
    
    // Verify user is owner of the organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, owner_id')
      .eq('id', organizationId)
      .single();
    
    if (!org || org.owner_id !== user.id) {
      return NextResponse.redirect(
        `${baseUrl}/studio/${studioSlug}/channel?error=unauthorized`
      );
    }
    
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens');
    }
    
    // Get channel info
    const channel = await getMyChannel(tokens.access_token);
    
    // Store connection in database (upsert)
    const { error: dbError } = await adminClient
      .from('youtube_connections')
      .upsert({
        organization_id: organizationId,
        channel_id: channel.id,
        channel_title: channel.title,
        channel_thumbnail: channel.thumbnail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        scopes: tokens.scope?.split(' ') || [],
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      });
    
    if (dbError) {
      console.error('Database error storing YouTube connection:', dbError);
      throw dbError;
    }
    
    return NextResponse.redirect(
      `${baseUrl}/studio/${studioSlug}/channel?youtube=connected`
    );
    
  } catch (err) {
    console.error('YouTube OAuth callback error:', err);
    return NextResponse.redirect(
      `${baseUrl}/hub?error=youtube_connection_failed`
    );
  }
}
