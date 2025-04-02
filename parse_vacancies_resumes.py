import requests
from bs4 import BeautifulSoup
import sqlite3
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('DROP TABLE IF EXISTS vacancies')
    cursor.execute('''
        CREATE TABLE vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salary TEXT,
            currency TEXT,
            source TEXT,
            location TEXT,
            company TEXT,
            position TEXT,
            parsed_date TEXT,
            parsed_month TEXT,
            query TEXT,
            role_id TEXT
        )
    ''')
    conn.commit()
    conn.close()

def parse_vacancies_by_role(role_id, max_items=100):
    url = f"https://hh.ru/search/vacancy?professional_role={role_id}&items_on_page=20"
    all_vacancies = []
    page = 0
    
    while len(all_vacancies) < max_items:
        page_url = f"{url}&page={page}"
        response = requests.get(page_url, headers=headers, timeout=10)
        print(f"Роль {role_id}, Страница {page}, Код ответа: {response.status_code}")
        
        if response.status_code != 200:
            break
        
        with open(f'debug_page_role_{role_id}_{page}.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        vacancies = soup.find_all('div', class_=lambda x: x and 'vacancy-card' in x)
        print(f"Найдено вакансий на странице {page}: {len(vacancies)}")
        
        if not vacancies:
            print("Вакансий не найдено. HTML сохранён для анализа.")
            break
        
        all_vacancies.extend(vacancies)
        print(f"Собрано: {len(all_vacancies)} из {max_items}")
        
        if len(vacancies) < 20 or len(all_vacancies) >= max_items:
            break
        
        page += 1
        time.sleep(1)
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    parsed_date = time.strftime('%Y-%m-%d %H:%M:%S')
    parsed_month = time.strftime('%Y-%m')
    saved_count = 0
    
    for vacancy in all_vacancies[:max_items]:
        try:
            position_tag = vacancy.find('span', class_=lambda x: x and 'title' in x.lower())
            position = position_tag.text.strip() if position_tag else "Не указана"
            
            company_tag = vacancy.find('span', class_=lambda x: x and 'company' in x.lower())
            company = company_tag.text.strip() if company_tag else "Не указана"
            
            salary_tag = vacancy.find('span', class_=lambda x: x and 'compensation' in x.lower())
            salary = salary_tag.text.strip() if salary_tag else "Не указана"
            currency = '₽' if '₽' in salary else '$' if '$' in salary else "Не указана"
            
            location_tag = vacancy.find('span', class_=lambda x: x and 'location' in x.lower())
            location = location_tag.text.strip() if location_tag else "Не указана"
            
            cursor.execute('''
                INSERT INTO vacancies (salary, currency, source, location, company, position, parsed_date, parsed_month, query, role_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (salary, currency, 'hh.ru', location, company, position, parsed_date, parsed_month, url, role_id))
            saved_count += 1
        except Exception as e:
            print(f"Ошибка в разборе вакансии: {e}")
            continue
    
    conn.commit()
    conn.close()
    print(f"Сохранено: {saved_count} вакансий для роли {role_id}")

# Парсим первые 10 ролей
init_db()
for role_id in range(1, 11):
    parse_vacancies_by_role(role_id)