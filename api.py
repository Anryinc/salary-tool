from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/search_positions')
def search_positions():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем уникальные позиции из базы
    cursor.execute('''
        SELECT DISTINCT position 
        FROM (
            SELECT position FROM vacancies
            UNION
            SELECT desired_position as position FROM resumes
        )
        WHERE position LIKE ?
    ''', (f'%{query}%',))
    
    positions = [row['position'] for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(positions)

@app.route('/api/add_data', methods=['POST'])
def add_data():
    data = request.json
    position = data.get('position')
    vacancies = data.get('vacancies', [])
    resumes = data.get('resumes', [])

    if not position:
        return jsonify({'error': 'Position is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Добавляем вакансии
        for vacancy in vacancies:
            cursor.execute('''
                INSERT INTO vacancies (
                    position, salary, currency, source, location, company,
                    parsed_date, parsed_month
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                position,
                str(vacancy['salary']),
                'RUB',
                'Generated',
                'Moscow',
                'Test Company',
                datetime.now().strftime('%Y-%m-%d'),
                datetime.now().strftime('%Y-%m')
            ))

        # Добавляем резюме
        for resume in resumes:
            cursor.execute('''
                INSERT INTO resumes (
                    desired_position, salary, salary_currency, location,
                    parsed_date, parsed_month
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                position,
                str(resume['salary']),
                'RUB',
                'Moscow',
                datetime.now().strftime('%Y-%m-%d'),
                datetime.now().strftime('%Y-%m')
            ))

        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/get_salary_data')
def get_salary_data():
    position = request.args.get('position')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Получаем вакансии
        cursor.execute('''
            SELECT salary, parsed_date
            FROM vacancies
            WHERE position = ?
            AND (? IS NULL OR parsed_date >= ?)
            AND (? IS NULL OR parsed_date <= ?)
        ''', (position, start_date, start_date, end_date, end_date))
        vacancies = [{'salary': int(row['salary']), 'date': row['parsed_date']} 
                    for row in cursor.fetchall()]

        # Получаем резюме
        cursor.execute('''
            SELECT salary, parsed_date
            FROM resumes
            WHERE desired_position = ?
            AND (? IS NULL OR parsed_date >= ?)
            AND (? IS NULL OR parsed_date <= ?)
        ''', (position, start_date, start_date, end_date, end_date))
        resumes = [{'salary': int(row['salary']), 'date': row['parsed_date']} 
                  for row in cursor.fetchall()]

        return jsonify({
            'vacancies': vacancies,
            'resumes': resumes
        })
    finally:
        conn.close()

@app.route('/api/get_grade_stats')
def get_grade_stats():
    position = request.args.get('position')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    grade_ranges = {
        'Intern': {'min': 0, 'max': 60000},
        'Junior': {'min': 60000, 'max': 150000},
        'Middle': {'min': 150000, 'max': 260000},
        'Senior': {'min': 260000, 'max': 350000},
        'Lead': {'min': 350000, 'max': 470000}
    }

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        def calculate_grade_stats(data):
            stats = []
            for grade, range_info in grade_ranges.items():
                salaries = [item['salary'] for item in data 
                          if range_info['min'] <= item['salary'] < range_info['max']]
                
                count = len(salaries)
                avg_salary = sum(salaries) / count if count > 0 else 0
                
                stats.append({
                    'grade': grade,
                    'range': range_info,
                    'count': count,
                    'avg_salary': avg_salary,
                    'percentiles': {
                        'grade1': sorted(salaries)[int(len(salaries) * 0.15)] if salaries else 0,
                        'grade2': sorted(salaries)[int(len(salaries) * 0.50)] if salaries else 0,
                        'grade3': sorted(salaries)[int(len(salaries) * 0.85)] if salaries else 0
                    }
                })
            return stats

        # Получаем вакансии
        cursor.execute('''
            SELECT salary, parsed_date
            FROM vacancies
            WHERE position = ?
            AND (? IS NULL OR parsed_date >= ?)
            AND (? IS NULL OR parsed_date <= ?)
        ''', (position, start_date, start_date, end_date, end_date))
        vacancies = [{'salary': int(row['salary']), 'date': row['parsed_date']} 
                    for row in cursor.fetchall()]

        # Получаем резюме
        cursor.execute('''
            SELECT salary, parsed_date
            FROM resumes
            WHERE desired_position = ?
            AND (? IS NULL OR parsed_date >= ?)
            AND (? IS NULL OR parsed_date <= ?)
        ''', (position, start_date, start_date, end_date, end_date))
        resumes = [{'salary': int(row['salary']), 'date': row['parsed_date']} 
                  for row in cursor.fetchall()]

        return jsonify({
            'vacancies': calculate_grade_stats(vacancies),
            'resumes': calculate_grade_stats(resumes)
        })
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True) 