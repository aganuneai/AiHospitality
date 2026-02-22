export default function GuestsPage() {
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Hóspedes</h1>
            <p className="mt-2 text-muted-foreground max-w-md">
                Este módulo está em desenvolvimento. Em breve você poderá gerenciar perfis, histórico e preferências dos hóspedes aqui.
            </p>
        </div>
    );
}
