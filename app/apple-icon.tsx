import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#004d8f,#003f73,#002d52)', borderRadius: 36 }}>
        <span style={{ color: '#ccbd92', fontSize: 110, fontWeight: 900, fontFamily: 'Arial Black, Arial, sans-serif', lineHeight: 1 }}>A</span>
      </div>
    ),
    { ...size }
  )
}
