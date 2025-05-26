import schedule
import time
import logging
from datetime import datetime, timedelta
import json
from parse_vacancies_resumes import HHAPIParser, init_db, save_vacancies_to_db, save_resumes_to_db
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
        self.roles_per_day = 4  # Количество ролей для парсинга в день
        self.current_role_index = self._load_last_role_index()

    def _load_roles(self):
        try:
            with open('roles.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Ошибка при загрузке файла ролей: {e}")
            return {"categories": []}

    def _load_last_role_index(self):
        try:
            with open('last_role_index.txt', 'r') as f:
                return int(f.read().strip())
        except:
            return 0

    def _save_last_role_index(self, index):
        try:
            with open('last_role_index.txt', 'w') as f:
                f.write(str(index))
        except Exception as e:
            logging.error(f"Ошибка при сохранении индекса роли: {e}")

    def _should_reset_daily_requests(self):
        now = datetime.now()
        if now >= self.requests_reset_time + timedelta(days=1):
            self.daily_requests = 0
            self.requests_reset_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            logging.info("Счетчик ежедневных запросов сброшен")

    def _can_make_request(self):
        self._should_reset_daily_requests()
        return self.daily_requests < self.max_daily_requests

    def _get_roles_for_today(self):
        # Собираем все ID ролей
        all_role_ids = []
        for category in self.roles_data.get('categories', []):
            for role in category.get('roles', []):
                all_role_ids.append(role['id'])

        # Если достигли конца списка, начинаем сначала
        if self.current_role_index >= len(all_role_ids):
            self.current_role_index = 0

        # Получаем роли для сегодняшнего парсинга
        today_roles = []
        for i in range(self.roles_per_day):
            if self.current_role_index + i < len(all_role_ids):
                today_roles.append(all_role_ids[self.current_role_index + i])

        # Обновляем индекс для следующего дня
        self.current_role_index = (self.current_role_index + self.roles_per_day) % len(all_role_ids)
        self._save_last_role_index(self.current_role_index)

        return today_roles

    def parse_data(self):
        if not self._can_make_request():
            logging.warning("Достигнут лимит ежедневных запросов. Парсинг отложен до следующего дня.")
            return

        logging.info("Начало парсинга данных")
        self.last_run = datetime.now()

        # Инициализируем базу данных
        init_db()

        # Получаем роли для сегодняшнего парсинга
        today_roles = self._get_roles_for_today()
        logging.info(f"Сегодня будут обработаны роли: {today_roles}")

        # Парсим данные для каждой роли
        for role_id in today_roles:
            if not self._can_make_request():
                logging.warning(f"Достигнут лимит запросов. Остановка парсинга на роли {role_id}")
                break

            logging.info(f"Парсинг данных для роли {role_id}")
            try:
                # Парсим вакансии
                logging.info("Сбор вакансий...")
                vacancies = self.parser.parse_vacancies_by_role(role_id, max_items=100)
                if vacancies:
                    save_vacancies_to_db(vacancies, role_id)
                    self.daily_requests += 1
                
                time.sleep(random.uniform(2, 4))
                
                # Парсим резюме
                logging.info("Сбор резюме...")
                resumes = self.parser.parse_resumes_by_role(role_id, max_items=100)
                if resumes:
                    save_resumes_to_db(resumes, role_id)
                    self.daily_requests += 1
                
                time.sleep(random.uniform(2, 4))
            except Exception as e:
                logging.error(f"Ошибка при парсинге роли {role_id}: {e}")
                continue

        logging.info(f"Парсинг завершен. Всего запросов сегодня: {self.daily_requests}")

def main():
    scheduler = ParserScheduler()
    
    # Планируем запуск каждый день в 3:00
    schedule.every().day.at("03:00").do(scheduler.parse_data)
    
    logging.info("Планировщик запущен")
    logging.info("Запуск запланирован каждый день в 3:00")
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # Проверяем расписание каждую минуту
        except Exception as e:
            logging.error(f"Ошибка в планировщике: {e}")
            time.sleep(300)  # При ошибке ждем 5 минут перед следующей попыткой

if __name__ == "__main__":
    main() 