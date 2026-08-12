import React from "react";

interface MorphingInfinityProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function MorphingInfinity({
  className = "w-6 h-6",
  ...props
}: MorphingInfinityProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <style>
        {`
          .morphing-infinity-path {
            stroke-dasharray: 60 120;
            stroke-dashoffset: 0;
            animation: morphing-infinity-draw 1.8s ease-in-out infinite;
          }
          @keyframes morphing-infinity-draw {
            0% {
              stroke-dashoffset: 180;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
      <path
        className="morphing-infinity-path"
        d="M 6.5 12 c -2.5 0 -4.5 -2 -4.5 -4.5 s 2 -4.5 4.5 -4.5 s 4.5 4.5 7.5 9 s 7 4.5 7.5 4.5 s 4.5 -2 4.5 -4.5 s -2 -4.5 -4.5 -4.5 s -4.5 4.5 -7.5 9 s -7 4.5 -7.5 4.5"
      />
    </svg>
  );
}
