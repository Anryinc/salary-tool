import pandas as pd
import numpy as np

# Курсы валют (примерные на март 2025, уточни актуальные)
USD_TO_RUB = 90  # 1 USD = 90 RUB
KZT_TO_RUB = 0.2  # 1 KZT = 0.2 RUB

# Загрузка данных
resumes = pd.read_csv('resumes.csv')
vacancies = pd.read_csv('vacancies.csv')

# Функция для конвертации ЗП
def convert_salary(salary_str, is_before_tax=False):
    salary_str = str(salary_str).replace(' ', '').replace(' ', '')  # Убираем пробелы
    value = salary_str.lower()
    
    # Извлекаем числа
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
    
    # Конвертация валют
    if '$' in value:
        avg *= USD_TO_RUB
    elif '₸' in value:
        avg *= KZT_TO_RUB
    
    # Пересчёт "до налогов" в "на руки" (13% НДФЛ)
    if is_before_tax:
        avg *= (1 - 0.13)
    
    return avg

# Обработка резюме
resumes['resume_salary_rub'] = resumes['resume_salary'].apply(lambda x: convert_salary(x))

# Обработка вакансий
vacancies['is_before_tax'] = vacancies['vacancy_salary'].str.contains('до вычета налогов', case=False)
vacancies['vacancy_salary_rub'] = vacancies.apply(
    lambda row: convert_salary(row['vacancy_salary'], row['is_before_tax']), axis=1
)

# Функция для генерации диапазонов
def generate_ranges(step, max_salary=600000):
    return [(start, start + step) for start in range(0, max_salary + step, step)]

# Расчёт долей и перцентилей
def calculate_metrics(resumes, vacancies, step):
    ranges = generate_ranges(step)
    results = {}
    
    total_resumes = len(resumes['resume_salary_rub'].dropna())
    total_vacancies = len(vacancies['vacancy_salary_rub'].dropna())
    
    for r in ranges:
        min_salary, max_salary = r
        range_key = f"{min_salary}-{max_salary}"
        
        resume_count = len(resumes[(resumes['resume_salary_rub'] >= min_salary) & (resumes['resume_salary_rub'] < max_salary)])
        resume_fraction = resume_count / total_resumes if total_resumes > 0 else 0
        
        vacancy_count = len(vacancies[(vacancies['vacancy_salary_rub'] >= min_salary) & (vacancies['vacancy_salary_rub'] < max_salary)])
        vacancy_fraction = vacancy_count / total_vacancies if total_vacancies > 0 else 0
        
        vacancy_in_range = vacancies[(vacancies['vacancy_salary_rub'] >= min_salary) & (vacancies['vacancy_salary_rub'] < max_salary)]['vacancy_salary_rub']
        percentiles = np.percentile(vacancy_in_range, [10, 20, 30, 40, 50, 60, 70, 80, 90]) if len(vacancy_in_range) > 0 else [0] * 9
        
        results[range_key] = {
            'resume_fraction': resume_fraction,
            'vacancy_fraction': vacancy_fraction,
            'percentiles': percentiles
        }
    
    return results

# Расчёт грейдов с динамическими метками
def calculate_grades(vacancies, step, grade_ranges):
    ranges = generate_ranges(step)
    grades = {'I': [], 'J': [], 'M': [], 'S': [], 'L': []}
    
    for r in ranges:
        min_salary, max_salary = r
        range_key = f"{min_salary}-{max_salary}"
        
        # Проверяем, попадает ли диапазон в заданные интервалы грейдов
        for level, (grade_min, grade_max) in grade_ranges.items():
            if min_salary >= grade_min and max_salary <= grade_max:
                salaries_in_range = vacancies[(vacancies['vacancy_salary_rub'] >= min_salary) & (vacancies['vacancy_salary_rub'] < max_salary)]['vacancy_salary_rub']
                if len(salaries_in_range) > 0:
                    grades[level].extend(salaries_in_range)
    
    result = {}
    for level in grades:
        if grades[level]:
            result[level] = {
                'grade1': np.percentile(grades[level], 15),
                'grade2': np.percentile(grades[level], 50),
                'grade3': np.percentile(grades[level], 85)
            }
        else:
            result[level] = {'grade1': 0, 'grade2': 0, 'grade3': 0}
    
    return result

# Выбор шага пользователем
print("Доступные шаги диапазонов: 5000, 10000, 20000, 50000")
step = int(input("Введите шаг диапазонов (например, 10000): "))

# Определение диапазонов для грейдов
grade_ranges = {
    'I': (0, 60000),      # Intern: 0–60k
    'J': (60000, 150000), # Junior: 60k–150k
    'M': (150000, 260000),# Middle: 150k–260k
    'S': (260000, 350000),# Senior: 260k–350k
    'L': (350000, 470000) # Lead: 350k–470k
}

metrics = calculate_metrics(resumes, vacancies, step)
grades = calculate_grades(vacancies, step, grade_ranges)

# Вывод результатов
print("\nДиапазоны:")
for r, v in metrics.items():
    if v['resume_fraction'] > 0 or v['vacancy_fraction'] > 0:
        print(f"{r}: Доля резюме = {v['resume_fraction']:.3f}, Доля вакансий = {v['vacancy_fraction']:.3f}, 50-й перцентиль вакансий = {v['percentiles'][4]:.0f} ₽")
print("\nГрейды:")
for level, g in grades.items():
    print(f"{level}: Грейд 1 = {g['grade1']:.0f} ₽, Грейд 2 = {g['grade2']:.0f} ₽, Грейд 3 = {g['grade3']:.0f} ₽")