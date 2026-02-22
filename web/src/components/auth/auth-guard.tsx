'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Skip auth check for login page
        if (pathname === '/admin/login') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/admin/login');
            setIsLoading(false);
        } else {
            setIsAuthenticated(true);
            setIsLoading(false);
        }
    }, [pathname, router]);

    // Always render on login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show nothing while checking auth (prevents hydration mismatch)
    if (isLoading || !isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
