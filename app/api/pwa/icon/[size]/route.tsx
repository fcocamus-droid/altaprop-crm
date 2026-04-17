import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _request: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = Math.min(Math.max(parseInt(params.size) || 192, 16), 1024)
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.52)
  const letterY = Math.round(size * 0.68)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #004d8f 0%, #003f73 50%, #002d52 100%)',
          borderRadius: radius,
        }}
      >
        {/* Gold horizontal bar at top */}
        <div
          style={{
            position: 'absolute',
            top: Math.round(size * 0.07),
            left: Math.round(size * 0.15),
            right: Math.round(size * 0.15),
            height: Math.round(size * 0.04),
            background: '#ccbd92',
            borderRadius: 99,
            opacity: 0.6,
          }}
        />
        {/* Main letter */}
        <span
          style={{
            color: '#ccbd92',
            fontSize,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial, sans-serif',
            letterSpacing: -2,
            lineHeight: 1,
            marginTop: Math.round(size * 0.04),
          }}
        >
          A
        </span>
        {/* Gold dot bottom-right accent */}
        <div
          style={{
            position: 'absolute',
            bottom: Math.round(size * 0.1),
            right: Math.round(size * 0.12),
            width: Math.round(size * 0.1),
            height: Math.round(size * 0.1),
            background: '#ccbd92',
            borderRadius: '50%',
            opacity: 0.8,
          }}
        />
      </div>
    ),
    { width: size, height: size }
  )
}
