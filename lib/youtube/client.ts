/**
 * YouTube API Client
 * Handles OAuth and YouTube Data API interactions
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly', // List videos
  'https://www.googleapis.com/auth/youtube.force-ssl', // Update video metadata
  'https://www.googleapis.com/auth/youtube.upload', // Upload thumbnails
  'https://www.googleapis.com/auth/youtube.channel-memberships.creator', // Channel management
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
  );
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh token
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

export function getYouTubeClient(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });
}

/**
 * Get the authenticated user's channel info
 */
export async function getMyChannel(accessToken: string) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
  });
  
  const channel = response.data.items?.[0];
  if (!channel) {
    throw new Error('No channel found for this account');
  }
  
  return {
    id: channel.id!,
    title: channel.snippet?.title || 'Unknown Channel',
    thumbnail: channel.snippet?.thumbnails?.default?.url || null,
  };
}

/**
 * Get channel statistics (subscriber count, video count, view count)
 */
export async function getChannelStatistics(accessToken: string) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.channels.list({
    part: ['statistics'],
    mine: true,
  });
  
  const channel = response.data.items?.[0];
  if (!channel) {
    throw new Error('No channel found for this account');
  }
  
  return {
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
    videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
    viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
    hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false,
  };
}

/**
 * List videos from the authenticated user's channel
 */
export async function listMyVideos(accessToken: string, maxResults = 50) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.search.list({
    part: ['snippet'],
    forMine: true,
    type: ['video'],
    maxResults,
    order: 'date',
  });
  
  return response.data.items?.map(item => ({
    id: item.id?.videoId!,
    title: item.snippet?.title || 'Untitled',
    thumbnail: item.snippet?.thumbnails?.medium?.url || null,
    publishedAt: item.snippet?.publishedAt || null,
    description: item.snippet?.description || '',
  })) || [];
}

/**
 * Get detailed info about a specific video
 */
export async function getVideoDetails(accessToken: string, videoId: string) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.videos.list({
    part: ['snippet', 'status'],
    id: [videoId],
  });
  
  const video = response.data.items?.[0];
  if (!video) {
    throw new Error('Video not found');
  }
  
  return {
    id: video.id!,
    title: video.snippet?.title || '',
    description: video.snippet?.description || '',
    tags: video.snippet?.tags || [],
    thumbnail: video.snippet?.thumbnails?.maxres?.url || 
               video.snippet?.thumbnails?.high?.url || null,
    publishedAt: video.snippet?.publishedAt || null,
    privacyStatus: video.status?.privacyStatus || 'private',
  };
}

/**
 * Update video metadata (title, description, tags)
 */
export async function updateVideoMetadata(
  accessToken: string,
  videoId: string,
  data: {
    title?: string;
    description?: string;
    tags?: string[];
  }
) {
  const youtube = getYouTubeClient(accessToken);
  
  // First get current video data to preserve category
  const current = await youtube.videos.list({
    part: ['snippet'],
    id: [videoId],
  });
  
  const currentSnippet = current.data.items?.[0]?.snippet;
  if (!currentSnippet) {
    throw new Error('Video not found');
  }
  
  const response = await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet: {
        title: data.title ?? currentSnippet.title!,
        description: data.description ?? currentSnippet.description!,
        tags: data.tags ?? currentSnippet.tags ?? [],
        categoryId: currentSnippet.categoryId!, // Required field
      },
    },
  });
  
  return response.data;
}

/**
 * Upload/update video thumbnail
 */
export async function updateVideoThumbnail(
  accessToken: string,
  videoId: string,
  imageBuffer: Buffer,
  mimeType: string
) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.thumbnails.set({
    videoId,
    media: {
      mimeType,
      body: imageBuffer,
    },
  });
  
  return response.data;
}

/**
 * List playlists from the authenticated user's channel
 */
export async function listMyPlaylists(accessToken: string, maxResults = 50) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.playlists.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
    maxResults,
  });
  
  return response.data.items?.map(item => ({
    id: item.id!,
    title: item.snippet?.title || 'Untitled',
    description: item.snippet?.description || '',
    thumbnail: item.snippet?.thumbnails?.medium?.url || null,
    itemCount: item.contentDetails?.itemCount || 0,
  })) || [];
}

/**
 * Create a new playlist on YouTube
 */
export async function createPlaylist(
  accessToken: string,
  title: string,
  description?: string,
  privacyStatus: 'public' | 'private' | 'unlisted' = 'public'
) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description: description || '',
      },
      status: {
        privacyStatus,
      },
    },
  });
  
  return {
    id: response.data.id!,
    title: response.data.snippet?.title || title,
  };
}

/**
 * Add a video to a playlist
 */
export async function addVideoToPlaylist(
  accessToken: string,
  playlistId: string,
  videoId: string
) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    },
  });
  
  return response.data;
}

/**
 * Remove a video from a playlist
 */
export async function removeVideoFromPlaylist(
  accessToken: string,
  playlistItemId: string
) {
  const youtube = getYouTubeClient(accessToken);
  
  await youtube.playlistItems.delete({
    id: playlistItemId,
  });
}

/**
 * Check if a video is in a playlist
 */
export async function getVideoPlaylistItem(
  accessToken: string,
  playlistId: string,
  videoId: string
) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.playlistItems.list({
    part: ['id'],
    playlistId,
    videoId,
    maxResults: 1,
  });
  
  return response.data.items?.[0]?.id || null;
}

/**
 * Update channel branding (name and description)
 * Note: Handle cannot be changed via API - it's set during channel creation
 */
export async function updateChannelBranding(
  accessToken: string,
  data: {
    title?: string;
    description?: string;
  }
) {
  const youtube = getYouTubeClient(accessToken);
  
  // Get current channel data
  const current = await youtube.channels.list({
    part: ['snippet', 'brandingSettings'],
    mine: true,
  });
  
  const channel = current.data.items?.[0];
  if (!channel) {
    throw new Error('No channel found');
  }
  
  // Update channel
  const response = await youtube.channels.update({
    part: ['brandingSettings'],
    requestBody: {
      id: channel.id!,
      brandingSettings: {
        channel: {
          title: data.title ?? channel.brandingSettings?.channel?.title,
          description: data.description ?? channel.brandingSettings?.channel?.description,
        },
      },
    },
  });
  
  return response.data;
}

/**
 * Upload/update channel banner (cover photo)
 * Image requirements: 2560 x 1440 px, max 6MB
 */
export async function updateChannelBanner(
  accessToken: string,
  imageBuffer: Buffer,
  mimeType: string
) {
  const youtube = getYouTubeClient(accessToken);
  
  // First upload the banner image
  const uploadResponse = await youtube.channelBanners.insert({
    media: {
      mimeType,
      body: Readable.from(imageBuffer),
    },
  });
  
  const bannerUrl = uploadResponse.data.url;
  if (!bannerUrl) {
    throw new Error('Failed to upload banner image');
  }
  
  // Then set it as the channel banner
  const current = await youtube.channels.list({
    part: ['brandingSettings'],
    mine: true,
  });
  
  const channel = current.data.items?.[0];
  if (!channel) {
    throw new Error('No channel found');
  }
  
  const response = await youtube.channels.update({
    part: ['brandingSettings'],
    requestBody: {
      id: channel.id!,
      brandingSettings: {
        image: {
          bannerExternalUrl: bannerUrl,
        },
      },
    },
  });
  
  return response.data;
}

/**
 * Get full channel branding info
 */
export async function getChannelBranding(accessToken: string) {
  const youtube = getYouTubeClient(accessToken);
  
  const response = await youtube.channels.list({
    part: ['snippet', 'brandingSettings', 'statistics'],
    mine: true,
  });
  
  const channel = response.data.items?.[0];
  if (!channel) {
    throw new Error('No channel found');
  }
  
  return {
    id: channel.id!,
    title: channel.snippet?.title || '',
    description: channel.snippet?.description || '',
    customUrl: channel.snippet?.customUrl || '', // This is the handle like @channelname
    thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || null,
    banner: channel.brandingSettings?.image?.bannerExternalUrl || null,
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
    videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
  };
}
