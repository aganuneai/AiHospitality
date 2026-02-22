/**
 * Partner Onboarding Portal
 * 
 * Self-service portal for channel partners to:
 * - Register and get API credentials
 * - Configure channel settings
 * - Test API integration
 * - View documentation
 */

'use client';

import { useState } from 'react';

/**
 * Partner application
 */
interface PartnerApplication {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    channelType: 'OTA' | 'METASEARCH' | 'GDS' | 'DIRECT' | 'OTHER';
    estimatedVolume: string;
    description: string;
}

/**
 * API credentials
 */
interface APICredentials {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    environment: 'sandbox' | 'production';
}

/**
 * Partner Onboarding Portal Component
 */
export default function PartnerOnboardingPortal() {
    const [step, setStep] = useState<'apply' | 'configure' | 'test' | 'complete'>('apply');
    const [application, setApplication] = useState<Partial<PartnerApplication>>({});
    const [credentials, setCredentials] = useState<APICredentials | null>(null);
    const [testResult, setTestResult] = useState<any>(null);

    /**
     * Submit partner application
     */
    const submitApplication = async () => {
        // In production, submit to backend
        console.log('Submitting application:', application);

        // Mock credentials generation
        const mockCredentials: APICredentials = {
            clientId: `client_${Date.now()}`,
            clientSecret: `secret_${Math.random().toString(36).substring(7)}`,
            apiKey: `key_${Math.random().toString(36).substring(7)}`,
            environment: 'sandbox'
        };

        setCredentials(mockCredentials);
        setStep('configure');
    };

    /**
     * Test API connection
     */
    const testConnection = async () => {
        setTestResult({ loading: true });

        try {
            // Mock API test
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTestResult({
                success: true,
                message: 'Connection successful!',
                details: {
                    latency: '142ms',
                    endpoint: 'https://api.aihospitality.com/api/v1/health',
                    status: 200
                }
            });

            setTimeout(() => setStep('complete'), 1500);
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Connection failed',
                error: 'Could not reach API endpoint'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Partner Onboarding Portal
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300">
                        Get started with AiHospitality API in minutes
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center space-x-4">
                        {['Apply', 'Configure', 'Test', 'Complete'].map((label, idx) => {
                            const stepKeys = ['apply', 'configure', 'test', 'complete'];
                            const currentIdx = stepKeys.indexOf(step);
                            const isActive = idx === currentIdx;
                            const isComplete = idx < currentIdx;

                            return (
                                <div key={label} className="flex items-center">
                                    <div
                                        className={`
                                            flex items-center justify-center w-10 h-10 rounded-full
                                            ${isComplete ? 'bg-green-500 text-white' : ''}
                                            ${isActive ? 'bg-blue-500 text-white' : ''}
                                            ${!isActive && !isComplete ? 'bg-slate-300 text-slate-600' : ''}
                                        `}
                                    >
                                        {isComplete ? '✓' : idx + 1}
                                    </div>
                                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                                        {label}
                                    </span>
                                    {idx < 3 && (
                                        <div className={`w-12 h-0.5 mx-2 ${isComplete ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">

                    {/* Step 1: Apply */}
                    {step === 'apply' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Apply for API Access
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                        value={application.companyName || ''}
                                        onChange={(e) => setApplication({ ...application, companyName: e.target.value })}
                                        placeholder="e.g., Acme Travel OTA"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Contact Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                            value={application.contactName || ''}
                                            onChange={(e) => setApplication({ ...application, contactName: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                            value={application.contactEmail || ''}
                                            onChange={(e) => setApplication({ ...application, contactEmail: e.target.value })}
                                            placeholder="john@acme.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Channel Type *
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                        value={application.channelType || ''}
                                        onChange={(e) => setApplication({ ...application, channelType: e.target.value as any })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="OTA">OTA (Online Travel Agency)</option>
                                        <option value="METASEARCH">Metasearch</option>
                                        <option value="GDS">GDS (Global Distribution System)</option>
                                        <option value="DIRECT">Direct Channel</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Estimated Monthly Volume
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                        value={application.estimatedVolume || ''}
                                        onChange={(e) => setApplication({ ...application, estimatedVolume: e.target.value })}
                                        placeholder="e.g., 1,000 bookings/month"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tell us about your integration
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                                        rows={4}
                                        value={application.description || ''}
                                        onChange={(e) => setApplication({ ...application, description: e.target.value })}
                                        placeholder="Describe your use case..."
                                    />
                                </div>

                                <button
                                    onClick={submitApplication}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Submit Application
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configure */}
                    {step === 'configure' && credentials && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                API Credentials
                            </h2>

                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                                <p className="text-green-800 dark:text-green-200">
                                    ✓ Application approved! Your API credentials are ready.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Client ID
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-l-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-mono text-sm"
                                            value={credentials.clientId}
                                            readOnly
                                        />
                                        <button className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-r-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Client Secret
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="password"
                                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-l-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-mono text-sm"
                                            value={credentials.clientSecret}
                                            readOnly
                                        />
                                        <button className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-r-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                            Show
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        ⚠️ Store securely. This will only be shown once.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        API Key
                                    </label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-l-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-mono text-sm"
                                            value={credentials.apiKey}
                                            readOnly
                                        />
                                        <button className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-r-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Environment
                                    </label>
                                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <span className="inline-block px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm font-semibold">
                                            SANDBOX
                                        </span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                            Use sandbox for testing. Request production access after successful integration.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep('test')}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Continue to Testing
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Test */}
                    {step === 'test' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Test Your Integration
                            </h2>

                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                        Quick Test
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                        Click the button below to test your API connection.
                                    </p>

                                    <button
                                        onClick={testConnection}
                                        disabled={testResult?.loading}
                                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors"
                                    >
                                        {testResult?.loading ? 'Testing...' : 'Run Connection Test'}
                                    </button>

                                    {testResult && !testResult.loading && (
                                        <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                            <p className={`font-semibold ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                                {testResult.success ? '✓' : '✗'} {testResult.message}
                                            </p>
                                            {testResult.details && (
                                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                    <p>Latency: {testResult.details.latency}</p>
                                                    <p>Endpoint: {testResult.details.endpoint}</p>
                                                    <p>Status: {testResult.details.status}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                        Resources
                                    </h3>
                                    <ul className="space-y-2">
                                        <li>
                                            <a href="/api-docs" className="text-blue-500 hover:underline">
                                                📖 API Documentation
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/docs/postman" className="text-blue-500 hover:underline">
                                                📦 Postman Collection
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/docs/guides" className="text-blue-500 hover:underline">
                                                📚 Integration Guides
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/support" className="text-blue-500 hover:underline">
                                                💬 Developer Support
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {step === 'complete' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl text-white">✓</span>
                            </div>

                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                You're All Set!
                            </h2>

                            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                                Your API integration is ready. Start building amazing experiences!
                            </p>

                            <div className="space-y-4">
                                <a
                                    href="/dashboard"
                                    className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Go to Dashboard
                                </a>

                                <a
                                    href="/api-docs"
                                    className="block w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    View API Docs
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
