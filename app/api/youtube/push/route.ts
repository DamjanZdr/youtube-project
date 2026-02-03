/**
 * YouTube Push API
 * Push project metadata to linked YouTube video
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { 
  updateVideoMetadata, 
  updateVideoThumbnail, 
  refreshAccessToken,
  createPlaylist,
  addVideoToPlaylist,
  getVideoPlaylistItem
} from '@/lib/youtube';
import sharp from 'sharp';

// YouTube thumbnail requirements: 1280x720 (16:9)
const YOUTUBE_THUMBNAIL_WIDTH = 1280;
const YOUTUBE_THUMBNAIL_HEIGHT = 720;

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
      projectId, 
      pushTitle, 
      pushDescription, 
      pushTags, 
      pushThumbnail,
      playlistId,        // Existing YouTube playlist ID
      newPlaylistName,   // Name for new playlist to create
    } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }
    
    // Get project with organization info
    const { data: project } = await supabase
      .from('projects')
      .select(`
        id,
        organization_id,
        youtube_video_id,
        title,
        description
      `)
      .eq('id', projectId)
      .single();
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    if (!project.youtube_video_id) {
      return NextResponse.json({ error: 'No YouTube video linked to this project' }, { status: 400 });
    }
    
    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', project.organization_id)
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
    
    const results: { metadata?: boolean; thumbnail?: boolean; errors: string[] } = { errors: [] };
    
    // Get selected packaging set (contains title and thumbnail)
    const { data: packagingSet } = await adminClient
      .from('packaging_sets')
      .select('title, thumbnail_url')
      .eq('project_id', projectId)
      .eq('is_selected', true)
      .single();
    
    const { data: tags } = await adminClient
      .from('project_tags')
      .select('tag')
      .eq('project_id', projectId);
    
    // Push metadata if requested
    if (pushTitle || pushDescription || pushTags) {
      try {
        const updateData: { title?: string; description?: string; tags?: string[] } = {};
        
        if (pushTitle && packagingSet?.title) {
          updateData.title = packagingSet.title;
        }
        
        if (pushDescription && project.description) {
          updateData.description = project.description;
        }
        
        if (pushTags && tags && tags.length > 0) {
          updateData.tags = tags.map(t => t.tag);
        }
        
        if (Object.keys(updateData).length > 0) {
          await updateVideoMetadata(accessToken, project.youtube_video_id, updateData);
          results.metadata = true;
        }
      } catch (metaError: any) {
        console.error('Failed to update video metadata:', metaError);
        results.errors.push(`Metadata update failed: ${metaError.message}`);
      }
    }
    
    // Push thumbnail if requested
    if (pushThumbnail) {
      try {
        if (packagingSet?.thumbnail_url) {
          // Fetch the image
          const imageResponse = await fetch(packagingSet.thumbnail_url);
          if (!imageResponse.ok) {
            throw new Error('Failed to fetch thumbnail image');
          }
          
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // Resize/crop to YouTube's required 1280x720 (16:9) dimensions
          // Using 'cover' to fill the entire area, cropping if needed
          const processedBuffer = await sharp(imageBuffer)
            .resize(YOUTUBE_THUMBNAIL_WIDTH, YOUTUBE_THUMBNAIL_HEIGHT, {
              fit: 'cover',
              position: 'center',
            })
            .jpeg({ quality: 95 }) // YouTube accepts JPEG, PNG, GIF - JPEG is most efficient
            .toBuffer();
          
          await updateVideoThumbnail(accessToken, project.youtube_video_id, processedBuffer, 'image/jpeg');
          results.thumbnail = true;
        } else {
          results.errors.push('No thumbnail selected');
        }
      } catch (thumbError: any) {
        console.error('Failed to update thumbnail:', thumbError);
        results.errors.push(`Thumbnail update failed: ${thumbError.message}`);
      }
    }
    
    // Handle playlist - either add to existing or create new
    if (playlistId || newPlaylistName) {
      try {
        let targetPlaylistId = playlistId;
        
        // Create new playlist if name provided
        if (newPlaylistName && !playlistId) {
          const newPlaylist = await createPlaylist(accessToken, newPlaylistName);
          targetPlaylistId = newPlaylist.id;
          (results as any).playlistCreated = newPlaylist.title;
        }
        
        if (targetPlaylistId) {
          // Check if video is already in playlist
          const existingItem = await getVideoPlaylistItem(accessToken, targetPlaylistId, project.youtube_video_id);
          
          if (!existingItem) {
            await addVideoToPlaylist(accessToken, targetPlaylistId, project.youtube_video_id);
            (results as any).addedToPlaylist = true;
          } else {
            (results as any).alreadyInPlaylist = true;
          }
        }
      } catch (playlistError: any) {
        console.error('Failed to handle playlist:', playlistError);
        results.errors.push(`Playlist operation failed: ${playlistError.message}`);
      }
    }
    
    // Update last synced timestamp
    await adminClient
      .from('projects')
      .update({ youtube_last_synced_at: new Date().toISOString() })
      .eq('id', projectId);
    
    if (results.errors.length > 0 && !results.metadata && !results.thumbnail) {
      return NextResponse.json({ error: results.errors.join('; ') }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: results.errors.length > 0 
        ? 'Partially completed with some errors' 
        : 'Successfully pushed to YouTube'
    });
    
  } catch (error: any) {
    console.error('YouTube push error:', error);
    return NextResponse.json({ error: error.message || 'Failed to push to YouTube' }, { status: 500 });
  }
}
