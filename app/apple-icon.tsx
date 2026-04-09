import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a2332',
          borderRadius: '40px',
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#c9a84c',
            lineHeight: 1,
            fontFamily: 'Georgia, serif',
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size }
  )
}
