import requests
import sqlite3
import time
import json
from datetime import datetime
import random
from typing import Dict, List, Optional

class HHAPIParser:
    def __init__(self):
        self.base_url = "https://api.hh.ru"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
        }
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        ]

    def _rotate_user_agent(self):
        self.headers['User-Agent'] = random.choice(self.user_agents)

    def _make_request(self, url: str, params: Optional[Dict] = None, max_retries: int = 3) -> Optional[Dict]:
        for attempt in range(max_retries):
            try:
                self._rotate_user_agent()
                response = requests.get(url, headers=self.headers, params=params, timeout=10)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 403:
                    print(f"Доступ запрещен. Попытка {attempt + 1} из {max_retries}")
                    time.sleep(5 * (attempt + 1))
                else:
                    print(f"Ошибка {response.status_code}. Попытка {attempt + 1} из {max_retries}")
                    time.sleep(2 * (attempt + 1))
            except Exception as e:
                print(f"Ошибка запроса: {e}. Попытка {attempt + 1} из {max_retries}")
                time.sleep(2 * (attempt + 1))
        return None

    def parse_vacancies_by_role(self, role_id: str, max_items: int = 100) -> List[Dict]:
        all_vacancies = []
        page = 0
        per_page = 20

        while len(all_vacancies) < max_items:
            params = {
                'professional_role': role_id,
                'per_page': per_page,
                'page': page,
                'area': 1,  # Москва
                'only_with_salary': True
            }

            url = f"{self.base_url}/vacancies"
            data = self._make_request(url, params)

            if not data or 'items' not in data:
                break

            vacancies = data['items']
            if not vacancies:
                break

            all_vacancies.extend(vacancies)
            print(f"Собрано: {len(all_vacancies)} из {max_items} вакансий для роли {role_id}")

            if len(vacancies) < per_page or len(all_vacancies) >= max_items:
                break

            page += 1
            time.sleep(random.uniform(0.25, 0.5))

        return all_vacancies[:max_items]

    def parse_resumes_by_role(self, role_id: str, max_items: int = 100) -> List[Dict]:
        all_resumes = []
        page = 0
        per_page = 20

        while len(all_resumes) < max_items:
            params = {
                'professional_role': role_id,
                'per_page': per_page,
                'page': page,
                'area': 1,  # Москва
                'order_by': 'publication_time'
            }

            url = f"{self.base_url}/resumes"
            data = self._make_request(url, params)

            if not data or 'items' not in data:
                break

            resumes = data['items']
            if not resumes:
                break

            # Получаем детальную информацию о каждом резюме
            for resume in resumes:
                try:
                    resume_id = resume.get('id')
                    if resume_id:
                        detail_url = f"{self.base_url}/resumes/{resume_id}"
                        detail_data = self._make_request(detail_url)
                        if detail_data:
                            all_resumes.append(detail_data)
                            time.sleep(random.uniform(0.25, 0.5))
                except Exception as e:
                    print(f"Ошибка при получении деталей резюме {resume_id}: {e}")
                    continue

            print(f"Собрано: {len(all_resumes)} из {max_items} резюме для роли {role_id}")

            if len(resumes) < per_page or len(all_resumes) >= max_items:
                break

            page += 1
            time.sleep(random.uniform(0.25, 0.5))

        return all_resumes[:max_items]

    def process_salary(self, salary: Optional[Dict]) -> tuple:
        if not salary:
            return None, None, None

        currency = salary.get('currency', 'RUR')
        if currency == 'RUR':
            currency = '₽'
        elif currency == 'USD':
            currency = '$'
        elif currency == 'EUR':
            currency = '€'

        salary_from = salary.get('from')
        salary_to = salary.get('to')

        if salary_from and salary_to:
            salary_str = f"{salary_from} - {salary_to}"
        elif salary_from:
            salary_str = f"от {salary_from}"
        elif salary_to:
            salary_str = f"до {salary_to}"
        else:
            salary_str = "Не указана"

        return salary_str, currency, (salary_from, salary_to)

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Создаем таблицу для вакансий
    cursor.execute('DROP TABLE IF EXISTS vacancies')
    cursor.execute('''
        CREATE TABLE vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hh_id TEXT,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_text TEXT,
            currency TEXT,
            source TEXT,
            location TEXT,
            company TEXT,
            position TEXT,
            experience TEXT,
            skills TEXT,
            url TEXT,
            parsed_date TEXT,
            parsed_month TEXT,
            query TEXT,
            role_id TEXT
        )
    ''')

    # Создаем таблицу для резюме
    cursor.execute('DROP TABLE IF EXISTS resumes')
    cursor.execute('''
        CREATE TABLE resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hh_id TEXT,
            title TEXT,
            salary_from INTEGER,
            salary_to INTEGER,
            salary_currency TEXT,
            age INTEGER,
            gender TEXT,
            location TEXT,
            experience_years INTEGER,
            skills TEXT,
            education TEXT,
            languages TEXT,
            url TEXT,
            parsed_date TEXT,
            parsed_month TEXT,
            role_id TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def save_vacancies_to_db(vacancies: List[Dict], role_id: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    parser = HHAPIParser()
    parsed_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    parsed_month = datetime.now().strftime('%Y-%m')
    saved_count = 0

    for vacancy in vacancies:
        try:
            salary_text, currency, (salary_from, salary_to) = parser.process_salary(vacancy.get('salary'))
            
            experience = vacancy.get('experience', {}).get('name', 'Не указан')
            skills = ', '.join([skill.get('name', '') for skill in vacancy.get('key_skills', [])])
            
            cursor.execute('''
                INSERT INTO vacancies (
                    hh_id, salary_from, salary_to, salary_text, currency, 
                    source, location, company, position, experience, 
                    skills, url, parsed_date, parsed_month, query, role_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                vacancy.get('id'),
                salary_from,
                salary_to,
                salary_text,
                currency,
                'hh.ru',
                vacancy.get('area', {}).get('name', 'Не указано'),
                vacancy.get('employer', {}).get('name', 'Не указано'),
                vacancy.get('name', 'Не указано'),
                experience,
                skills,
                vacancy.get('alternate_url'),
                parsed_date,
                parsed_month,
                f"professional_role={role_id}",
                role_id
            ))
            saved_count += 1
        except Exception as e:
            print(f"Ошибка при сохранении вакансии {vacancy.get('id')}: {e}")
            continue

    conn.commit()
    conn.close()
    print(f"Сохранено {saved_count} вакансий для роли {role_id}")

def save_resumes_to_db(resumes: List[Dict], role_id: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    parsed_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    parsed_month = datetime.now().strftime('%Y-%m')
    saved_count = 0

    for resume in resumes:
        try:
            # Обработка зарплаты
            salary = resume.get('salary', {})
            salary_from = salary.get('amount')
            salary_to = salary.get('amount')  # В резюме обычно указывается одна сумма
            salary_currency = salary.get('currency', 'RUR')
            if salary_currency == 'RUR':
                salary_currency = '₽'
            elif salary_currency == 'USD':
                salary_currency = '$'
            elif salary_currency == 'EUR':
                salary_currency = '€'

            # Обработка навыков
            skills = ', '.join([skill.get('name', '') for skill in resume.get('skills', [])])

            # Обработка образования
            education = []
            for edu in resume.get('education', {}).get('primary', []):
                if edu.get('name'):
                    education.append(edu['name'])
            education_str = '; '.join(education)

            # Обработка языков
            languages = []
            for lang in resume.get('language', []):
                if lang.get('name'):
                    languages.append(lang['name'])
            languages_str = '; '.join(languages)

            cursor.execute('''
                INSERT INTO resumes (
                    hh_id, title, salary_from, salary_to, salary_currency,
                    age, gender, location, experience_years, skills,
                    education, languages, url, parsed_date, parsed_month, role_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                resume.get('id'),
                resume.get('title', 'Не указано'),
                salary_from,
                salary_to,
                salary_currency,
                resume.get('age'),
                resume.get('gender', {}).get('name', 'Не указано'),
                resume.get('area', {}).get('name', 'Не указано'),
                resume.get('total_experience', {}).get('months', 0) // 12,
                skills,
                education_str,
                languages_str,
                resume.get('alternate_url'),
                parsed_date,
                parsed_month,
                role_id
            ))
            saved_count += 1
        except Exception as e:
            print(f"Ошибка при сохранении резюме {resume.get('id')}: {e}")
            continue

    conn.commit()
    conn.close()
    print(f"Сохранено {saved_count} резюме для роли {role_id}")

def main():
    # Инициализируем базу данных
    init_db()
    
    # Создаем парсер
    parser = HHAPIParser()
    
    # Загружаем роли из файла
    with open('roles.json', 'r', encoding='utf-8') as f:
        roles_data = json.load(f)
    
    # Собираем все ID ролей
    role_ids = []
    for category in roles_data.get('categories', []):
        for role in category.get('roles', []):
            role_ids.append(role['id'])
    
    # Парсим вакансии и резюме для каждой роли
    for role_id in role_ids:
        print(f"\nПарсинг данных для роли {role_id}")
        
        # Парсим вакансии
        print("Сбор вакансий...")
        vacancies = parser.parse_vacancies_by_role(role_id, max_items=100)
        if vacancies:
            save_vacancies_to_db(vacancies, role_id)
        
        time.sleep(random.uniform(1, 2))
        
        # Парсим резюме
        print("Сбор резюме...")
        resumes = parser.parse_resumes_by_role(role_id, max_items=100)
        if resumes:
            save_resumes_to_db(resumes, role_id)
        
        time.sleep(random.uniform(1, 2))

if __name__ == "__main__":
    main()