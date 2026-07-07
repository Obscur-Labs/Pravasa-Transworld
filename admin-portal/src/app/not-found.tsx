'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-6 h-6 text-primary-foreground" />
        </div>

        <p className="text-7xl font-bold tracking-tight text-foreground">404</p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
