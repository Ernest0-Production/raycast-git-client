# Git Client for Raycast

Управляйте локальными Git‑репозиториями через удобный интерфейс Raycast: просмотр статуса, веток, коммитов и тегов, клонирование, быстрые действия (открыть в Терминале/внешнем клиенте), интеграция с URL‑трекерами и пресетами AI‑подсказок для сообщений коммитов.

![PLACEHOLDER — Hero: обзор расширения / список репозиториев](PLACEHOLDER)

См. пример оформления и UX в [Obsidian для Raycast (лучшие практики)](https://www.raycast.com/marcjulian/obsidian).

## Возможности

- **Управление репозиториями**: команда `manage-repositories` показывает список локальных репозиториев с быстрыми действиями.
- **Открытие репозитория**: команда `open-repository` открывает детальный интерфейс по пути (`path`).
- **Клонирование по URL**: команда `clone-repository` клонирует репозиторий из удалённого URL (`url`).
- **URL Trackers**: команда `configure-url-trackers` настраивает правила автоссылок из коммит‑месседжей (тикеты, PR и т. п.).
- **AI Message Prompts**: команда `manage-ai-message-prompts` управляет пресетами подсказок для генерации сообщений коммитов.
- **Быстрые действия**: открыть репозиторий в выбранном Терминале или внешнем Git‑клиенте из карточки.
- **Производительность**: пагинация коммитов, лимиты на число веток/тегов (настраивается в Preferences).

## Скриншоты (плейсхолдеры)

- ![PLACEHOLDER — Manage Repositories: список и быстрые действия](PLACEHOLDER)
- ![PLACEHOLDER — Open Repository: обзор/шапка репозитория](PLACEHOLDER)
- ![PLACEHOLDER — Status: изменённые файлы и действия](PLACEHOLDER)
- ![PLACEHOLDER — Branches: локальные/удалённые ветки](PLACEHOLDER)
- ![PLACEHOLDER — Commits: пагинация, детали, копирование SHA](PLACEHOLDER)
- ![PLACEHOLDER — Tags: список тегов](PLACEHOLDER)
- ![PLACEHOLDER — URL Trackers: конфигурация правил](PLACEHOLDER)
- ![PLACEHOLDER — AI Message Prompts: пресеты для коммитов](PLACEHOLDER)

## Установка

### Из Raycast Store
- [PLACEHOLDER — ссылка на страницу расширения в Raycast Store](PLACEHOLDER)

### Из исходников

Требования:
- macOS с установленным Raycast и Git (2.38+)
- Node.js 18+ (для разработки)

Шаги:

```bash
git clone PLACEHOLDER_YOUR_REPO_URL.git
cd git-client
npm install
npm run dev
```

Команда `npm run dev` откроет окно разработки Raycast для этого расширения.

## Использование по командам

### Manage Git Repositories (`manage-repositories`)
- Просматривайте список локальных репозиториев.
- Быстрые действия: открыть в Терминале (см. Preference `Default Terminal`) или во внешнем Git‑клиенте.
- Откройте детальный интерфейс репозитория одной командой.

![PLACEHOLDER — Manage Repositories: список репозиториев](PLACEHOLDER)

### Clone Git Repository (`clone-repository`)
- Аргумент `url` обязателен — вставьте HTTPS/SSH URL.
- После клонирования откройте репозиторий сразу из успешного тоста/экрана.

![PLACEHOLDER — Clone: ввод URL и прогресс](PLACEHOLDER)

### Open Git Repository (`open-repository`)
- Аргумент `path` обязателен — абсолютный путь к папке репозитория.
- Интерфейс:
  - **Status**: изменённые файлы, быстрые действия (просмотр/копирование путей).
  - **Branches**: локальные/удалённые ветки, переключение, создание и т. п.
  - **Commits**: история, детали коммита, копирование SHA, пагинация (`commitsPerPage`).
  - **Tags**: список тегов (`maxTagsToLoad`).

![PLACEHOLDER — Open Repository: вкладки Status/Branches/Commits/Tags](PLACEHOLDER)

### Configure URL Trackers (`configure-url-trackers`)
- Добавляйте правила, которые автоматически превращают совпавшие шаблоны в кликабельные ссылки в интерфейсе (например, `ABC-123` → ссылка на трекер задач).

![PLACEHOLDER — URL Trackers: список правил, примеры](PLACEHOLDER)

### Manage AI Message Prompts (`manage-ai-message-prompts`)
- Создавайте и редактируйте пресеты подсказок для генерации коммит‑месседжей.
- Если включён флаг `Auto Generate Commit Message`, окно коммита может сразу предлагать AI‑вариант.

![PLACEHOLDER — AI Prompts: список пресетов, предпросмотр](PLACEHOLDER)

## Настройки (Preferences)

| Имя | Тип | Значение по умолчанию | Описание |
|---|---|---|---|
| `Default Terminal` (`defaultTerminal`) | App Picker | `com.apple.Terminal` | Терминал по умолчанию для открытия директории репозитория |
| `External Git Client` (`externalGitClient`) | App Picker | `com.apple.Terminal` | Внешний Git‑клиент для открытия репозитория (например, GitKraken) |
| `Max Commits to Load` (`commitsPerPage`) | Textfield | `30` | Сколько коммитов подгружать за страницу (пагинация) |
| `Max Branches to Load` (`maxBranchesToLoad`) | Textfield | `80` | Лимит загружаемых веток в списках |
| `Max Tags to Load` (`maxTagsToLoad`) | Textfield | `80` | Лимит загружаемых тегов |
| `Auto Generate Commit Message` (`autoGenerateCommitMessage`) | Checkbox | `false` | Автогенерация сообщения коммита с использованием AI |

> Подсказка: если список большой или интерфейс подтормаживает, уменьшите лимиты или число коммитов на страницу.

## Скрипты

```bash
npm run dev     # локальная разработка (ray develop)
npm run build   # сборка (ray build)
npm run lint    # проверка линтером
npm run fix-lint
```

## Решение проблем

- **Raycast CLI не найден**: установите Raycast, затем запустите режим разработки (`npm run dev`).
- **Git операции завершаются с ошибкой**: убедитесь, что путь — это валидный репозиторий и у вас есть права доступа к файлам.
- **Не открывается в Терминале/внешнем клиенте**: проверьте выбранные приложения в Preferences.
- **Проблемы с производительностью**: уменьшите `commitsPerPage`, `maxBranchesToLoad` и/или `maxTagsToLoad`.

## Конфиденциальность

Расширение выполняет Git‑операции локально (через `simple-git`). Никакие данные репозитория не отправляются третьим сторонам. Сетевые вызовы происходят только при операциях Git (например, `fetch`, `push`, `pull`) согласно вашей конфигурации удалённых репозиториев.

## Лицензия

MIT — см. `LICENSE` (если отсутствует, используйте MIT по умолчанию).

## Благодарности и ссылки

- [Raycast — документация для разработчиков](https://developers.raycast.com/)
- [`simple-git` — обёртка Git для Node.js](https://github.com/steveukx/git-js)
- [Obsidian для Raycast (пример лучших практик)](https://www.raycast.com/marcjulian/obsidian)

