from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import time
import json  # Добавлен импорт json

app = Flask(__name__)

# Курсы валют
USD_TO_RUB = 90
KZT_TO_RUB = 0.2

# Заголовки для парсинга
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://hh.ru/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salary TEXT,
            currency TEXT,
            source TEXT,
            location TEXT,
            company TEXT,
            position TEXT,
            parsed_date TEXT,
            parsed_month TEXT,
            query TEXT
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vacancy_month ON vacancies (position, company, location, parsed_month)')
    conn.commit()
    conn.close()

def remove_duplicates_in_month():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM vacancies
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM vacancies
            GROUP BY position, company, location, parsed_month
        )
    ''')
    conn.commit()
    conn.close()

def parse_vacancies(url, items_per_page=20, max_items=100):
    all_vacancies = []
    page = 0
    
    while len(all_vacancies) < max_items:
        page_url = f"{url}&page={page}" if page > 0 else url
        try:
            response = requests.get(page_url, headers=headers, timeout=10)
            print(f"Страница {page}, Код ответа: {response.status_code}")
            
            if response.status_code == 404:
                print("Страница не найдена (404). Прекращаем сбор.")
                break
            
            with open(f'debug_page_{page}.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            vacancies = soup.find_all('div', class_='magritte-card-action___4A43B_6-2-0')
            print(f"Найдено вакансий на странице {page}: {len(vacancies)}")
            
            if not vacancies:
                print("Вакансии закончились или ошибка. Прекращаем сбор.")
                break
            
            all_vacancies.extend(vacancies)
            print(f"Собрано всего: {len(all_vacancies)} из {max_items}")
            
            if len(vacancies) < items_per_page or len(all_vacancies) >= max_items:
                break
            
            page += 1
            time.sleep(1)
            
        except Exception as e:
            print(f"Ошибка на странице {page}: {e}")
            break
    
    all_vacancies = all_vacancies[:max_items]
    
    if not all_vacancies:
        return []
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    current_time = datetime.now()
    parsed_date = current_time.isoformat()
    parsed_month = current_time.strftime('%Y-%m')
    
    vacancy_data = []
    for vacancy in all_vacancies:
        position_tags = vacancy.find_all('span', class_='magritte-text___tkzIl_5-0-2')
        position = position_tags[0].text.strip() if position_tags else "Не указана"
        
        company = position_tags[1].text.strip() if len(position_tags) > 1 else "Не указана"
        
        salary_tag = vacancy.find('span', class_='magritte-text_typography-label-1-regular___pi3R-_3-0-27')
        salary = salary_tag.text.strip() if salary_tag else "Не указана"
        currency = '₽' if '₽' in salary else '$' if '$' in salary else "Не указана"
        
        location_tags = vacancy.find_all('span', class_='magritte-text_typography-label-3-regular___Nhtlp_3-0-27')
        location = location_tags[2].text.strip() if len(location_tags) > 2 else "Не указана"
        
        if salary == "Не указана":
            continue
        
        cursor.execute('''
            INSERT INTO vacancies (salary, currency, source, location, company, position, parsed_date, parsed_month, query)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (salary, currency, 'hh.ru', location, company, position, parsed_date, parsed_month, url))
        
        vacancy_data.append({
            'vacancy_title': position,
            'vacancy_salary': salary,
            'company': company,
            'location': location
        })
    
    conn.commit()
    conn.close()
    remove_duplicates_in_month()
    return vacancy_data

def load_data_from_db():
    conn = sqlite3.connect('database.db')
    vacancies = pd.read_sql_query("SELECT * FROM vacancies", conn)
    conn.close()
    if not vacancies.empty:
        vacancies = vacancies.rename(columns={'salary': 'vacancy_salary', 'position': 'vacancy_title'})
    return vacancies

def convert_salary(salary_str, is_before_tax=False):
    salary_str = str(salary_str).replace(' ', '').replace(' ', '')
    value = salary_str.lower()
    
    if '–' in value:
        min_val, max_val = value.split('–')
        min_val = float(''.join(filter(str.isdigit, min_val)))
        max_val = float(''.join(filter(str.isdigit, max_val)))
        avg = (min_val + max_val) / 2
    elif 'от' in value:
        avg = float(''.join(filter(str.isdigit, value.replace('от', ''))))
    elif 'до' in value:
        avg = float(''.join(filter(str.isdigit, value.replace('до', ''))))
    else:
        avg = float(''.join(filter(str.isdigit, value)))
    
    if '$' in value:
        avg *= USD_TO_RUB
    elif '₸' in value:
        avg *= KZT_TO_RUB
    
    if is_before_tax:
        avg *= (1 - 0.13)
    
    return avg

def generate_ranges(step, max_salary=600000):
    return [(start, start + step) for start in range(0, max_salary + step, step)]

def calculate_metrics(resumes, vacancies, step):
    ranges = generate_ranges(step)
    results = []
    
    total_resumes = len(resumes['resume_salary_rub'].dropna()) if not resumes.empty else 0
    total_vacancies = len(vacancies['vacancy_salary_rub'].dropna()) if not vacancies.empty else 0
    
    for r in ranges:
        min_salary, max_salary = r
        range_key = f"{min_salary}-{max_salary}"
        
        resume_count = len(resumes[(resumes['resume_salary_rub'] >= min_salary) & (resumes['resume_salary_rub'] < max_salary)]) if not resumes.empty else 0
        resume_fraction = resume_count / total_resumes if total_resumes > 0 else 0
        
        vacancy_count = len(vacancies[(vacancies['vacancy_salary_rub'] >= min_salary) & (vacancies['vacancy_salary_rub'] < max_salary)]) if not vacancies.empty else 0
        vacancy_fraction = vacancy_count / total_vacancies if total_vacancies > 0 else 0
        
        results.append({
            'range': range_key,
            'resume_fraction': resume_fraction,
            'vacancy_fraction': vacancy_fraction
        })
    
    return results

def calculate_grades(resumes, vacancies, step, custom_grade_ranges):
    ranges = generate_ranges(step)
    grades = {'I': [], 'J': [], 'M': [], 'S': [], 'L': []}
    
    for r in ranges:
        min_salary, max_salary = r
        range_key = f"{min_salary}-{max_salary}"
        for level, selected_ranges in custom_grade_ranges.items():
            if range_key in selected_ranges:
                vacancy_salaries = vacancies[(vacancies['vacancy_salary_rub'] >= min_salary) & (vacancies['vacancy_salary_rub'] < max_salary)]['vacancy_salary_rub'].tolist()
                resume_salaries = resumes[(resumes['resume_salary_rub'] >= min_salary) & (resumes['resume_salary_rub'] < max_salary)]['resume_salary_rub'].tolist()
                grades[level].extend(vacancy_salaries)
                grades[level].extend(resume_salaries)
    
    result = {}
    for level in grades:
        if grades[level]:
            result[level] = {
                'grade1': int(np.percentile(grades[level], 15)),
                'grade2': int(np.percentile(grades[level], 50)),
                'grade3': int(np.percentile(grades[level], 85))
            }
        else:
            result[level] = {'grade1': 0, 'grade2': 0, 'grade3': 0}
    
    return result

default_grade_ranges = {'I': [], 'J': [], 'M': [], 'S': [], 'L': []}

@app.route('/', methods=['GET', 'POST'])
def index():
    init_db()
    step = 10000
    custom_grade_ranges = default_grade_ranges.copy()
    vacancies_df = pd.DataFrame()
    resumes_df = pd.read_csv('resumes.csv')  # Пока оставляем тестовые резюме
    
    if request.method == 'POST':
        step = int(request.form.get('step', 10000))
        search_type = request.form.get('search_type')
        
        if search_type == 'position':
            position = request.form.get('position')
            if position:
                url = f"https://hh.ru/search/vacancy?text={position.replace(' ', '+')}&items_on_page=20"
                vacancy_data = parse_vacancies(url)
                vacancies_df = pd.DataFrame(vacancy_data)
        elif search_type == 'url':
            url = request.form.get('url')
            if url:
                vacancy_data = parse_vacancies(url)
                vacancies_df = pd.DataFrame(vacancy_data)
        
        for level in ['I', 'J', 'M', 'S', 'L']:
            selected_ranges = request.form.getlist(f'grade_{level}')
            custom_grade_ranges[level] = selected_ranges
    
    if vacancies_df.empty:
        vacancies_df = load_data_from_db()  # Загружаем из БД, если ничего не спарсили
    
    if not vacancies_df.empty:
        vacancies_df['is_before_tax'] = vacancies_df['vacancy_salary'].str.contains('до вычета налогов', case=False, na=False)
        vacancies_df['vacancy_salary_rub'] = vacancies_df.apply(
            lambda row: convert_salary(row['vacancy_salary'], row['is_before_tax']), axis=1
        )
    
    if not resumes_df.empty:
        resumes_df['resume_salary_rub'] = resumes_df['resume_salary'].apply(convert_salary)
    
    metrics = calculate_metrics(resumes_df, vacancies_df, step)
    grades = calculate_grades(resumes_df, vacancies_df, step, custom_grade_ranges)
    
    labels_chart = [f"<{step//1000}k" if i == 0 else f"{r[0]//1000}k" for i, r in enumerate(generate_ranges(step))]
    resume_data = [m['resume_fraction'] for m in metrics]
    vacancy_data = [m['vacancy_fraction'] for m in metrics]
    
    return render_template('index.html', metrics=metrics, grades=grades, 
                         labels=json.dumps(labels_chart), resume_data=json.dumps(resume_data), 
                         vacancy_data=json.dumps(vacancy_data), current_step=step, 
                         custom_grade_ranges=json.dumps(custom_grade_ranges))

@app.route('/update_grades', methods=['POST'])
def update_grades():
    step = int(request.json.get('step', 10000))
    custom_grade_ranges = request.json.get('custom_grade_ranges', default_grade_ranges)
    vacancies_df = load_data_from_db()
    resumes_df = pd.read_csv('resumes.csv')
    
    if not vacancies_df.empty:
        vacancies_df['is_before_tax'] = vacancies_df['vacancy_salary'].str.contains('до вычета налогов', case=False, na=False)
        vacancies_df['vacancy_salary_rub'] = vacancies_df.apply(
            lambda row: convert_salary(row['vacancy_salary'], row['is_before_tax']), axis=1
        )
    
    if not resumes_df.empty:
        resumes_df['resume_salary_rub'] = resumes_df['resume_salary'].apply(convert_salary)
    
    grades = calculate_grades(resumes_df, vacancies_df, step, custom_grade_ranges)
    return jsonify(grades)

if __name__ == '__main__':
    app.run(debug=True)