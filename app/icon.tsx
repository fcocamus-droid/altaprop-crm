import { ImageResponse } from 'next/og'

export const size        = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: '14px',
        }}
      >
        <span
          style={{
            fontSize: 44,
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
