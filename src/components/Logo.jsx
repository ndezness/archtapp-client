export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ArchtApp logo">
      <rect width="64" height="64" rx="14" fill="#F2B705" />
      <path
        d="M14 51 L32 13 L50 51"
        fill="none"
        stroke="#3B2A1E"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23 39 H41" fill="none" stroke="#3B2A1E" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}