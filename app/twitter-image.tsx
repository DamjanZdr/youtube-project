import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Blueprint - The all-in-one creator OS';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0b',
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#2563EB',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
              fontSize: 32,
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            B
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#3B82F6',
            }}
          >
            Blueprint
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: 'white',
              marginBottom: 8,
            }}
          >
            Plan, Script, and
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: '#3B82F6',
            }}
          >
            Ship Videos Faster
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 32,
            fontSize: 24,
            color: '#9CA3AF',
          }}
        >
          The all-in-one creator operating system for YouTube
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#6B7280',
          }}
        >
          myblueprint.studio
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
