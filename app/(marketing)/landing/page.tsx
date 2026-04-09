import Link from 'next/link'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
    title: 'CRM Inmobiliario',
    description: 'Gestiona propiedades, postulantes y visitas desde un solo lugar con herramientas diseñadas para corredores.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    title: 'Publicación Automática',
    description: 'Importa propiedades desde Portal Inmobiliario y publica en tu sitio altaprop.cl automáticamente.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Calendario de Visitas',
    description: 'Programa y gestiona visitas con bloqueo de horarios inteligente para evitar conflictos.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: 'Gestión de Postulaciones',
    description: 'Revisa documentos de postulantes, aprueba o rechaza solicitudes con flujo organizado.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    title: 'Tu Marca, Tu Dominio',
    description: 'Personaliza colores, logo y conecta tu propio dominio para una experiencia profesional.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Notificaciones por Email',
    description: 'Emails automáticos con tu branding para visitas, postulaciones y actualizaciones.',
  },
]

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    price: 19,
    popular: false,
    features: ['1 agente', 'Propiedades ilimitadas', 'CRM básico', 'Soporte por email'],
  },
  {
    name: 'Básico',
    slug: 'basico',
    price: 29,
    popular: false,
    features: ['1 agente', 'Propiedades ilimitadas', 'CRM completo', 'Calendario de visitas', 'Importación automática', 'Soporte por email'],
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 49,
    popular: true,
    features: ['3 agentes', 'Dominio personalizado', 'Importación automática', 'Soporte prioritario', 'Branding personalizado', 'Reportes avanzados'],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 99,
    popular: false,
    features: ['10 agentes', 'API access', 'Onboarding dedicado', 'SLA garantizado', 'Integraciones custom', 'Manager de cuenta'],
  },
]

const testimonials = [
  {
    name: 'Carolina Muñoz',
    role: 'Corredora de Propiedades, Santiago',
    text: 'Altaprop transformó la forma en que gestiono mis arriendos. Antes perdía horas coordinando visitas, ahora todo está automatizado.',
    avatar: 'CM',
  },
  {
    name: 'Roberto Espinoza',
    role: 'Inmobiliaria Espinoza, Viña del Mar',
    text: 'La importación automática desde Portal Inmobiliario nos ahorra al menos 5 horas semanales. El CRM es intuitivo y potente.',
    avatar: 'RE',
  },
  {
    name: 'Patricia Lagos',
    role: 'Lagos Propiedades, Concepción',
    text: 'Mis clientes notan la diferencia. El sitio con mi marca y dominio propio le da una imagen mucho más profesional a mi negocio.',
    avatar: 'PL',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1B2A4A] via-[#243560] to-[#2d4a7a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgydjJoMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Tu inmobiliaria, potenciada con{' '}
              <span className="text-[#C4A962]">tecnología</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              CRM inmobiliario, publicación automática, gestión de visitas y postulaciones.
              Todo lo que necesitas para escalar tu negocio de corretaje en una sola plataforma.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto bg-[#C4A962] text-[#1B2A4A] px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#d4b972] transition shadow-lg"
              >
                Empieza tu prueba gratis
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto border border-white/30 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-white/10 transition"
              >
                Ver demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">14 días gratis. Sin tarjeta de crédito.</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-[#1B2A4A]">3,000+</p>
              <p className="text-sm text-gray-500 mt-1">Propiedades gestionadas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1B2A4A]">500+</p>
              <p className="text-sm text-gray-500 mt-1">Agentes activos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1B2A4A]">98%</p>
              <p className="text-sm text-gray-500 mt-1">Satisfacción de clientes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B2A4A]">
              Todo lo que necesitas para gestionar tu inmobiliaria
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para corredores de propiedades en Chile y Latinoamérica.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-[#1B2A4A]/5 rounded-lg flex items-center justify-center text-[#C4A962] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#1B2A4A] mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B2A4A]">
              Planes simples y transparentes
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Elige el plan que mejor se adapte a tu negocio. Todos incluyen 14 días de prueba gratis.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-[#1B2A4A] text-white ring-4 ring-[#C4A962] scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#C4A962] text-[#1B2A4A] text-xs font-bold px-4 py-1 rounded-full">
                    Más Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold ${plan.popular ? 'text-white' : 'text-[#1B2A4A]'}`}>
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-[#1B2A4A]'}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-gray-300' : 'text-gray-500'}`}>
                    USD/mes
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-[#C4A962]' : 'text-green-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className={plan.popular ? 'text-gray-200' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.slug}`}
                  className={`mt-8 block w-full text-center py-3 rounded-lg text-sm font-semibold transition ${
                    plan.popular
                      ? 'bg-[#C4A962] text-[#1B2A4A] hover:bg-[#d4b972]'
                      : 'bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90'
                  }`}
                >
                  {plan.slug === 'starter' ? 'Suscríbete Ahora' : 'Prueba Gratis 14 días'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1B2A4A]">
              Lo que dicen nuestros clientes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#1B2A4A] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1B2A4A] text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-[#1B2A4A] to-[#243560] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Empieza hoy, los primeros 14 días son gratis
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Sin tarjeta de crédito. Configura tu cuenta en menos de 5 minutos.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block bg-[#C4A962] text-[#1B2A4A] px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#d4b972] transition shadow-lg"
          >
            Comenzar prueba gratis
          </Link>
        </div>
      </section>
    </>
  )
}
