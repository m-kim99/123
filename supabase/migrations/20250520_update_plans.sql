-- ============================================================
-- Migration: 플랜 4종 체계로 변경
-- 날짜: 2025-05-20
-- 설명: free(유지) + basic(신규) + pro(변경) + enterprise(변경)
-- ============================================================

-- 1. 기존 pro, enterprise 삭제 후 재삽입 (구독 연결 없을 때만 안전)
DELETE FROM public.plans WHERE name IN ('pro', 'enterprise');

-- 2. basic 플랜 신규 삽입
INSERT INTO public.plans (
  name, display_name, price_monthly, price_yearly,
  max_members, max_departments, max_documents, max_storage_mb, max_ai_queries_monthly, max_nfc_tags,
  feature_ai_chat, feature_vector_search, feature_nfc, feature_ocr_advanced,
  feature_external_share, feature_statistics_advanced, feature_api_access, feature_audit_log, feature_custom_branding,
  sort_order
) VALUES (
  'basic', '베이직', 5900, 59000,
  3, 2, 200, 2048, 50, 0,
  true, false, false, false,
  false, false, false, false, false,
  1
);

-- 3. pro 플랜 재삽입
INSERT INTO public.plans (
  name, display_name, price_monthly, price_yearly,
  max_members, max_departments, max_documents, max_storage_mb, max_ai_queries_monthly, max_nfc_tags,
  feature_ai_chat, feature_vector_search, feature_nfc, feature_ocr_advanced,
  feature_external_share, feature_statistics_advanced, feature_api_access, feature_audit_log, feature_custom_branding,
  sort_order
) VALUES (
  'pro', 'Pro', 29900, 299000,
  10, 10, 1000, 10240, 200, 20,
  true, true, true, true,
  true, true, false, false, false,
  2
);

-- 4. enterprise 플랜 재삽입
INSERT INTO public.plans (
  name, display_name, price_monthly, price_yearly,
  max_members, max_departments, max_documents, max_storage_mb, max_ai_queries_monthly, max_nfc_tags,
  feature_ai_chat, feature_vector_search, feature_nfc, feature_ocr_advanced,
  feature_external_share, feature_statistics_advanced, feature_api_access, feature_audit_log, feature_custom_branding,
  sort_order
) VALUES (
  'enterprise', 'Enterprise', 0, 0,
  NULL, NULL, NULL, NULL, NULL, NULL,
  true, true, true, true,
  true, true, true, true, true,
  3
);
