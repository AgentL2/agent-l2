import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="AgentL2 Logo"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      priority
    />
  );
}
