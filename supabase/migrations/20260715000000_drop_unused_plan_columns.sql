-- ============================================================
-- Migration: 미구현 기능의 빈 스키마 정리
-- 날짜: 2026-07-15
-- 설명: 뒤에 실제 기능이 없는 컬럼 제거.
--       feature_ai_chat/nfc/ocr_advanced/external_share/statistics_advanced는
--       기능이 존재하므로 유지 (게이트 연결 예정).
-- [주의] 코드 배포(Netlify) 후에 적용할 것 —
--        구버전 클라이언트가 feature_vector_search를 select하면
--        플랜 조회가 실패해 무료 기본값으로 폴백됨.
-- ============================================================

-- 1. plans: 기능 실체가 없는 플래그 4개 제거
--    (vector_search: 미구현 / api_access·audit_log·custom_branding: 엔터프라이즈 출시 전)
ALTER TABLE public.plans
  DROP COLUMN IF EXISTS feature_vector_search,
  DROP COLUMN IF EXISTS feature_api_access,
  DROP COLUMN IF EXISTS feature_audit_log,
  DROP COLUMN IF EXISTS feature_custom_branding;

-- 2. documents.embedding: 벡터 검색 미구현 — 쓰기/읽기 코드 전무, 전부 NULL
ALTER TABLE public.documents
  DROP COLUMN IF EXISTS embedding;

-- 3. usage_tracking: 문서 수·저장량은 documents 테이블 라이브 집계로 계산 —
--    이 컬럼들은 어디서도 기록하지 않음. ai_queries_used는 AI 계량용으로 유지.
ALTER TABLE public.usage_tracking
  DROP COLUMN IF EXISTS documents_uploaded,
  DROP COLUMN IF EXISTS storage_used_mb;
