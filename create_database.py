import sqlite3

# Подключаемся к базе данных
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Удаляем старые таблицы (если они есть) и создаём новые
cursor.execute('DROP TABLE IF EXISTS vacancies')
cursor.execute('DROP TABLE IF EXISTS resumes')

# Создаём таблицу для вакансий
cursor.execute('''
    CREATE TABLE vacancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        salary TEXT,
        currency TEXT,
        source TEXT,
        location TEXT,
        company TEXT,
        position TEXT
    )
''')

# Создаём таблицу для резюме
cursor.execute('''
    CREATE TABLE resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        salary TEXT,
        currency TEXT,
        source TEXT,
        location TEXT,
        company TEXT,
        last_position TEXT,
        desired_position TEXT
    )
''')

# Сохраняем изменения и закрываем
conn.commit()
conn.close()

print("База данных обновлена!")