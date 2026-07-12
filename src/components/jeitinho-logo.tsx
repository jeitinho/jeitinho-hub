import logoAsset from "@/assets/jeitinho-logo.png.asset.json";

export function JeitinhoLogo({ className = "h-8 w-auto", alt = "JEITINHO" }: { className?: string; alt?: string }) {
  return <img src={logoAsset.url} alt={alt} className={className} />;
}