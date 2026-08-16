import React from 'react'

export function ToffeeMarblePattern({ className = '', opacity = 0.9 }) {
  return (
    <svg
      viewBox="0 0 800 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full object-cover pointer-events-none ${className}`}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background: Beige #D4B28E */}
      <rect width="800" height="500" fill="#D4B28E" />

      {/* Deep Chocolate (#432414) fluid wave loops & droplets */}
      <path
        d="M-20,120 C80,40 140,190 220,130 C300,70 330,-10 420,50 C510,110 470,220 540,260 C610,300 720,190 820,230 L820,-20 L-20,-20 Z"
        fill="#432414"
      />

      {/* Dark Espresso (#47241E) organic wave layer */}
      <path
        d="M-30,340 C90,260 110,430 240,360 C370,290 340,490 490,440 C640,390 690,480 830,410 L830,520 L-30,520 Z"
        fill="#47241E"
      />

      {/* Toffee (#9F6839) fluid ribbons */}
      <path
        d="M100,0 C170,80 120,220 200,240 C280,260 360,140 430,210 C500,280 430,390 530,420 C630,450 710,340 780,390 L820,0 Z"
        fill="#9F6839"
        opacity="0.9"
      />

      {/* Light Caramel (#DABA8C) smooth swirls */}
      <path
        d="M60,190 C120,160 160,260 220,250 C280,240 310,130 380,180 C450,230 460,330 550,340 C640,350 720,260 790,300 C810,310 820,330 820,260 C750,210 650,260 580,210 C510,160 480,70 400,60 C320,50 280,160 210,170 C140,180 110,120 60,190 Z"
        fill="#DABA8C"
      />

      {/* Crema (#FEE4D7) soft swirls & fluid highlights */}
      <path
        d="M-10,480 C110,430 160,520 290,480 C420,440 450,510 590,490 C730,470 780,510 820,480 L820,510 L-10,510 Z"
        fill="#FEE4D7"
        opacity="0.8"
      />

      {/* Chocolate fluid droplets */}
      <circle cx="150" cy="180" r="22" fill="#432414" />
      <circle cx="390" cy="270" r="28" fill="#432414" />
      <circle cx="670" cy="240" r="26" fill="#432414" />
      <circle cx="490" cy="80" r="32" fill="#432414" />
      <circle cx="260" cy="380" r="30" fill="#432414" />

      {/* Toffee (#9F6839) nested droplets */}
      <circle cx="150" cy="180" r="13" fill="#9F6839" />
      <circle cx="390" cy="270" r="16" fill="#9F6839" />
      <circle cx="670" cy="240" r="15" fill="#9F6839" />
      <circle cx="490" cy="80" r="18" fill="#9F6839" />
      <circle cx="260" cy="380" r="18" fill="#9F6839" />

      {/* Light Caramel (#DABA8C) and Espresso (#47241E) accent dots */}
      <circle cx="560" cy="150" r="18" fill="#DABA8C" />
      <circle cx="730" cy="120" r="14" fill="#47241E" />
      <circle cx="80" cy="310" r="16" fill="#DABA8C" />
      <circle cx="320" cy="460" r="24" fill="#9F6839" />
    </svg>
  )
}
