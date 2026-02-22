export default function FinancePage() {
    return (
        <div className="flex h-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                >
                    <line x1="12" x2="12" y1="2" y2="22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Módulo Financeiro</h1>
            <p className="mt-2 text-muted-foreground max-w-md">
                Gestão de pagamentos, fluxo de caixa e conciliação bancária estarão disponíveis nesta seção.
            </p>
        </div>
    );
}
