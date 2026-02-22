import { NextRequest, NextResponse } from 'next/server';

export interface ContextHeaders {
  hotelId: string;
  requestId: string;
  domain?: 'PROPERTY' | 'DISTRIBUTION';
  hubId?: string;
  channelCode?: string;
  appKey?: string;
  userId?: string;
}

export function parseContext(req: NextRequest): ContextHeaders | null {
  const hotelId = req.headers.get('x-hotel-id');
  const requestId = req.headers.get('x-request-id');
  const domain = req.headers.get('x-domain') as 'PROPERTY' | 'DISTRIBUTION' | null;

  if (!hotelId) {
    return null;
  }

  return {
    hotelId,
    requestId: requestId || `req-${Date.now()}`, // Auto-generate if not provided
    domain: domain || undefined,
    hubId: req.headers.get('x-hub-id') || undefined,
    channelCode: req.headers.get('x-channel-code') || undefined,
    appKey: req.headers.get('x-app-key') || undefined,
    userId: req.headers.get('x-user-id') || undefined
  };
}

/**
 * Middleware to validate context headers
 * Returns NextResponse with error if validation fails, null if OK
 */
export function validateContext(req: NextRequest): NextResponse | null {
  const hotelId = req.headers.get('x-hotel-id');
  const requestId = req.headers.get('x-request-id');
  const domain = req.headers.get('x-domain');

  if (!hotelId) {
    return NextResponse.json({
      code: 'CONTEXT_INVALID',
      message: 'Header x-hotel-id é obrigatório'
    }, { status: 400 });
  }

  // x-request-id is optional - will be auto-generated if not provided

  // Validação específica por domínio
  if (domain === 'DISTRIBUTION') {
    const channelCode = req.headers.get('x-channel-code');
    const appKey = req.headers.get('x-app-key');

    if (!channelCode) {
      return NextResponse.json({
        code: 'CONTEXT_INVALID',
        message: 'Header x-channel-code é obrigatório para domínio DISTRIBUTION'
      }, { status: 400 });
    }

    if (!appKey) {
      return NextResponse.json({
        code: 'CONTEXT_INVALID',
        message: 'Header x-app-key é obrigatório para domínio DISTRIBUTION'
      }, { status: 400 });
    }
  }

  return null; // Validation passed
}

/**
 * Helper to get context from request with fallback
 */
export function getContext(req: NextRequest): ContextHeaders {
  const context = parseContext(req);
  if (!context) {
    throw new Error('Context headers missing - should have been validated by middleware');
  }
  return context;
}
