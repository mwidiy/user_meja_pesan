'use client';

export default function ArIconRGB() {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        }}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '100%',
                    height: '100%',
                    filter: 'drop-shadow(0 0 4px rgba(66, 133, 244, 0.5))'
                }}
            >
                <defs>
                    <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285F4">
                            <animate attributeName="stop-color" values="#4285F4; #9B72CB; #D96570; #4285F4" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stopColor="#9B72CB">
                            <animate attributeName="stop-color" values="#9B72CB; #D96570; #4285F4; #9B72CB" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#D96570">
                            <animate attributeName="stop-color" values="#D96570; #4285F4; #9B72CB; #D96570" dur="3s" repeatCount="indefinite" />
                        </stop>
                    </linearGradient>
                </defs>

                {/* 3D Cube / AR Box Shape */}
                <path
                    d="M12 3.5L3 8.5V17.5L12 22.5L21 17.5V8.5L12 3.5Z"
                    stroke="url(#gemini-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 22.5V13"
                    stroke="url(#gemini-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 13L21 8.5"
                    stroke="url(#gemini-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 13L3 8.5"
                    stroke="url(#gemini-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Inner 'AR' Text simulated or small detail (optional, keeping it simple clean cube for now as requested 'vector') */}
            </svg>
        </div>
    );
}
