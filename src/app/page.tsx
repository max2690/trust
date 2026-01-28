import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import HeroButtons from "@/components/HeroButtons";
import HowItWorksTrigger from "@/components/HowItWorksTrigger";
import TakeTaskButton from "@/components/TakeTaskButton";
import CreateTaskButton from "@/components/CreateTaskButton";
import HeroVideo from "@/components/HeroVideo";

export const metadata: Metadata = {
  title: "MB-Trust — первый доверительный маркетинг",
  description:
    "MB-Trust — платформа доверительного (трастового) маркетинга: честные задания в соцсетях, выплаты исполнителям, рост узнаваемости брендов для бизнеса.",
  openGraph: {
    title: "MB-Trust — первый доверительный маркетинг",
    description:
      "Зарабатывай на сарафанном радио или продвигай бренд через реальных людей. Антифрод, верификация, аналитика.",
    url: "http://localhost:3000/",
    siteName: "MB-Trust",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const levels = [
  { name: "Novice", percent: 40, note: "Стартовый уровень" },
  { name: "Verified", percent: 50, note: "Верификация пройдена" },
  { name: "Referral+", percent: 60, note: "Рефералы и активность" },
  { name: "Top", percent: 80, note: "Высший уровень доверия" },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F2F2F2]">
      {/* Санити-тест — показывать только в development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="p-6 mb-4 font-semibold text-center text-black bg-emerald-500 rounded-2xl">
          Tailwind работает ✔
        </div>
      )}
      
      {/* HERO */}
      <section className="flex overflow-hidden relative items-center min-h-screen border-b border-gray-200 border-white/5 dark:border-white/5">
        {/* Фоновое видео */}
        <HeroVideo />

        <div className="relative z-10 px-4 py-16 mx-auto w-full max-w-6xl sm:px-6 sm:py-24">
          <div className="flex flex-col gap-6 items-center text-center">
            {/* Логотип MB-Trust большими буквами */}
            <div className="flex gap-3 items-center mb-4">
              <Image 
                src="/logo/mb-trust-logo.png" 
                alt="MB-Trust" 
                width={180}
                height={48}
                className="w-auto h-12"
                priority
              />
              <span className="text-5xl font-bold bg-gradient-to-r from-[#00E1B4] to-[#00E1B4] bg-clip-text text-transparent tracking-wider">
                MB-TRUST
              </span>
            </div>
            
            <span className="inline-flex gap-2 items-center px-3 py-1 text-sm text-gray-600 rounded-full border border-gray-300 border-white/10 dark:border-white/10 text-white/70 dark:text-white/70">
              <span className="text-[#00E1B4]">•</span> первый доверительный маркетинг
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Реклама, которой{" "}
              <span className="text-[#00E1B4]">доверяют люди</span>
            </h1>
            <p className="max-w-3xl text-base text-gray-600 drop-shadow-lg text-white/90 dark:text-white/90 sm:text-lg">
              MB-Trust — платформа, где бренды размещают задания на продвижение,
              а реальные пользователи публикуют сторис и посты в своих соцсетях,
              получая честные выплаты. Прозрачно. Легально. Эффективно.
            </p>

            <HeroButtons />
          </div>
        </div>
      </section>

      {/* О ПРОЕКТЕ / ТРАСТ-МАРКЕТИНГ */}
      <section className="px-4 py-12 mx-auto max-w-6xl sm:px-6 sm:py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="p-6 rounded-2xl border bg-white/5 border-white/10">
            <h2 className="mb-3 text-xl font-semibold sm:text-2xl">
              Что такое MB-Trust?
            </h2>
            <p className="text-white/80">
              Экосистема доверительного продвижения. Бренды создают задания на
              публикации (сторис, посты, репосты) в соцсетях, а пользователи
              берут их в работу. Мы фиксируем результат, считаем переходы и
              конверсии, защищаем от фрода и обеспечиваем выплаты.
            </p>
          </div>

          <div className="p-6 rounded-2xl border bg-white/5 border-white/10">
            <h2 className="mb-3 text-xl font-semibold sm:text-2xl">
              Трастовый маркетинг и сила сарафанного радио
            </h2>
            <ul className="space-y-2 text-white/85">
              <li>• Люди доверяют людям, а не баннерам и таргету.</li>
              <li>• Рекомендация знакомого повышает конверсию в 2–5 раз.</li>
              <li>• Платёж за реальные публикации и переходы, а не «показы».</li>
              <li>• Верификация, антифрод и понятная аналитика.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ДЛЯ ИСПОЛНИТЕЛЕЙ */}
      <section id="executor-section" className="border-t bg-white/5 border-white/5">
        <div className="px-4 py-12 mx-auto max-w-6xl sm:px-6 sm:py-16">
          <div className="grid gap-10 items-start lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-2xl font-semibold">Исполнителям</h3>
              <p className="mb-5 text-white/80">
                Публикуйте задания и получайте до{" "}
                <span className="text-[#00E1B4] font-semibold">80%</span> от
                стоимости. Чем выше доверие — тем больше доход.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {levels.map((l) => (
                  <div
                    key={l.name}
                    className="p-4 text-center rounded-xl border bg-white/5 border-white/10"
                  >
                    <div className="text-sm text-white/70">{l.name}</div>
                    <div className="text-2xl font-bold">{l.percent}%</div>
                    <div className="text-xs text-white/60">{l.note}</div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-white/85">
                При активной работе на нескольких площадках реально
                зарабатывать{" "}
                <span className="font-semibold text-[#FFD65A]">
                  50 000 ₽ и больше в месяц
                </span>
                . Выплаты — по модели самозанятых (легально и прозрачно).
              </p>

              <div className="flex gap-3 mt-6">
                <Link
                  href="/auth/signup?role=executor"
                  className="rounded-xl bg-[#00E1B4] text-[#0B0B0F] px-5 py-3 font-semibold hover:brightness-110 transition-all duration-200 ease-out"
                >
                  Стать исполнителем
                </Link>
                <HowItWorksTrigger />
                <TakeTaskButton />
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-white/5 border-white/10">
              <h4 className="mb-3 font-semibold">Пример дохода</h4>
              <ul className="space-y-2 text-white/85">
                <li>• Цена одной сторис: 100 ₽</li>
                <li>• В день: 10 сторис × 3 площадки = 30 публикаций</li>
                <li>• Уровень TOP (80%): 30 × 100 × 0.8 = 2 400 ₽/день</li>
                <li>• Месяц (30 дней): ≈ 72 000 ₽ брутто*</li>
              </ul>
              <p className="mt-3 text-xs text-gray-400 text-white/60 dark:text-white/60">
                *Факт зависит от доступных заданий и лимитов/уровня.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ДЛЯ БИЗНЕСА */}
      <section id="business-section" className="px-4 py-12 mx-auto max-w-6xl sm:px-6 sm:py-16">
        <div className="p-6 rounded-2xl border bg-white/5 border-white/10">
          <h3 className="mb-3 text-2xl font-semibold">Бизнесу</h3>
          <p className="mb-4 text-white/85">
            Сделайте бренд более узнаваемым: заявляйте о себе через
            сарафанное радио. Запустите кампанию за 5 минут — задания увидят
            сотни реальных людей, а вы получите статистику по переходам и лидам.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-[#00E1B4] font-semibold">Ниже CPL</div>
              <div className="text-sm text-white/70">
                Цена за лид на 30–50% ниже таргета и закупа у блогеров.
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-[#00E1B4] font-semibold">Доверие</div>
              <div className="text-sm text-white/70">
                Рекомендации реальных людей конвертят лучше баннеров.
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-[#00E1B4] font-semibold">Антифрод</div>
              <div className="text-sm text-white/70">
                Верификация, лимиты, AI-проверки и отчётность.
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-[#00E1B4] font-semibold">Контроль</div>
              <div className="text-sm text-white/70">
                Гибкие кампании: неделя, две, разовые посты, QR и UTM.
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link
              href="/auth/signup?role=customer"
              className="rounded-xl bg-[#00E1B4] text-[#0B0B0F] px-5 py-3 font-semibold hover:brightness-110 transition-all duration-200 ease-out"
            >
              Зарегистрировать бизнес
            </Link>
            <CreateTaskButton />
          </div>
        </div>
      </section>

      {/* РЕКВИЗИТЫ */}
      <section className="border-t bg-white/3 border-white/5">
        <div className="px-4 py-12 mx-auto max-w-6xl sm:px-6 sm:py-16">
          <h3 className="mb-4 text-2xl font-semibold">Реквизиты компании</h3>

          <div className="grid gap-4 text-gray-600 sm:grid-cols-2 lg:grid-cols-3 text-white/85 dark:text-white/85">
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">Организация</div>
              <div className="font-semibold">ООО «МБ-ТРАСТ»</div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">ИНН / ОГРН</div>
              <div className="font-semibold">ИНН 0000000000 • ОГРН 0000000000000</div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">Юр. адрес</div>
              <div className="font-semibold">000000, г. Город, ул. Улица, д. 1</div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">Р/с, Банк, БИК</div>
              <div className="font-semibold">Р/с 40702… • ПАО «Пример» • БИК 044525000</div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">Поддержка</div>
              <div className="font-semibold">support@mb-trust.example • +7 (000) 000-00-00</div>
            </div>
            <div className="p-4 rounded-xl border bg-white/5 border-white/10">
              <div className="text-sm text-white/60">Время работы</div>
              <div className="font-semibold">Пн–Пт, 10:00–19:00 (МСК)</div>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-400 text-white/50 dark:text-white/50">
            *Замените данные на фактические реквизиты перед запуском.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 border-white/10 dark:border-white/10">
        <div className="flex flex-col gap-3 justify-between items-center px-4 py-10 mx-auto max-w-6xl sm:px-6 sm:flex-row">
          <div className="text-sm text-gray-500 text-white/60 dark:text-white/60">
            © {new Date().getFullYear()} MB-Trust. Все права защищены.
          </div>
          <div className="flex gap-3">
            <Link
              href="/privacy"
              className="text-sm transition text-white/70 hover:text-white"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/terms"
              className="text-sm transition text-white/70 hover:text-white"
            >
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}