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
          position: 'relative',
        }}
      >
        {/* Background gradient blobs */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          {/* Blueprint text logo */}
          <svg
            width="280"
            height="70"
            viewBox="0 0 280 70"
            fill="none"
          >
            {/* B icon */}
            <path
              d="M0 10C0 4.47715 4.47715 0 10 0H50C55.5228 0 60 4.47715 60 10V60C60 65.5228 55.5228 70 50 70H10C4.47715 70 0 65.5228 0 60V10Z"
              fill="#2563EB"
            />
            <path
              d="M18 15H35C40.5228 15 45 19.4772 45 25V25C45 30.5228 40.5228 35 35 35H18V15Z"
              fill="white"
            />
            <path
              d="M18 35H38C43.5228 35 48 39.4772 48 45V45C48 50.5228 43.5228 55 38 55H18V35Z"
              fill="white"
            />
            <path
              d="M18 15V55"
              stroke="white"
              strokeWidth="8"
            />
            {/* Blueprint text */}
            <text
              x="75"
              y="50"
              fill="#3B82F6"
              fontSize="48"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
            >
              Blueprint
            </text>
          </svg>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Plan, Script, and
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
              backgroundClip: 'text',
              color: 'transparent',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Ship Videos Faster
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: '32px',
            fontSize: '24px',
            color: '#9CA3AF',
            textAlign: 'center',
          }}
        >
          The all-in-one creator operating system for YouTube
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '20px',
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
