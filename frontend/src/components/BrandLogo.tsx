interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-8 w-8" }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="15" fill="#1D1D1F" />
      <circle cx="32" cy="32" r="20" stroke="#FFFFFF" strokeOpacity="0.24" strokeWidth="2" />
      <circle cx="32" cy="32" r="11.5" stroke="#FFFFFF" strokeWidth="2.4" />
      <path d="M32 9V16M32 48V55M9 32H16M48 32H55" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#0A84FF" />
    </svg>
  );
}
