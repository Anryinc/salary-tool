import schedule
import time
import logging
from datetime import datetime, timedelta
import json
from parse_vacancies_resumes import HHAPIParser, init_db, save_vacancies_to_db
import random

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('parser.log'),
        logging.StreamHandler()
    ]
)

class ParserScheduler:
    def __init__(self):
        self.parser = HHAPIParser()
        self.last_run = None
        self.roles_data = self._load_roles()
        self.daily_requests = 0
        self.max_daily_requests = 2000  # Максимальное количество запросов в сутки
        self.requests_reset_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    def _load_roles(self):
        try:
            with open('roles.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Ошибка при загрузке файла ролей: {e}")
            return {"categories": []}

    def _should_reset_daily_requests(self):
        now = datetime.now()
        if now >= self.requests_reset_time + timedelta(days=1):
            self.daily_requests = 0
            self.requests_reset_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            logging.info("Счетчик ежедневных запросов сброшен")

    def _can_make_request(self):
        self._should_reset_daily_requests()
        return self.daily_requests < self.max_daily_requests

    def parse_roles(self):
        if not self._can_make_request():
            logging.warning("Достигнут лимит ежедневных запросов. Парсинг отложен до следующего дня.")
            return

        logging.info("Начало парсинга вакансий")
        self.last_run = datetime.now()

        # Инициализируем базу данных
        init_db()

        # Собираем все ID ролей
        role_ids = []
        for category in self.roles_data.get('categories', []):
            for role in category.get('roles', []):
                role_ids.append(role['id'])

        # Парсим вакансии для каждой роли
        for role_id in role_ids:
            if not self._can_make_request():
                logging.warning(f"Достигнут лимит запросов. Остановка парсинга на роли {role_id}")
                break

            logging.info(f"Парсинг вакансий для роли {role_id}")
            try:
                vacancies = self.parser.parse_vacancies_by_role(role_id, max_items=100)
                if vacancies:
                    save_vacancies_to_db(vacancies, role_id)
                    self.daily_requests += 1
                
                # Случайная задержка между ролями (2-4 секунды)
                time.sleep(random.uniform(2, 4))
            except Exception as e:
                logging.error(f"Ошибка при парсинге роли {role_id}: {e}")
                continue

        logging.info(f"Парсинг завершен. Всего запросов сегодня: {self.daily_requests}")

def main():
    scheduler = ParserScheduler()
    
    # Планируем запуск каждый понедельник и четверг в 3:00
    schedule.every().monday.at("03:00").do(scheduler.parse_roles)
    schedule.every().thursday.at("03:00").do(scheduler.parse_roles)
    
    logging.info("Планировщик запущен")
    logging.info("Следующие запуски запланированы на понедельник и четверг в 3:00")
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Проверяем расписание каждую минуту
        except Exception as e:
            logging.error(f"Ошибка в планировщике: {e}")
            time.sleep(300)  # При ошибке ждем 5 минут перед следующей попыткой

if __name__ == "__main__":
    main() 