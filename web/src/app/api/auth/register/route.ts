import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';

export async function POST(request: NextRequest) {
    try {
        const authUser = await authService.getUserFromRequest(
            request.headers.get('authorization')
        );

        if (!authUser || authUser.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin only' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, password, name, role } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        const user = await authService.createUser(email, password, name, role);

        return NextResponse.json(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Create user error:', error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
