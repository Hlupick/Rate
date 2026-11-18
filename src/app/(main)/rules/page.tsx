import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Правила',
  description: 'Правила публикации музыки и модерации в Rate.',
}

const CONTACT = process.env.CONTACT_EMAIL ?? 'support@monah.local'

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 md:px-6">
      <div className="pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Документы
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Правила сайта</h1>
        <p className="mt-2 text-sm text-muted">
          Коротко: слушайте свободно, загружайте только свою музыку и уважайте чужие права.
        </p>
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Что такое Rate</h2>
          <p>
            Это локальная музыкальная библиотека, которую наполняют сами слушатели. Все треки
            загружают пользователи, а не редакция. Прослушивание открыто для всех, загрузка — по
            инвайт-коду.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Что можно загружать</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Свою музыку: записи, на которые у вас есть авторские права.</li>
            <li>Чужие треки — только с разрешения правообладателя.</li>
            <li>Форматы MP3, M4A, AAC, OGG, OPUS, FLAC, WAV, до 50 МБ на файл.</li>
            <li>Обложки и тексты без нарушения чужих прав.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Что запрещено</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Загружать чужие треки без разрешения правообладателя.</li>
            <li>Спам, реклама, вредоносные файлы и попытки взломать сайт.</li>
            <li>Экстремистские материалы, призывы к насилию, NSFW-обложки.</li>
            <li>Обход лимитов: несколько аккаунтов ради дополнительных загрузок.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Лимиты</h2>
          <p>
            На пользователя — до 100 треков и 2 ГБ. Дополнительно сервер останавливает загрузки,
            когда свободное место подходит к концу. Загрузка доступна после активации
            инвайт-кода.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Жалобы и удаление</h2>
          <p>
            У каждого трека в меню «…» есть кнопка «Пожаловаться». Если вы правообладатель,
            напишите на{' '}
            <a className="text-ink underline underline-offset-2" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>{' '}
            с ссылкой на трек. Мы удалим материал и, при необходимости, заблокируем загрузившего.
            Администратор также может удалить любой трек без объяснения причин.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Ответственность</h2>
          <p>
            Ответственность за загруженный контент несёт пользователь, который его добавил. Сайт
            предоставляет техническую площадку и не проверяет каждый файл до публикации.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-white/5 pt-6 text-sm">
          <Link href="/privacy" className="text-ink underline underline-offset-2">
            Политика конфиденциальности
          </Link>
          <Link href="/" className="text-muted transition hover:text-ink">
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
