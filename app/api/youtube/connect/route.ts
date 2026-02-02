/**
 * YouTube Connection API
 * Start OAuth flow to connect YouTube channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/youtube';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { organizationId, studioSlug } = await request.json();
    
    if (!organizationId || !studioSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    
    // Generate OAuth URL with state containing org info
    const state = `${organizationId}:${studioSlug}`;
    const authUrl = getAuthUrl(state);
    
    return NextResponse.json({ url: authUrl });
    
  } catch (error) {
    console.error('YouTube connect error:', error);
    return NextResponse.json({ error: 'Failed to start connection' }, { status: 500 });
  }
}
