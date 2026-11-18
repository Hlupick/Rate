import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Конфиденциальность',
  description: 'Какие данные Rate хранит и как их удалить.',
}

const CONTACT = process.env.CONTACT_EMAIL ?? 'support@monah.local'

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 md:px-6">
      <div className="pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Документы
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
          Политика конфиденциальности
        </h1>
        <p className="mt-2 text-sm text-muted">
          Мы храним минимум данных, необходимых для работы сайта. Никакой аналитики и трекеров.
        </p>
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Какие данные хранятся</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>E-mail, имя пользователя, отображаемое имя и хеш пароля (bcrypt).</li>
            <li>Загруженные треки, обложки и метаданные файлов.</li>
            <li>Плейлисты, лайки и история прослушиваний (для «Недавно слушали» и счётчиков).</li>
            <li>Технические журналы запросов на сервере — для диагностики и защиты от абуза.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Cookies</h2>
          <p>
            Используется одна служебная cookie сессии: httpOnly, SameSite=Lax, срок 30 дней. Она
            нужна только для входа и не используется для рекламы или слежки.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Кому передаются данные</h2>
          <p>
            Никому. Сайт работает на собственном сервере, без внешних аналитических сервисов и
            рекламных сетей. Резервные копии хранятся на том же сервере и в приватном облаке
            владельца.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Удаление данных</h2>
          <p>
            Вы можете удалить свои треки в разделе «Мои загрузки». Чтобы удалить аккаунт и связанные
            данные полностью, напишите на{' '}
            <a className="text-ink underline underline-offset-2" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            . Запрос обрабатывается вручную в течение нескольких дней.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-white/5 pt-6 text-sm">
          <Link href="/rules" className="text-ink underline underline-offset-2">
            Правила сайта
          </Link>
          <Link href="/" className="text-muted transition hover:text-ink">
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
