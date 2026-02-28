# Documents — что уже сделано

## Хранение
- **localStorage** — метаданные документов (имя, папка, теги, заметки)
- **IndexedDB** — файлы (blob) по id

## Папки
- Папки по умолчанию: General, RAMS, Certificates, Contracts
- **＋ New folder** — создание новой папки
- **Move** — перемещение выбранных в другую папку

## Добавление файлов
- **＋ Add** — в шапке (открывает выбор файлов)
- **Drag & drop** — на область списка или модал
- Множественный выбор (multiple)

## Поиск и фильтры
- **Поиск** — поиск по подстроке (name, folder, type, tags, notes), без учёта регистра
- **Тип** — All, PDF, Images, Text, Docs, Sheets, Slides, Archives, Other
- **Сортировка** — Newest, Oldest, Name A→Z, Name Z→A, Largest, Smallest
- **Теги** — панель частых тегов, фильтр по клику

## Список и сетка
- **View** — переключение List / Grid
- Чекбоксы для множественного выбора
- Клик по строке — открыть Preview

## Действия в строке (на каждый документ)
- **Preview** (👁) — открыть в панели
- **Download** (⬇) — скачать
- **Delete** — в Trash или удалить навсегда (в корзине)
- Тёмные кнопки, тултипы сверху (mp-docs-tt-top)

## Preview
- **Image** → `<img>`
- **PDF** → `<iframe>`
- **Остальные** → «No preview available»
- Редактирование: Name, Folder, Tags, Notes
- **Save**, **Use as filter**
- **Download** — кнопка в шапке Preview

## Trash
- **Trash** — переключение Library / Trash
- **Restore** — восстановить выбранные
- **Delete forever** — удалить навсегда
- Тултипы Restore и Delete forever показываются сверху (mp-docs-tt-top)

## Batch Rename
- Режимы: Replace name (full), Prefix, Suffix, Find/Replace, Template
- Токены: `{name}`, `{ext}`, `{n}`, `{date}`
- Preview первых 10 имён
- **Keep extension** — checkbox

## Горячие клавиши
- **Escape** — закрыть модал

## Экспорт / импорт
- **Export** — JSON (folders + documents)
- **Import** — загрузка JSON

## Стили
- Тултипы: чёрный фон, белый текст
- `mp-docs-tt-top` — тултип сверху
- `mp-docs-tt-right` — тултип справа (для Trash)
- Кнопки действий: тёмные (slate), hover по типу (preview=blue, download=green, delete=red)
- Скроллбары: amber

## Иконки типов документов
- PDF: 📄, Image: 🖼️, Text: 📝, Sheet: 📊, Slides: 📽️, Archive: 🗜️, Other: 📎

---

## Возможные доработки
- Pinned / Recent — быстрые папки
- Add files — кнопка в тулбаре (сейчас только в шапке)
- Storage — статистика использования
- Duplicates — поиск дубликатов
- Batch tags — массовые теги
- ZIP export — выгрузка выбранных в архив
- Dark mode — тёмная тема
- Smart folders (PDFs, Images, Large)
- Pin — закрепление документов
- Клавиши: Delete, Ctrl+A
