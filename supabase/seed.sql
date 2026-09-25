-- Seed generado desde scripts/medications_dataset.csv
-- Se ejecuta automáticamente tras las migraciones en `supabase db reset`.

-- Paciente demo: su UUID fijo es el que usa el backend como usuario simulado (DEMO_PATIENT_ID)
insert into patients (id, full_name, email) values
  ('00000000-0000-0000-0000-000000000001', 'Juan Pérez', 'paciente@ejemplo.com');

-- Categorías terapéuticas (valores únicos del dataset)
insert into categories (name) values
  ('Analgésico'),
  ('Antibiótico'),
  ('Antidiabético'),
  ('Antihipertensivo'),
  ('Antihistamínico'),
  ('Antiinflamatorio'),
  ('Antisecretor'),
  ('Broncodilatador'),
  ('Corticosteroide'),
  ('Hipolipemiante');

-- Medicamentos (50 registros)
insert into medications (commercial_name, active_ingredient, category_id, laboratory, presentation, price, stock, requires_prescription, indications, contraindications)
select v.commercial_name, v.active_ingredient, c.id, v.laboratory, v.presentation, v.price, v.stock, v.requires_prescription, v.indications, v.contraindications
from (values
  ('Paracetamol', 'Acetaminofén', 'Analgésico', 'Bayer', 'Tabletas 500mg x 20', 15000.0, 100, False, 'Dolor leve a moderado fiebre', 'Alergia al acetaminofén'),
  ('Ibuprofeno', 'Ibuprofeno', 'Antiinflamatorio', 'Genfar', 'Tabletas 400mg x 30', 18000.0, 85, False, 'Dolor inflamación fiebre', 'Ulcera gástrica embarazo'),
  ('Amoxicilina', 'Amoxicilina', 'Antibiótico', 'GSK', 'Cápsulas 500mg x 12', 32000.0, 45, True, 'Infecciones bacterianas', 'Alergia penicilinas'),
  ('Loratadina', 'Loratadina', 'Antihistamínico', 'Sanofi', 'Tabletas 10mg x 10', 12500.0, 120, False, 'Rinitis alérgica urticaria', 'Menores 2 años'),
  ('Omeprazol', 'Omeprazol', 'Antisecretor', 'Novartis', 'Cápsulas 20mg x 14', 22000.0, 75, False, 'Reflujo gastroesofágico', 'Alergia omeprazol'),
  ('Metformina', 'Metformina', 'Antidiabético', 'Merck', 'Tabletas 850mg x 30', 18500.0, 60, True, 'Diabetes tipo 2', 'Insuficiencia renal'),
  ('Atorvastatina', 'Atorvastatina', 'Hipolipemiante', 'Pfizer', 'Tabletas 20mg x 30', 28500.0, 40, True, 'Colesterol alto', 'Enfermedad hepática'),
  ('Losartán', 'Losartán', 'Antihipertensivo', 'AstraZeneca', 'Tabletas 50mg x 28', 24500.0, 55, True, 'Hipertensión arterial', 'Embarazo'),
  ('Salbutamol', 'Salbutamol', 'Broncodilatador', 'GSK', 'Inhalador 100mcg', 42500.0, 25, True, 'Asma bronquitis', 'Hipersensibilidad'),
  ('Ciprofloxacina', 'Ciprofloxacina', 'Antibiótico', 'Bayer', 'Tabletas 500mg x 10', 35000.0, 35, True, 'Infecciones bacterianas', 'Menores 18 años'),
  ('Diclofenaco', 'Diclofenaco', 'Antiinflamatorio', 'Novartis', 'Tabletas 50mg x 20', 16500.0, 70, False, 'Dolor inflamación', 'Ulcera sangrado'),
  ('Cetirizina', 'Cetirizina', 'Antihistamínico', 'Sanofi', 'Tabletas 10mg x 14', 13500.0, 95, False, 'Rinitis alérgica', 'Embarazo'),
  ('Pantoprazol', 'Pantoprazol', 'Antisecretor', 'Takeda', 'Tabletas 40mg x 14', 24000.0, 50, False, 'Reflujo gastroesofágico', 'Alergia pantoprazol'),
  ('Insulina Glargina', 'Insulina Glargina', 'Antidiabético', 'Sanofi', 'Inyectable 100UI/ml', 95000.0, 15, True, 'Diabetes tipo 1 y 2', 'Hipoglucemia'),
  ('Simvastatina', 'Simvastatina', 'Hipolipemiante', 'Merck', 'Tabletas 20mg x 30', 19500.0, 45, True, 'Colesterol alto', 'Enfermedad hepática'),
  ('Valsartán', 'Valsartán', 'Antihipertensivo', 'Novartis', 'Tabletas 160mg x 28', 26500.0, 40, True, 'Hipertensión arterial', 'Embarazo'),
  ('Budesonida', 'Budesonida', 'Corticosteroide', 'AstraZeneca', 'Inhalador 200mcg', 38500.0, 20, True, 'Asma EPOC', 'Infecciones fúngicas'),
  ('Azitromicina', 'Azitromicina', 'Antibiótico', 'Pfizer', 'Tabletas 500mg x 3', 28000.0, 30, True, 'Infecciones respiratorias', 'Alergia macrólidos'),
  ('Ketorolaco', 'Ketorolaco', 'Analgésico', 'Roche', 'Tabletas 10mg x 10', 14500.0, 65, True, 'Dolor moderado severo', 'Ulcera sangrado'),
  ('Fexofenadina', 'Fexofenadina', 'Antihistamínico', 'Sanofi', 'Tabletas 180mg x 10', 15500.0, 80, False, 'Rinitis alérgica', 'Menores 6 años'),
  ('Esomeprazol', 'Esomeprazol', 'Antisecretor', 'AstraZeneca', 'Cápsulas 40mg x 14', 27500.0, 45, False, 'Reflujo gastroesofágico', 'Alergia esomeprazol'),
  ('Metformina XR', 'Metformina', 'Antidiabético', 'Merck', 'Tabletas 1000mg x 30', 21500.0, 35, True, 'Diabetes tipo 2', 'Insuficiencia renal'),
  ('Rosuvastatina', 'Rosuvastatina', 'Hipolipemiante', 'AstraZeneca', 'Tabletas 10mg x 30', 32500.0, 25, True, 'Colesterol alto', 'Embarazo'),
  ('Telmisartán', 'Telmisartán', 'Antihipertensivo', 'Boehringer', 'Tabletas 80mg x 28', 29500.0, 30, True, 'Hipertensión arterial', 'Embarazo'),
  ('Formoterol', 'Formoterol', 'Broncodilatador', 'Novartis', 'Inhalador 12mcg', 45500.0, 18, True, 'Asma EPOC', 'Hipersensibilidad'),
  ('Levofloxacina', 'Levofloxacina', 'Antibiótico', 'Janssen', 'Tabletas 500mg x 5', 38000.0, 22, True, 'Infecciones bacterianas', 'Tendinitis'),
  ('Naproxeno', 'Naproxeno', 'Antiinflamatorio', 'Bayer', 'Tabletas 500mg x 20', 17500.0, 55, False, 'Dolor inflamación', 'Ulcera sangrado'),
  ('Desloratadina', 'Desloratadina', 'Antihistamínico', 'Merck', 'Tabletas 5mg x 10', 16500.0, 75, False, 'Rinitis alérgica', 'Menores 12 años'),
  ('Rabeprazol', 'Rabeprazol', 'Antisecretor', 'Eisai', 'Tabletas 20mg x 14', 23000.0, 40, False, 'Reflujo gastroesofágico', 'Alergia rabeprazol'),
  ('Insulina Lispro', 'Insulina Lispro', 'Antidiabético', 'Eli Lilly', 'Inyectable 100UI/ml', 88000.0, 12, True, 'Diabetes tipo 1 y 2', 'Hipoglucemia'),
  ('Pravastatina', 'Pravastatina', 'Hipolipemiante', 'Bristol', 'Tabletas 40mg x 30', 20500.0, 38, True, 'Colesterol alto', 'Enfermedad hepática'),
  ('Olmesartán', 'Olmesartán', 'Antihipertensivo', 'Daiichi', 'Tabletas 40mg x 28', 28500.0, 32, True, 'Hipertensión arterial', 'Embarazo'),
  ('Fluticasona', 'Fluticasona', 'Corticosteroide', 'GSK', 'Inhalador 250mcg', 41500.0, 16, True, 'Asma EPOC', 'Infecciones fúngicas'),
  ('Claritromicina', 'Claritromicina', 'Antibiótico', 'Abbott', 'Tabletas 500mg x 14', 31000.0, 28, True, 'Infecciones respiratorias', 'Alergia macrólidos'),
  ('Tramadol', 'Tramadol', 'Analgésico', 'Grünenthal', 'Cápsulas 50mg x 10', 19500.0, 42, True, 'Dolor moderado severo', 'Convulsiones'),
  ('Levocetirizina', 'Levocetirizina', 'Antihistamínico', 'UCB', 'Tabletas 5mg x 10', 14500.0, 85, False, 'Rinitis alérgica', 'Menores 6 años'),
  ('Dexlansoprazol', 'Dexlansoprazol', 'Antisecretor', 'Takeda', 'Cápsulas 60mg x 14', 29500.0, 28, False, 'Reflujo gastroesofágico', 'Alergia lansoprazol'),
  ('Glibenclamida', 'Glibenclamida', 'Antidiabético', 'Sanofi', 'Tabletas 5mg x 30', 12500.0, 48, True, 'Diabetes tipo 2', 'Hipoglucemia'),
  ('Atorvastatina/Exetimibe', 'Atorvastatina/Exetimibe', 'Hipolipemiante', 'MSD', 'Tabletas 10/10mg x 30', 38500.0, 20, True, 'Colesterol alto', 'Enfermedad hepática'),
  ('Perindopril', 'Perindopril', 'Antihipertensivo', 'Servier', 'Tabletas 8mg x 30', 22500.0, 36, True, 'Hipertensión arterial', 'Embarazo'),
  ('Salmeterol', 'Salmeterol', 'Broncodilatador', 'GSK', 'Inhalador 50mcg', 39500.0, 15, True, 'Asma EPOC', 'Hipersensibilidad'),
  ('Moxifloxacina', 'Moxifloxacina', 'Antibiótico', 'Bayer', 'Tabletas 400mg x 5', 42000.0, 18, True, 'Infecciones bacterianas', 'Tendinitis'),
  ('Celecoxib', 'Celecoxib', 'Antiinflamatorio', 'Pfizer', 'Cápsulas 200mg x 10', 25500.0, 32, False, 'Artritis dolor', 'Ulcera sangrado'),
  ('Bilastina', 'Bilastina', 'Antihistamínico', 'FAES', 'Tabletas 20mg x 10', 17500.0, 60, False, 'Rinitis alérgica', 'Menores 12 años'),
  ('Lansoprazol', 'Lansoprazol', 'Antisecretor', 'Takeda', 'Cápsulas 30mg x 14', 21000.0, 42, False, 'Reflujo gastroesofágico', 'Alergia lansoprazol'),
  ('Insulina Detemir', 'Insulina Detemir', 'Antidiabético', 'Novo Nordisk', 'Inyectable 100UI/ml', 92000.0, 10, True, 'Diabetes tipo 1 y 2', 'Hipoglucemia'),
  ('Fluvastatina', 'Fluvastatina', 'Hipolipemiante', 'Novartis', 'Tabletas 80mg x 30', 18500.0, 40, True, 'Colesterol alto', 'Embarazo'),
  ('Candesartán', 'Candesartán', 'Antihipertensivo', 'Takeda', 'Tabletas 32mg x 28', 27500.0, 30, True, 'Hipertensión arterial', 'Embarazo'),
  ('Beclometasona', 'Beclometasona', 'Corticosteroide', 'Chiesi', 'Inhalador 250mcg', 36500.0, 14, True, 'Asma EPOC', 'Infecciones fúngicas'),
  ('Eritromicina', 'Eritromicina', 'Antibiótico', 'Abbott', 'Tabletas 500mg x 20', 19500.0, 25, True, 'Infecciones respiratorias', 'Alergia macrólidos')
) as v(commercial_name, active_ingredient, category, laboratory, presentation, price, stock, requires_prescription, indications, contraindications)
join categories c on c.name = v.category;
