import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Simple in-memory cache to reduce API calls
// Cache entries expire after 10 minutes
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedResult(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key); // Clean up expired entry
  return null;
}

function setCachedResult(key: string, data: any) {
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  console.log("=== YouTube Search API called ===");
  console.log("YOUTUBE_API_KEY exists:", !!YOUTUBE_API_KEY);
  console.log("YOUTUBE_API_KEY length:", YOUTUBE_API_KEY?.length || 0);
  
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const maxResults = searchParams.get("maxResults") || "10";
  const videoDuration = searchParams.get("videoDuration"); // 'short' for <60s, 'long' for >4min, 'medium' for 4-20min

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured!");
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 });
  }

  // Check cache first
  const cacheKey = `${query.toLowerCase().trim()}_${maxResults}_${videoDuration || 'any'}`;
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    return NextResponse.json(cachedResult);
  }

  try {
    // Add videoDuration parameter if specified
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    if (videoDuration) {
      url += `&videoDuration=${videoDuration}`;
    }
    url += `&key=${YOUTUBE_API_KEY}`;
    
    console.log("Fetching YouTube API:", url.replace(YOUTUBE_API_KEY!, "***API_KEY***"));
    
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      console.error("YouTube API error response:", JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.error?.message || "YouTube API error" }, { status: response.status });
    }

    const data = await response.json();

    // Transform the response to only include what we need
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelThumbnail: item.snippet.thumbnails.default?.url,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

    const result = { videos };
    
    // Cache the result
    setCachedResult(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("YouTube search error:", error);
    return NextResponse.json({ error: "Failed to search YouTube" }, { status: 500 });
  }
}
