export function JeitinhoLogo({ className = "h-8 w-auto", alt = "JEITINHO" }: { className?: string; alt?: string }) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" role="img" aria-label={alt} xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="none" />
      <g fill="none" stroke="currentColor" strokeWidth="5">
        <path d="M135 635C210 635 253 597 253 526V389" />
        <path d="M253 389H171" />
        <path d="M171 389C171 442 201 470 246 470" />
        <path d="M319 389V548C319 603 350 635 399 635C447 635 479 603 479 548V389" />
        <path d="M420 319C434 294 461 281 490 281" />
        <path d="M542 389V635" />
        <path d="M542 389L691 635" />
        <path d="M691 635V389" />
        <path d="M751 389V635" />
        <path d="M751 389L891 635V389" />
      </g>
      <text x="735" y="750" fill="currentColor" fontFamily="Georgia, serif" fontSize="84" letterSpacing="10">BR</text>
    </svg>
  );
}
