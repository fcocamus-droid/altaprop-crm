import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003f73', borderRadius: 6 }}>
        <span style={{ color: '#ccbd92', fontSize: 20, fontWeight: 900, fontFamily: 'Arial Black, Arial, sans-serif', lineHeight: 1 }}>A</span>
      </div>
    ),
    { ...size }
  )
}
