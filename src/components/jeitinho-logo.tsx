export function JeitinhoLogo({ className = "h-8 w-auto", alt = "JEITINHO" }: { className?: string; alt?: string }) {
  return (
    <svg className={className} viewBox="0 0 900 190" role="img" aria-label={alt} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid meet">
      <title>{alt}</title>
      <text x="0" y="145" fill="currentColor" fontFamily="Georgia, 'Times New Roman', serif" fontSize="128" fontWeight="400" letterSpacing="3">JEITINHO</text>
      <text x="748" y="145" fill="currentColor" fontFamily="Georgia, 'Times New Roman', serif" fontSize="52" fontWeight="400" letterSpacing="2">BR</text>
    </svg>
  );
}
