interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-10 w-10" }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#0066CC" />
      <circle cx="32" cy="32" r="20" stroke="#BFDBFE" strokeWidth="2.2" strokeDasharray="4 4" />
      <circle cx="32" cy="32" r="12.5" stroke="#FFFFFF" strokeWidth="2.8" />
      <path d="M32 8V16M32 48V56M8 32H16M48 32H56" stroke="#DBEAFE" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.8" fill="#FFFFFF" />
    </svg>
  );
}
