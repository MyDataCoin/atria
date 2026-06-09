# ATRIA — лендинг токенизации недвижимости

Премиальный лендинг на **React + Vite** с моушеном (Framer Motion), плавным
скроллом (Lenis) и скролл-анимациями (GSAP ScrollTrigger).

Дизайн-язык взят из брендмарка: **шалфейный туман · янтарное свечение ·
чернильно-синий**, антиква **Fraunces** + гротеск **Hanken Grotesk**.

## Запуск

```bash
npm install      # один раз
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # посмотреть собранную версию
```

## Что где менять

| Хочу поменять… | Файл |
| --- | --- |
| Любые тексты, цифры, объекты, FAQ | `src/content.js` |
| Цвета, шрифты, отступы, размеры | `src/styles/global.css` (блок `:root` сверху) |
| Логотип (контуры арки) | `src/components/AtriaMark.jsx` |
| Порядок секций | `src/App.jsx` |
| Скорость/плавность скролла | `src/lib/smooth.js` (`duration`) |

## Секции

`Hero → Marquee → Stats → Tokenization → HowItWorks (пин-скролл) →
Properties → Dividends → Trust → FAQ → CTA → Footer`

## Моушен

- **Lenis** — инерционный плавный скролл, синхронизирован с GSAP.
- **Framer Motion** — появления, stagger, счётчики, параллакс (`useScroll` +
  `useTransform`), аккордеон FAQ, кастомный курсор.
- **GSAP ScrollTrigger** — подключён для пин-секций; готов к расширению.
- Уважается `prefers-reduced-motion` (анимации и курсор отключаются).

## Заметки

- Картинки объектов сейчас — атмосферные градиенты (без внешних ассетов).
  Заменить можно в `src/content.js` → поле `bg` (CSS `background`) или подставить
  реальные фото в `.prop-bg`.
- Цифры доходности намеренно не выдуманы — в текстах нет фейкового «% годовых».
  Добавляйте реальные показатели, когда они будут.
