import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: 'transparent',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Hive Logo */}
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M13.5 6.5L19.5 10V17L13.5 20.5L7.5 17V10L13.5 6.5Z"
                        fill="#F59E0B"
                    />
                    <path
                        d="M26.5 6.5L32.5 10V17L26.5 20.5L20.5 17V10L26.5 6.5Z"
                        fill="#EAB308"
                    />
                    <path
                        d="M20 17.5L26 21V28L20 31.5L14 28V21L20 17.5Z"
                        fill="#F97316"
                    />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    )
}
