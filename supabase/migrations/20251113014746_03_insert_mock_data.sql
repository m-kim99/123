/*
  # Insert Mock Data

  1. Departments
    - HR Team (인사팀)
    - Development Team (개발팀)
    - Marketing Team (마케팅팀)
    - Finance Team (회계팀)

  2. Categories
    - Recruitment documents, salary records, technical docs, etc.

  3. Documents
    - Sample documents for each category

*/

-- Insert departments
INSERT INTO departments (id, name, code)
VALUES
  ('HR001', '인사팀', 'HR001'),
  ('DEV001', '개발팀', 'DEV001'),
  ('MKT001', '마케팅팀', 'MKT001'),
  ('FIN001', '회계팀', 'FIN001')
ON CONFLICT (code) DO NOTHING;

-- Insert categories
INSERT INTO categories (name, description, department_id, nfc_registered, storage_location)
VALUES
  ('채용 문서', '신입 및 경력 채용 관련 문서', 'HR001', true, 'A동 2층 캐비닛 3'),
  ('급여 명세', '월별 급여 및 상여금 명세서', 'HR001', true, 'A동 2층 캐비닛 1'),
  ('기술 문서', '시스템 아키텍처 및 API 문서', 'DEV001', true, 'B동 3층 보관소'),
  ('프로젝트 계획서', '분기별 프로젝트 기획 및 실행 계획', 'DEV001', false, NULL),
  ('캠페인 보고서', '마케팅 캠페인 성과 분석 보고서', 'MKT001', true, 'C동 1층 서고'),
  ('예산 보고서', '월별/분기별 예산 집행 현황', 'FIN001', true, 'A동 지하 금고')
ON CONFLICT DO NOTHING;

-- Insert sample documents
INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '2024년 1분기 신입사원 채용공고.pdf',
  (SELECT id FROM categories WHERE name = '채용 문서' LIMIT 1),
  'HR001',
  '2024-01-15'::date,
  '김영희',
  false,
  '/docs/recruitment_2024_q1.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '2024년 1분기 신입사원 채용공고.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '경력직 면접 평가서_DEV001.pdf',
  (SELECT id FROM categories WHERE name = '채용 문서' LIMIT 1),
  'HR001',
  '2024-02-20'::date,
  '이철수',
  true,
  '/docs/interview_evaluation_dev001.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '경력직 면접 평가서_DEV001.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '2024년 2월 급여명세서.pdf',
  (SELECT id FROM categories WHERE name = '급여 명세' LIMIT 1),
  'HR001',
  '2024-02-28'::date,
  '박민수',
  true,
  '/docs/salary_2024_02.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '2024년 2월 급여명세서.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  'API 설계 문서 v2.3.pdf',
  (SELECT id FROM categories WHERE name = '기술 문서' LIMIT 1),
  'DEV001',
  '2024-03-05'::date,
  '정개발',
  false,
  '/docs/api_design_v2.3.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = 'API 설계 문서 v2.3.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '시스템 아키텍처 다이어그램.pdf',
  (SELECT id FROM categories WHERE name = '기술 문서' LIMIT 1),
  'DEV001',
  '2024-03-10'::date,
  '최기술',
  false,
  '/docs/system_architecture.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '시스템 아키텍처 다이어그램.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  'Q2 프로젝트 기획안.pdf',
  (SELECT id FROM categories WHERE name = '프로젝트 계획서' LIMIT 1),
  'DEV001',
  '2024-03-15'::date,
  '강프로',
  false,
  '/docs/project_plan_q2.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = 'Q2 프로젝트 기획안.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '소셜미디어 캠페인 성과보고.pdf',
  (SELECT id FROM categories WHERE name = '캠페인 보고서' LIMIT 1),
  'MKT001',
  '2024-03-20'::date,
  '임마케',
  false,
  '/docs/social_media_campaign.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '소셜미디어 캠페인 성과보고.pdf');

INSERT INTO documents (name, category_id, department_id, upload_date, uploader, classified, file_url)
SELECT 
  '2024년 3월 예산집행 현황.pdf',
  (SELECT id FROM categories WHERE name = '예산 보고서' LIMIT 1),
  'FIN001',
  '2024-03-25'::date,
  '윤회계',
  true,
  '/docs/budget_execution_2024_03.pdf'
WHERE NOT EXISTS (SELECT 1 FROM documents WHERE name = '2024년 3월 예산집행 현황.pdf');
