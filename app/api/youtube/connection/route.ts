/**
 * YouTube Connection Status API
 * Get the current YouTube connection for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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
    
    // Get YouTube connection (without exposing tokens)
    const { data: connection } = await adminClient
      .from('youtube_connections')
      .select('id, channel_id, channel_title, channel_thumbnail, connected_by, created_at')
      .eq('organization_id', organizationId)
      .single();
    
    if (!connection) {
      return NextResponse.json({ connection: null });
    }
    
    return NextResponse.json({ connection });
    
  } catch (error) {
    console.error('YouTube connection status error:', error);
    return NextResponse.json({ error: 'Failed to get connection status' }, { status: 500 });
  }
}
