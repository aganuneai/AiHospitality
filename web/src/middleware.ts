import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseContext, validateContext } from './lib/context/context';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Proteger rotas Administrativas (Interface)
    if (pathname.startsWith('/admin')) {
        // Permitir acesso à tela de login sem token
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            console.log(`[Security] Unauthorized access attempt to ${pathname}. Redirecting to login.`);
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        return NextResponse.next();
    }

    // 2. Proteger rotas de API
    if (pathname.startsWith('/api/v1')) {
        console.log(`[Middleware] Incoming API request: ${request.method} ${pathname}`);

        // Rotas públicas de API
        if (pathname.endsWith('/health') || pathname.startsWith('/api/v1/admin/login')) {
            return NextResponse.next();
        }

        // Para APIs internas do admin dentro de v1
        if (pathname.startsWith('/api/v1/admin')) {
            const token = request.cookies.get('auth_token')?.value;
            if (!token) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Validação de contexto legada (se aplicável)
        const validationError = validateContext(request);
        if (validationError) {
            return validationError;
        }

        const context = parseContext(request);
        if (!context) {
            return NextResponse.json(
                { code: 'CONTEXT_INVALID', message: 'Invalid Context Envelope headers.' },
                { status: 400 }
            );
        }

        const response = NextResponse.next();
        response.headers.set('x-context-validated', 'true');
        response.headers.set('x-request-id', context.requestId);

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
};
