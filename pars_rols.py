import requests
import json

response = requests.get('https://api.hh.ru/professional_roles')
roles_data = response.json()

with open('roles.json', 'w', encoding='utf-8') as f:
    json.dump(roles_data, f, ensure_ascii=False, indent=2)

print("Первые 10 ролей:")
for role in roles_data['categories'][0]['roles'][:10]:
    print(f"ID: {role['id']}, Name: {role['name']}")