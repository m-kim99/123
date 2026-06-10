


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auto_grant_permission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO user_permissions (user_id, department_id, company_id, can_read, can_write, can_upload, can_delete, can_download, can_share, can_print)
    VALUES (NEW.user_id, NEW.department_id, NEW.company_id, true, false, false, false, true, false, true)
    ON CONFLICT (user_id, department_id) DO UPDATE
    SET can_read = true,
        can_download = true,
        can_print = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_grant_permission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_document_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_max_documents integer;
  v_current_count integer;
BEGIN
  -- 회사의 활성 구독에서 플랜의 max_documents 조회
  SELECT p.max_documents INTO v_max_documents
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = NEW.company_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  -- 구독이 없으면 free 플랜 기본값 (100)
  IF v_max_documents IS NULL THEN
    SELECT max_documents INTO v_max_documents
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  -- max_documents가 NULL이면 무제한 (enterprise)
  IF v_max_documents IS NULL THEN
    RETURN NEW;
  END IF;

  -- 현재 활성 문서 수 (soft-deleted 제외)
  SELECT COUNT(*) INTO v_current_count
  FROM public.documents
  WHERE company_id = NEW.company_id
    AND deleted_at IS NULL;

  -- 제한 초과 시 INSERT 차단
  IF v_current_count >= v_max_documents THEN
    RAISE EXCEPTION 'PLAN_DOCUMENT_LIMIT_REACHED: 현재 플랜의 문서 한도(%개)를 초과했습니다. 플랜을 업그레이드하거나 기존 문서를 삭제해주세요.', v_max_documents;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_document_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_member_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_company_id uuid;
  v_current_count integer;
  v_max_members integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.company_id IS NULL) OR (OLD.company_id IS NOT DISTINCT FROM NEW.company_id) THEN
      RETURN NEW;
    END IF;
    v_company_id := NEW.company_id;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.users
  WHERE company_id = v_company_id
    AND id != NEW.id;

  SELECT p.max_members INTO v_max_members
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = v_company_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_max_members IS NULL THEN
    SELECT max_members INTO v_max_members
    FROM public.plans
    WHERE name = 'free';
  END IF;

  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION '회사 멤버 수 제한에 도달했습니다. (현재: %명 / 최대: %명) 플랜을 업그레이드해주세요.', v_current_count, v_max_members;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_member_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, department_id, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'team',
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_operator"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM operators                                                                                              
      WHERE id = auth.uid() AND is_active = true
    );
  END;
  $$;


ALTER FUNCTION "public"."is_operator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_account_deletion_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_account_deletion_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_permissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_permissions_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_deletion_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "announcement_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comments_content_length" CHECK (("char_length"("content") > 0))
);


ALTER TABLE "public"."announcement_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "allow_comments" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "announcements_content_length" CHECK (("char_length"("content") > 0)),
    CONSTRAINT "announcements_title_length" CHECK (("char_length"("title") > 0))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "department_id" "uuid",
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS '대분류 카테고리 - 문서의 주요 분류';



CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'bot'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "code" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(10) NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "description" "text",
    "company_id" "uuid"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "file_path" character varying(500) NOT NULL,
    "file_size" integer,
    "ocr_text" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "is_classified" boolean DEFAULT false,
    "department_id" "uuid",
    "embedding" "extensions"."vector"(768),
    "company_id" "uuid",
    "subcategory_id" "uuid",
    "parent_category_id" "uuid",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inquiry_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inquiry_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inquiry_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nfc_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_id" character varying(100) NOT NULL,
    "subcategory_id" "uuid",
    "registered_by" "uuid",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone,
    "access_count" integer DEFAULT 0
);


ALTER TABLE "public"."nfc_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nfc_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subcategory_id" "uuid",
    "tag_uid" character varying(100) NOT NULL,
    "tag_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."nfc_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "document_id" "uuid",
    "company_id" "uuid" NOT NULL,
    "department_id" "uuid",
    "parent_category_id" "uuid",
    "subcategory_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_user_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{"members": true, "notices": true, "reports": true, "inquiries": true}'::"jsonb",
    "is_super" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone
);


ALTER TABLE "public"."operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "department_id" "uuid",
    "company_id" "uuid",
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "processed_by" "uuid",
    CONSTRAINT "permission_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."permission_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "otp_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "send_count" integer DEFAULT 1 NOT NULL,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_at" timestamp with time zone,
    "consumed_at" timestamp with time zone,
    "consumed_for_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "price_monthly" integer DEFAULT 0 NOT NULL,
    "price_yearly" integer DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'KRW'::"text" NOT NULL,
    "max_members" integer DEFAULT 5,
    "max_departments" integer DEFAULT 2,
    "max_documents" integer DEFAULT 100,
    "max_storage_mb" integer DEFAULT 1024,
    "max_ai_queries_monthly" integer DEFAULT 20,
    "max_nfc_tags" integer DEFAULT 0,
    "feature_ai_chat" boolean DEFAULT false,
    "feature_vector_search" boolean DEFAULT false,
    "feature_nfc" boolean DEFAULT false,
    "feature_ocr_advanced" boolean DEFAULT false,
    "feature_external_share" boolean DEFAULT false,
    "feature_statistics_advanced" boolean DEFAULT false,
    "feature_api_access" boolean DEFAULT false,
    "feature_audit_log" boolean DEFAULT false,
    "feature_custom_branding" boolean DEFAULT false,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "action_taken" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "query" "text" NOT NULL,
    "searched_at" timestamp with time zone DEFAULT "now"(),
    "search_count" integer DEFAULT 1,
    "company_id" "uuid"
);


ALTER TABLE "public"."search_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "shared_by_user_id" "uuid" NOT NULL,
    "shared_to_user_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "message" "text",
    "shared_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shared_documents_permission_check" CHECK (("permission" = ANY (ARRAY['view'::"text", 'download'::"text"])))
);


ALTER TABLE "public"."shared_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "parent_category_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "nfc_tag_id" character varying,
    "nfc_registered" boolean DEFAULT false,
    "storage_location" "text",
    "company_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "default_expiry_days" integer,
    "expiry_date" timestamp with time zone,
    "color_label" character varying(6) DEFAULT NULL::character varying,
    "management_number" "text"
);


ALTER TABLE "public"."subcategories" OWNER TO "postgres";


COMMENT ON TABLE "public"."subcategories" IS '세부 카테고리 - NFC 태그 단위 분류 (4단 구조)';



COMMENT ON COLUMN "public"."subcategories"."parent_category_id" IS '상위 대분류 카테고리 참조';



COMMENT ON COLUMN "public"."subcategories"."nfc_tag_id" IS 'NFC 태그 ID (nfc_mappings 연결용)';



COMMENT ON COLUMN "public"."subcategories"."default_expiry_days" IS '기본 만료일 (일수). null이면 만료 없음';



COMMENT ON COLUMN "public"."subcategories"."color_label" IS 'Hex color code (without #) for visual color label on subcategory cards';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_customer_id" "text",
    "payment_subscription_id" "text",
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone DEFAULT "now"(),
    "current_period_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_notices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "is_active" boolean DEFAULT true,
    "target_audience" "text" DEFAULT 'all'::"text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."system_notices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "documents_uploaded" integer DEFAULT 0 NOT NULL,
    "ai_queries_used" integer DEFAULT 0 NOT NULL,
    "storage_used_mb" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subcategory_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorites" IS '사용자별 즐겨찾기한 세부 카테고리';



CREATE TABLE IF NOT EXISTS "public"."user_notification_muted_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_category_id" "uuid" NOT NULL,
    "muted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_muted_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_muted_categories" IS '사용자별 음소거한 대분류 카테고리';



CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "document_created" boolean DEFAULT true,
    "document_deleted" boolean DEFAULT true,
    "document_shared" boolean DEFAULT true,
    "category_changes" boolean DEFAULT true,
    "expiry_alerts" boolean DEFAULT true,
    "notify_my_department_only" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_preferences" IS '사용자별 알림 설정 (어떤 알림을 받을지)';



COMMENT ON COLUMN "public"."user_notification_preferences"."document_created" IS '문서 등록 알림 받기';



COMMENT ON COLUMN "public"."user_notification_preferences"."document_deleted" IS '문서 삭제 알림 받기';



COMMENT ON COLUMN "public"."user_notification_preferences"."document_shared" IS '문서 공유 알림 받기';



COMMENT ON COLUMN "public"."user_notification_preferences"."category_changes" IS '카테고리 생성/삭제 알림 받기';



COMMENT ON COLUMN "public"."user_notification_preferences"."expiry_alerts" IS '만료 알림 받기 (7일/30일/만료됨)';



COMMENT ON COLUMN "public"."user_notification_preferences"."notify_my_department_only" IS '내 부서 알림만 받기 (관리자용)';



CREATE TABLE IF NOT EXISTS "public"."user_notification_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false,
    "is_dismissed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "department_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    CONSTRAINT "user_permissions_role_check" CHECK (("role" = ANY (ARRAY['none'::"text", 'viewer'::"text", 'editor'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_permissions" IS '역할 기반 부서별 접근 권한 관리
- none: 접근 불가
- viewer: 읽기, 다운로드, 출력만 가능
- editor: viewer + 업로드, 수정 가능 (자기 문서만)
- manager: editor + 모든 문서 삭제, 공유, NFC 등록 가능';



COMMENT ON COLUMN "public"."user_permissions"."user_id" IS '권한 부여 대상 사용자 ID';



COMMENT ON COLUMN "public"."user_permissions"."department_id" IS '권한이 적용되는 부서 ID';



COMMENT ON COLUMN "public"."user_permissions"."company_id" IS '멀티테넌시: 회사 ID';



COMMENT ON COLUMN "public"."user_permissions"."role" IS '사용자 역할: none, viewer, editor, manager';



CREATE TABLE IF NOT EXISTS "public"."user_recent_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subcategory_id" "uuid" NOT NULL,
    "parent_category_id" "uuid",
    "department_id" "uuid",
    "company_id" "uuid",
    "visited_at" timestamp with time zone DEFAULT "now"(),
    "visit_count" integer DEFAULT 1
);


ALTER TABLE "public"."user_recent_visits" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_recent_visits" IS '사용자별 세부 카테고리 방문 기록';



CREATE TABLE IF NOT EXISTS "public"."user_suspensions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "suspended_by" "uuid" NOT NULL,
    "suspended_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "lifted_at" timestamp with time zone,
    "lifted_by" "uuid"
);


ALTER TABLE "public"."user_suspensions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255),
    "name" character varying(100),
    "role" character varying(20),
    "department_id" "uuid",
    "created_at" timestamp without time zone,
    "company_id" "uuid",
    "push_id" character varying(64),
    "preferences" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."push_id" IS 'OneSignal 푸시 알림용 Player ID (앱 재설치 시 갱신됨)';



COMMENT ON COLUMN "public"."users"."preferences" IS 'User preferences (theme, language, etc.)';



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcement_comments"
    ADD CONSTRAINT "announcement_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiry_replies"
    ADD CONSTRAINT "inquiry_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfc_mappings"
    ADD CONSTRAINT "nfc_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfc_mappings"
    ADD CONSTRAINT "nfc_mappings_tag_id_key" UNIQUE ("tag_id");



ALTER TABLE ONLY "public"."nfc_tags"
    ADD CONSTRAINT "nfc_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfc_tags"
    ADD CONSTRAINT "nfc_tags_tag_uid_key" UNIQUE ("tag_uid");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_requests"
    ADD CONSTRAINT "permission_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verifications"
    ADD CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_documents"
    ADD CONSTRAINT "shared_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_notices"
    ADD CONSTRAINT "system_notices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_unique" UNIQUE ("company_id", "period_start");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_user_id_subcategory_id_key" UNIQUE ("user_id", "subcategory_id");



ALTER TABLE ONLY "public"."user_notification_muted_categories"
    ADD CONSTRAINT "user_notification_muted_categori_user_id_parent_category_id_key" UNIQUE ("user_id", "parent_category_id");



ALTER TABLE ONLY "public"."user_notification_muted_categories"
    ADD CONSTRAINT "user_notification_muted_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."user_notification_status"
    ADD CONSTRAINT "user_notification_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_status"
    ADD CONSTRAINT "user_notification_status_user_id_notification_id_key" UNIQUE ("user_id", "notification_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_department_id_key" UNIQUE ("user_id", "department_id");



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "user_recent_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_suspensions"
    ADD CONSTRAINT "user_suspensions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_suspensions"
    ADD CONSTRAINT "user_suspensions_user_id_suspended_at_key" UNIQUE ("user_id", "suspended_at");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_account_deletion_requests_scheduled" ON "public"."account_deletion_requests" USING "btree" ("scheduled_deletion_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_account_deletion_requests_status" ON "public"."account_deletion_requests" USING "btree" ("status");



CREATE INDEX "idx_account_deletion_requests_user_id" ON "public"."account_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_announcement_comments_announcement_id" ON "public"."announcement_comments" USING "btree" ("announcement_id");



CREATE INDEX "idx_announcement_comments_user_id" ON "public"."announcement_comments" USING "btree" ("user_id");



CREATE INDEX "idx_announcements_company_id" ON "public"."announcements" USING "btree" ("company_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_categories_company_id" ON "public"."categories" USING "btree" ("company_id");



CREATE INDEX "idx_chat_messages_created_at" ON "public"."chat_messages" USING "btree" ("created_at");



CREATE INDEX "idx_chat_messages_user_id" ON "public"."chat_messages" USING "btree" ("user_id");



CREATE INDEX "idx_companies_code" ON "public"."companies" USING "btree" ("code");



CREATE INDEX "idx_departments_company_id" ON "public"."departments" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_departments_company_id_code_unique" ON "public"."departments" USING "btree" ("company_id", "code");



CREATE INDEX "idx_documents_company_id" ON "public"."documents" USING "btree" ("company_id");



CREATE INDEX "idx_documents_deleted_at" ON "public"."documents" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_documents_parent_category_id" ON "public"."documents" USING "btree" ("parent_category_id");



CREATE INDEX "idx_documents_subcategory_id" ON "public"."documents" USING "btree" ("subcategory_id");



CREATE INDEX "idx_documents_trashed" ON "public"."documents" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_muted_categories_parent_category_id" ON "public"."user_notification_muted_categories" USING "btree" ("parent_category_id");



CREATE INDEX "idx_muted_categories_user_id" ON "public"."user_notification_muted_categories" USING "btree" ("user_id");



CREATE INDEX "idx_nfc_category_id" ON "public"."nfc_mappings" USING "btree" ("subcategory_id");



CREATE INDEX "idx_nfc_mappings_category_id" ON "public"."nfc_mappings" USING "btree" ("subcategory_id");



CREATE INDEX "idx_nfc_mappings_tag_id" ON "public"."nfc_mappings" USING "btree" ("tag_id");



CREATE INDEX "idx_nfc_tag_id" ON "public"."nfc_mappings" USING "btree" ("tag_id");



CREATE INDEX "idx_nfc_tags_company_id" ON "public"."nfc_tags" USING "btree" ("company_id");



CREATE INDEX "idx_notifications_target_user_id" ON "public"."notifications" USING "btree" ("target_user_id");



CREATE INDEX "idx_permission_requests_company_id" ON "public"."permission_requests" USING "btree" ("company_id");



CREATE INDEX "idx_permission_requests_department_id" ON "public"."permission_requests" USING "btree" ("department_id");



CREATE INDEX "idx_permission_requests_status" ON "public"."permission_requests" USING "btree" ("status");



CREATE INDEX "idx_permission_requests_user_id" ON "public"."permission_requests" USING "btree" ("user_id");



CREATE INDEX "idx_phone_verifications_expires_at" ON "public"."phone_verifications" USING "btree" ("expires_at");



CREATE INDEX "idx_phone_verifications_phone_purpose_created_at" ON "public"."phone_verifications" USING "btree" ("phone", "purpose", "created_at" DESC);



CREATE INDEX "idx_search_history_company_id" ON "public"."search_history" USING "btree" ("company_id");



CREATE INDEX "idx_search_history_query" ON "public"."search_history" USING "btree" ("query");



CREATE INDEX "idx_search_history_search_count" ON "public"."search_history" USING "btree" ("search_count" DESC);



CREATE INDEX "idx_search_history_searched_at" ON "public"."search_history" USING "btree" ("searched_at" DESC);



CREATE INDEX "idx_search_history_user_id" ON "public"."search_history" USING "btree" ("user_id");



CREATE INDEX "idx_shared_documents_document_id" ON "public"."shared_documents" USING "btree" ("document_id");



CREATE INDEX "idx_shared_documents_shared_at" ON "public"."shared_documents" USING "btree" ("shared_at" DESC);



CREATE INDEX "idx_shared_documents_shared_by" ON "public"."shared_documents" USING "btree" ("shared_by_user_id");



CREATE INDEX "idx_shared_documents_shared_to" ON "public"."shared_documents" USING "btree" ("shared_to_user_id");



CREATE INDEX "idx_subcategories_company_id" ON "public"."subcategories" USING "btree" ("company_id");



CREATE INDEX "idx_subcategories_default_expiry_days" ON "public"."subcategories" USING "btree" ("default_expiry_days") WHERE ("default_expiry_days" IS NOT NULL);



CREATE INDEX "idx_subcategories_department_id" ON "public"."subcategories" USING "btree" ("department_id");



CREATE INDEX "idx_subcategories_dept_parent" ON "public"."subcategories" USING "btree" ("department_id", "parent_category_id");



CREATE INDEX "idx_subcategories_expiry_date" ON "public"."subcategories" USING "btree" ("expiry_date" DESC) WHERE ("expiry_date" IS NOT NULL);



CREATE INDEX "idx_subcategories_management_number" ON "public"."subcategories" USING "btree" ("management_number");



CREATE INDEX "idx_subcategories_nfc_tag_id" ON "public"."subcategories" USING "btree" ("nfc_tag_id") WHERE ("nfc_tag_id" IS NOT NULL);



CREATE INDEX "idx_subcategories_parent_category_id" ON "public"."subcategories" USING "btree" ("parent_category_id");



CREATE UNIQUE INDEX "idx_subscriptions_company_active" ON "public"."subscriptions" USING "btree" ("company_id") WHERE ("status" = ANY (ARRAY['active'::"text", 'trialing'::"text"]));



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_unique_pending_deletion" ON "public"."account_deletion_requests" USING "btree" ("user_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_usage_tracking_company_period" ON "public"."usage_tracking" USING "btree" ("company_id", "period_start" DESC);



CREATE INDEX "idx_user_favorites_company_id" ON "public"."user_favorites" USING "btree" ("company_id");



CREATE INDEX "idx_user_favorites_subcategory_id" ON "public"."user_favorites" USING "btree" ("subcategory_id");



CREATE INDEX "idx_user_favorites_user_id" ON "public"."user_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_preferences_company_id" ON "public"."user_notification_preferences" USING "btree" ("company_id");



CREATE INDEX "idx_user_notification_preferences_user_id" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_notification_status_notification_id" ON "public"."user_notification_status" USING "btree" ("notification_id");



CREATE INDEX "idx_user_notification_status_user_id" ON "public"."user_notification_status" USING "btree" ("user_id");



CREATE INDEX "idx_user_permissions_company_id" ON "public"."user_permissions" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_user_permissions_department_id" ON "public"."user_permissions" USING "btree" ("department_id");



CREATE INDEX "idx_user_permissions_lookup" ON "public"."user_permissions" USING "btree" ("user_id", "department_id", "company_id");



CREATE INDEX "idx_user_permissions_role" ON "public"."user_permissions" USING "btree" ("role");



CREATE INDEX "idx_user_permissions_user_id" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_recent_visits_company_id" ON "public"."user_recent_visits" USING "btree" ("company_id");



CREATE INDEX "idx_user_recent_visits_subcategory_id" ON "public"."user_recent_visits" USING "btree" ("subcategory_id");



CREATE INDEX "idx_user_recent_visits_user_id" ON "public"."user_recent_visits" USING "btree" ("user_id");



CREATE INDEX "idx_user_recent_visits_visited_at" ON "public"."user_recent_visits" USING "btree" ("visited_at" DESC);



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_department_id" ON "public"."users" USING "btree" ("department_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_push_id" ON "public"."users" USING "btree" ("push_id") WHERE ("push_id" IS NOT NULL);



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "check_document_limit_before_insert" BEFORE INSERT ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."check_document_limit"();



CREATE OR REPLACE TRIGGER "check_member_limit_before_insert" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."check_member_limit"();



CREATE OR REPLACE TRIGGER "check_member_limit_before_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."check_member_limit"();



CREATE OR REPLACE TRIGGER "plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_user_permissions_updated_at" BEFORE UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_permissions_updated_at"();



CREATE OR REPLACE TRIGGER "subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_auto_grant_permission" AFTER UPDATE ON "public"."permission_requests" FOR EACH ROW EXECUTE FUNCTION "public"."auto_grant_permission"();



CREATE OR REPLACE TRIGGER "trigger_update_account_deletion_requests_updated_at" BEFORE UPDATE ON "public"."account_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_account_deletion_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_permissions_updated_at" BEFORE UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "usage_tracking_updated_at" BEFORE UPDATE ON "public"."usage_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_comments"
    ADD CONSTRAINT "announcement_comments_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_comments"
    ADD CONSTRAINT "announcement_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."permission_requests"
    ADD CONSTRAINT "fk_permission_requests_processed_by" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."permission_requests"
    ADD CONSTRAINT "fk_permission_requests_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "fk_user_favorites_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "fk_user_permissions_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "fk_user_recent_visits_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_users_departments" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inquiry_replies"
    ADD CONSTRAINT "inquiry_replies_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inquiry_replies"
    ADD CONSTRAINT "inquiry_replies_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."nfc_mappings"
    ADD CONSTRAINT "nfc_mappings_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nfc_mappings"
    ADD CONSTRAINT "nfc_mappings_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nfc_tags"
    ADD CONSTRAINT "nfc_tags_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nfc_tags"
    ADD CONSTRAINT "nfc_tags_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_requests"
    ADD CONSTRAINT "permission_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_requests"
    ADD CONSTRAINT "permission_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."system_notices"
    ADD CONSTRAINT "system_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_muted_categories"
    ADD CONSTRAINT "user_notification_muted_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_muted_categories"
    ADD CONSTRAINT "user_notification_muted_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_status"
    ADD CONSTRAINT "user_notification_status_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "user_recent_visits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "user_recent_visits_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "user_recent_visits_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recent_visits"
    ADD CONSTRAINT "user_recent_visits_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_suspensions"
    ADD CONSTRAINT "user_suspensions_lifted_by_fkey" FOREIGN KEY ("lifted_by") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."user_suspensions"
    ADD CONSTRAINT "user_suspensions_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."user_suspensions"
    ADD CONSTRAINT "user_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can create announcements" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text") AND ("users"."company_id" = "announcements"."company_id")))));



CREATE POLICY "Admins can delete announcements" ON "public"."announcements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage subscriptions" ON "public"."subscriptions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text") AND ("users"."company_id" = "subscriptions"."company_id")))));



CREATE POLICY "Admins can update announcements" ON "public"."announcements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view all permissions" ON "public"."user_permissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Anyone can create companies for signup" ON "public"."companies" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anyone can read active notices" ON "public"."system_notices" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can read companies" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view active plans" ON "public"."plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view companies for signup" ON "public"."companies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Authenticated users can create companies" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert companies" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can view all companies for verification" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Enable insert for authenticated users" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for users based on id" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Managers can create NFC tags" ON "public"."nfc_tags" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."subcategories" "s"
     JOIN "public"."user_permissions" "up" ON (("up"."department_id" = "s"."department_id")))
  WHERE (("s"."id" = "nfc_tags"."subcategory_id") AND ("up"."user_id" = "auth"."uid"()) AND ("up"."role" = 'manager'::"text")))))));



CREATE POLICY "Managers can register NFC tags" ON "public"."nfc_mappings" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."subcategories" "s"
     JOIN "public"."user_permissions" "up" ON (("up"."department_id" = "s"."department_id")))
  WHERE (("s"."id" = "nfc_mappings"."subcategory_id") AND ("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['manager'::"text", 'editor'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Managers can update NFC mappings" ON "public"."nfc_mappings" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."subcategories" "s"
     JOIN "public"."user_permissions" "up" ON (("up"."department_id" = "s"."department_id")))
  WHERE (("s"."id" = "nfc_mappings"."subcategory_id") AND ("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['manager'::"text", 'editor'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Only admins can delete departments" ON "public"."departments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Only admins can delete permissions" ON "public"."user_permissions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert departments" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert permissions" ON "public"."user_permissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Only admins can update departments" ON "public"."departments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Only admins can update permissions" ON "public"."user_permissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Operators can manage notices" ON "public"."system_notices" USING (("auth"."uid"() IN ( SELECT "operators"."id"
   FROM "public"."operators")));



CREATE POLICY "Operators can manage reports" ON "public"."reports" USING (("auth"."uid"() IN ( SELECT "operators"."id"
   FROM "public"."operators")));



CREATE POLICY "Operators can manage suspensions" ON "public"."user_suspensions" USING (("auth"."uid"() IN ( SELECT "operators"."id"
   FROM "public"."operators")));



CREATE POLICY "Service role full access" ON "public"."phone_verifications" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can cancel own pending deletion requests" ON "public"."account_deletion_requests" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create comments on allowed announcements" ON "public"."announcement_comments" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."announcements"
  WHERE (("announcements"."id" = "announcement_comments"."announcement_id") AND ("announcements"."allow_comments" = true)))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can create own deletion requests" ON "public"."account_deletion_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can deactivate their shares" ON "public"."shared_documents" FOR UPDATE TO "authenticated" USING (("shared_by_user_id" = "auth"."uid"())) WITH CHECK (("shared_by_user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete categories with manager permission" ON "public"."categories" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "categories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can delete documents with manager permission" ON "public"."documents" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "documents"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can delete own muted categories" ON "public"."user_notification_muted_categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete subcategories with manager permission" ON "public"."subcategories" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "subcategories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can delete their own comments or admins can delete any" ON "public"."announcement_comments" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Users can delete their own favorites" ON "public"."user_favorites" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own notification status" ON "public"."user_notification_status" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their shares" ON "public"."shared_documents" FOR DELETE TO "authenticated" USING ((("shared_by_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Users can insert categories with manager permission" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "categories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can insert documents with editor permission" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "documents"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['editor'::"text", 'manager'::"text"])))))));



CREATE POLICY "Users can insert own chat messages" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own muted categories" ON "public"."user_notification_muted_categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own search history" ON "public"."search_history" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert subcategories with manager permission" ON "public"."subcategories" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "subcategories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can insert their own favorites" ON "public"."user_favorites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own notification status" ON "public"."user_notification_status" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own recent visits" ON "public"."user_recent_visits" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can share their documents" ON "public"."shared_documents" FOR INSERT TO "authenticated" WITH CHECK (("shared_by_user_id" = "auth"."uid"()));



CREATE POLICY "Users can update categories with manager permission" ON "public"."categories" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "categories"."department_id") AND ("user_permissions"."role" = 'manager'::"text")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "categories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can update documents with editor permission" ON "public"."documents" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "documents"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['editor'::"text", 'manager'::"text"]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "documents"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['editor'::"text", 'manager'::"text"])))))));



CREATE POLICY "Users can update own preferences" ON "public"."user_notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own search history" ON "public"."search_history" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update subcategories with manager permission" ON "public"."subcategories" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "subcategories"."department_id") AND ("user_permissions"."role" = 'manager'::"text")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "subcategories"."department_id") AND ("user_permissions"."role" = 'manager'::"text"))))));



CREATE POLICY "Users can update their own comments" ON "public"."announcement_comments" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own company" ON "public"."companies" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own notification status" ON "public"."user_notification_status" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own recent visits" ON "public"."user_recent_visits" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view NFC mappings in their company" ON "public"."nfc_mappings" FOR SELECT TO "authenticated" USING (("subcategory_id" IN ( SELECT "subcategories"."id"
   FROM "public"."subcategories"
  WHERE ("subcategories"."company_id" = ( SELECT "users"."company_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view NFC tags in their company" ON "public"."nfc_tags" FOR SELECT TO "authenticated" USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view announcements from their company" ON "public"."announcements" FOR SELECT TO "authenticated" USING (("company_id" IN ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view categories they have access to" ON "public"."categories" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "categories"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['viewer'::"text", 'editor'::"text", 'manager'::"text"])))))));



CREATE POLICY "Users can view comments from their company announcements" ON "public"."announcement_comments" FOR SELECT TO "authenticated" USING (("announcement_id" IN ( SELECT "announcements"."id"
   FROM "public"."announcements"
  WHERE ("announcements"."company_id" IN ( SELECT "users"."company_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view documents they have access to" ON "public"."documents" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "documents"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['viewer'::"text", 'editor'::"text", 'manager'::"text"])))))));



CREATE POLICY "Users can view notifications from their company" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own chat messages" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own company subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own company usage" ON "public"."usage_tracking" FOR SELECT TO "authenticated" USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own deletion requests" ON "public"."account_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own muted categories" ON "public"."user_notification_muted_categories" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own preferences" ON "public"."user_notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own search history" ON "public"."search_history" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view shared documents" ON "public"."shared_documents" FOR SELECT TO "authenticated" USING ((("shared_by_user_id" = "auth"."uid"()) OR ("shared_to_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "Users can view subcategories they have access to" ON "public"."subcategories" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))) OR ("department_id" = ( SELECT "users"."department_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_permissions"
  WHERE (("user_permissions"."user_id" = "auth"."uid"()) AND ("user_permissions"."department_id" = "subcategories"."department_id") AND ("user_permissions"."role" = ANY (ARRAY['viewer'::"text", 'editor'::"text", 'manager'::"text"])))))));



CREATE POLICY "Users can view their own favorites" ON "public"."user_favorites" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notification status" ON "public"."user_notification_status" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own permissions" ON "public"."user_permissions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own recent visits" ON "public"."user_recent_visits" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcement_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_user_update_own_operator" ON "public"."operators" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "auth_user_view_own_operator" ON "public"."operators" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inquiry_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nfc_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nfc_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_notices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_muted_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_recent_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_suspensions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_grant_permission"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_grant_permission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_grant_permission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_document_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_document_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_document_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_member_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_member_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_member_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_operator"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_operator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_operator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_account_deletion_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_account_deletion_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_account_deletion_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_permissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_permissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_permissions_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."account_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_comments" TO "anon";
GRANT ALL ON TABLE "public"."announcement_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_comments" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."inquiries" TO "anon";
GRANT ALL ON TABLE "public"."inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."inquiry_replies" TO "anon";
GRANT ALL ON TABLE "public"."inquiry_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiry_replies" TO "service_role";



GRANT ALL ON TABLE "public"."nfc_mappings" TO "anon";
GRANT ALL ON TABLE "public"."nfc_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."nfc_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."nfc_tags" TO "anon";
GRANT ALL ON TABLE "public"."nfc_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."nfc_tags" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."operators" TO "anon";
GRANT ALL ON TABLE "public"."operators" TO "authenticated";
GRANT ALL ON TABLE "public"."operators" TO "service_role";



GRANT ALL ON TABLE "public"."permission_requests" TO "anon";
GRANT ALL ON TABLE "public"."permission_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_requests" TO "service_role";



GRANT ALL ON TABLE "public"."phone_verifications" TO "anon";
GRANT ALL ON TABLE "public"."phone_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."search_history" TO "anon";
GRANT ALL ON TABLE "public"."search_history" TO "authenticated";
GRANT ALL ON TABLE "public"."search_history" TO "service_role";



GRANT ALL ON TABLE "public"."shared_documents" TO "anon";
GRANT ALL ON TABLE "public"."shared_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_documents" TO "service_role";



GRANT ALL ON TABLE "public"."subcategories" TO "anon";
GRANT ALL ON TABLE "public"."subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."system_notices" TO "anon";
GRANT ALL ON TABLE "public"."system_notices" TO "authenticated";
GRANT ALL ON TABLE "public"."system_notices" TO "service_role";



GRANT ALL ON TABLE "public"."usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_muted_categories" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_muted_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_muted_categories" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_status" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_recent_visits" TO "anon";
GRANT ALL ON TABLE "public"."user_recent_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_recent_visits" TO "service_role";



GRANT ALL ON TABLE "public"."user_suspensions" TO "anon";
GRANT ALL ON TABLE "public"."user_suspensions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_suspensions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







