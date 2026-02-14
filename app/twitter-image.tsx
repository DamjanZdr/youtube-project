import { ImageResponse } from 'next/og';

// Force cache invalidation v2
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
        {/* Logo */}
        <img
          src="https://myblueprint.studio/bplogo.png"
          alt="Blueprint"
          width={280}
          height={70}
          style={{
            marginBottom: 40,
          }}
        />

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
            Turn Your Video Ideas
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            Into a Clear Plan
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
          Stop starting videos without direction
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
