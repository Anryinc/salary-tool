from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/search/positions', methods=['GET'])
def search_positions():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Поиск по вакансиям
    cursor.execute('''
        SELECT DISTINCT position 
        FROM vacancies 
        WHERE position LIKE ? 
        LIMIT 10
    ''', (f'%{query}%',))
    
    positions = [row['position'] for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(positions)

@app.route('/api/salary-data', methods=['GET'])
def get_salary_data():
    position = request.args.get('position', '')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    conn = get_db_connection()
    
    # Получаем данные о вакансиях
    vacancies_query = '''
        SELECT 
            salary_from,
            salary_to,
            parsed_date,
            experience,
            skills
        FROM vacancies
        WHERE position LIKE ?
    '''
    
    if start_date and end_date:
        vacancies_query += ' AND parsed_date BETWEEN ? AND ?'
        params = (f'%{position}%', start_date, end_date)
    else:
        params = (f'%{position}%',)
    
    vacancies_df = pd.read_sql_query(vacancies_query, conn, params=params)
    
    # Получаем данные о резюме
    resumes_query = '''
        SELECT 
            salary_from,
            salary_to,
            parsed_date,
            experience_years,
            skills
        FROM resumes
        WHERE title LIKE ?
    '''
    
    if start_date and end_date:
        resumes_query += ' AND parsed_date BETWEEN ? AND ?'
        params = (f'%{position}%', start_date, end_date)
    else:
        params = (f'%{position}%',)
    
    resumes_df = pd.read_sql_query(resumes_query, conn, params=params)
    
    conn.close()
    
    # Обработка данных для графика
    def process_salary_data(df, is_vacancy=True):
        if df.empty:
            return []
        
        # Вычисляем среднюю зарплату
        df['avg_salary'] = df.apply(
            lambda x: (x['salary_from'] + x['salary_to']) / 2 
            if pd.notnull(x['salary_from']) and pd.notnull(x['salary_to'])
            else x['salary_from'] if pd.notnull(x['salary_from'])
            else x['salary_to'] if pd.notnull(x['salary_to'])
            else None,
            axis=1
        )
        
        # Группируем по дате
        df['parsed_date'] = pd.to_datetime(df['parsed_date'])
        grouped = df.groupby(df['parsed_date'].dt.date)['avg_salary'].agg(['mean', 'count']).reset_index()
        
        return [{
            'date': row['parsed_date'].strftime('%Y-%m-%d'),
            'salary': row['mean'],
            'count': row['count']
        } for _, row in grouped.iterrows()]

    return jsonify({
        'vacancies': process_salary_data(vacancies_df, True),
        'resumes': process_salary_data(resumes_df, False)
    })

@app.route('/api/grade-stats', methods=['GET'])
def get_grade_stats():
    position = request.args.get('position', '')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    conn = get_db_connection()
    
    # Получаем статистику по грейдам для вакансий
    vacancies_query = '''
        SELECT 
            experience,
            COUNT(*) as count,
            AVG((salary_from + salary_to) / 2) as avg_salary
        FROM vacancies
        WHERE position LIKE ?
    '''
    
    if start_date and end_date:
        vacancies_query += ' AND parsed_date BETWEEN ? AND ?'
        params = (f'%{position}%', start_date, end_date)
    else:
        params = (f'%{position}%',)
    
    vacancies_query += ' GROUP BY experience'
    
    cursor = conn.cursor()
    cursor.execute(vacancies_query, params)
    vacancy_stats = [dict(row) for row in cursor.fetchall()]
    
    # Получаем статистику по грейдам для резюме
    resumes_query = '''
        SELECT 
            CASE 
                WHEN experience_years < 1 THEN 'Intern'
                WHEN experience_years < 3 THEN 'Junior'
                WHEN experience_years < 5 THEN 'Middle'
                WHEN experience_years < 7 THEN 'Senior'
                ELSE 'Lead'
            END as grade,
            COUNT(*) as count,
            AVG(salary_from) as avg_salary
        FROM resumes
        WHERE title LIKE ?
    '''
    
    if start_date and end_date:
        resumes_query += ' AND parsed_date BETWEEN ? AND ?'
        params = (f'%{position}%', start_date, end_date)
    else:
        params = (f'%{position}%',)
    
    resumes_query += ' GROUP BY grade'
    
    cursor.execute(resumes_query, params)
    resume_stats = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        'vacancies': vacancy_stats,
        'resumes': resume_stats
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 