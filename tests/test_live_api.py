import requests
import json
import os

url = 'http://127.0.0.1:8000/api/detect/image'
img_path = 'test_data/val/images/val_road_01.jpg'

if not os.path.exists(img_path):
    print("Test image doesn't exist.")
    exit(1)

files = {'file': ('val_road_01.jpg', open(img_path, 'rb'), 'image/jpeg')}
data = {
    'road_name': 'Test Metro Highway',
    'latitude': '12.9716',
    'longitude': '77.5946',
    'traffic_importance': 'Critical',
    'nearby_facility': 'Hospital',
    'facility_risk': 'High',
    'save_to_database': 'false'
}

response = requests.post(url, files=files, data=data)
print('HTTP Status:', response.status_code)
res = response.json()
print('Success:', res.get('success'))
print('Detected:', res.get('detected'))
print('Damage Count:', res.get('count'))
print('Annotated Image URL:', res.get('annotated_image_path'))
print('Crops Count:', len(res.get('crops', [])))
for c in res.get('crops', []):
    print(f"  Crop #{c.get('detection_id')}: {c.get('crop_path')} ({c.get('width')}x{c.get('height')}px, {c.get('severity')}, {round(c.get('confidence')*100, 1)}%)")
print('Summary:', res.get('summary'))

