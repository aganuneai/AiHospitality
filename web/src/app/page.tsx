import Link from 'next/link';
import { Calendar, LayoutDashboard, FileText, ArrowRight, CheckCircle, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 px-6 py-20 text-white sm:py-32">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Sistema Completo de
              <br />
              <span className="bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">
                Gestão Hoteleira
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              Plataforma moderna para reservas online e gerenciamento de propriedades hoteleiras.
              API REST completa, interface intuitiva e 100% em português.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Link href="/booking">
                  <Calendar className="mr-2 h-5 w-5" />
                  Fazer Reserva
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                <Link href="/admin/reservations">
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Dashboard PMS
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white px-6 py-24 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Funcionalidades Principais
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Tudo que você precisa para gerenciar seu hotel em uma única plataforma
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Booking Engine */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                Reservas Online
              </h3>
              <p className="mb-4 text-slate-600 dark:text-slate-300">
                Motor de reservas moderno com busca de disponibilidade, cotações em tempo real e confirmação instantânea.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Acessar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* Dashboard PMS */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 inline-flex rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
                <LayoutDashboard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                Dashboard PMS
              </h3>
              <p className="mb-4 text-slate-600 dark:text-slate-300">
                Gerenciamento completo de reservas com filtros, busca avançada e cancelamento inline.
              </p>
              <Link
                href="/admin/reservations"
                className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400"
              >
                Acessar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* API Docs */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3 dark:bg-purple-900/20">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                API REST
              </h3>
              <p className="mb-4 text-slate-600 dark:text-slate-300">
                Documentação interativa Swagger com 6 endpoints, exemplos e playground de testes.
              </p>
              <Link
                href="/api-docs"
                className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                Explorar API
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-50 px-6 py-24 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Por que AiHospitality?
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Tecnologia de ponta para otimizar suas operações hoteleiras
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">100% em Português</h3>
                    <p className="text-slate-600 dark:text-slate-300">Interface e mensagens completamente traduzidas para PT-BR</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Performance Otimizada</h3>
                    <p className="text-slate-600 dark:text-slate-300">Cache LRU com 70% de redução em queries ao banco de dados</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Seguro e Confiável</h3>
                    <p className="text-slate-600 dark:text-slate-300">Rate limiting, validação Zod e tratamento robusto de erros</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-4xl font-bold text-blue-600">6</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Endpoints REST</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-4xl font-bold text-green-600">100%</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Type-safe TypeScript</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-4xl font-bold text-purple-600">70%</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">Redução em queries (cache)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pronto para começar?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Experimente agora o sistema completo de gestão hoteleira
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              <Link href="/booking">
                Fazer uma Reserva
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Link href="/api-docs">
                Ver Documentação
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-12 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">AiHospitality</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Sistema completo de gestão hoteleira desenvolvido com Next.js 14 e TypeScript.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Navegação</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li><Link href="/booking" className="hover:text-blue-600">Reservas</Link></li>
                <li><Link href="/admin/reservations" className="hover:text-blue-600">Dashboard</Link></li>
                <li><Link href="/api-docs" className="hover:text-blue-600">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Recursos</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li><a href="https://github.com" className="hover:text-blue-600">GitHub</a></li>
                <li><Link href="/api-docs" className="hover:text-blue-600">Documentação</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-slate-600 dark:text-slate-300">
            © 2026 AiHospitality. Desenvolvido com ❤️
          </div>
        </div>
      </footer>
    </div>
  );
}
