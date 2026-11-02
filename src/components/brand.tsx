import Link from "next/link";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand site-brand" aria-label="Forma home">
      <span className="brand-mark" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      forma<span className="brand-dot">.</span>
    </Link>
  );
}
