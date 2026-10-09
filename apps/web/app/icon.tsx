import { RAW_TOKENS } from '@dttm/theme'
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * The tab icon, drawn rather than drawn in: it is generated into an image at build time, which is
 * a renderer that cannot read a stylesheet, so it takes its two colors from the values the theme
 * mirrors for exactly this case.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: RAW_TOKENS.accent,
        borderRadius: 7,
        color: RAW_TOKENS.inkInverse,
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'sans-serif',
      }}
    >
      D
    </div>,
    { ...size }
  )
}
