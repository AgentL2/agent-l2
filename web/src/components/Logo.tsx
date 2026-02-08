import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 48, className = '' }: LogoProps) {
  // Logo aspect ratio is 500:333 (3:2)
  const height = Math.round(size * (333 / 500));
  
  return (
    <Image
      src="/logo.svg"
      alt="AgentL2 Logo"
      width={size}
      height={height}
      className={`object-contain ${className}`}
      priority
      unoptimized
    />
  );
}
