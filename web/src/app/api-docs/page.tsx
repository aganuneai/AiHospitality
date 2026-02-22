'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="border-b bg-slate-50 px-6 py-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    📚 AiHospitality - Documentação da API
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                    Documentação interativa da API REST - 100% PT-BR
                </p>
            </div>
            <div className="p-4" id="swagger-ui">
                <SwaggerUI url="/api/docs" />
            </div>
        </div>
    );
}
