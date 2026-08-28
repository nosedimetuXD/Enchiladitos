import React from 'react'

export function EnchiladitosPattern({ className = '', opacity = 0.9 }) {
  return (
    <svg
      viewBox="0 0 800 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full object-cover pointer-events-none ${className}`}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background: Deep Warm Tone */}
      <rect width="800" height="500" fill="#7f1d1d" />

      {/* Fiery Chili Red Wave (#dc2626) */}
      <path
        d="M-20,120 C80,40 140,190 220,130 C300,70 330,-10 420,50 C510,110 470,220 540,260 C610,300 720,190 820,230 L820,-20 L-20,-20 Z"
        fill="#dc2626"
        opacity="0.85"
      />

      {/* Dark Chamoy (#450a0a) organic wave layer */}
      <path
        d="M-30,340 C90,260 110,430 240,360 C370,290 340,490 490,440 C640,390 690,480 830,410 L830,520 L-30,520 Z"
        fill="#450a0a"
      />

      {/* Spicy Orange (#ea580c) flame ribbons */}
      <path
        d="M100,0 C170,80 120,220 200,240 C280,260 360,140 430,210 C500,280 430,390 530,420 C630,450 710,340 780,390 L820,0 Z"
        fill="#ea580c"
        opacity="0.9"
      />

      {/* Golden Tajín Yellow (#f59e0b) smooth swirls */}
      <path
        d="M60,190 C120,160 160,260 220,250 C280,240 310,130 380,180 C450,230 460,330 550,340 C640,350 720,260 790,300 C810,310 820,330 820,260 C750,210 650,260 580,210 C510,160 480,70 400,60 C320,50 280,160 210,170 C140,180 110,120 60,190 Z"
        fill="#f59e0b"
        opacity="0.8"
      />

      {/* Spicy Flare droplets */}
      <circle cx="150" cy="180" r="18" fill="#dc2626" />
      <circle cx="390" cy="270" r="22" fill="#ea580c" />
      <circle cx="670" cy="240" r="20" fill="#f59e0b" />
      <circle cx="490" cy="80" r="24" fill="#dc2626" />
      <circle cx="260" cy="380" r="22" fill="#ea580c" />

      <circle cx="150" cy="180" r="8" fill="#fbbf24" />
      <circle cx="390" cy="270" r="10" fill="#fbbf24" />
      <circle cx="670" cy="240" r="9" fill="#dc2626" />
      <circle cx="490" cy="80" r="11" fill="#f59e0b" />
      <circle cx="260" cy="380" r="10" fill="#f59e0b" />
    </svg>
  )
}

// Backward compatibility export
export const ToffeeMarblePattern = EnchiladitosPattern
