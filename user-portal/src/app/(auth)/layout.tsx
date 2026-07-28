// Login/register are client-only and token-aware; prerendering them serves a
// stale shell that redirects a beat later. Keep the group fully dynamic.
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
