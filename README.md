# Salary Tool

Инструмент для сбора и анализа данных о зарплатах с hh.ru.

## Описание

Проект собирает данные о вакансиях с hh.ru по различным профессиональным ролям и сохраняет их в базу данных для последующего анализа. Сбор данных происходит автоматически два раза в неделю.

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/salary_tool.git
cd salary_tool
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

## Использование

### Ручной запуск парсера
```bash
python parse_vacancies_resumes.py
```

### Запуск планировщика
```bash
python scheduler.py
```

## Структура проекта

- `parse_vacancies_resumes.py` - основной парсер данных
- `scheduler.py` - планировщик автоматического сбора данных
- `roles.json` - список профессиональных ролей
- `database.db` - база данных SQLite
- `parser.log` - лог-файл с информацией о работе парсера

## Настройка автозапуска

### Windows
1. Создайте файл `start_scheduler.bat`:
```batch
@echo off
cd /d %~dp0
python scheduler.py
```

2. Создайте задачу в Планировщике задач Windows:
   - Откройте "Планировщик задач"
   - Создайте новую задачу
   - Триггер: "При запуске компьютера"
   - Действие: "Запустить программу"
   - Укажите путь к `start_scheduler.bat`
   - В настройках выберите "Запускать с наивысшими правами"

### Linux
1. Создайте systemd сервис:
```bash
sudo nano /etc/systemd/system/salary-tool.service
```

2. Добавьте конфигурацию:
```ini
[Unit]
Description=Salary Tool Scheduler
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/salary_tool
ExecStart=/usr/bin/python3 scheduler.py
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
```

3. Включите и запустите сервис:
```bash
sudo systemctl enable salary-tool
sudo systemctl start salary-tool
``` 