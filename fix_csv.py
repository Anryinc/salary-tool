def fix_csv(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as infile, open(output_file, 'w', encoding='utf-8') as outfile:
        # Читаем заголовок
        header = infile.readline().strip()
        outfile.write(header + '\n')
        
        # Обрабатываем строки
        for line in infile:
            # Разделяем по запятым
            parts = line.strip().split(',')
            fixed_parts = [f'"{part.strip()}"' for part in parts]
            # Собираем строку обратно
            outfile.write(','.join(fixed_parts) + '\n')

# Укажи свои файлы
input_file = 'vacancies.csv'  # Исходный файл
output_file = 'vacancies_fixed.csv'  # Новый файл с кавычками
fix_csv(input_file, output_file)