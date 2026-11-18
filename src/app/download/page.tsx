import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Download, Monitor, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { readAppRelease } from '@/lib/app-release'
import { readDesktopRelease } from '@/lib/desktop-release'
import { timeAgo } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Приложения Rate',
  description: 'Rate на Android и Windows: отдельное приложение с музыкой в фоне.',
}

// Builds live on the storage volume and can be replaced without a rebuild.
export const dynamic = 'force-dynamic'

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} МБ`
}

export default async function DownloadPage() {
  const [release, desktop] = await Promise.all([readAppRelease(), readDesktopRelease()])

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 md:py-14">
      <div className="flex items-center justify-between">
        <Logo size={26} />
        <Link
          href="/"
          className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-ink"
        >
          Открыть сайт
        </Link>
      </div>

      <div className="mt-10 flex flex-col items-center gap-5 text-center md:mt-14">
        <Image
          src="/icons/icon-512.png"
          alt=""
          width={104}
          height={104}
          className="h-24 w-24 rounded-3xl border border-line shadow-2xl md:h-28 md:w-28"
          priority
        />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Приложения Rate
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Отдельное окно на компьютере и приложение на телефоне: тот же каталог, ваша
            медиатека и музыка в фоне.
          </p>
        </div>

        {release ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-dim">
              <span className="rounded-full border border-line px-2.5 py-1">
                версия {release.versionName}
              </span>
              <span className="rounded-full border border-line px-2.5 py-1">
                {formatSize(release.size)}
              </span>
              {release.builtAt && (
                <span className="rounded-full border border-line px-2.5 py-1">
                  обновлено {timeAgo(new Date(release.builtAt).getTime())}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-col items-center gap-4 md:flex-row">
              <a
                href="/api/app/android"
                download
                className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-bold text-black transition hover:bg-white"
              >
                <Download size={18} />
                Скачать APK
              </a>
              <div className="hidden items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5 text-left md:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/download-qr.svg"
                  alt="QR-код на эту страницу"
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded bg-white p-1"
                />
                <span className="text-[11px] leading-snug text-muted">
                  Наведите камеру
                  <br />
                  телефона
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-2 rounded-full border border-line px-5 py-3 text-xs text-muted">
            Сборка готовится — загляните чуть позже
          </div>
        )}
      </div>

      {desktop && (
        <div className="mt-10 w-full rounded-2xl border border-line bg-panel p-5 text-left md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-black/30 text-ink">
                <Monitor size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Rate для Windows</h2>
                <p className="text-xs text-muted">
                  Windows 10/11 · отдельное окно, музыка в фоне
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-dim">
              <span className="rounded-full border border-line px-2.5 py-1">
                версия {desktop.version}
              </span>
              <span className="rounded-full border border-line px-2.5 py-1">
                {formatSize(desktop.installer.size)}
              </span>
              {desktop.builtAt && (
                <span className="rounded-full border border-line px-2.5 py-1">
                  обновлено {timeAgo(new Date(desktop.builtAt).getTime())}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href="/api/app/windows/setup"
              download
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-black transition hover:bg-white"
            >
              <Download size={17} />
              Скачать установщик
            </a>
            <a
              href="/api/app/windows/portable"
              download
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-white/35"
            >
              Портативная · {formatSize(desktop.portable.size)}
            </a>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Установщик создаёт ярлык в «Пуск» и на рабочем столе, удаляется через «Программы».
            Портативная версия запускается сразу из папки. Все изменения сайта появляются
            автоматически — переустанавливать для этого не нужно.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-200/80">
            При первом запуске Windows покажет «Неизвестный издатель»: нажмите «Подробнее» →
            «Выполнить в любом случае». Подписи Microsoft у самодельной сборки нет.
          </p>
          <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-dim">
            SHA-256 установщика: {desktop.installer.sha256}
          </p>
          <p className="break-all font-mono text-[10px] leading-relaxed text-dim">
            SHA-256 портативной: {desktop.portable.sha256}
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-3 md:mt-14 md:grid-cols-3">
        {[
          {
            icon: Smartphone,
            title: 'Как установить',
            text: 'Скачайте APK, откройте файл и разрешите установку из этого источника. Обычно достаточно одного касания в диалоге Android.',
          },
          {
            icon: ShieldCheck,
            title: 'Подпись не меняется',
            text: 'Все версии подписаны одним ключом, поэтому новая сборка ставится поверх старой и ваши данные остаются на месте.',
          },
          {
            icon: RefreshCw,
            title: 'Обновления',
            text: 'Магазина нет, поэтому обновляться нужно вручную: скачать свежий APK на этой странице и установить поверх.',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-panel px-4 py-4">
            <item.icon size={18} className="text-ink" />
            <div className="mt-2 text-sm font-semibold text-ink">{item.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{item.text}</p>
          </div>
        ))}
      </div>

      <ol className="mt-6 space-y-2 rounded-xl border border-line px-5 py-4 text-xs leading-relaxed text-muted">
        <li>1. Нажмите «Скачать APK» и дождитесь загрузки файла.</li>
        <li>2. Откройте загрузку — Android спросит разрешение на установку из браузера.</li>
        <li>3. Запустите Rate и войдите тем же аккаунтом, что и на сайте.</li>
        <li>4. Музыка продолжает играть при выключенном экране, кнопки есть в шторке.</li>
      </ol>

      <div className="mt-6 rounded-xl bg-panel px-5 py-4">
        <div className="text-sm font-semibold text-ink">iPhone?</div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          APK есть только для Android. На iPhone откройте сайт в Safari, нажмите «Поделиться» →
          «На экран Домой» — приложение появится на домашнем экране и будет работать так же.
        </p>
      </div>

      <div className="mt-auto pt-10 text-center text-[11px] text-dim">
        <Link href="/" className="hover:text-muted">
          Rate — музыка, которая всегда рядом
        </Link>
      </div>
    </div>
  )
}
