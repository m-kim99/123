--
-- PostgreSQL database dump
--

\restrict 3eWnAngPcoH6vuDS8KrctblgfT15FTgHoX7WjE3Gz1DtEtxLkSS9n27agWUZVyP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: auto_grant_permission(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_grant_permission() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.auto_grant_permission() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: match_documents(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer) RETURNS TABLE(id uuid, title text, ocr_text text, department_name text, category_name text, subcategory_name text, storage_location text, uploaded_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.ocr_text,
    dept.name AS department_name,
    cat.name AS category_name,
    sub.name AS subcategory_name,
    sub.storage_location,
    d.uploaded_at,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  LEFT JOIN departments dept ON d.department_id = dept.id
  LEFT JOIN categories cat ON d.parent_category_id = cat.id
  LEFT JOIN subcategories sub ON d.subcategory_id = sub.id
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer) OWNER TO postgres;

--
-- Name: update_account_deletion_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_account_deletion_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION public.update_account_deletion_requests_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_user_permissions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_permissions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_permissions_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_deletion_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    cancelled_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'cancelled'::text, 'completed'::text])))
);


ALTER TABLE public.account_deletion_requests OWNER TO postgres;

--
-- Name: announcement_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcement_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT comments_content_length CHECK ((char_length(content) > 0))
);


ALTER TABLE public.announcement_comments OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    allow_comments boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT announcements_content_length CHECK ((char_length(content) > 0)),
    CONSTRAINT announcements_title_length CHECK ((char_length(title) > 0))
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    department_id uuid,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    company_id uuid
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.categories IS '대분류 카테고리 - 문서의 주요 분류';


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'bot'::text])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    code text,
    created_at timestamp with time zone
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    description text,
    company_id uuid
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size integer,
    ocr_text text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    is_classified boolean DEFAULT false,
    department_id uuid,
    embedding public.vector(768),
    company_id uuid,
    subcategory_id uuid,
    parent_category_id uuid
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: COLUMN documents.subcategory_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents.subcategory_id IS '세부 카테고리 참조 (NFC 단위)';


--
-- Name: COLUMN documents.parent_category_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents.parent_category_id IS '대분류 카테고리 참조 (조회 최적화)';


--
-- Name: nfc_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nfc_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id character varying(100) NOT NULL,
    subcategory_id uuid,
    registered_by uuid,
    registered_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    access_count integer DEFAULT 0
);


ALTER TABLE public.nfc_mappings OWNER TO postgres;

--
-- Name: nfc_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nfc_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    subcategory_id uuid,
    tag_uid character varying(100) NOT NULL,
    tag_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    company_id uuid
);


ALTER TABLE public.nfc_tags OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    document_id uuid,
    company_id uuid NOT NULL,
    department_id uuid,
    parent_category_id uuid,
    subcategory_id uuid,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_user_id uuid
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: permission_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    department_id uuid,
    company_id uuid,
    reason text,
    status text DEFAULT 'pending'::text,
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    processed_by uuid,
    CONSTRAINT permission_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.permission_requests OWNER TO postgres;

--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phone_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    purpose text NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    send_count integer DEFAULT 1 NOT NULL,
    last_sent_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    consumed_at timestamp with time zone,
    consumed_for_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.phone_verifications OWNER TO postgres;

--
-- Name: search_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    query text NOT NULL,
    searched_at timestamp with time zone DEFAULT now(),
    search_count integer DEFAULT 1,
    company_id uuid
);


ALTER TABLE public.search_history OWNER TO postgres;

--
-- Name: shared_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shared_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    shared_to_user_id uuid NOT NULL,
    permission text NOT NULL,
    message text,
    shared_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shared_documents_permission_check CHECK ((permission = ANY (ARRAY['view'::text, 'download'::text])))
);


ALTER TABLE public.shared_documents OWNER TO postgres;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    parent_category_id uuid NOT NULL,
    department_id uuid NOT NULL,
    nfc_tag_id character varying,
    nfc_registered boolean DEFAULT false,
    storage_location text,
    company_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    default_expiry_days integer,
    expiry_date timestamp with time zone,
    color_label character varying(6) DEFAULT NULL::character varying,
    management_number text
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: TABLE subcategories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.subcategories IS '세부 카테고리 - NFC 태그 단위 분류 (4단 구조)';


--
-- Name: COLUMN subcategories.parent_category_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.subcategories.parent_category_id IS '상위 대분류 카테고리 참조';


--
-- Name: COLUMN subcategories.nfc_tag_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.subcategories.nfc_tag_id IS 'NFC 태그 ID (nfc_mappings 연결용)';


--
-- Name: COLUMN subcategories.default_expiry_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.subcategories.default_expiry_days IS '기본 만료일 (일수). null이면 만료 없음';


--
-- Name: COLUMN subcategories.color_label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.subcategories.color_label IS 'Hex color code (without #) for visual color label on subcategory cards';


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    company_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_favorites OWNER TO postgres;

--
-- Name: TABLE user_favorites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_favorites IS '사용자별 즐겨찾기한 세부 카테고리';


--
-- Name: user_notification_muted_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_muted_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    parent_category_id uuid NOT NULL,
    muted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_notification_muted_categories OWNER TO postgres;

--
-- Name: TABLE user_notification_muted_categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_muted_categories IS '사용자별 음소거한 대분류 카테고리';


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    document_created boolean DEFAULT true,
    document_deleted boolean DEFAULT true,
    document_shared boolean DEFAULT true,
    category_changes boolean DEFAULT true,
    expiry_alerts boolean DEFAULT true,
    notify_my_department_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_notification_preferences OWNER TO postgres;

--
-- Name: TABLE user_notification_preferences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_preferences IS '사용자별 알림 설정 (어떤 알림을 받을지)';


--
-- Name: COLUMN user_notification_preferences.document_created; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.document_created IS '문서 등록 알림 받기';


--
-- Name: COLUMN user_notification_preferences.document_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.document_deleted IS '문서 삭제 알림 받기';


--
-- Name: COLUMN user_notification_preferences.document_shared; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.document_shared IS '문서 공유 알림 받기';


--
-- Name: COLUMN user_notification_preferences.category_changes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.category_changes IS '카테고리 생성/삭제 알림 받기';


--
-- Name: COLUMN user_notification_preferences.expiry_alerts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.expiry_alerts IS '만료 알림 받기 (7일/30일/만료됨)';


--
-- Name: COLUMN user_notification_preferences.notify_my_department_only; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_notification_preferences.notify_my_department_only IS '내 부서 알림만 받기 (관리자용)';


--
-- Name: user_notification_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    is_dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_notification_status OWNER TO postgres;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    role text DEFAULT 'viewer'::text NOT NULL,
    CONSTRAINT user_permissions_role_check CHECK ((role = ANY (ARRAY['none'::text, 'viewer'::text, 'editor'::text, 'manager'::text])))
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: TABLE user_permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_permissions IS '역할 기반 부서별 접근 권한 관리
- none: 접근 불가
- viewer: 읽기, 다운로드, 출력만 가능
- editor: viewer + 업로드, 수정 가능 (자기 문서만)
- manager: editor + 모든 문서 삭제, 공유, NFC 등록 가능';


--
-- Name: COLUMN user_permissions.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_permissions.user_id IS '권한 부여 대상 사용자 ID';


--
-- Name: COLUMN user_permissions.department_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_permissions.department_id IS '권한이 적용되는 부서 ID';


--
-- Name: COLUMN user_permissions.company_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_permissions.company_id IS '멀티테넌시: 회사 ID';


--
-- Name: COLUMN user_permissions.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_permissions.role IS '사용자 역할: none, viewer, editor, manager';


--
-- Name: user_recent_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_recent_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    parent_category_id uuid,
    department_id uuid,
    company_id uuid,
    visited_at timestamp with time zone DEFAULT now(),
    visit_count integer DEFAULT 1
);


ALTER TABLE public.user_recent_visits OWNER TO postgres;

--
-- Name: TABLE user_recent_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_recent_visits IS '사용자별 세부 카테고리 방문 기록';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255),
    name character varying(100),
    role character varying(20),
    department_id uuid,
    created_at timestamp without time zone,
    company_id uuid,
    push_id character varying(64)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.push_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.push_id IS 'OneSignal 푸시 알림용 Player ID (앱 재설치 시 갱신됨)';


--
-- Data for Name: account_deletion_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_deletion_requests (id, user_id, requested_at, scheduled_deletion_at, status, cancelled_at, completed_at, created_at, updated_at) FROM stdin;
61ae0d06-66bf-483e-a97d-bc29dcdc6069	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2026-02-25 02:46:55.042015+00	2026-03-11 02:46:55.042015+00	cancelled	2026-02-25 02:48:33.356+00	\N	2026-02-25 02:46:55.042015+00	2026-02-25 02:48:53.294945+00
cef5eeb7-5108-437f-be78-6d14656fea26	9c4614a7-296b-40db-9b30-10389dabaa35	2026-02-25 02:56:46.423471+00	2026-03-11 02:56:46.423471+00	cancelled	2026-02-25 03:03:20.42+00	\N	2026-02-25 02:56:46.423471+00	2026-02-25 03:03:40.038291+00
\.


--
-- Data for Name: announcement_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcement_comments (id, announcement_id, user_id, content, created_at, updated_at) FROM stdin;
f15826f9-1171-4480-83fe-9ede3776a4b1	b6e608a1-8e7a-4a7e-afb1-8d4f35ba3259	87c6642a-8fcd-417f-a881-862a9131b9fe	hjgklgulul	2025-12-30 01:14:26.083747+00	2025-12-30 01:14:26.083747+00
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, company_id, title, content, allow_comments, created_by, created_at, updated_at) FROM stdin;
184756a2-9434-437c-afae-71f6e4d0a177	3f9ccd94-e6d6-4267-a156-434186524ac9	111	111	f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025-12-29 06:56:40.8096+00	2025-12-29 06:56:40.8096+00
39e35f33-63d5-48dc-a33e-745d0532f771	3f9ccd94-e6d6-4267-a156-434186524ac9	1	1	t	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025-12-29 06:59:29.797013+00	2025-12-29 06:59:29.797013+00
a789ce14-9332-4693-9753-e2aff1f051c7	3f9ccd94-e6d6-4267-a156-434186524ac9	1	1	f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025-12-29 07:02:09.982185+00	2025-12-29 07:02:09.982185+00
8e6e4193-64b7-4547-a357-2c8d8d6bbecf	3f9ccd94-e6d6-4267-a156-434186524ac9	1	1	t	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025-12-29 07:05:34.337178+00	2025-12-29 07:05:34.337178+00
b6e608a1-8e7a-4a7e-afb1-8d4f35ba3259	3f9ccd94-e6d6-4267-a156-434186524ac9	ㄹㄴ	ㄴㅇ	t	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025-12-29 07:16:58.267116+00	2025-12-29 07:16:58.267116+00
947a14fc-411b-49de-afad-69f0013efecb	3f9ccd94-e6d6-4267-a156-434186524ac9	fff	fffff	f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2026-01-07 06:43:31.113611+00	2026-01-07 06:43:31.113611+00
ffd2b6af-b730-491a-967b-ee669d1afb9f	e7134118-47d4-4d4d-998d-0b0bd2a1c445	공지입니다.	공지 참고하세요.\n공지 참고하세요\n공지 참고하세요\n공지 참고하세요	t	f42df23d-f599-4cb8-9bee-a90ae6370bb7	2026-02-01 06:09:25.469193+00	2026-02-11 01:41:41.439+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, department_id, code, name, description, created_at, company_id) FROM stdin;
6907df9b-f08b-4ec0-9513-030a06554aa4	05c8cab4-694a-48ae-9bfb-394f8dce13a9	65656	65656	565	2025-12-17 04:36:19.18475	\N
a101e186-0083-4c31-8bf6-5e792bef0ff6	054ed490-7c4b-490c-bf50-33a6cb5b4f5b	이력서	이력서	\N	2026-01-28 11:27:29.20371	\N
ff596867-3dc9-4917-89c1-97b19412b59c	8cc4a1ce-d211-4e33-8fe4-86e020a6a84c	인사	인사	\N	2026-01-28 11:30:52.782312	\N
4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	TEST	test	1111	2025-11-24 05:43:33.676005	3f9ccd94-e6d6-4267-a156-434186524ac9
bd122ad9-5da4-4678-990e-b691eb6bd922	05c8cab4-694a-48ae-9bfb-394f8dce13a9	20	20	20	2025-11-24 06:09:43.947187	3f9ccd94-e6d6-4267-a156-434186524ac9
fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	5727	5727	272	2025-11-24 06:54:13.715184	3f9ccd94-e6d6-4267-a156-434186524ac9
72d042d2-9877-4d35-b16a-8ccfc4c0c559	05c8cab4-694a-48ae-9bfb-394f8dce13a9	근로계약서(2023	근로계약서(2023년)	근로계약서(2023년)	2025-11-26 16:04:20.751797	3f9ccd94-e6d6-4267-a156-434186524ac9
50599218-1655-4208-8d68-fdf044278892	05c8cab4-694a-48ae-9bfb-394f8dce13a9	근로계약서(2022	근로계약서(2022년)	근로계약서(2022년)	2025-11-26 16:05:06.124826	3f9ccd94-e6d6-4267-a156-434186524ac9
8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	11	11	1	2025-11-21 06:46:24.441745	3f9ccd94-e6d6-4267-a156-434186524ac9
43c24094-df3b-4d58-8d98-1e3266685270	05c8cab4-694a-48ae-9bfb-394f8dce13a9	444	444	444	2025-12-05 05:35:34.366461	\N
27cc66ba-4ef2-445f-bdc5-19a4637bd790	05c8cab4-694a-48ae-9bfb-394f8dce13a9	14	14	\N	2025-12-08 06:34:58.319187	\N
6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	333-1	333-1	475	2025-12-08 08:20:44.018166	\N
c8a69a0a-c47d-486c-9688-aafc678e8974	e7a4b0f9-af44-49a7-a758-1857e91a96a3	5543	5543	543543543453	2025-12-08 08:37:41.504184	\N
df120a35-8343-47d5-bd77-72f2736b1df5	05c8cab4-694a-48ae-9bfb-394f8dce13a9	222333	222333	\N	2025-12-09 08:07:27.274248	\N
62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	근로계약서(2024	근로계약서(2024년)	근로계약서(2024년)	2025-11-26 16:03:31.446923	3f9ccd94-e6d6-4267-a156-434186524ac9
b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	근로계약서(2025	근로계약서(2025년)	근로계약서(2024년)	2025-11-26 16:04:03.342749	3f9ccd94-e6d6-4267-a156-434186524ac9
bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	DEV001-A	기술 문서123	시스템 아키텍처 및 API 문서1231312	2025-11-21 05:20:19.651431	3f9ccd94-e6d6-4267-a156-434186524ac9
7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	HR001-A	채용 문서	신입 및 경력 채용 관련 문서	2025-11-21 05:20:19.651431	3f9ccd94-e6d6-4267-a156-434186524ac9
3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	1111	1111	222	2025-11-24 04:48:30.391841	3f9ccd94-e6d6-4267-a156-434186524ac9
52b94ac2-b933-4b79-a0b2-533de539d5f1	05c8cab4-694a-48ae-9bfb-394f8dce13a9	ㅀ	ㅀ	ㅀ	2026-02-06 06:25:54.894269	\N
97177207-ec1c-4ce5-9ac8-2b2dd2956fad	57aa959a-90f9-440d-9c28-1a381c1aabb8	인사문서	인사문서	\N	2026-02-06 10:30:34.382214	\N
8da8923e-2700-4e07-a298-b336b99e7df7	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	4대보험	4대보험	4대보험 관련 서류	2026-02-08 08:36:24.282213	\N
856cb54f-608c-4a1a-9c38-ab099d930117	b860e052-39b8-444f-bf2a-fbafdafafdc8	4	4	4	2026-02-11 04:37:31.632954	\N
e0a13daa-6409-4414-b5a5-eb6de980c2fb	05c8cab4-694a-48ae-9bfb-394f8dce13a9	77	77	7	2026-02-11 04:37:43.558489	\N
fc606c20-02d9-4cde-bcf0-569374ed61f7	e3da437e-4d84-41d1-8127-f553a0352e02	연차	연차	연차	2026-02-12 01:43:54.576945	\N
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, user_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, code, created_at) FROM stdin;
1666bb6d-8003-44c1-bc50-b54b13730ad2	222	222	\N
e34fb54b-87d5-4b82-858d-4d84e0e0600a	333	333	\N
24e3191a-60bb-47ea-a200-41047d1c1a55	주식회사파랑_인천지점	A002	\N
3f9ccd94-e6d6-4267-a156-434186524ac9	주식회사파랑_인천지점	A001	\N
58f39dc9-a8f4-42c6-9c83-0e30d775a860	3232	2331	\N
2782a3bb-9ce0-44a1-9a8f-352fc060b861	43545	55435	\N
e7134118-47d4-4d4d-998d-0b0bd2a1c445	엘지전자	company3	\N
2bf42ea4-8284-4739-a977-654856b2e79f	주식회사파랑	A0001	\N
c82a58aa-aecb-4dd5-9f9e-c478b18c371a	test	test	\N
c6adb89a-feb7-41f1-9286-3b166a35865e	주식회사파랑_인천	A000	\N
8a582b82-a62c-4a9c-a7a1-95c39efb4b7e	주식회사인포크리에이티브	info001	\N
904ba7d2-24ad-461f-b7fe-202f375d87bb	Test	Test	\N
07cbdd6e-6294-4883-9204-238d728e3d11	t	t	\N
22c65fbe-5e3b-4018-8eb9-11772e40f8f3	주식회사 인포크리에이티브	infocreative1	\N
f4d49713-b40a-4ac8-a0ca-36ee41aef974	옐로우윈	yellowin	\N
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, code, name, created_at, description, company_id) FROM stdin;
05c8cab4-694a-48ae-9bfb-394f8dce13a9	HR001	인사팀	2025-11-21 05:19:48.769787	\N	3f9ccd94-e6d6-4267-a156-434186524ac9
b860e052-39b8-444f-bf2a-fbafdafafdc8	DEV001	개발팀	2025-11-21 05:19:48.769787	\N	3f9ccd94-e6d6-4267-a156-434186524ac9
e7a4b0f9-af44-49a7-a758-1857e91a96a3	MKT001	마케팅팀	2025-11-21 05:19:48.769787	\N	3f9ccd94-e6d6-4267-a156-434186524ac9
ed15289a-165d-4768-b160-6ed4bf180bf7	FIN001	회계팀	2025-11-21 05:19:48.769787	\N	3f9ccd94-e6d6-4267-a156-434186524ac9
37eea1e3-2c23-426c-bca7-a0acbbafa5a0	333	333	2025-11-28 06:25:07.01519	333	3f9ccd94-e6d6-4267-a156-434186524ac9
2bb2eeec-9865-4e3e-8cfe-43391e812e62	utrfgbybu	11	2025-11-25 01:43:12.203747	1	3f9ccd94-e6d6-4267-a156-434186524ac9
6c79e555-1c43-45bf-9a28-1164658bc412	PL001	기획팀	2025-12-26 14:50:12.133939	기획팀	e7134118-47d4-4d4d-998d-0b0bd2a1c445
e1e95513-7064-4186-8347-1dd7d7c7e7c5	PR002	홍보팀	2026-01-13 07:02:05.150202	PR팀	e7134118-47d4-4d4d-998d-0b0bd2a1c445
054ed490-7c4b-490c-bf50-33a6cb5b4f5b	HR	인사팀	2026-01-28 11:26:01.648558	\N	58f39dc9-a8f4-42c6-9c83-0e30d775a860
8cc4a1ce-d211-4e33-8fe4-86e020a6a84c	인사팀	인사팀	2026-01-28 11:29:28.67951	\N	8a582b82-a62c-4a9c-a7a1-95c39efb4b7e
57aa959a-90f9-440d-9c28-1a381c1aabb8	HR001	인사팀	2025-12-26 14:25:38.400918	인사팀입니다.	e7134118-47d4-4d4d-998d-0b0bd2a1c445
518e6da2-71fa-4d35-a690-2fbf68b9ed1a	FN001	총무회계팀	2026-02-08 08:35:57.420235	재정 관련	e7134118-47d4-4d4d-998d-0b0bd2a1c445
27787d1b-18f9-4141-9486-ee1d75ce3aec	5	5	2026-02-11 04:38:13.584132	5	3f9ccd94-e6d6-4267-a156-434186524ac9
2914c90e-7912-400d-80bc-b2cb153d578e	t_DEFAULT	기본 부서	2026-02-11 07:45:05.456025	회사 가입 시 자동 생성된 기본 부서입니다.	07cbdd6e-6294-4883-9204-238d728e3d11
e3da437e-4d84-41d1-8127-f553a0352e02	HR001	인사팀	2026-02-12 01:43:24.085533	인사팀 관련	22c65fbe-5e3b-4018-8eb9-11772e40f8f3
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, title, file_path, file_size, ocr_text, uploaded_by, uploaded_at, is_classified, department_id, embedding, company_id, subcategory_id, parent_category_id) FROM stdin;
3dac5b70-12de-4878-bf7a-eb840a8ebd3f	기업1	1767768621822.png	77236	2. 국내 중소기업 대출 촉진 관련 제도\n중소기업 대출 시장 전반을 기술성 등 특정 중소기업에\n확대하기 위한 제도 대한 여신 할당을 높이기\n위한 제도\n금융통화위원회가 중소기업 및 지역 기술력을 지닌 혁신적인 중소기업이\n대출제도 경제 여건을 고려하여 정한 한도규 받을수 있는 제도\n모내에서, 은행의 중소기업대출실\n적 등에 따라은행에 한국은행의 저 1 지식재산권(IP) 금융 2 기술금융(TCB) 대출\n리자금을 지원하는 제도\n부실발생시의존할수 있는 안전장치가은\n행으로 하여금 중소기업이 비우량할지라도\n기술력에 근거해 과감한 대출을 실행할 수\n있게 만드는 주요한 요인임을 확인\n중소기업대출비율제도는 신용도가\n중소기업대출 낮고 담보력도 부족한 중소기업이 벤처대출 관련 2023년 「벤처투자촉진법」 개정으로\n비율제도 은행 여신을 좀 더 수월하게 활용할 2023년 12월부터 투자조건부융자\n수 있도록 1965년 4월 도입 법제 도입\n은행의 원화자금대출 증가액 중 50%\n이상을 중소기업에 대출하도록 규율\n하는 제도 > 기술금융대출의 경우 사실상\n비기술기업에도 기술평가서를 발급하는 등,\n신용이 우수한 경우 시행되고 있다는 한계,\n> 질적인 측면에서 은행의 혁신적 벤처대출의 경우 시중은행으로확산되고\n중소기업 선별 및 신용 할당 역량 있지 않는 현실\n제고에는한계\n>IP 담보대출의 성장과정은 벤처대출의\n성장을 위한 유인책 설계에 정책적 시사\n점을 제공	\N	2026-01-07 06:50:23.334557+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.017954782,0.067219324,-0.046644483,-0.0020445422,0.09923862,0.053131055,0.03718964,0.024095105,-0.016832896,-0.039190397,-0.0008910795,0.08714575,0.06622361,0.041905683,0.0027723662,-0.002770118,0.015061747,0.05157159,-0.05882197,-0.040688407,-0.052305333,0.019370096,0.039607037,0.032890577,-0.013703505,-0.06635358,-0.027325375,-0.031092469,0.015540114,-0.06930127,-0.009971711,0.06898954,0.03289554,0.04212414,-0.014449627,-0.015417523,0.04745945,0.020302454,0.02392392,-0.09424246,-0.023448426,-0.043969292,0.01235006,0.028032552,-0.034713686,-0.015131862,0.022774026,0.014474468,-0.04464275,0.05996119,0.04107157,-0.01933966,-0.032837633,0.014811137,-0.022205645,-0.06747272,-0.043454472,-0.059106264,0.08195337,0.0047549903,-0.036449708,0.013098741,-0.050512522,-0.02972958,-0.017103935,-0.01732874,-0.005994651,-0.053680737,-0.122600265,-0.024650436,-0.011292092,0.07272147,-0.02158247,0.041952834,0.05623453,-0.0024083185,0.005121181,-0.0109698875,0.045450408,0.045677375,-0.031727582,0.0539051,0.038749322,0.08271788,-0.0015001323,-0.020447068,0.0138349505,-0.025345167,-0.05933782,-0.051153943,0.077830136,-0.00056864746,-0.01225287,-0.01360698,0.04699809,-0.04494851,-0.08002482,-0.078917064,0.09626542,0.039597835,-0.014704369,-0.005645367,0.015764166,-0.016469631,0.050771248,0.013185702,-0.032168623,-0.027439404,-0.032211363,0.04746001,0.025580138,-0.0062440345,0.039654933,-0.014407813,-0.0048346,0.007549703,-0.027992245,0.00049934385,-0.028609088,0.005300528,-0.026329514,-0.027746009,0.004232585,0.0010769041,-0.014899102,0.013399442,-0.060582776,0.025309732,-0.024007708,-0.003539562,-0.032036323,-0.06057537,0.044651836,0.07672312,0.004129388,-0.030650375,0.04600524,0.022747675,-0.0024641713,-0.014445389,0.021377487,-0.028526943,-0.05883222,0.041576084,-0.0025546434,-0.03994,0.07397308,0.051495533,-0.055030454,0.024608847,-0.043887995,0.028298711,-0.017427253,-0.008018051,-0.0066193254,0.006618578,0.016337266,-0.05705526,0.030970728,0.00835943,0.030358514,-0.0027862305,0.003985087,0.03809961,-0.04211508,-0.09316475,-0.030650495,-0.07413408,-0.008283641,0.035602156,0.05143476,-0.026066564,-0.019260183,-0.05230371,0.012526477,-0.003834237,0.01810236,-0.0051985225,-0.03582945,-0.008558498,0.031752627,0.021721967,-0.0032661874,-0.0038953035,-0.018751886,0.023129147,0.03357149,0.0641934,0.026460936,0.0342697,-0.012459865,0.029459678,0.04858997,0.035470866,-0.014287999,0.018637424,0.029764878,-0.012073313,-0.0052799466,-0.021470735,0.040416334,0.017190542,-0.013632192,-0.041004106,-0.025414644,0.012585014,-0.06571819,-0.041779235,0.007922036,-0.003584368,-0.004767587,0.011949158,0.005279941,-0.02298088,-0.039797615,0.028466227,0.077440724,-0.03030501,0.048235495,0.00632591,-0.0063903756,-0.019872017,0.0042461846,0.06341547,0.040282756,-0.013896113,0.024454016,-0.049820714,0.0030205145,-0.024030598,0.014051095,-0.015739704,-0.021960454,0.012198545,0.029262787,0.035179213,0.025972538,-0.057620615,-0.029482905,-0.02660545,0.027697174,-0.008467489,0.05865467,-0.04073406,-0.00775273,-0.04140196,0.043979377,0.037441425,0.02455653,-0.022671418,-0.050331134,-0.030576091,-0.018684702,0.038490318,-0.077859804,-0.04673633,0.029525073,-0.025502024,-0.0114757465,-0.0453153,0.021758065,-0.0062607885,-0.009371969,-0.011771109,-0.04554323,-0.072316766,-0.0014639173,-0.014031707,0.067626104,-0.0336431,0.010083914,-0.09524938,-0.040491786,0.03198871,-0.04992109,0.04472599,0.004004855,-0.010225889,-0.01366773,-0.031364847,-0.008501014,-0.035433933,-0.03280201,-0.048781145,0.032748066,-0.04650202,0.0019030459,-0.041211408,-0.0215624,-0.008212862,0.032947585,0.03129481,0.0131705925,-0.03706964,0.02986462,-0.011069471,0.015147722,-0.03245967,-0.047474433,-0.047269296,0.0071598953,0.031564623,-0.0035809376,-0.0056003593,0.03309788,-0.04656413,-0.03641967,-0.019255005,0.00040427613,0.028296174,0.04790175,0.08434054,-0.026993008,-0.009592205,-0.006563786,0.033676613,-0.11473507,-0.008379567,-0.013133511,-0.0076261326,-0.026872145,0.03484945,-0.05864095,-0.024558803,0.008581123,0.009477381,0.017466448,0.004085055,0.028448153,-0.020539017,-0.012565501,0.00415853,-0.032510106,-0.0013116671,0.04837913,-0.028997801,-0.039334286,-0.0026806532,0.06550672,0.019153228,-0.0077725495,0.028322458,0.048862614,0.039034016,0.014946919,-0.050442606,0.0048981225,-0.0033437763,0.012051444,0.022648182,0.007189044,0.024655271,-0.047451664,-0.03054524,-0.005279854,0.012998011,0.0040152436,0.021813784,-0.011339726,0.00032950277,-0.020962691,0.025155393,-0.014923743,0.002564993,0.04855658,-0.025757266,0.020539265,0.07731332,0.023973417,-0.0007977819,0.0047496366,0.0025361585,-0.021273326,0.05717326,0.021903293,0.002802445,0.012347279,0.025457084,0.052222237,-0.045909215,-0.029940369,-0.005639223,-0.024972366,0.03597734,-0.013117583,0.0092731165,-0.049493045,-0.018025778,0.0013225363,0.023998484,-0.036287274,0.015417265,-0.017133268,0.012298924,0.018354004,0.027414521,-0.021867786,0.028291365,-0.044379458,0.019666126,-0.021416174,0.0039985706,0.05875743,-0.018165937,-0.010934868,-0.040851712,0.049483463,0.04870914,0.012683676,0.05552134,-0.0065593855,-0.012537896,0.010239223,-0.03472013,-0.06992603,-0.022121176,0.011996228,-0.01587926,0.003447826,0.06675225,-0.036350984,0.048783094,0.054124262,-0.0020443685,-0.00782611,-0.041016944,-0.065676644,-0.005506828,-0.027849447,-0.012926867,0.027680315,0.053461205,0.0010156473,-0.0061899875,-0.0027319142,-0.010512722,-0.030743774,-0.034611586,-0.0057553737,0.011764274,-0.009968888,0.04165551,0.021724908,0.018218348,-0.016259395,0.018551555,0.015697602,-0.010983081,0.037278514,-0.04808024,-0.017687716,-0.001487953,0.0055609564,-0.07515209,-0.05174475,0.008041845,0.012124168,0.035932716,-0.0021407262,0.030169489,-0.07067661,-0.0022168157,0.013810291,0.03489364,0.061439972,-0.049859673,-0.037128188,0.046365354,-0.053580873,0.04914037,0.008675558,0.020170217,0.053204734,-0.0114975395,-0.05818799,0.0073111374,0.010456555,0.044961248,-0.0022920412,0.014372094,-0.04891964,0.0058013233,-0.013497225,0.048447978,0.013759878,-0.005231967,-0.02994097,-0.015797459,0.027222631,0.014906756,0.065985665,0.022599515,-0.013904139,-0.027549885,0.0024731988,0.035445705,0.060467515,0.039053172,-0.018161085,0.019580552,0.037607618,0.027624475,-0.009905258,-0.08045331,-0.0045197643,0.011007473,-0.026277177,-0.07228214,0.08964299,0.042995706,-0.0042910283,-0.03139225,-0.020228116,0.022711368,-0.05057515,-0.0024398388,-0.07833614,0.017442932,-0.025084846,0.014486315,-0.0453177,-0.025937513,-0.00864654,-0.010102193,-0.00022061708,0.01840781,-0.010825381,-0.014199941,0.031360816,-0.09308038,-0.0345592,0.06304798,-0.014741526,0.026452037,0.033492755,0.04457023,0.0020378963,0.04743278,0.081003554,-0.024251333,0.061505925,-0.017716955,-0.033861265,0.04402478,0.04237087,0.0050644,-0.014433309,0.0041318014,-0.03457587,0.050287146,-0.0038589542,0.016684663,-0.036305767,0.017612508,0.038161132,-0.018631428,0.07923678,0.0049952194,-0.057087764,0.003871339,0.019554146,-0.0040792217,0.03272987,-0.017000988,-0.0038799,-0.00910882,-0.014094412,0.08755266,0.024618827,-0.008704438,0.044969115,0.011858219,-0.0034388027,-0.005345902,0.08298663,-0.02529049,-0.06408889,0.030524818,0.011181311,-0.014832608,-0.0066546598,-0.013687999,0.10404256,-0.027948555,0.0009297834,-0.018092863,-0.0022397987,0.007659586,0.01554095,0.05736138,-0.0128158,0.023477916,0.04141784,-0.08488349,0.058489397,0.02827245,-0.030780146,-0.0020799574,0.016862039,-0.005624786,0.00037614218,-0.021162406,0.015639288,0.027024614,-0.009417914,-0.054129396,-0.034319837,-0.0375984,0.009986793,0.01668859,-0.051582165,0.05492118,-0.05501425,-0.0132704815,-0.04342224,-0.024486305,-0.019737974,-0.012718192,-0.007001876,0.05141693,-0.018483013,-0.0067594824,-0.01374629,-0.043982834,-0.07357788,0.0021022037,0.006286901,-0.054362748,0.005236194,0.0057888115,0.019001724,0.0076316698,-0.011870156,0.005158446,-0.0036208516,0.03544713,-0.025073081,-0.0005765458,-0.032346927,-0.052918334,0.022527818,0.07561436,0.06717084,0.020635428,-0.010877407,-0.0026860635,0.012011183,0.06503504,-0.07381838,0.0071816826,-0.0029258577,0.029535098,-0.048689183,0.046096765,-0.013403118,0.026364127,0.060323104,-0.05408969,0.009035559,0.014097622,-0.0014492485,-0.0131687345,0.058821116,0.0087730065,-0.0042093396,-0.02521535,-0.040674943,0.021267679,0.021214118,-0.004042701,0.03738464,-0.034310833,-0.022238934,0.06594979,0.07843942,-0.038688503,0.030728748,0.027554898,-0.043006107,-0.0067415275,0.02341194,-0.049697775,-0.03777848,0.032724973,0.0044691907,0.0042145634,0.0007303927,0.013114122,0.022447001,0.07953975,0.023470607,-0.033344712,-0.012152114,0.03838327,-0.052040733,0.057432167,-0.027391993,0.031626783,0.07575544,-0.0072873323,-0.031041507,0.011541991,-0.03689579,-0.02856076,-0.0006717552,-0.0041857827,0.07239701,0.045753893,-0.0047884206,0.047932208,0.026963547,0.026029512,0.075739466,-0.05387163,-0.003412226,-0.030144088,0.034542322,-0.014845697,0.013843971,0.016508896,0.010950036,-0.034035165,0.020694336,0.043387145,0.016485577,-0.012351275,-0.028367234,0.021712186,-0.05014343,0.052603807,-0.009500455,0.0117059415,0.0013703721,0.02218522,0.017663438,-0.013287317,0.017816104,-0.053318202,-0.03243717,-0.06404317,0.025220145,-0.0090178605,0.0034512894,-0.0018733145,0.0025173526,0.051375356,0.047542304,-0.030112203,0.016807055,-0.0068318704,-0.046249747,-0.018419715,0.037684545,-0.011073586,0.007964063,-0.041043594,-0.009640392,-0.023408717,-0.0033839631,0.0016393977,-0.0045812475,0.028458316,-0.050024617,0.016723914,-0.012318513,0.013988904,0.048370216,-0.057029366]	\N	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed
7aed3db3-c216-443c-a04b-ae784d670e62	33	1767082485825.png	78476	1. 연구 범위\n이미지화\no 분석 기간: 2017년~2024년(연도별 시계열 가용 자료 활용)\n0 분석 대상\n- 신한카드 가맹점(전국 200만여 개 가맹점 대상)\n- 국세청 국세통계시스템(TASIS)의 생활밀접업종 사업자(전국 300만여 개 사업자 대상)\no 분석 업종\n- 소매업, 음식점업, 숙박업, 교육 서비스업, 병의원 서비스업, 전문 서비스업, 기타\n서비스업 등을 중분류로 하는 총 100개 '생활밀접업종'\n0 분석 지표\n- 경쟁 강도(동종 업종 내 경쟁 정도). 불평등도(업종 내 매출 격차 등), 지역별·업종별\n경영 상태	\N	2025-12-30 08:14:54.307397+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.034580924,0.06394184,-0.043886695,-0.020991266,0.036016643,0.051021565,0.037730526,-0.012443652,0.0041700215,-0.0006270042,-0.025894152,0.05900862,0.053515974,0.01946528,-0.040599898,0.0030410402,0.019394133,0.035125274,-0.07216933,-0.04868235,-0.022647446,0.00920174,-0.016795631,0.008144453,0.019609027,-0.04439566,-0.008678086,0.02344612,0.012761545,-0.036214557,0.022424344,0.044271532,-0.0084064435,-0.0024867144,0.012244849,0.019993892,-0.0075067696,0.026036944,0.03251468,-0.047839995,-0.019857964,-0.023066765,0.005098899,-0.043676056,-0.030939152,-0.024162535,0.03638814,0.050568145,-0.087203175,0.039114576,0.0066236476,-0.04133609,-0.011019957,-0.027952015,-0.029704442,-0.013118307,0.003052332,-0.06729132,0.05592446,0.0023949635,-0.0048889876,0.017913675,-0.040748402,-0.041844342,-0.0024123117,0.022182146,-0.0105329,-0.044700332,-0.07879115,-0.011966739,-0.010245343,0.07284333,-0.056164872,0.06220095,0.033030257,0.03214856,-0.01631831,-0.030019123,0.017695498,0.086488366,-0.03588805,0.04230414,0.05728425,0.08513384,-0.0013675723,0.0047637364,0.005559631,-0.06721764,-0.08974177,-0.016601807,0.059013333,0.0041324412,-0.043349896,-0.008418593,0.034555405,-0.027675549,-0.044106305,-0.12457526,0.042118896,0.05488312,0.00023045499,-0.0016349963,-0.020164592,-0.024706773,0.042680915,0.03564274,0.026072597,-0.027939864,-0.06507686,0.03167128,-0.004291576,-0.019674812,0.025999784,-0.011785255,-0.034598883,-0.0037315604,-0.030270861,0.04001181,-0.081565395,0.06917814,-0.00883941,0.011383203,-0.036842015,0.015960816,0.004913156,0.021646973,-0.060880218,0.021205537,-0.042646475,0.02087321,-0.013762489,-0.059420485,0.025782501,0.02988647,-0.03357378,-0.0061973874,0.06570348,0.027391529,0.001227958,-0.00076556613,0.0052313297,-0.036366582,-0.06474367,0.0022399395,-0.009989831,-0.047389053,0.053399235,0.012106955,-0.024293395,-0.018497342,-0.052760087,0.018482108,-0.004435811,-0.016488565,0.036205538,-0.0370435,0.01907785,-0.06289548,0.034198847,0.017072108,0.06220042,-0.061630722,-0.017079504,0.0054198545,-0.06689859,-0.021422876,-0.01891321,-0.07910386,0.009870976,0.03359514,0.02876743,0.018810442,-0.050098702,-0.041751996,-0.030531017,-0.029198373,-0.023236547,-0.051690966,-0.07015824,-0.026804531,0.050291363,0.011106789,-0.0016826253,-0.026234623,0.014470617,0.024434837,0.013647392,0.025434932,0.024495432,0.015049205,-0.049519118,0.016435778,0.02224114,0.038543817,-0.008522933,0.011686971,0.037600473,-0.0046911943,0.03652172,-0.055218216,0.021057496,-0.010595198,-0.012376263,-0.0048419,0.011731385,0.012437117,-0.0229426,-0.058882926,0.003951247,0.012117974,-0.043090224,-0.011067345,-0.030759761,-0.05265078,-0.03403918,0.019362748,0.095985785,-0.016611684,0.08329547,-0.04963743,-0.059943408,-0.026491972,0.052243773,0.03256263,0.05703193,0.029185569,-0.034050774,0.006788776,0.009470171,0.022207879,-0.036716234,-0.00024969608,0.0128595475,0.024069369,-0.011828791,0.055117164,0.029855566,-0.05981652,-0.050618414,0.03705302,0.018881848,-0.004922866,0.011877414,-0.07531988,-0.020678157,0.013336524,0.042372465,0.035062984,0.0009505691,0.020704422,-0.053665005,-0.011187268,-0.03487471,-0.0073278947,-0.08222353,0.014110172,0.044096697,-0.06484177,-0.0019960294,-0.04180075,0.02919956,-0.037299287,-0.029049696,-0.05193274,-0.05037595,-0.082781956,-0.035910703,0.0024654411,0.07648458,-0.028527424,0.006101419,-0.06559903,-0.055732224,0.002952587,-0.007079664,0.017831601,-0.03146516,0.008766904,-0.040483784,-0.019616775,0.029042713,-0.008802906,-0.024030311,-0.03861559,0.036100898,-0.066968784,-0.028470477,0.03966864,-0.0016869414,-0.044552483,0.041751284,0.057697747,0.015539685,-0.0021756596,0.027014185,0.029912587,0.019177103,0.0061316057,-0.04750503,-0.0039065303,-0.002670954,-0.00069162814,-0.030624457,0.024142725,0.040304355,-0.038201664,-0.0054159462,0.017423375,0.008584344,-0.007385113,0.026429461,0.03391854,-0.046926484,0.004868669,0.0030104246,0.02169393,-0.13826789,-0.017436463,0.02253352,-0.010890075,-0.026428994,0.035226088,-0.07666904,0.009375054,0.030498533,0.011131276,0.020114653,-0.008527189,0.028189482,-0.032135647,0.036590952,-0.011171826,-0.048144475,-0.021325829,0.008888572,-0.019371415,-0.058361202,-0.03113191,0.050432216,0.02493929,0.020432414,0.03617746,0.095348775,-0.0084034,0.032914694,-0.036479916,0.011333391,-0.027671257,0.002272731,0.028157756,0.02937519,0.030061657,-0.034596764,-0.025440715,0.0064658658,0.022528408,0.033092845,-0.025049966,0.009505237,0.010089334,-0.0145943295,0.009388047,-0.012670608,-0.009588214,0.00965022,-0.046109304,0.06675087,0.03172698,-0.015513237,0.007427663,0.017308686,0.01924697,-0.0017312403,0.041363332,-0.0019446963,0.000428879,0.009899996,0.030697845,0.029810427,-0.050881468,-0.011541859,-0.020002542,-0.013792538,0.058188826,0.012178888,0.03195244,-0.036359984,-0.016177362,-0.009302873,0.021781484,0.00943393,0.053366333,-0.017381059,0.024933841,0.0067192703,0.03325703,-0.005242013,0.024132816,0.000654389,0.010067209,-0.011179502,0.01201246,0.07153962,-0.0025549994,0.0360222,-0.026810387,0.033450037,0.0296446,-0.03666756,-0.0021732547,0.008927763,-0.04256963,0.014212548,-0.027176194,-0.07362837,0.015159912,-0.03556434,-0.02026824,-0.0014241834,0.07166972,0.032020614,0.029792745,0.033171512,0.0068691773,0.036746457,-0.0720295,0.016435897,0.027423264,-0.027300337,0.0019298694,0.021793948,0.015028811,0.0045916685,-0.01661043,-0.018638272,0.036647633,-0.023371335,-0.03469769,-0.067974545,0.0069792145,-0.0025112927,0.034513023,0.018994577,0.02760319,-0.01844407,0.024024818,0.030198084,0.013173089,-0.005804008,-0.044208463,-0.036421735,0.02251353,0.0041364906,-0.030645374,-0.027361915,0.008943819,0.047989413,0.0041386858,-0.011314559,0.08489616,-0.06350129,-0.05078173,-0.010090404,0.05224242,0.023668967,-0.017665971,-0.0052047563,0.050865725,0.012088222,0.023909863,0.019759096,0.0065331245,0.008360879,-0.042965677,-0.017375035,0.040158223,0.015631268,0.052400306,0.038915437,0.020715166,-0.043791056,0.039409045,0.02716727,0.033285603,0.04840862,-0.028248385,-0.030099511,-0.020864824,-0.0012201153,0.043263245,0.08373952,0.03829008,0.010009408,-0.04661965,0.016438793,0.015689202,0.03883198,0.062303286,-0.0077584465,0.0014166295,0.08625867,0.0048842896,-0.0005502739,-0.051897142,-0.006542587,0.021724537,-0.06101775,-0.059384726,0.045317832,0.040861856,0.027885998,-0.03447597,0.019858213,0.067821845,-0.03777649,0.03642703,-0.080580495,0.027168702,-0.028804107,0.027445165,-0.02669236,-0.054838497,0.053804737,-0.018572545,-0.036033344,0.009602629,0.022771597,-0.018021239,0.04681752,-0.08727086,-0.03384933,0.057230752,-0.010511591,0.038745396,0.007326214,0.03699058,0.037921343,0.0128295645,0.058382556,0.009944705,0.041124802,-0.0010327413,-0.0073417937,0.07382525,0.016330857,0.01222431,0.016304791,0.0019306527,-0.060482632,0.04996806,0.008850857,-0.04243702,0.016800385,-0.042109806,0.0054308,-0.020934192,0.052354507,0.026175171,-0.068096094,-0.022015058,0.010078234,-0.008567401,0.0744099,-0.024337921,0.0060998453,0.0043641143,0.003568538,0.05001181,-0.02220495,-0.013121664,0.028509906,-0.015308532,-0.010096933,0.0060948925,0.05263763,-0.04491033,-0.04197483,0.0018437193,0.038564373,0.0064913556,0.002461436,0.012227024,0.10288398,-0.0036973525,0.026092438,-0.0023432204,-0.012032329,-0.021009514,-0.005752619,0.049663726,0.0029867748,-0.0029245254,0.052207675,-0.09519978,0.035574168,0.027363414,-0.0769029,0.00923585,0.02817207,-0.028897054,-0.020511562,-0.023004094,0.028635273,-0.022959037,-0.019338463,-0.041396786,-0.03803526,-0.0970203,0.00019833358,0.048585992,-0.0370411,0.026496796,-0.061765753,-0.027385537,-0.05190963,0.02923086,-0.039960466,-0.020247266,0.039454814,0.04466584,-0.020257743,-0.00970822,-0.04363222,-0.014177122,-0.03384863,0.02048754,-0.0029189205,-0.040729567,-0.0018376181,-0.0035665517,0.0074288817,-0.0068649217,-0.00898188,0.016101016,-0.019034434,0.019843074,-0.033741888,0.0024302716,0.021895519,-0.047426477,0.009537242,0.035433635,0.07425241,0.019924553,-0.016816432,0.042145226,-0.01656638,0.046405125,-0.021946462,0.03908837,0.010784561,0.042161606,-0.04681453,0.07858955,-0.012483248,0.037125167,0.0120598525,-0.065277725,-0.006061181,0.05242546,-0.036300194,-0.02375756,-0.005709912,0.015838757,-0.040610004,-0.050923638,-0.063565515,0.034948897,0.010184617,-0.05206103,0.048002586,-0.015165203,0.00051703886,0.058814626,0.0044104075,0.0015819324,0.0035619354,0.022150345,-0.022656899,-0.004674739,-0.0064847386,-0.050560653,0.006432848,-0.008605444,0.0045450623,-0.005400764,0.012002424,0.0030503601,-0.014669127,0.03427748,-0.021722931,-0.041048046,-0.01730436,-0.025876401,-0.02655232,0.04714574,-0.03101318,0.0074112955,0.04975993,0.0061612516,-0.042922463,0.03217499,-0.029769182,-0.005911653,0.017114935,0.024888719,0.077367194,0.012148846,-0.0052381083,0.004080046,-0.05055829,0.02506645,0.02675937,0.06595618,-0.010697923,0.007012229,0.027266858,-0.012033526,0.006641756,0.0069105388,0.016344294,-0.047297265,0.03869312,0.031204075,0.022227546,-0.040223453,-0.043049626,-0.0054091737,-0.025649756,0.021896243,0.017512348,-0.041017573,0.0143150585,-0.0029214027,0.01817719,-0.010674998,0.029648025,-0.0550425,0.0061057215,-0.03654427,0.04863941,0.011868214,-0.008773025,-0.03411611,0.05684019,0.026767492,0.054073382,-0.05068334,0.022836013,-0.019822167,-0.048478372,0.018692276,0.041281022,-0.0019301752,0.012606127,-0.0145230135,-0.033292536,-0.04508712,0.06333171,0.010952637,-0.027836408,0.08578772,-0.035058428,0.0226603,-0.007311571,0.025018921,0.055023745,-0.03043178]	\N	bac0023a-8673-4269-8b53-fea6e60a8374	27cc66ba-4ef2-445f-bdc5-19a4637bd790
03f805c7-9d46-4279-ab2c-443bf49d38d9	스크린샷 2026-01-06 154343	1767862992559.png	114132	localhost:3000/admin/statistics am 로그인\n9+\nTrayStorage 문서 검색... 홍길동\nCONNECT\n총 문서 이번 달 전체 부서\n홈\n35 0 6\nd 부서 관리\n대분류 관리\n세부 카테고리 관리 월별 업로드 현황 2025년 대분류별 문서수\n문서 관리 20 1 채용 문서 6\n팀원 관리\n15 2 20 6\n통계\n3 1111 5\n공지사항\n10\n4 test 4\n5\n5 11 3\n0\n1월 2월 3월 4월 5월 6월 7월 8월 9월 10월 11월 12월	\N	2026-01-08 09:03:13.855628+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.037039403,0.062149845,-0.05348076,0.0064727613,0.05633752,0.004653162,0.09707831,-0.020465,-0.021091467,0.004223001,-0.014438863,0.07857737,0.056836516,0.0006944505,0.010032615,-0.00047789628,0.06096553,0.03193475,-0.029923374,-0.030563964,-0.032361995,0.024069883,-0.006167013,0.010544248,-0.015206723,-0.038763046,-0.025130708,-0.03841714,-0.0024986074,-0.036826767,0.0123017365,0.0142570995,0.024310388,-0.036800317,0.027323563,0.021703416,-0.014758778,0.032573473,0.031847097,-0.10533581,-0.017972192,0.018906167,-0.030070513,0.023678008,-0.00038859906,-0.0325118,-0.027328057,0.0012819696,-0.034488432,0.0034356795,0.028397398,0.010131268,-0.013902916,-0.016572628,-0.064753965,-0.044898085,0.00221858,-0.0741915,0.029246379,-0.034117848,-0.026447551,-0.01579158,-0.020242792,-0.009881796,0.0023672648,-0.00028757678,0.015396748,0.015265211,-0.057000015,-0.019756734,-0.033955857,0.02221325,-0.014626195,-0.009044282,0.006725744,0.038974185,0.00020410298,0.016376866,0.046842102,0.049102746,-0.037565988,-0.0058775,0.05584572,0.022199836,0.047233388,0.029109644,0.037986312,-0.01659632,-0.07851528,-0.005332903,0.09743597,0.028296225,-0.015798802,0.0063235713,0.08206386,-0.068775885,-0.076901406,-0.14756289,0.055973753,0.09248113,-0.045396887,0.0075247353,0.033653013,-0.020003987,0.025383215,-0.00077021425,-0.079365276,0.006216068,-0.08305304,-0.0056595136,0.009848599,-0.0044702343,0.04006276,0.030237613,-0.050703797,0.025460798,0.035648815,0.039393205,0.0117727015,-0.030016791,0.021640398,0.046673063,-0.038703725,0.04497475,0.013512312,0.009919468,-0.0688843,-0.013580707,-0.015693156,0.026552232,-0.054262385,-0.04019717,0.016009293,0.0050032297,-0.04020042,0.019111535,0.05441987,0.08049637,-0.051395256,0.0075024827,-0.009320183,-0.04700198,-0.07564539,0.025708735,-0.03324669,-0.04252709,0.017003609,0.071365595,-0.0122182015,0.012526397,-0.06712839,0.022935007,-0.05419775,-0.022047672,-0.001768342,0.02004584,0.019495932,-0.033616856,0.041618206,0.004360651,-0.012645775,-0.07726568,-0.011774953,0.029920243,-0.021188965,-0.056576524,-0.04447583,-0.05517961,-0.016575495,0.007907544,-0.0085908715,-0.023571158,-0.0525739,-0.004825455,-0.014350452,0.011157483,-0.016511641,-0.043667767,-0.011990553,-0.014327359,0.08970286,-0.009582072,0.0023027186,-0.068020314,-0.024458326,0.0015349253,0.019991929,0.01731207,0.053243008,0.10031939,0.006223161,-0.030819789,0.03199239,0.028411716,-0.037541863,0.08349652,0.06449732,-0.0007843352,-0.053879373,-0.040376846,0.029402507,-0.01743307,-0.002474338,0.0051428033,-0.00040463606,0.008002299,-0.02825876,-0.024152372,0.025849055,0.010710597,-0.013939116,-0.026366515,0.027311943,-0.008534515,0.046099257,0.037246414,0.04766412,-0.010279437,0.051082976,-0.0393204,0.048497424,0.019180464,0.01185429,0.022552276,0.03270328,-0.021492532,0.022158686,0.035441544,-0.01867936,-0.029722705,-0.0026939395,0.01755824,0.0037241762,-0.014197723,-0.012517898,0.06005424,0.03443028,-0.016551722,-0.045791134,0.021585671,-0.009849056,-0.0300848,0.03194125,-0.03597201,0.03815422,0.015382315,0.03735549,0.026489697,0.017000984,-0.018992728,-0.013621587,-0.0020171036,-0.090185724,0.02490273,-0.03721754,-0.016449092,0.03351895,-0.017522885,0.016983397,0.015874337,0.05048921,-0.0022595807,-0.015633166,-0.03702581,-0.04028511,-0.05928414,-0.0191929,-0.021390107,0.026003161,-0.043846928,0.053727407,-0.06290211,-0.03197234,-0.0012938237,-0.03987853,0.03985702,-0.01393642,0.010197971,-0.06989049,-0.047164377,-0.008143653,0.00902234,0.0424703,0.01002042,0.0008633027,-0.06307207,-0.006585212,0.0076205204,0.026835328,-0.031681288,0.043673906,0.04093598,-0.033765692,-0.050185006,0.04821997,0.058687203,0.041837692,0.011011062,0.012387499,0.0054186434,0.0041199178,0.053126745,-0.0240644,0.012032178,-0.012200383,-0.012501503,-0.05379063,-0.013564134,-0.026491426,-0.00018538999,0.054600038,0.058508813,-0.046392262,-0.04304934,-0.018019784,-0.0095443325,-0.14314087,0.005163778,-0.041822188,-0.034279577,0.021304486,0.0026974536,-0.049340203,-0.022576675,0.03551833,0.006557677,0.015274325,0.018821066,0.0067759664,-0.01199273,0.03411993,0.0056457464,-0.03444681,0.0010086838,0.0042634928,0.04249629,-0.047113217,0.02420557,0.050942324,0.029728344,0.012875552,0.020281782,0.058847263,0.061762355,0.012215209,-0.03327847,-0.0032810764,0.006077312,-0.008036714,0.013727069,0.027596751,-0.03325875,-0.054572918,0.016055996,-0.010141013,0.0071377046,0.03553933,-0.0038606653,-0.011183341,0.0019010236,-0.001081887,0.022767235,-0.022102026,0.071927615,0.022804467,0.0058591478,0.033650838,0.035313945,-0.012701305,0.008202504,-0.037785638,-0.012746032,-0.004459054,0.03765059,0.015109788,-0.05927425,-0.021426799,0.034913484,0.04306549,-0.07644252,-0.0080907745,-0.019317811,-0.034437064,0.071748465,0.017658755,0.016853686,-0.06602503,-0.006543017,0.016186574,0.011695798,-0.050484687,-0.0122550735,0.0028387064,0.01870094,0.015566779,0.011506128,-0.004544829,0.015451482,-0.028736794,0.032501847,-0.016590146,-0.033111874,0.05965998,-0.032034416,-0.014956065,0.010321616,0.0054437155,0.033283703,-0.058336772,0.018711746,0.02802455,-0.055086177,-0.034603197,0.028887136,-0.01418875,-0.002522119,0.0018568559,-0.012828738,-0.0175522,0.025743349,0.027099624,0.013097834,0.047820408,-0.0019367198,-0.023128023,-0.076464325,-0.0073004547,0.010067602,0.013042266,-0.0319226,0.0009940473,0.011091824,-0.043008663,-0.028821463,-0.04927331,0.0053990544,-0.047651872,-0.065940976,-0.0120640285,0.007908355,0.01264687,0.020726299,0.07954947,-0.038036764,-0.014002214,-0.0007283184,0.034718182,0.026310768,-0.011972263,-0.063971736,-0.026345074,0.019023662,0.009671731,-0.02649512,-0.088189706,0.02975852,0.016729303,0.03337959,-0.00900559,0.036525436,-0.05065848,-0.02472127,0.049339917,0.0037608964,-0.014243792,-0.06663168,-0.08253306,0.021957386,0.01908979,0.032627005,0.010358147,-0.01994735,0.035012763,-0.011716361,0.0037316163,0.027236633,0.004547131,-0.016156755,-0.02608129,-0.033750333,-0.058411602,0.0019184549,-0.02434109,0.035075802,0.024803689,-0.0036987888,-0.0052946196,0.004491118,0.015122603,-0.008797386,0.016431507,-0.01375516,-0.03929708,-0.009362202,0.05258819,0.025844395,0.08521627,0.008373723,-0.0015457917,0.023279686,0.0727813,0.014076035,-0.008646958,-0.025146507,-0.03076061,-0.0153167145,-0.0339431,-0.022834009,0.08121308,-0.013600116,0.015229926,-0.03927927,0.016940799,0.0054037767,-0.05332845,0.0119174365,-0.03983131,0.0022501366,-0.019743528,0.060754124,-0.04573581,-0.0043834723,0.05427338,-0.008973612,-0.021908252,0.0021175467,0.015646817,0.013403056,-0.003182503,-0.03771693,-0.03016351,0.058631588,0.018344546,-0.016059117,0.021936066,0.09639919,0.04604532,0.019143984,0.06050657,0.014030645,0.03384726,0.055637017,0.020733953,0.011490728,0.0636488,0.04189367,0.00968789,-0.019516729,-0.028207092,0.009705162,-0.047280442,0.020035196,-0.014286054,-0.0099458685,0.009418314,-0.020236518,0.024298383,0.039114643,-0.021141391,0.018673802,-0.009815636,-0.015808191,0.02233959,0.03034593,0.016416086,0.00063294807,-0.026239272,0.0662162,0.023652812,-0.012718541,-0.014111007,-0.026534839,0.04159241,-0.042917535,0.050817832,-0.0020157755,-0.057452403,0.013601926,0.023464937,0.01397138,-0.007184616,0.0014786777,0.026404101,-0.016532471,-0.033809844,-0.017993445,0.022638015,-0.003545337,-0.00016690917,0.047987524,-0.019431073,-0.00029765037,-0.010939602,-0.06415019,0.049115267,-0.0046192356,-0.044921402,0.028906578,0.06064364,-0.04451998,0.057608515,-0.025014725,0.055897415,0.025120433,-0.013918392,-0.048425563,-0.038671743,-0.05729017,0.0054393453,0.005628194,0.020191982,0.026406715,-0.026411237,-0.019563768,-0.048800968,0.045599237,-0.018073777,-0.04417944,0.04872522,0.051657863,0.0072225453,0.046491984,-0.015691582,0.0047445577,0.03530553,-0.0217422,0.016132897,0.033039503,0.015122894,-0.042626284,-0.026149984,0.016545657,0.017145595,-0.023251489,0.020296108,-0.04886733,-0.015024941,0.061146732,0.0042412262,-0.044426415,0.0058826683,0.06610333,0.057878714,-0.00069626933,-0.053937566,-0.023075173,0.011437137,0.039952703,0.019775175,0.0016701621,-0.018236274,0.052704684,-0.028988512,0.03419037,-0.06450187,-0.028786492,-0.021445742,0.024429305,-0.006747655,-0.04373314,-0.02874828,-0.031313974,-0.017061213,-0.011419119,-0.039630633,-0.0476594,-0.039237462,0.0048294966,-0.029138856,-0.047465,0.014285952,-0.029605124,-0.018338937,0.1030791,-0.005252477,-0.024250472,0.007983865,0.019038806,-0.05512316,0.020403542,0.009523318,-0.011102619,0.030583434,-0.005525975,0.0003352788,0.03686707,0.021141756,-0.041789196,0.020254921,0.018246386,-0.01823898,0.026950445,-0.018048448,0.019965254,-0.05100391,0.076983795,-0.024605833,0.084762886,0.026434964,0.0062430617,0.026000043,-0.00013655683,-0.017870639,-0.037295844,0.031248003,0.009659396,0.03242328,0.021735262,0.011424922,0.0013611024,-0.07387241,0.034336835,0.048543826,-0.028545026,0.060844198,0.01133979,0.040196463,0.011792639,0.040806748,0.029255783,-0.03758712,-0.01929431,0.07145736,0.06418749,-0.011754046,-0.007977848,-0.013940054,0.012914219,-0.06604873,0.020293513,0.0384328,-0.019331357,-0.04675494,0.038030338,-0.027015993,-0.019091018,0.0035482668,-0.044521086,-0.02110533,-0.0016840886,0.04083103,-0.009088232,-0.053668637,-0.0036116675,0.0070583844,0.036603767,-0.004924551,-0.025899094,0.017286437,-0.024379257,-0.12827058,0.032725915,0.01771163,0.0053963116,0.021586156,0.0025508318,0.028606955,-0.021666141,0.059768062,-0.025331054,-0.055101015,0.02640824,-0.02356663,0.0054153893,-0.06481737,0.040279467,0.0688129,-0.003987242]	\N	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1
2289e077-829b-4467-b256-3d267f9c7d92	333.png	1763958611249.png	24985	한슬 A\nOCR B=	\N	2025-11-24 04:30:13.82377+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1
846c1a09-234b-4256-aad4-3498a463e730	55555.png	1763963611592.png	22172	KGS! 중소벤처기업연구원\n소상공인 지원정책 및 제도 개선을 위한 기초자료 제공\n빅데이터를 활용한 소상공인 경영실태 분석\n12025-12101점잭이슈 인포그래픽.\n나수미 연구위원\n수시연구 2417\n<빅데이터를 활용한 소상공인 경영실태 분석>를 바탕으로 제작되었습니다.	\N	2025-11-24 05:53:32.839505+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.02869027,-0.015901644,-0.010522801,0.0124725215,0.038067233,0.030224973,0.0021185214,0.01556437,0.027664173,0.006518759,-0.013499401,0.02550699,0.04912507,-0.01504623,0.0024644674,0.012342347,0.0321115,-0.02140886,-0.054234903,0.011509322,-0.016418805,-0.015481457,0.0474385,0.03793871,0.0102902185,0.010865076,0.021649785,-0.0034772404,-0.030835101,-0.04886035,0.033663806,0.069313794,-0.02685214,0.022348853,0.048184708,0.015749598,-0.03269892,0.07074808,-0.006447595,-0.10020748,-0.049515873,0.00817219,0.025958966,0.027186232,-0.030483423,-0.008614878,0.0027119867,0.013397726,-0.052319955,0.034785353,-0.0033341527,-0.039190967,-0.027526606,0.010490028,-0.029717153,-0.0036021457,-0.033891104,-0.020639233,0.048926592,-0.012061091,-0.015404774,0.0034889402,-0.0055098897,-0.037893046,-0.015413996,-0.043453842,-0.044084366,-0.029186053,-0.08641567,0.010949674,0.009333473,0.03850027,-0.047482178,0.030650245,0.014689818,-0.028852655,0.036325272,0.019443734,0.062225047,0.05555816,-0.01755366,-0.017556958,0.042920094,0.036969814,0.019998148,0.051479615,0.05295298,-0.02175922,-0.094495945,-0.013303309,0.092734456,0.023982007,-0.02983424,-0.019410696,0.08651974,-0.042294413,-0.07850287,-0.14294304,0.027033985,0.057924595,-0.03290865,-0.038429745,-0.0031824978,0.00014918811,0.017058661,0.006957349,-0.041620526,-0.048570734,-0.07728621,-0.04399599,-0.032337964,-0.013690071,-0.020624377,0.055189934,-0.05641308,-0.028925471,0.0013089315,0.061261408,0.015943086,0.01476696,-0.0055820066,-0.0033248956,-0.022528311,0.004800238,-0.0009965521,0.007396424,-0.028223993,0.0067677395,-0.020205345,0.0272446,0.0061292932,-0.038144417,0.044005036,0.017844046,-0.043468382,-0.018517325,0.02349271,0.03883344,0.0067111496,0.017154226,0.02341581,-0.027878722,-0.069303505,0.018389624,0.0049798777,-0.06401927,-0.062448964,0.009830783,0.008536317,0.01762335,-0.02840743,-0.02829255,0.029914236,-0.050555415,-0.008786288,0.03118715,0.025550917,-0.06582007,0.028980812,-0.022797916,0.0036804904,-0.058550302,0.011375869,0.01935371,-0.03243501,-0.044946395,-0.048109192,-0.056294754,-0.0040081586,0.010741896,0.025968237,-0.009535898,-0.057897422,-0.0053903316,-0.0039153285,-0.063258775,-0.013805613,-0.029907102,-0.08189628,0.03431509,0.092823006,-0.0014618902,-0.0074502653,0.0036494746,-0.052699547,-0.01716884,0.03858561,0.028576866,0.07495169,0.02836747,-0.015100627,-0.028885506,0.017133288,0.019247856,-0.017050648,0.02931082,0.018440314,-0.026440345,-0.020214345,-0.036659963,0.026873404,-0.026465055,-0.0033415407,-0.018939033,0.00510665,0.044050857,-0.08747271,-0.038472533,-0.0059503415,0.019923048,-0.0026572335,-0.0043202965,0.0022508653,-0.07502462,0.04520289,0.03460825,0.08708317,0.055117264,0.0732304,-0.05698538,0.0305965,0.045690764,0.030524932,-0.016772885,-0.003558061,-0.0049447445,-0.005179029,-0.011215004,0.013343611,-0.035116334,0.009919446,0.027009377,-0.0054607536,0.016344063,-0.013427762,-0.027990963,0.036599632,-0.06809533,-0.085823655,0.015113229,0.029501742,0.009040038,0.041107737,-0.027079176,0.0039694044,0.02002543,0.046931997,-0.0023358802,-0.029032318,-0.05928983,-0.0074206176,-0.017841052,-0.06661748,-0.013790113,-0.04195667,-0.010250412,0.023430955,0.011519882,0.014265196,0.0081688315,0.05631008,0.014706481,0.03153384,-0.0035104353,-0.08324611,-0.030915104,-0.022158394,-0.015463056,-0.018514201,-0.079127885,0.039038524,-0.059701588,-0.06678703,0.009564899,-0.0483722,0.003043707,-0.03188663,0.014451572,-0.039892588,-0.041054886,0.03910476,0.00986845,-0.008103035,-0.019539917,0.0011663503,-0.09387956,-0.046625897,0.02592168,-0.011765085,-0.039179545,0.022102695,0.04516198,0.01463689,-0.085904606,0.044666,0.0547682,0.006503957,-0.0134918075,-0.041605704,0.025465993,-0.028816894,0.06997539,-0.006438791,-0.016306266,0.018888252,-0.0042583956,-0.00902497,-0.045015946,-0.0207494,-0.00938,0.036897343,0.1150141,-0.032611657,0.00026593424,-0.004343128,0.0021540138,-0.13926858,-0.011866672,0.025099503,-0.012067157,0.014037606,0.011632708,-0.05917744,0.0060287234,0.048543617,-0.004046362,-0.026149713,-0.026126128,0.039759174,0.028650027,0.0036590123,-0.0060355626,-0.0015015292,-0.025012638,-0.0034605586,0.04179244,-0.060558274,0.004650905,0.011583302,0.011654167,0.029880423,-0.016223984,0.058300283,-0.010493079,-0.0020024648,-0.09601885,-0.00165881,-0.0049850056,0.031859003,-0.009928647,0.00882398,0.022058789,-0.0403338,-0.0070313998,0.0031649333,-0.010965947,0.057809945,-0.010928423,-0.020037478,-0.0076334537,-0.002527492,0.0222882,0.033268224,0.07202026,0.024327103,0.007409967,0.031145087,0.046764474,-0.025957657,0.0022799533,-0.014389,0.020474412,0.01201567,0.03517981,0.026842548,-0.01270035,0.0026728194,0.016071195,0.04697892,-0.078587234,-0.007078775,-0.0029518914,-0.013886235,0.025565233,0.00020885793,0.07131724,-0.0298717,0.0053887763,0.026140168,0.031562626,-0.030243533,-0.0018587731,-0.010386878,0.029037891,0.03878331,0.023481693,0.004830284,0.03391434,-0.0043298802,0.03617658,-0.0060423273,-0.004654564,0.06433588,-0.06821246,0.014964213,-0.044499688,0.07000744,0.027531683,-0.03149706,0.01354148,-0.011688467,-0.022657657,0.014678538,-0.0020916874,-0.06284646,-0.025982222,0.02376299,-0.025317546,0.009233551,0.04444347,-0.012823339,0.0069060517,0.0098516205,0.036726706,-0.02559909,-0.072693035,-0.014286927,-0.026235787,0.021125412,-0.0045353477,0.015487351,0.00423656,-0.022065371,-0.027609041,-0.0067977337,0.0042113536,-0.010584867,-0.013965927,-0.009303022,0.010894199,-0.0097138425,0.044597406,-0.0039358595,0.008184831,0.017328506,0.028194496,0.009305731,-0.025496298,-2.1038117e-05,-0.025589474,0.0108162835,-0.0139658395,-0.009401888,-0.036704056,-0.07011664,0.026019538,0.03117699,0.026264962,-0.0504751,0.048120555,-0.03720317,-0.073565684,0.053524427,0.04288119,0.012274028,-0.029597867,-0.022127485,0.05955525,-0.04854422,0.009687842,0.0075245514,0.0011350046,0.009188761,-0.0131391715,-0.038392443,0.010966337,-0.010108487,0.046494387,0.011158981,-0.019992312,0.0042795422,0.015657706,-0.004157906,0.0024301559,0.07424104,-0.0117164375,-0.0073268753,-0.0005322824,0.053179644,0.049435288,0.037475236,0.039312925,0.0062432867,-0.041253183,0.028649062,-0.017020555,0.06200302,-0.02316422,-0.032971855,0.026264403,0.03649778,0.004144893,0.012192591,-0.05227617,-0.04378299,0.047536876,-0.050828926,-0.01254231,0.030952277,-0.043291245,0.023745008,-0.03495082,0.048528902,0.0071054073,-0.03368439,0.031997357,-0.04756207,-0.022875836,-0.05730956,0.052507702,0.009133322,-0.020721124,-0.029703362,-0.071648,-0.009182613,-0.012170681,0.053078532,-0.004631411,0.039821453,-0.03545718,-0.07422598,0.05919902,0.014570018,0.007207215,0.03875089,0.04676079,0.06440135,0.040931344,0.015056891,-0.02467985,0.0041376245,0.009002671,-0.011577752,0.024296166,0.048995975,0.0025289494,-0.0056987177,-0.050822604,0.014836605,0.04419142,-0.007122989,-0.021611463,-0.055256933,0.004746201,0.0241688,-0.021327276,0.060578875,0.023210473,-0.09404182,0.016961224,-0.0317577,0.0019199534,0.060564004,0.005812809,-0.0074519063,0.0063289925,-0.052389886,0.124520496,0.019813163,0.013291043,-0.009181256,-0.012665231,0.004353615,0.001250876,0.06431221,-0.011710809,-0.053108532,-0.033860806,0.027678574,0.009616483,0.02912079,-0.025878077,0.04532776,0.00862034,0.009832871,-0.030477025,0.0010178569,-0.03236805,0.02696507,0.028053947,-0.03882968,0.046459857,0.007897484,-0.039475605,0.05495691,-0.0071143243,-0.017826932,0.0111723,0.013456971,-0.014885867,0.0505366,-0.02287032,0.042805314,0.0739737,0.002676936,-0.04695187,-0.02056671,-0.09213231,0.003940863,0.02261409,-0.07036121,0.011805499,-0.028510459,-0.061771512,-0.04650363,0.009575346,-0.034029104,-0.026634265,0.056580216,0.03591235,0.022717498,0.025551112,0.016634963,0.008181488,-0.03427807,0.018957201,-0.04642314,0.008689974,-0.008217935,-0.00015097657,-0.016728373,0.023380406,0.023136768,-0.058999363,0.005817936,0.030192412,0.025833944,0.0054807235,0.028426642,-0.06261562,0.01933865,0.027600305,0.09391026,0.010047924,-0.06678744,-0.025487632,0.024719728,0.030573402,-0.012387026,0.058535736,-0.029058063,0.031677503,-0.04162297,0.009834646,-0.06214556,-0.0033599217,0.011890204,0.01628978,0.02847238,0.025110394,-0.009575795,0.00869382,0.020396674,-0.009484911,0.0065388833,-0.02380353,0.027526513,0.032238442,0.019553209,-0.07747181,0.03435422,-0.02731185,0.011642434,0.09018619,0.016440261,0.004701864,0.03720819,0.026674038,-0.05090568,0.013199923,0.010085643,0.014678391,0.0030302783,-0.028727157,-0.056658644,-0.02883734,-0.003864969,-0.036306128,-0.026400615,-0.018517056,-0.008529979,-0.0460012,0.012781831,-0.018947544,-0.004643797,0.024809677,-0.026734201,0.04008276,-0.02223846,0.06417001,-0.048889596,-0.0082083,-0.014066934,-0.033710923,0.025215574,0.025772424,0.062359903,-0.005449365,-0.020549232,0.005256789,-0.050237928,-0.0013848337,0.06659385,0.030204333,0.026145136,0.00031803641,0.05754041,0.013541285,0.018716741,0.010856153,-0.0074294154,0.0057096607,0.06963125,0.04793957,0.0061580953,0.010495303,-0.038237724,-0.0024427061,-0.035375994,0.007072838,-0.0026166514,-0.007850986,-0.04421527,0.03010351,-0.0143651385,-0.030647986,0.010342174,-0.014494101,0.013738426,-0.011726643,0.06539842,-0.022216272,-0.014999242,-0.025897814,0.04227406,0.07295972,-0.0077969343,-0.042910237,-0.021044124,-0.019447632,-0.082527354,-0.006837222,0.016901327,-0.018565604,-0.014446139,-0.03340875,0.022764554,-0.041677546,0.011218025,-0.0078042783,-0.015962789,0.039277025,-0.042207044,-0.0034519362,-0.0698259,0.014352053,-0.008083698,-0.059212852]	3f9ccd94-e6d6-4267-a156-434186524ac9	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1
af8f1b85-3017-4c8b-aae5-2d85049a5cba	스크린샷 2026-01-07 133835	1767761176504.png	101634	새탭 x TrayStorageCONNECT x TrayStorageCONNECT x + X\nhttps://traystorageconnect.com/team/documents\n9+\nTrayStorage 문서 검색... 김철수\nCONNECT Ai\n카테고리와 문서를 관리하세요\n@ 홈\n부서 보기 세부 카테고리 전체 문서 문서 업로드\n3 대분류 관리\n日 세부 카테고리 관리 전체 문서 목록\n문서 관리 파일명, 업로더, 카테고리, 부서로 검색... 전체 기간 : 최신순\n공유받은 문서함\n1-19 / 총 19개 문서\n통계\np 공지사항 33 문서 보기\n2025-12-30 08:14 · 14 . 14 . 인사팀\n20230412162051_egoeqbqv 문서 보기\n2025-12-30 01:45·11·11-2024년 . 인사팀\n20251226_110205 문서 보기\n2025-12-26 02:09 . 14 . 14 . 인사팀\n기업1 문서 보기\n2025-12-11 06:58·근로계약서(22024년) · 근로계약서(2024년) - 2024년 ·인사팀\nindex002 문서 보기\n2025-12-11 02:56 · 20 20 - 2024년 인사팀\n김철수 P\n팀원 | 인사팀\n:	\N	2026-01-07 04:46:19.580359+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.038242042,0.09031253,-0.062073793,0.008433084,0.057102,0.00736529,0.09705036,-0.0024840203,0.009636985,-0.0048306887,-0.023863595,0.044186283,0.05286688,0.031375404,0.02144864,-0.012571565,0.059349265,0.042066652,-0.03420925,-0.028764442,-0.035792097,0.047145825,0.00021733851,0.029108657,-0.009873302,-0.06961933,0.03210106,-0.026130209,0.011614086,-0.06435402,0.0119805755,0.05476261,0.0027316157,-0.06841813,0.012320202,0.025133286,-0.024671337,0.014792718,0.016996419,-0.089279816,-0.05105958,-0.0065289694,-0.008790361,0.017248102,-0.0023532507,0.028780144,-0.012258451,0.013440963,-0.09441116,0.053540435,0.009750155,-0.022985986,0.0068054358,-0.019984065,-0.049092334,-0.057825275,-0.051335614,-0.06288312,0.04480006,-0.036988236,-0.020663967,-0.009645015,0.014078633,-0.023552645,-0.0043742564,-0.017435407,0.013218369,0.003373708,-0.08658163,0.01755921,-0.008110323,0.060978223,-0.029748034,0.0072806417,0.040589087,0.014947746,0.02096497,0.009762813,0.05700477,0.06181508,-0.06797127,0.030481078,0.065517,0.039892294,0.028278751,-0.0064824964,0.033312965,-0.047685754,-0.09860421,-0.03536906,0.09022597,0.006795125,0.009014992,-0.0031393443,0.092312306,-0.042686045,-0.09847354,-0.14818104,0.045146935,0.06872052,-0.01967627,-0.0019710197,0.008021406,-0.017730117,0.02856129,0.003558679,-0.056498073,-0.01410314,-0.06964011,0.021072961,0.016430162,0.020009883,-0.020489294,0.020014238,-0.05249274,0.023709226,0.016935932,0.020807914,-0.036867402,-0.009152673,0.026510881,0.0098423315,-0.010209365,0.07313315,0.053781,0.022869378,-0.034024894,0.029539624,-0.017734924,0.02235736,-0.02172069,-0.030685557,0.018918747,0.0027664695,-0.013197667,0.0121754855,0.048758525,0.033077195,-0.039560366,-0.0067633116,-0.0008657012,-0.027809666,-0.06388952,0.02547556,0.014306135,-0.049446784,0.014945304,0.04524145,-0.055416796,0.02531125,-0.06462978,-0.0057320497,-0.024987796,-0.04143752,-0.017849797,0.03292642,0.0029619855,-0.022324562,0.067071415,-0.034287464,0.030637544,-0.054547735,-0.0006981394,0.009123677,-0.04025784,-0.06422813,-0.03802816,-0.06788815,0.01615019,0.0069314796,0.0038048725,-0.03435373,-0.016413407,-0.0116922045,0.002956632,-0.015260864,0.016062042,-0.040593296,-0.04049494,0.002368778,0.041205153,-0.021031866,-0.007746105,-0.014804797,-0.02135368,-0.019235099,0.010157317,0.0018140547,0.024380447,0.102670334,0.00833582,-0.01824625,0.030512199,0.030397303,-0.03503071,0.049845938,0.0324846,-0.044581056,-0.043864865,-0.027494323,0.027338738,-0.010738484,0.021472864,-0.012732978,0.030144447,0.01180948,-0.039583206,-0.03199272,0.01844729,0.043552395,-0.053229287,-0.04662763,0.006393319,-0.031312276,0.027933853,0.028834805,0.06378194,-0.003252746,0.03844076,-0.055695783,0.013252158,-0.0023949156,-0.02386749,0.029005926,0.0038682218,-0.0017952325,0.015919039,0.016494794,-0.012036048,-0.04417022,-0.00776601,0.008723873,0.012761266,0.012718775,-0.0047857,0.05628785,0.04086805,-0.058308408,-0.02962382,0.0007452645,-0.026290417,-0.0101084,0.030421218,-0.04780507,0.007436444,-0.0016288722,0.022591164,0.022444233,0.0021700729,-0.03992996,-0.023477796,0.013229071,-0.08782016,0.021966564,-0.051995058,0.015359559,0.04050904,-0.023046764,0.009499703,0.010012744,0.033443864,-0.002538892,-0.023546161,-0.015594188,-0.046106596,-0.06884651,-0.031702116,-0.018235601,0.020691186,-0.01647931,0.06294747,-0.06369233,-0.043832146,-0.015556338,-0.04411675,0.024217531,-0.014481598,-0.0051773074,-0.04706776,-0.070094176,-0.0010091823,0.010628185,0.0037057472,0.015532497,0.014270716,-0.07093921,-0.012931421,-0.012722307,0.04274088,-0.03835547,0.044388793,0.03898798,-0.05560104,-0.083861075,0.027729498,0.050737668,0.032031033,0.034351632,0.0014135063,-0.01653917,0.013575021,0.04191421,-0.021971168,0.043117046,-0.019642936,0.016243601,-0.003951731,0.009001237,-0.027829433,-0.018807793,0.041072674,0.05728214,-0.032000553,-0.0025380452,-0.010486795,-0.00010690833,-0.14751455,0.003363423,-0.022549914,-0.016314995,0.02140009,0.0101375,-0.03527719,-0.026286824,0.0674974,0.020510485,0.010321335,0.023930255,0.03192782,0.0012600175,0.01767365,0.01044522,0.0022387921,0.015559653,0.016762355,0.030645357,-0.023500677,0.014183379,0.05893521,0.009741185,0.03523128,0.009975526,0.049039733,0.020298751,0.0020729825,-0.022826562,0.009397618,0.022335377,0.0010605323,0.006363838,0.05360005,0.019011557,-0.046526354,0.022541804,-0.0078035383,0.012769028,0.045857165,-0.02175227,0.007889934,-0.0048227794,0.024491481,0.041392803,-0.018691162,0.054511413,0.021043919,-0.01789964,0.047263708,0.031173652,-0.006258597,-0.0033457328,-0.015664266,-0.012814106,-0.0066338778,0.02938564,-0.025831474,-0.05212068,0.0071521294,0.026724994,0.03878362,-0.07771728,-0.00049050036,-0.023608226,-0.009957618,0.057733987,-0.0027200615,0.045984715,-0.06298454,-0.0012535361,-0.0038660362,0.012832107,-0.029302482,0.03368695,-0.013746674,0.024403565,0.019967973,-0.007833612,0.006498205,-0.002604534,-0.010103648,0.018227244,-0.033664826,-0.019660208,0.09227105,-0.038097166,-0.003325696,-0.033531655,0.033899095,0.015016427,-0.026397455,0.019146545,-0.0024917077,-0.060390558,0.0009212104,0.032588214,-0.043960825,-0.012803888,0.017948376,-0.017082071,-0.025790822,0.028860535,0.028297383,0.026778758,0.06724826,0.019336931,-0.009988037,-0.07412712,-0.027499268,-0.025281975,0.022326272,0.008225602,0.048385285,0.0025677604,0.018237064,-0.02258521,0.017026879,0.012761239,-0.041742258,-0.053182498,-0.007961401,0.007190399,-0.0047993353,0.024002466,0.07519869,-0.01383017,-0.022817377,0.042236805,0.03817574,0.012538852,0.006556645,-0.049521767,-0.011782764,0.002346464,0.013945237,-0.05046108,-0.07368479,0.022435997,0.036212318,0.039352786,-0.036142047,0.026316432,-0.06468925,-0.04362877,0.033100408,0.0138370795,0.017672045,-0.06880543,-0.051865403,0.034413103,-0.015964057,0.057662316,0.030494822,-0.009529838,0.01984667,0.0057953754,-0.0028016912,0.04591839,0.03325397,0.010406356,0.004689039,-0.020723224,-0.028361646,0.025299443,-0.0042276746,0.046683367,0.047831066,-0.016967641,-0.018298205,-0.022329053,0.002918088,-0.009455841,-0.0015807361,0.0019301065,-0.05126892,-0.020779831,0.024494506,0.0046337084,0.08934404,-0.012616511,0.0017349288,0.005402767,0.03787784,0.042088516,-0.012567337,-0.029907608,-0.014370853,0.013121369,-0.0092007965,-0.031607542,0.058218203,0.018353742,0.010631831,-0.041677725,0.012962583,0.010475085,-0.026124423,0.013914667,-0.034771755,-0.003666159,-0.073902786,0.076601826,-0.034231238,-0.012785276,0.01387174,-0.032792322,-0.035586674,-0.01714968,0.009618483,-0.000618345,0.020597838,-0.0005374751,-0.02512791,0.089406565,0.027499551,-0.0015841295,0.019364817,0.07104145,0.046331536,0.0026636973,0.06137532,0.03300314,0.05410496,0.035071332,0.011151653,0.019595759,0.06501543,0.044342816,0.00824462,0.008944183,-0.0297431,0.019414637,-0.03912087,0.015298825,-0.021373585,-0.015032388,0.027610276,-0.014101316,0.06395146,0.04380688,-0.041976467,-0.036652964,0.022060536,-0.0323689,0.024830423,0.017744126,0.017171122,-0.01077506,-0.034339093,0.0756858,-0.03481359,-0.033166073,0.019500928,-0.043544274,0.020872464,-0.043150574,0.035274457,-0.017295208,-0.053504948,0.014157869,0.0106383255,0.022626974,0.010594094,-0.006953586,0.062246267,0.011463177,0.018888408,-0.013793541,-0.0007781815,-0.005139074,0.010780123,0.035928432,0.012430821,-0.021620959,0.017429583,-0.07112756,0.031086536,-0.0058797696,-0.05038697,0.015881894,0.05604082,-0.036807686,0.016113626,-0.009948748,0.05943965,0.011899343,0.008674281,-0.04994887,-0.038830474,-0.06706205,0.0052840174,-0.015840711,-0.00310698,0.04720712,-0.029659824,-0.037543543,-0.080392025,0.06012641,-0.004973965,-0.026321601,0.031381596,0.043167915,0.02971656,0.040920258,-0.042961936,-0.008742226,0.0008219553,-0.0052868063,0.012341354,0.015211219,0.013834748,-0.019493286,0.0065867,-0.0069363806,0.03623908,-0.016291779,0.0024605966,0.000535914,-8.020152e-05,0.062325913,0.038143624,-0.034007683,0.036387708,0.06078123,0.08144093,-0.022496546,-0.048187133,-0.0076373816,-0.012019086,0.04739835,-0.016508114,0.032188453,-0.0024416477,0.04471761,-0.07686556,0.04926315,-0.024295047,-0.023642793,-0.0082329,0.015802529,-0.032227505,-0.019355377,-0.012300694,-0.014462056,-0.0052789687,0.0133105805,-0.07850026,-0.037520792,-0.08150397,0.007895243,-0.03110905,-0.05962859,-0.0030469052,-0.018391369,-0.034503613,0.08203079,0.026839875,-0.020366596,0.0006191033,-0.0057037417,-0.04672564,-0.013172267,0.008604245,-0.0023127517,0.035948534,-0.030129658,0.0024037417,0.00075835525,0.030910114,-0.03301153,0.00029329993,0.0024859873,-0.03717757,0.0064036534,-0.017946355,0.048473027,-0.033868317,0.059879173,-0.037617248,0.04529437,0.015009709,0.03331118,0.022625519,-0.009124715,-0.028113853,-0.033448834,0.043016117,0.007589759,0.037271064,0.017124755,-0.040890064,-0.0026238644,-0.046032608,0.036172196,0.045181524,-0.035228107,0.0609165,-0.009136371,0.042578433,0.0125781605,0.06711977,-0.012259308,-0.0047342796,-0.018832495,0.041768666,0.0533309,-0.0077235983,0.012917772,-0.064889304,0.015927283,-0.0681323,0.00373915,0.016954005,-0.047280714,-0.030484185,0.069363676,-0.033685617,-0.006030107,0.01845128,-0.029984713,-0.026984861,-0.0045087407,0.026481137,-0.013939298,-0.078831844,-0.014795343,0.027939916,0.046547405,0.00981264,-0.01395828,0.022680562,-0.022397902,-0.09789113,0.026678342,0.02042478,-0.011158365,0.0029812704,-0.0055705924,-0.019381596,-0.009578179,0.043764427,-0.019214578,-0.011965898,0.060641862,-0.033762436,-0.0038686045,-0.070130736,-0.0054348065,0.07994759,-0.036413096]	\N	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed
16030ccb-7157-456e-bf9f-6c77d8c177cd	art_14908641930849	1765439520870.jpg	97819	<표1>행정자치부행정업무편람 39쪽\n구분           표시방법                   여시\nEJ 아라아숫자로쓴다명제/조제4항)\nFON 수자로표기하되연,월,일의글자는생략하고그자리에 ~ 2016.12.12.(월)\n온점을찍어표시(영제/조세5항)\nICO ㅅ'분은24시각제에따라숫자로표기하되,시'분의글자는 오후3시20분(=)\n생릭하고그사이에 쌍점()을 찍어구분(영제/조저5항)              ~1520(0)\nEC) 금액을표시할때에는아라비아숫자로쓰되,숫자다음에      21135602\n괄호를하고한글로기재(규칙저?조저2항|        (금일십일만삼천오백육십원)\nEx      20%	\N	2025-12-11 07:52:03.30504+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	[0.02082232,0.018625213,-0.0564035,-0.005089243,0.06062743,0.03981092,0.0134632215,0.06422008,0.029080953,-0.023169123,0.0516519,0.08484563,0.017800951,0.031266585,0.034099072,-0.051405676,0.04077223,0.04374237,-0.05472224,-0.021664899,-0.034957122,0.009674438,0.030557226,0.021767614,-0.0123075815,-0.021155544,-0.02138527,-0.023403047,0.0012349013,-0.056344546,-0.034147557,0.058853213,0.014427512,-0.025188759,0.071645275,-0.031079192,-0.035478726,0.06051785,-0.01938199,-0.05253693,-0.08128595,0.029741975,-0.041226357,0.020915477,-0.0040692906,0.009644573,-0.0043273736,-0.029405836,-0.06226628,0.03280725,0.046828784,-0.0114467,-0.100712195,-0.0053613456,-0.048416976,-0.00768724,-0.028521055,-0.056855936,0.115163185,-0.01716266,-0.051044364,-0.035173565,-0.03951483,-0.05522782,0.013596786,0.0010670602,0.010917482,-0.008722642,-0.073784895,-0.0040908223,0.012620333,0.052914567,-0.005727261,0.020519573,0.061567787,-0.036074437,0.014596914,-0.008090072,0.07174949,0.009023634,-0.018923454,-0.03264472,0.07851991,0.04449631,0.0036779423,-0.0149427345,0.00061580306,-0.0048251227,-0.07588934,-0.03897434,0.0904357,0.043443706,0.0015406101,-0.008139856,0.07478375,-0.012758626,-0.04575734,-0.079934426,0.030893842,0.032661285,-0.039771676,0.017164258,-0.012053917,0.007892086,0.050151937,0.024175178,-0.013380134,-0.043111257,-0.053238004,0.0784872,-0.0016962199,-0.010912899,0.0074627385,-0.030801142,0.018812608,-0.013800983,-0.03884376,0.026457028,-0.029878255,-0.004458928,-0.008437738,0.04992582,-0.010326621,0.042758126,0.016073482,-0.014144256,-0.05526534,-0.0134058865,0.044202387,0.017941957,-0.030369276,-0.07032382,0.024051204,0.03788046,-0.004183429,-0.034761406,0.06543814,0.0650877,-0.024747685,0.019437553,-0.019529708,-0.008927585,-0.0659764,-0.011815242,-0.0035729036,-0.06512439,-0.0030429324,0.0471511,-0.058783114,0.0030061328,-0.027059158,-0.06125411,0.004801694,0.016674189,-0.042051125,-0.011986727,-0.0032201256,-0.04723719,0.056806095,-0.05325311,0.016246388,-0.028696965,0.04676544,0.025074042,-0.014164039,-0.042436767,-0.024580061,-0.048817307,-0.053202312,0.020521475,0.013223294,0.0007931282,-0.04947793,-0.0015392719,-0.018056925,0.013649943,0.0034474581,-0.009194315,0.008400838,0.0042473534,0.046396565,-0.004019835,-0.01478078,0.0037264118,0.04433965,0.019998597,0.027521636,0.044156943,-0.019595288,0.039457947,-0.0027457923,0.01644123,0.04028666,0.0133291995,-0.026643218,0.045636773,0.010196983,-0.036988143,-0.038976252,-0.035615757,0.037913144,-0.02323392,0.043323223,0.004647795,0.00056732167,-0.0043714684,-0.044135857,-0.03146803,-0.01640031,-0.0049108234,0.006696151,-0.0475004,0.026189048,-0.033598658,-0.01670321,-0.008872034,0.04177647,0.03190317,0.09635937,-0.010696391,0.02257671,0.010109327,-0.024096845,0.06041876,-0.004578767,-0.044666186,0.0032510706,0.029751636,0.0010259396,-0.036269397,0.028848574,0.024317846,-0.027608443,0.0026983833,-0.00028420356,0.03712301,0.023036517,-0.039296545,-0.037394322,0.002222742,0.04228301,0.01718543,0.06292028,-0.042991966,0.048916806,0.012835581,0.026136948,0.018929418,0.001978441,0.013895692,-0.01612405,-0.0068274126,-0.08341257,0.047763504,-0.012459796,-0.02608155,0.041720342,-0.029912801,-0.01157848,0.015649978,0.025332334,-0.0052755233,-0.0036150333,-0.028084258,-0.04382837,-0.04718838,-0.00078846415,-0.013185714,0.0045541315,-0.046586253,0.02392951,-0.012728424,-0.021056794,-0.012030958,-0.023768544,0.02028824,-0.029876571,0.03451684,-0.04543499,-0.039269548,-0.0020370446,0.005038399,-0.013867238,-0.035536557,-0.0004089047,-0.0634643,-0.024097176,-0.0068800743,-0.01098916,-0.034126077,0.026635861,0.05640684,0.020729285,-0.10785904,0.045593172,0.022912428,0.059742305,0.016470773,-0.036287382,-0.021206839,-0.026076777,-0.00023057898,-0.029193228,-0.027277438,0.0054058977,-0.012726894,-0.039427884,-0.013558631,-0.0061040837,0.010115776,0.06967433,0.047295887,-0.0019865776,-0.0050025084,-0.011266412,-0.025128184,-0.16179235,-0.034698635,-0.024404136,0.0156066185,0.023730362,0.0022489282,-0.06383846,-0.02989888,0.049928,-0.022009296,0.03495241,0.00266917,0.027599938,-0.012523578,0.05020968,-0.0692956,-2.0377885e-05,-0.047807977,-0.00401417,0.018537536,-0.112925716,-0.0019338538,0.05640519,-0.03833037,0.030098947,0.041667487,0.026212707,0.019924749,0.0063338606,-0.024689956,-0.017307088,-0.009010765,0.0330831,-0.018374665,0.0385527,0.0033148641,-0.014922969,-0.0016699575,0.019085988,-0.00528913,0.047154542,-0.010156705,0.028146863,0.011569534,-0.008338251,0.029140526,-0.034937687,0.050315745,0.04860054,0.0052415105,0.020073744,0.02719501,-0.0032587536,0.010920449,0.009960257,0.0064893216,-0.0054414407,-0.01427273,0.013787847,-0.03037508,0.028683804,0.01962412,0.0086402465,-0.0670203,-0.0221081,0.012300254,-0.06549474,0.025559546,-0.012530223,0.05110858,-0.068908826,-0.0019886866,-0.049839463,0.014887442,-0.039226342,0.010351109,-0.036629472,0.041027155,0.024659649,0.06351806,-0.03766743,0.013300465,0.008164286,0.020794984,-0.10227876,0.002358164,0.05224758,-0.055158142,0.014794322,-0.020443086,0.07656654,0.024564326,-0.007556968,0.008954571,0.020196073,-0.04095794,-0.02944279,-0.0274427,-0.032617703,-0.0041816873,0.0017144112,0.011676264,-0.0117315585,0.013340138,-0.012590748,0.008444854,0.03955034,0.023400113,-0.0033689698,-0.044606797,0.0014495925,-0.021807961,0.023743978,0.0064856797,0.036624342,-0.0077817426,-0.0035880196,0.013369801,-0.011150042,0.0008555112,-0.020011302,-0.02774684,-0.023149649,0.027067265,0.029184178,0.07085676,0.07581908,-0.002015426,-0.03517698,0.015641645,-0.0045905127,-0.024598954,-0.019366428,-0.0698927,0.059515096,0.0014119651,-0.018170416,-0.03138132,-0.09355472,0.009145141,0.006942882,0.015920606,-0.012207027,0.030758126,-0.04196723,-0.02352074,0.020659909,0.03427017,0.006775888,-0.041984763,-0.036648095,0.0763043,-0.02860191,0.015485202,0.03965151,0.018679174,0.0078026964,-0.029860247,-0.029173711,0.035764802,0.024072224,-0.00849188,-0.011750467,0.005443258,-0.02501232,0.007148219,0.0059184846,-0.022390436,0.058519,0.01662023,0.012770337,-0.0048084185,0.028226832,-0.035273787,0.035942223,-0.0019702797,0.027984437,-0.019186838,0.07886504,-0.014580174,0.06189928,0.019363428,-0.029430695,0.0043009324,0.04741362,0.017198032,0.004664148,-0.03954465,0.015864383,0.024175368,-0.03869577,-0.008507714,-0.00052979274,0.051047776,0.0461858,-0.015756438,0.0012688772,0.029026434,-0.04304918,-0.022722578,-0.06100103,-0.011092549,-0.019712167,0.03030646,-0.006320416,-0.019552544,-0.010737816,0.020424373,0.0027918979,0.070998035,-0.034671575,-0.031008089,0.017872931,0.006750635,-0.03389502,0.08801222,0.0070621367,0.03692208,0.019224014,0.087295294,0.057742722,0.05734888,0.06188768,-0.00078477117,0.038937982,-0.0032904323,0.0012152549,0.026837116,0.07171638,0.021223936,-0.016456453,0.041396216,-0.011299845,0.02395009,-0.032402925,-0.040407535,-0.035440296,0.004525102,0.014351823,-0.012130031,0.013442227,-0.032475714,-0.026604822,0.007848661,0.042168297,-0.013003057,0.038405254,0.020943996,0.008790688,-0.018870939,-0.03952084,0.07062772,0.026187556,0.02614153,0.010131038,-0.024018774,0.00038331246,-0.021260547,0.035724442,-0.062275235,-0.08656757,0.0035083517,0.012523053,-0.031345807,0.027105907,0.003271727,0.014195863,-0.029272452,0.0072050025,-0.05032146,0.017296389,-0.05888026,-0.020273285,0.03047074,-0.0070121726,-0.02914363,0.017228952,-0.06218359,0.026533503,0.002699312,-0.036742274,0.01982978,0.02342226,-0.025957176,0.06811812,-0.03551951,0.02204353,0.030462977,-0.030155672,-0.07554896,-0.068249784,-0.080250815,0.020131117,0.0104804635,0.027841825,0.030554704,-0.026296528,-0.08366807,-0.068073526,0.018336225,-0.05477673,-0.018635228,0.068267465,0.03924034,-0.013056531,0.03326622,-0.0264443,0.031431787,-0.04036077,0.007402737,0.020241754,-0.0026350836,-0.0083086835,-0.025552565,-0.035758186,-0.026292533,0.092021406,0.016866786,0.009500242,0.047972403,0.0024043,-0.018109173,-0.0017897201,-0.056108277,0.016432514,0.035781804,0.07822247,0.002058327,-0.07775422,0.0058393865,-0.020180998,0.026495054,-0.030263903,0.051399283,0.0077342256,0.043532673,-0.031147664,-0.0104012275,-0.06731089,-0.023363516,-0.016732706,-0.040954206,0.01615976,-0.010391841,0.013744685,-0.04904719,-0.008689742,0.04321284,-0.036789995,-0.0072170887,0.016999034,0.016658526,-0.010727685,-0.03439761,-0.0054493602,-0.082928635,-0.0303132,-0.007943449,0.017608417,0.017248627,0.026664803,0.008038609,-0.07092266,0.017792411,-0.009010487,-0.022830825,0.02000001,-0.017203892,0.012069881,-0.0077202194,0.031556126,-0.019384114,0.005790612,0.019002108,0.0058707674,-2.932284e-05,-0.051325656,0.059471555,-0.0014895205,0.050424222,-0.0215014,-0.022803195,0.037363697,0.024204394,-0.011653926,-0.060065832,-0.039113395,-0.04437396,0.0054801707,-0.01904364,0.053680897,0.038923584,-0.020708153,0.018664164,-0.02803835,0.028575502,0.12771405,-0.008886952,0.030431248,0.008255521,0.03887029,0.05504168,0.0244702,-0.01034422,0.038682308,-0.0025663027,-0.011494645,0.023954013,0.046933938,0.037852984,-0.06762912,0.032701507,-0.037026327,0.026555162,0.041534282,0.008219147,-0.02991865,0.021713248,-0.004477266,0.022766959,0.039923467,-0.038238186,-0.0037609483,-0.0106501235,0.008096231,-0.0014080686,-0.0376567,0.004415566,-0.008002807,0.026850294,0.052898623,-0.05622909,-0.015021341,-0.014218568,-0.044181544,0.04395796,0.0399,0.018381698,0.027898999,0.029321393,0.026134668,-0.02223997,0.04287357,-0.012155886,-0.033394963,0.072101586,-0.009229087,-0.022514988,-0.017579194,-0.019528184,0.03636514,-0.011801237]	\N	ad5598f1-7fd4-42fa-a0b9-eaf4ba2cd6fe	c8a69a0a-c47d-486c-9688-aafc678e8974
43717b74-c714-4122-a98c-29cc3e031f17	날씨	1764056076000.png	27986	0 ARE                               [ ]\n안녕하세요! 저는 TrayStoragel Al 어시스턴\n트 트로이입니다. @ 문서 검색과 관리를 도\n와드릴게요!\nexon\n날씨 어때\nexo\n안녕하세요! 저는 문서 관리 시스템 어시스턴\n트 트로이입니다. @ 죄송하지만 저는 실시간\n인사팀 문서는 어디에 있나요? EA 문서 수는?\n카테고리 목록 보여줘\n질문하세요.                                [ |]	\N	2025-11-25 07:34:37.425756+00	f	ed15289a-165d-4768-b160-6ed4bf180bf7	[0.046269707,0.04170443,-0.02611633,0.008207404,-0.010485899,0.01616317,0.06180904,0.009707721,0.022394324,0.001111114,-0.03448155,0.029759679,0.045365673,-0.019566827,-0.015298634,-0.07242882,0.04853132,0.014990575,-0.031432543,-0.0008069701,0.010992196,-0.008104474,0.029497141,0.009069658,-0.014825722,-0.04591731,0.03613755,-0.037989613,-0.0073216413,0.015147468,-0.015120678,0.0014363438,0.04837588,-0.04327357,0.015774738,-0.002117245,-0.039801743,0.047377948,0.009462273,-0.02544205,-0.08495565,0.00734813,0.0076620807,-0.03383392,0.00408799,-0.004412884,-0.0065846196,0.030121433,-0.050709147,0.06606136,0.06019686,-0.051186804,-0.0322238,-0.06282055,-0.051496245,-0.037100516,0.0029068328,-0.04372106,0.022756765,-0.054549415,-0.05214097,-0.023868935,-0.039446477,-0.0018393443,0.018200748,-0.018245308,-0.013235036,0.016810425,-0.06396882,-0.0089098085,-0.039388698,-0.015132152,-0.040889096,-0.013376734,0.050379574,-0.020211032,0.022086166,0.023679094,0.05698333,0.05538317,-0.035360955,0.058797263,0.058634546,0.011835775,0.031640604,-0.025117874,-0.010165003,-0.03295014,-0.08922254,0.002268828,0.10061128,0.02331043,0.0015839019,0.05912901,0.07031759,-0.02917464,-0.0688555,-0.13821772,0.027740046,0.085504025,0.0051073213,-0.016021805,-0.042188648,-0.018560488,0.036573492,-0.010664678,-0.045173366,-0.0014338639,-0.07656374,0.01268467,0.013351744,-0.035906643,-0.020243317,0.037406266,-0.015411745,-0.005715776,-0.0048636603,0.049162455,-0.0033912354,-0.019209867,-0.013756123,0.037254926,-0.008247769,0.003864201,0.020621875,-0.0072871195,-0.028405717,0.008930303,-0.025005506,0.025367958,0.027669372,-0.04943968,-0.00079641613,0.014877017,-0.02160945,0.0019164026,0.04417852,0.036139954,0.014731402,-0.028507778,0.02018898,-0.04731141,-0.06382449,-0.004405186,-0.011112365,-0.020556392,0.018771643,0.028112272,0.020405786,-0.037494875,-0.03373451,0.0073326086,-0.014705681,-0.03747718,-0.0048997183,-0.01963922,0.028894406,-0.055162106,0.07149738,-0.039867625,0.0027797346,-0.10283247,0.015938446,0.013376219,-0.06924263,0.0007861069,-0.00041820787,-0.07306086,-0.030380176,0.0059769494,0.007055481,-0.016496653,-0.02495882,-0.02886226,-0.015490331,0.005205894,0.00043849688,-0.025644278,-0.034601342,0.0600578,0.0983172,-0.004763514,-0.0018656547,-0.05850708,-0.00010033678,0.012603515,-0.00079261925,0.04186314,0.032708783,0.08143119,0.00062684604,-0.004249829,0.041697316,0.041934732,0.029159302,0.022338822,0.06421138,-0.02187805,-0.06424516,-0.049470413,0.010987212,0.04645726,0.035989176,0.01989791,-0.014594088,0.01203491,-0.05002335,-0.0016302232,0.016757103,5.3433258e-05,0.006918763,-0.044155326,0.0033878789,-0.03790473,0.020655794,0.023808425,0.042738333,-0.031998713,0.07012369,-0.040711634,0.02474228,-0.020055268,-0.04589533,0.030079706,0.032236457,-0.019461907,0.011470677,0.012292868,-0.0043917536,-0.04798935,0.0045114215,-0.023516042,-0.024958743,-0.0025086359,-0.048129328,0.032371257,0.014997667,-0.039407704,-0.067808755,-0.012600071,-0.024740012,-0.005889155,0.045285065,-0.04456138,0.0071393535,-0.019251496,0.0017535327,0.061919335,-0.019592477,-0.0546739,-0.07085934,-0.036795422,-0.099386595,0.0043045017,-0.0038418716,0.0061916527,0.057966623,-0.018973919,0.06083864,0.0023046907,0.017208068,-0.040544935,0.032047626,-0.084483966,-0.018603902,-0.056051407,-0.025551952,-0.03440158,0.052039303,-0.040445156,-0.014077216,-0.06760583,-0.015928186,0.004617852,-0.06652126,0.015312969,-0.008316031,0.024008298,-0.03847961,-0.019768883,0.008042367,0.021072373,-0.014229907,-0.008422062,-0.014516565,-0.06281884,-0.01004279,0.02655325,0.017357077,-0.029280411,0.08394465,0.029895429,-0.024884086,-0.058393326,0.090116195,0.02879734,0.039876003,0.017551681,0.012245142,-0.018764004,0.02330404,0.03331941,-0.03343842,-0.00969405,0.040685266,-0.024251748,0.008404372,-0.022961808,0.0025468043,0.0075845937,0.0369166,0.043053977,-0.0017896019,-0.008363109,-0.008358818,0.02690909,-0.1315777,-0.0071623493,-0.061240893,-0.020816382,0.025969353,0.018930113,-0.022555778,-0.010405996,0.06675692,0.023683295,-0.022806346,0.034905385,0.013081282,-0.0045164805,0.021921854,0.025406204,-0.046383645,0.0073514986,-0.019882297,0.0103619285,-0.05802637,-0.027817586,0.05572721,0.06544535,0.009244139,0.01894492,0.028410971,0.069163434,0.007380206,-0.042036854,-0.014030652,0.020771729,-0.011437189,0.02721621,0.030226551,-0.008244476,-0.015467736,-0.03136744,-0.018202696,0.0023650504,0.03922141,-0.0102673555,-0.051924326,0.007971143,-0.0126594715,0.013252896,-0.027839253,0.02451622,0.051245138,-0.006717884,0.048260543,0.0021182436,-0.026652932,-0.013682091,-0.016005658,0.020624725,-0.017567389,0.0071024746,0.027991049,-0.027479991,0.011173622,0.015516523,0.032650758,-0.045032345,-0.025598211,-0.016857594,0.029119056,0.04922739,0.011118939,0.07393308,-0.06480921,-0.0060984553,-0.028179146,-0.029999224,-0.034290813,0.029566428,-0.008340317,0.015674705,0.020985156,0.013477632,-0.004272088,0.021338852,0.023640867,-0.006955272,-0.028648118,0.0080156755,0.06483617,-0.018475734,-0.0062187314,-0.028886648,0.0039468273,0.060817305,0.0014499975,0.0028915836,-0.011607579,-0.02159546,0.0040998096,0.022761509,-0.048807286,0.03361304,0.06841857,-0.010826814,0.0078042606,0.02553287,0.020321302,0.015715186,0.034480978,0.029661901,-0.025363168,-0.069769815,-0.047706712,-0.042967055,0.026729172,0.048265804,0.011424594,0.03632361,-0.0015829297,-0.019786106,-0.018580703,-0.012446095,-0.042728,-0.048096888,-0.028869323,-0.014088597,0.0042083766,-0.0029560013,0.05540505,0.02495207,-0.035364527,0.019541476,0.028283643,0.006154395,0.06342881,-0.08980558,-0.024502033,0.003875405,-0.0061094034,-0.011474079,-0.0673242,0.04823442,0.0075352206,0.03979611,-0.031756483,0.056150477,-0.071881354,-0.037252348,0.037675656,-0.0039643375,0.03580117,-0.04877209,-0.048938822,0.042163536,-0.0058481125,0.028760875,0.020329507,-0.011140101,0.016553147,-0.026229441,-0.0021204187,0.010219624,0.04505576,0.02767719,-0.0106515195,0.0067453124,-0.04144375,0.027738202,0.042995848,0.020680005,0.07058873,-0.028489266,-0.048184596,-0.047060717,0.029573169,0.014550903,0.06522225,0.018890966,-0.029195527,-0.0082351,0.04419069,0.011632155,0.07155869,0.02866818,-0.002317243,0.022766283,0.041375317,0.014841301,-0.0071868403,0.011855287,0.010013198,0.028278891,-0.018345216,-0.05050302,0.023821997,0.016161848,0.05465308,-0.008782773,-0.016113238,-0.011618455,-0.051808957,0.026218563,-0.06586574,0.021478035,-0.049578868,0.05958919,-0.029994527,0.005604236,0.052295644,-0.012111949,-0.011860565,-0.003391937,0.026285205,0.0035996523,0.019248534,0.0071223574,-0.043979574,0.055265717,-0.064727604,0.02610965,0.00021784447,0.0873835,0.046010755,0.011822027,0.025942227,0.014761226,-0.0071233176,-0.015734063,0.010270862,0.010407397,0.05302241,0.016965564,0.004768503,0.023906892,-0.062197067,0.023142464,-0.045872223,-0.01015203,-0.0055837817,0.0015822573,-0.019701228,-0.020630239,0.051797304,0.01628985,-0.0006743317,0.022841148,0.057683986,-0.0040144804,0.004027728,0.011811914,-0.0015048751,-0.061413903,0.03089597,0.051489163,-0.012705932,-0.061216187,0.019157419,0.001913434,0.020993227,-0.012295266,0.013277049,-0.03245016,-0.08439508,0.023553686,0.0015286058,-0.042427182,0.014621894,0.018234987,0.0739386,-0.01869823,-0.025701303,-0.009096629,0.02309765,0.009917581,-0.018162433,0.06262549,0.02294446,-0.016386215,0.014250231,-0.04794366,0.035431497,-0.00014182672,-0.043690078,-0.010837059,0.038158398,-0.03277359,-0.01654414,0.006976711,0.023046829,0.00039768932,-0.025744442,-0.046235226,-0.021629108,-0.06863464,0.025697285,-0.02258833,-0.008250077,0.07315202,-0.037202854,-0.03829009,-0.06968566,0.0122877555,-0.026856381,-0.025375195,0.020643098,0.043003347,-0.035715546,0.050495334,-0.027966991,-0.034057323,-0.015811196,0.01879439,0.034058563,0.0056795985,-0.015296159,-0.02552888,0.04475025,-0.007675371,0.015122523,0.0053868764,0.015483443,-0.006389668,-0.0002895248,0.0006915706,0.038358845,-0.0776087,0.041713532,0.04752438,0.093464695,-0.00982919,-0.0702894,0.022956364,-0.020464491,0.019729797,-0.0247511,0.006674116,-0.01809036,0.053236052,-0.07679476,0.03648071,0.02507396,-0.016594224,-0.016332364,0.01640707,0.0035528713,-0.023394052,-0.016388759,0.004460342,0.0030615642,0.006211685,-0.023383306,-0.06606111,-0.0073147374,0.004611087,0.030630782,-0.041228555,-0.011517784,-0.010082337,0.0015773611,0.065060146,-0.008160246,-0.02257817,0.051994823,-0.013909123,-0.075137794,-0.005514901,0.0058435863,0.017720958,-0.022843521,-0.004432809,-0.03932761,-0.009822411,0.011554026,0.006868996,0.046496417,0.01679475,-0.039674647,-0.018832669,-0.022665361,0.033304863,-0.04485498,0.042219557,-0.06776242,0.009133094,-0.005879266,-0.00978727,0.039379433,-0.0005783545,-0.0653236,-0.029201638,0.047730464,-0.0023931928,0.023774141,0.019703548,-0.036760323,-0.011353892,-0.06348888,0.042535145,0.054700516,-0.03581639,0.04737239,0.03620634,0.04196765,0.015002186,0.075495616,-0.016682606,0.009405865,-0.029448453,0.033639062,0.06530028,0.005400965,0.011151067,-0.08298953,0.027410962,-0.08529058,0.02491819,0.05824995,-0.053183902,-0.039438676,0.012153793,0.00310132,-0.00035682326,0.004467474,-0.055662632,0.013624139,0.012384487,0.040087733,-0.014471549,-0.07554599,-0.01757978,0.017139206,0.023218673,0.010780808,-0.014126915,0.017642703,-0.03487443,-0.083752535,0.041106462,0.011909172,-0.032492194,0.052461322,0.0057075485,0.024946341,-0.020579992,0.00227552,0.014542476,-0.036046147,0.09259879,-0.027789166,-0.013666101,-0.055777688,-0.03556851,0.024649177,-0.0016421321]	3f9ccd94-e6d6-4267-a156-434186524ac9	d1273aaf-0ec2-4d02-aab4-38600f980bb8	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796
3c4ec032-fe69-4537-a4ef-eac221971e65	img005	1764140771924.jpg	173275	BM 테스트용 이미지입니다.\n_ 반갑습니다.	\N	2025-11-26 07:06:13.640827+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[-0.036098015,0.06483274,0.017845398,-0.028844357,0.023531372,0.04880213,-0.0012940977,0.0458067,-0.010169185,0.028512703,-0.044907954,0.06783026,0.05439341,0.006176234,-0.006520845,-0.047795724,0.055624153,0.0053670164,-0.08230453,-0.00427288,0.01019314,-0.011677187,0.0460794,-0.02591649,-0.016542884,-0.02147322,0.05912088,0.01881971,-0.033337697,0.005640957,0.046879813,-0.019281754,0.02041943,-0.015839739,0.049877267,0.0030168106,-0.0434557,0.06648796,-0.012633017,-0.10734559,-0.03337817,-0.03239188,0.020500654,0.028351774,-0.054873336,0.0070342915,0.056536797,-0.0074494947,-0.04989749,0.025639584,0.010321745,-0.022795198,-0.022919638,0.04347411,-0.030513331,-0.0009308659,0.0023659132,-0.023300154,0.043171115,-0.018851673,-0.078214414,-0.024053963,-0.032871105,-0.042787742,0.0032277484,-0.062911235,-0.0170317,0.002341593,-0.059117645,-0.00054769026,-0.040869508,0.04923309,-0.05515617,0.0044880174,0.039166067,-0.06438786,0.0015546273,0.019365776,0.033468906,0.019908803,-0.057950944,0.01691259,0.009433258,0.10222675,0.078668706,0.052361157,0.04483779,-0.018093998,-0.06777524,0.042066447,0.07064576,0.0014547622,-0.029805306,-0.042943314,0.05593575,-0.020684205,-0.078221396,-0.13856491,0.098668285,0.03053121,0.032750104,-0.013612185,-0.010853056,-0.018547807,0.0579398,0.007198687,-0.049049802,0.013288061,-0.040609077,0.003474727,-0.022849994,-0.026244074,0.017382849,-0.005138417,0.029172419,-0.01785109,0.0035262925,0.0072399317,-0.03837898,0.008704918,0.010891984,-0.036933698,-0.042717785,0.023137618,0.04874276,-0.0042946083,-0.032093488,-0.0043957685,0.013268642,0.016807284,0.005537865,-0.04880321,0.039342277,0.02438218,-0.013953203,-0.0056187613,0.043377906,0.0019553432,0.018336132,0.019967275,-0.0022513128,-0.016845899,-0.06679951,-0.003029731,-0.023377547,-0.036812957,-0.02407285,0.02390723,-0.02204273,-0.06508351,-0.059577465,0.021018399,0.009945961,-0.03839761,-0.03673147,-0.010684028,0.025625996,-0.082261175,0.0713782,-0.0066334424,0.0072567347,-0.040878315,0.022933358,0.030262582,-0.009360908,-0.008368961,0.026669342,-0.027230455,-0.013734656,0.0047837505,-0.020089528,-0.058928654,-0.012106822,-0.008176253,-0.017845985,-0.023125699,-0.013410716,-0.009379223,-0.050382998,0.01609135,0.061765656,0.016636916,-0.016558506,-0.033479612,-0.0339996,0.048917066,0.016425524,0.038123615,0.020188173,0.07126832,0.0046756514,-0.018683026,0.06110248,0.0023282059,-0.023167517,0.049451232,0.03513088,0.006859527,0.0054328013,-0.0026982916,0.03270871,-0.008440722,0.018856876,0.004643668,-0.009141298,0.033133764,-0.05430936,-0.062593795,-0.023817826,-0.01702812,0.028725343,-0.028613698,0.007860087,-0.017525097,0.04634572,0.0027133662,0.091242544,-0.025506359,0.05888643,-0.028116425,0.011138957,0.022626149,0.038984604,0.02321468,0.014205324,-0.012344458,-0.026401293,-0.05229466,-0.008635076,-0.06705318,-0.04264304,0.009987062,0.0015436542,-0.029917521,0.029654535,0.0330439,0.029550074,-0.051840514,-0.023425058,-0.01526568,0.026785478,-0.009819717,0.051694434,-0.001794721,0.031708587,0.01863592,0.017002188,0.009072628,0.011539969,-0.030544845,-0.0013017303,-0.013386361,-0.043257877,-0.01946249,-0.045457248,-0.06840633,0.0052156034,-0.027252464,-0.015683578,-0.041952696,0.014293374,0.032985073,-0.022485057,-0.06024293,-0.03383105,-0.122968026,-0.035764746,0.026195213,0.015203256,-0.05077506,0.0051009767,-0.077337675,-0.03904305,-0.027472004,-0.048158187,0.004172816,-0.022926873,0.01887948,0.042990077,-0.028462484,0.03458488,0.020222908,-0.042973775,-0.024976537,-0.0059689186,-0.049160317,0.013655189,0.016424585,0.030210204,-0.027788669,0.046622377,0.10464028,0.015311637,-0.030550597,0.026544334,0.017120762,0.03584428,-0.0007211122,0.03809061,-0.038815,0.059722148,0.045961943,-0.044813007,-0.015242219,0.012543015,-0.023368852,-0.014714024,-0.061803985,-0.015549413,0.0155266505,0.040151067,0.076678224,-0.011052978,0.020888422,-0.015156694,-0.015978523,-0.09649491,-0.0079138875,-0.054966144,0.009067467,0.045675654,0.033566356,-0.10474702,0.03856996,0.026885511,-0.034409083,-0.027133357,0.01853925,0.016026258,0.001468934,0.052361548,-0.009749985,-0.0539904,-0.030526176,0.011757778,0.045827314,-0.048521694,-0.019115744,0.030827086,0.012340622,-0.010740337,0.048684023,0.04294453,0.04019691,-0.02880018,-0.077719085,0.055519335,-0.012689901,-0.0064033438,-0.02071128,0.027673902,0.038575325,0.005995478,0.011386792,0.0140813915,-0.029576732,0.061956123,-0.010229418,0.021818172,-0.016385807,-0.0044222707,0.011595724,-0.0068356427,0.035520874,-0.022479609,-0.027516168,0.020375507,0.02159718,-0.04392519,0.028249716,-0.017921677,0.038042333,-0.014026332,-0.009499093,0.010298786,-0.03354562,0.0021086498,0.027009334,0.011721899,-0.015187654,0.017398937,0.017410098,-0.03481037,0.026794624,0.021871012,0.027071698,-0.07573183,-0.020515054,-0.021201512,0.014880164,-0.06963612,0.009828758,0.019566244,0.01844793,0.033252787,0.018195435,-0.04129943,0.059254143,-0.02973514,0.06447595,-0.006398893,-0.012011403,0.08963139,0.007492411,-0.009743682,-0.052006427,0.05809902,0.018832447,-0.00025371715,-0.0015260025,-0.009728626,-0.017361289,0.005350788,0.009760025,-0.034801766,-0.03200024,0.015557067,-0.022114886,0.00072129024,0.018726612,-0.01636713,0.04207281,0.0392004,0.07987292,-0.0033504604,-0.045945223,-0.00801531,-0.007262137,0.009865142,0.00428858,0.0069490955,-0.0004755299,-0.010310485,-0.02650547,0.016665317,-0.008643879,-0.037762426,-0.004406817,-0.015512102,0.0026193787,-0.00061662326,0.0136458045,0.03433913,-0.053324986,-0.017096862,-0.022349654,0.02681168,-0.010119432,-0.003027449,-0.05578514,-0.036187265,-0.050519727,0.027120005,-0.011086773,-0.05340915,0.04049046,0.024346601,0.043699313,-0.00812767,-0.0018435288,-0.09545314,-0.008280347,0.04535931,0.009771209,-0.0016547907,0.0131191565,-0.028386582,0.028839715,-0.047215123,0.015600352,0.04191556,-0.013835973,0.012023547,-0.009999866,-0.0034865541,-0.017792555,0.02462575,0.03910892,0.047519583,0.02364605,-0.034401894,0.03272602,-0.0018791191,0.041377865,0.113572866,-0.036083736,-0.04159258,-0.05642086,-0.011098378,0.03781729,0.05026249,0.023768293,-0.0065443423,-0.04881145,0.007404554,0.0015341782,0.031873774,-0.025378523,-0.024870155,0.024895126,0.041474853,-0.005082514,-0.0066283946,-0.06379361,0.012031425,0.04575922,-0.025679544,-0.040499903,0.058100738,0.0069834264,0.010261363,0.010429505,0.014021682,0.0074752965,-0.056561355,0.018118551,-0.06552296,0.023862569,-0.0077904454,0.022122392,0.007102676,-0.0014748208,-0.01814999,-0.003358123,0.0045206416,-0.03354924,0.023798713,-0.04151024,0.031404983,-0.004192954,-0.075396575,0.06871354,0.0518197,0.033926662,0.025620034,0.088301875,0.026603648,0.0021007545,-0.010553673,0.01566056,-0.011208901,0.034133114,-0.056266215,0.03698054,0.01313514,0.010963668,0.023938641,-0.0005958682,-0.018104674,0.07325803,-0.00088704197,-0.031029208,-0.04896128,0.018868005,-0.02413426,0.011467568,0.02826215,0.009562525,-0.07023093,-0.0011468629,0.04357257,0.016459664,0.033656955,0.011093437,-0.0007572227,-0.0016176973,-0.021580387,0.034910943,0.025707519,0.02196681,0.035331897,0.027426558,-0.004620806,-0.03879597,0.059802756,-0.022143759,-0.035668943,-0.00075798325,0.06856986,-0.02822202,0.024442758,0.02632785,0.05636755,0.011197079,-0.006299662,0.002232899,0.019281289,-0.031069316,0.011640507,0.0073379613,-0.0069704973,0.0089914445,0.018126883,-0.07693481,0.014235008,-0.003182539,-0.035535593,-0.015645377,0.037315525,0.029678343,-0.0005370833,0.004585103,0.017593248,0.015664365,0.013854834,-0.04463114,-0.03415048,-0.06440012,0.013132839,0.065371834,5.5225755e-05,-0.0050257063,-0.053188786,-0.053742588,-0.03687241,0.01216556,-0.0131770335,-0.017220078,0.079645984,0.03635574,-0.022480043,0.010509658,-0.006731217,-0.0062736277,-0.041374613,-0.0069996435,-0.036605004,-0.022443054,-0.017738102,-0.004117334,-0.03994348,0.013511158,0.04240482,-0.0034953733,-0.015255027,0.040720798,0.023340853,-0.016022474,-0.028523527,-0.038059898,0.007858878,0.0771051,0.099726416,0.04370866,-0.050554834,0.0031805974,0.0064161136,0.0075869076,0.0028922686,0.024873544,0.0002998331,-0.0014789341,-0.023215953,0.044041898,-0.015882129,0.027716022,0.016509892,0.021850454,-0.0018418307,0.01582502,-0.037234474,-0.011529197,0.043907203,0.02082727,-0.047614194,-0.006371806,0.011887547,0.011907928,0.027284319,-0.038995788,-0.0030917705,-0.017897181,-0.012360284,0.03396757,-0.0133437915,-0.027349498,0.071585804,0.0018814855,-0.074427895,-0.007074293,0.022080086,-0.0062724715,0.00039154963,-0.0054852446,-0.010961016,0.0063538756,-0.05474821,0.011472027,-0.020336824,-0.03876554,0.013872192,-0.055837568,0.013714844,-0.034493864,-0.005642757,0.028732425,-0.061818294,0.043453194,0.031559993,0.019440975,-0.051664114,0.004834581,-0.067212306,0.008213857,0.041320737,0.04904495,0.032457378,0.031109013,0.006449409,-0.04530455,-0.026123006,-0.0009850453,0.077090085,-0.016381219,-0.0018246714,0.005518703,0.035904404,0.005555441,-0.0032083516,0.0374242,-0.015654976,-0.012488537,0.021488031,0.080044314,0.057749853,0.02745851,-0.09879274,0.046766028,-0.028060442,0.025854055,0.012371094,0.018279148,-0.06145214,0.06640987,0.0090714535,-0.038934764,0.043709267,-0.034924082,0.018683717,-0.010305331,0.07914292,0.0018395528,0.0040124757,-0.044858802,0.02696097,0.0144667635,0.00023067693,-0.07448036,0.008881713,-0.04342194,-0.06378794,0.023520276,0.0123562515,-0.010244313,0.0023371815,-0.05814325,-0.014507362,-0.004149295,0.04177526,0.062451437,0.0047150967,0.049510833,-0.034413997,0.046595916,-0.08385381,0.014570652,0.01994097,-0.041242648]	3f9ccd94-e6d6-4267-a156-434186524ac9	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
cf2eb398-6754-4f04-817f-f3d735e1ace7	img005	1764144338528.jpg	173275	BM 테스트용 이미지입니다.\n_ 반갑습니다.	\N	2025-11-26 08:05:39.830952+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[-0.036098015,0.06483274,0.017845398,-0.028844357,0.023531372,0.04880213,-0.0012940977,0.0458067,-0.010169185,0.028512703,-0.044907954,0.06783026,0.05439341,0.006176234,-0.006520845,-0.047795724,0.055624153,0.0053670164,-0.08230453,-0.00427288,0.01019314,-0.011677187,0.0460794,-0.02591649,-0.016542884,-0.02147322,0.05912088,0.01881971,-0.033337697,0.005640957,0.046879813,-0.019281754,0.02041943,-0.015839739,0.049877267,0.0030168106,-0.0434557,0.06648796,-0.012633017,-0.10734559,-0.03337817,-0.03239188,0.020500654,0.028351774,-0.054873336,0.0070342915,0.056536797,-0.0074494947,-0.04989749,0.025639584,0.010321745,-0.022795198,-0.022919638,0.04347411,-0.030513331,-0.0009308659,0.0023659132,-0.023300154,0.043171115,-0.018851673,-0.078214414,-0.024053963,-0.032871105,-0.042787742,0.0032277484,-0.062911235,-0.0170317,0.002341593,-0.059117645,-0.00054769026,-0.040869508,0.04923309,-0.05515617,0.0044880174,0.039166067,-0.06438786,0.0015546273,0.019365776,0.033468906,0.019908803,-0.057950944,0.01691259,0.009433258,0.10222675,0.078668706,0.052361157,0.04483779,-0.018093998,-0.06777524,0.042066447,0.07064576,0.0014547622,-0.029805306,-0.042943314,0.05593575,-0.020684205,-0.078221396,-0.13856491,0.098668285,0.03053121,0.032750104,-0.013612185,-0.010853056,-0.018547807,0.0579398,0.007198687,-0.049049802,0.013288061,-0.040609077,0.003474727,-0.022849994,-0.026244074,0.017382849,-0.005138417,0.029172419,-0.01785109,0.0035262925,0.0072399317,-0.03837898,0.008704918,0.010891984,-0.036933698,-0.042717785,0.023137618,0.04874276,-0.0042946083,-0.032093488,-0.0043957685,0.013268642,0.016807284,0.005537865,-0.04880321,0.039342277,0.02438218,-0.013953203,-0.0056187613,0.043377906,0.0019553432,0.018336132,0.019967275,-0.0022513128,-0.016845899,-0.06679951,-0.003029731,-0.023377547,-0.036812957,-0.02407285,0.02390723,-0.02204273,-0.06508351,-0.059577465,0.021018399,0.009945961,-0.03839761,-0.03673147,-0.010684028,0.025625996,-0.082261175,0.0713782,-0.0066334424,0.0072567347,-0.040878315,0.022933358,0.030262582,-0.009360908,-0.008368961,0.026669342,-0.027230455,-0.013734656,0.0047837505,-0.020089528,-0.058928654,-0.012106822,-0.008176253,-0.017845985,-0.023125699,-0.013410716,-0.009379223,-0.050382998,0.01609135,0.061765656,0.016636916,-0.016558506,-0.033479612,-0.0339996,0.048917066,0.016425524,0.038123615,0.020188173,0.07126832,0.0046756514,-0.018683026,0.06110248,0.0023282059,-0.023167517,0.049451232,0.03513088,0.006859527,0.0054328013,-0.0026982916,0.03270871,-0.008440722,0.018856876,0.004643668,-0.009141298,0.033133764,-0.05430936,-0.062593795,-0.023817826,-0.01702812,0.028725343,-0.028613698,0.007860087,-0.017525097,0.04634572,0.0027133662,0.091242544,-0.025506359,0.05888643,-0.028116425,0.011138957,0.022626149,0.038984604,0.02321468,0.014205324,-0.012344458,-0.026401293,-0.05229466,-0.008635076,-0.06705318,-0.04264304,0.009987062,0.0015436542,-0.029917521,0.029654535,0.0330439,0.029550074,-0.051840514,-0.023425058,-0.01526568,0.026785478,-0.009819717,0.051694434,-0.001794721,0.031708587,0.01863592,0.017002188,0.009072628,0.011539969,-0.030544845,-0.0013017303,-0.013386361,-0.043257877,-0.01946249,-0.045457248,-0.06840633,0.0052156034,-0.027252464,-0.015683578,-0.041952696,0.014293374,0.032985073,-0.022485057,-0.06024293,-0.03383105,-0.122968026,-0.035764746,0.026195213,0.015203256,-0.05077506,0.0051009767,-0.077337675,-0.03904305,-0.027472004,-0.048158187,0.004172816,-0.022926873,0.01887948,0.042990077,-0.028462484,0.03458488,0.020222908,-0.042973775,-0.024976537,-0.0059689186,-0.049160317,0.013655189,0.016424585,0.030210204,-0.027788669,0.046622377,0.10464028,0.015311637,-0.030550597,0.026544334,0.017120762,0.03584428,-0.0007211122,0.03809061,-0.038815,0.059722148,0.045961943,-0.044813007,-0.015242219,0.012543015,-0.023368852,-0.014714024,-0.061803985,-0.015549413,0.0155266505,0.040151067,0.076678224,-0.011052978,0.020888422,-0.015156694,-0.015978523,-0.09649491,-0.0079138875,-0.054966144,0.009067467,0.045675654,0.033566356,-0.10474702,0.03856996,0.026885511,-0.034409083,-0.027133357,0.01853925,0.016026258,0.001468934,0.052361548,-0.009749985,-0.0539904,-0.030526176,0.011757778,0.045827314,-0.048521694,-0.019115744,0.030827086,0.012340622,-0.010740337,0.048684023,0.04294453,0.04019691,-0.02880018,-0.077719085,0.055519335,-0.012689901,-0.0064033438,-0.02071128,0.027673902,0.038575325,0.005995478,0.011386792,0.0140813915,-0.029576732,0.061956123,-0.010229418,0.021818172,-0.016385807,-0.0044222707,0.011595724,-0.0068356427,0.035520874,-0.022479609,-0.027516168,0.020375507,0.02159718,-0.04392519,0.028249716,-0.017921677,0.038042333,-0.014026332,-0.009499093,0.010298786,-0.03354562,0.0021086498,0.027009334,0.011721899,-0.015187654,0.017398937,0.017410098,-0.03481037,0.026794624,0.021871012,0.027071698,-0.07573183,-0.020515054,-0.021201512,0.014880164,-0.06963612,0.009828758,0.019566244,0.01844793,0.033252787,0.018195435,-0.04129943,0.059254143,-0.02973514,0.06447595,-0.006398893,-0.012011403,0.08963139,0.007492411,-0.009743682,-0.052006427,0.05809902,0.018832447,-0.00025371715,-0.0015260025,-0.009728626,-0.017361289,0.005350788,0.009760025,-0.034801766,-0.03200024,0.015557067,-0.022114886,0.00072129024,0.018726612,-0.01636713,0.04207281,0.0392004,0.07987292,-0.0033504604,-0.045945223,-0.00801531,-0.007262137,0.009865142,0.00428858,0.0069490955,-0.0004755299,-0.010310485,-0.02650547,0.016665317,-0.008643879,-0.037762426,-0.004406817,-0.015512102,0.0026193787,-0.00061662326,0.0136458045,0.03433913,-0.053324986,-0.017096862,-0.022349654,0.02681168,-0.010119432,-0.003027449,-0.05578514,-0.036187265,-0.050519727,0.027120005,-0.011086773,-0.05340915,0.04049046,0.024346601,0.043699313,-0.00812767,-0.0018435288,-0.09545314,-0.008280347,0.04535931,0.009771209,-0.0016547907,0.0131191565,-0.028386582,0.028839715,-0.047215123,0.015600352,0.04191556,-0.013835973,0.012023547,-0.009999866,-0.0034865541,-0.017792555,0.02462575,0.03910892,0.047519583,0.02364605,-0.034401894,0.03272602,-0.0018791191,0.041377865,0.113572866,-0.036083736,-0.04159258,-0.05642086,-0.011098378,0.03781729,0.05026249,0.023768293,-0.0065443423,-0.04881145,0.007404554,0.0015341782,0.031873774,-0.025378523,-0.024870155,0.024895126,0.041474853,-0.005082514,-0.0066283946,-0.06379361,0.012031425,0.04575922,-0.025679544,-0.040499903,0.058100738,0.0069834264,0.010261363,0.010429505,0.014021682,0.0074752965,-0.056561355,0.018118551,-0.06552296,0.023862569,-0.0077904454,0.022122392,0.007102676,-0.0014748208,-0.01814999,-0.003358123,0.0045206416,-0.03354924,0.023798713,-0.04151024,0.031404983,-0.004192954,-0.075396575,0.06871354,0.0518197,0.033926662,0.025620034,0.088301875,0.026603648,0.0021007545,-0.010553673,0.01566056,-0.011208901,0.034133114,-0.056266215,0.03698054,0.01313514,0.010963668,0.023938641,-0.0005958682,-0.018104674,0.07325803,-0.00088704197,-0.031029208,-0.04896128,0.018868005,-0.02413426,0.011467568,0.02826215,0.009562525,-0.07023093,-0.0011468629,0.04357257,0.016459664,0.033656955,0.011093437,-0.0007572227,-0.0016176973,-0.021580387,0.034910943,0.025707519,0.02196681,0.035331897,0.027426558,-0.004620806,-0.03879597,0.059802756,-0.022143759,-0.035668943,-0.00075798325,0.06856986,-0.02822202,0.024442758,0.02632785,0.05636755,0.011197079,-0.006299662,0.002232899,0.019281289,-0.031069316,0.011640507,0.0073379613,-0.0069704973,0.0089914445,0.018126883,-0.07693481,0.014235008,-0.003182539,-0.035535593,-0.015645377,0.037315525,0.029678343,-0.0005370833,0.004585103,0.017593248,0.015664365,0.013854834,-0.04463114,-0.03415048,-0.06440012,0.013132839,0.065371834,5.5225755e-05,-0.0050257063,-0.053188786,-0.053742588,-0.03687241,0.01216556,-0.0131770335,-0.017220078,0.079645984,0.03635574,-0.022480043,0.010509658,-0.006731217,-0.0062736277,-0.041374613,-0.0069996435,-0.036605004,-0.022443054,-0.017738102,-0.004117334,-0.03994348,0.013511158,0.04240482,-0.0034953733,-0.015255027,0.040720798,0.023340853,-0.016022474,-0.028523527,-0.038059898,0.007858878,0.0771051,0.099726416,0.04370866,-0.050554834,0.0031805974,0.0064161136,0.0075869076,0.0028922686,0.024873544,0.0002998331,-0.0014789341,-0.023215953,0.044041898,-0.015882129,0.027716022,0.016509892,0.021850454,-0.0018418307,0.01582502,-0.037234474,-0.011529197,0.043907203,0.02082727,-0.047614194,-0.006371806,0.011887547,0.011907928,0.027284319,-0.038995788,-0.0030917705,-0.017897181,-0.012360284,0.03396757,-0.0133437915,-0.027349498,0.071585804,0.0018814855,-0.074427895,-0.007074293,0.022080086,-0.0062724715,0.00039154963,-0.0054852446,-0.010961016,0.0063538756,-0.05474821,0.011472027,-0.020336824,-0.03876554,0.013872192,-0.055837568,0.013714844,-0.034493864,-0.005642757,0.028732425,-0.061818294,0.043453194,0.031559993,0.019440975,-0.051664114,0.004834581,-0.067212306,0.008213857,0.041320737,0.04904495,0.032457378,0.031109013,0.006449409,-0.04530455,-0.026123006,-0.0009850453,0.077090085,-0.016381219,-0.0018246714,0.005518703,0.035904404,0.005555441,-0.0032083516,0.0374242,-0.015654976,-0.012488537,0.021488031,0.080044314,0.057749853,0.02745851,-0.09879274,0.046766028,-0.028060442,0.025854055,0.012371094,0.018279148,-0.06145214,0.06640987,0.0090714535,-0.038934764,0.043709267,-0.034924082,0.018683717,-0.010305331,0.07914292,0.0018395528,0.0040124757,-0.044858802,0.02696097,0.0144667635,0.00023067693,-0.07448036,0.008881713,-0.04342194,-0.06378794,0.023520276,0.0123562515,-0.010244313,0.0023371815,-0.05814325,-0.014507362,-0.004149295,0.04177526,0.062451437,0.0047150967,0.049510833,-0.034413997,0.046595916,-0.08385381,0.014570652,0.01994097,-0.041242648]	3f9ccd94-e6d6-4267-a156-434186524ac9	cb012c55-1aad-44d1-9e4d-dcd840ae2d34	8365ba25-1b79-44b1-b44f-4a4e078109c9
8806663a-1b45-45ba-bbb8-4da45a75c62a	Cap 2025-12-12 18-40-39	1765532527486.jpg	65315	Diabetes mellitus\n\nLow back pain\n\nIschemic stroke\n\nIschemic heart disease\nCirrhosis of the liver\nAlzheimer’s disease and other dementias\nMajor depressive disorders\n\nChronic lower respiratory diseases (excluding asthma)\nOsteoarthritis\n\nFalls\n\nPeriodontal disease\n\nSelf-harm\n\nMotorized vehicles with three or more wheels\nTrachea, bronchus and lung cancers\nHemorrhagic and other non-ischemic stroke\nBenign prostatic hyperplasia\n\nSchizophrenia\n\nPhobic anxiety disorders et al.\n\nTIN, pyelonephritis, and UTI\n\nStomach cancer\nGastroesophageal reflux disease\n\nColon and rectum cancers\n\nBreast cancer\n\nGlaucoma\n\nUver cancer\n\nCataracts.\n\nAsthma\n\nVision loss\n\nDental caries\nOverexertion and strenuous movements	\N	2025-12-12 09:42:05.764772+00	f	ed15289a-165d-4768-b160-6ed4bf180bf7	[0.036499247,0.04541231,-0.027842678,-0.02525491,-0.013932663,0.060580593,0.02402714,-0.01667449,0.017965505,-0.035462976,0.032355834,0.06751357,0.05036222,0.07092719,0.006048074,-0.022909123,-0.00948917,0.010671425,-0.07491034,-0.014062019,-0.008470143,0.05058811,-0.009405475,0.030581765,-0.019779652,0.028837021,-0.014019718,0.006362944,0.024901714,-0.056114957,-0.06551388,-0.02285195,0.04782788,0.047032323,0.035165273,-0.044498764,-0.015513243,-0.011756086,0.043386564,-0.07234264,-0.053219717,0.0064335796,-0.0031443976,-0.011782452,-0.048730675,0.022615198,0.0056953575,-0.027046865,-0.02719721,0.07057038,0.009692229,0.022172257,-0.073425286,0.027626347,-0.03517666,-0.055922434,-0.015478201,-0.07455398,0.028174818,-0.013952389,0.03166674,-0.035001412,0.0048640864,-0.025230024,-0.0012741446,-0.035294183,-0.010388211,-0.03402623,-0.019708375,-0.0063807243,-0.051052876,0.053089403,-0.06575999,0.017828483,-0.047504283,-0.017038487,0.052716542,-0.032750294,0.027906336,0.039403494,-0.014431124,-0.016639205,0.020625446,0.08234738,0.01043464,0.052557893,-0.033970423,-0.022476753,-0.029528648,-0.0225931,0.10489209,0.014794815,-0.005543445,-0.0024411154,0.051019073,-0.021133604,-0.072475724,-0.064389564,0.05396197,-0.027995702,-0.002206791,-0.006193036,-0.028370105,-0.05099208,0.030454619,-0.011779352,0.098278075,-0.034471773,-0.047956884,0.03572723,0.022468287,0.007823515,0.0003760321,0.016302925,-0.04439926,0.008765794,-0.000599408,-0.009490782,-0.069294766,0.0033913841,0.0077590784,0.035124365,-0.011969459,0.03500747,0.009510654,0.035242014,-0.03341495,-0.042306677,-0.032720417,-0.044166677,-0.0297164,-0.0748888,0.013544872,0.018657831,-0.004562827,0.031112282,0.040549543,-0.0024931547,-0.009034099,-0.0044011567,0.016802017,-0.07335602,-0.045481518,-0.00776247,0.019772358,-0.057932124,0.07265149,0.034921575,-0.005135891,0.0007376222,-0.014911706,-0.07709301,0.03078582,0.0017514683,-0.011295251,0.010900731,0.043204844,-0.039258122,0.026913278,0.0044057393,0.036027506,-0.017071974,0.027487753,0.024011893,-0.043079313,0.013333857,-0.055185933,-0.07022307,-0.0016981678,-0.02809881,0.015709722,-0.048852194,0.046215706,-0.08161802,-0.033002637,0.0127900755,-0.015131489,-0.0036156997,0.013272775,-0.058338076,0.07257822,0.042750422,0.03649748,-0.100438766,0.033663742,-0.016091976,0.043072365,0.05636285,-0.008505926,-0.009958294,-0.03464373,-0.053161282,-0.054429196,0.007684107,0.033586677,0.012332623,0.05154924,0.0603866,-0.0069263154,-0.06200164,0.025651267,-0.003838568,0.035564207,-0.020692442,0.0029957446,0.019720197,-0.045658395,-0.011426657,-0.032079574,-0.018761277,-0.032940418,0.018977772,-0.012648611,-0.071700394,-0.01942632,0.0071725943,-0.018935284,-0.03619823,0.028832471,-0.08284015,0.049487386,0.024330769,0.0820531,0.033882283,-0.012346997,-0.0020021845,0.0032265717,0.03874129,0.04446157,-0.042541217,0.012429357,0.079177275,0.018667005,-0.007989519,-0.022266313,0.05439326,0.004605435,-0.019545946,-0.07629491,-0.015267821,0.021819498,0.00863035,0.054117016,0.015908707,0.009094395,-0.042668596,0.03875006,0.0029152406,-0.005668582,-0.020912658,-0.017842436,0.04048753,-0.0530119,-0.011026118,-0.025110206,-0.03957287,0.055258624,0.0028580353,-0.011762817,-0.029170375,0.036066137,0.011566098,-0.045147937,-0.03014665,-0.078941025,-0.093884654,0.007944344,0.03194814,0.031370148,-0.056862805,-0.0162732,-0.057501588,-0.027425207,-0.004090226,-0.03313072,0.011196428,0.008760047,0.01018431,0.007980441,-0.08020342,0.056670856,-0.008061609,-0.012336661,-0.0081027625,-0.0018967101,-0.0024594439,-0.043582294,-0.014806423,0.032362334,-0.015311596,0.074579194,0.031571817,0.0013215978,-0.06120888,0.04167813,0.038716327,0.01699416,0.028788231,-0.04482095,-0.040321194,0.0071663125,0.04911847,-0.05540436,-0.0038713932,0.0006249886,-0.011169143,0.012985753,0.01764484,0.022018231,-0.01245068,0.030324155,0.06439551,0.0189075,0.02658029,-0.04661418,0.043834712,-0.09597931,-0.0030072108,0.038012166,0.05030017,0.0036075546,0.035723545,-0.0027849243,0.021098107,0.04494302,-0.015354839,0.023497816,-0.012756495,0.056096975,-0.028736945,0.034661092,0.01684442,0.016305145,-0.041049648,0.02392361,0.0021396019,-0.044234306,-0.0048243776,0.039137844,0.061301004,0.023073366,0.03608455,0.00943476,-0.0103792455,0.017408969,-0.0013642748,-0.022799902,-0.023946837,0.0241284,0.026025405,-0.0007157769,0.05257487,0.010605836,0.006895147,0.024172056,0.007407427,0.006214807,0.02000952,0.055453192,0.049504153,-0.038613956,0.0036452052,-0.011552829,0.02404392,0.005921988,-0.0049487012,0.07818562,0.060398914,0.0066601518,-0.0024933014,0.038055614,0.0066680955,0.031610172,0.009223359,-0.029973691,0.0037861876,-0.04057619,0.054055545,-0.02940173,0.008950351,-0.03510307,-0.005206779,-0.02506206,-0.01067439,0.04270814,0.024229173,-0.080423385,-0.0033375004,-0.04425195,0.027538106,-0.0113828,0.039974324,-0.03378301,0.053049795,0.040411845,0.018369649,0.015632669,-0.010414166,-0.03457844,-0.029867021,0.01823684,-0.042315956,0.086004145,-0.027902748,0.01145365,-0.053078856,0.066790946,0.03520372,-0.037157465,0.05789798,0.01014812,-0.010811273,-0.00878231,0.016438253,-0.0048702452,-0.02992815,-0.015722327,0.04048723,0.010973573,0.03905012,0.026260696,0.040456668,0.01123383,0.022438603,-0.019784972,-0.055320285,0.024754182,0.04098363,-0.022591805,-0.024056481,0.06643605,0.05247623,0.026723988,0.02659515,0.025650661,0.050051745,0.012282269,-0.017239919,-0.040517926,0.040319853,0.003953179,0.032029726,0.02032017,-0.00577408,-0.021935651,0.072265334,0.046215765,0.028058395,0.016043054,-0.05636203,0.017918395,0.009353333,0.046714045,-0.068837844,-0.009250148,0.030821757,0.031354196,0.0112742605,-0.0024605398,-0.0071251113,-0.020470714,-0.04172526,0.010017639,0.048446834,-0.0017238281,-0.07836971,-0.0033870076,0.037965015,0.0042206156,0.031544246,0.033660952,-0.03188885,0.04022704,-0.00076525577,-0.048126694,-0.007756702,0.020237511,0.04511444,9.8474506e-05,0.0028213689,0.005466789,0.017814375,0.01414772,0.059615105,0.031645123,0.034577772,0.004877195,0.023050733,-0.004994599,-0.0070180716,-0.016449675,0.037778746,-0.022273429,-0.085681796,-0.026219489,0.020101374,0.09132667,-0.0028800513,-0.05107732,0.052346017,0.079767674,0.01109647,-0.03560054,-0.094067045,-0.02702727,-0.020277817,-0.06458977,-0.039388664,0.053732455,-0.0031306094,-0.012089461,-0.023700112,0.049925044,0.036195047,-0.028908039,-0.0011623813,-0.05292875,0.04456648,-0.015925791,-0.000489433,-0.00016632167,0.02046449,0.011150414,0.001868834,-0.044448357,0.03804869,0.013977297,-0.0334635,0.025618454,-0.027384967,-0.0043776287,0.074509986,-0.01539988,0.02107372,0.021329794,0.039068557,0.05503675,-0.01870455,0.049578484,0.003926841,0.020024983,0.0046732714,0.022242337,0.041324634,0.018745618,-0.019489422,-0.010394251,0.061012276,-0.027659522,0.10903395,-0.016675126,-0.040851284,-0.0029998948,0.062371068,0.018838711,-0.021917555,0.067511626,0.03020089,0.004751557,0.0062401164,0.016055418,-0.038908307,-0.03242442,-0.007211298,-0.015674084,-0.0045785215,-0.049114764,0.048985396,0.02149566,-0.0022871103,-0.008740914,0.004987034,-0.014992783,0.011623891,0.06346661,-0.00034294455,-0.08243992,0.04622863,-0.01297717,0.015351899,-0.004738389,0.013677408,0.008172583,0.003866356,0.008392113,-0.04610586,-0.0390083,-0.017018605,-0.017451374,-0.00459567,0.005525497,-0.034319855,0.0023711447,-0.08524724,0.008344619,-0.071190886,-0.061626907,-0.015528088,0.011898644,-0.037024803,0.0073640696,-0.049498443,0.024618851,0.057421915,-0.079613075,-0.034078587,-0.006127897,-0.10379463,-0.06865715,-0.02275434,-0.019939959,0.023094505,-0.01655852,-0.00899045,-0.041059826,0.04152515,-0.00061991165,-0.013183359,0.016426997,0.05105572,-0.017164009,0.041170105,-0.01043876,-0.011443399,-0.05656091,0.009693709,0.026325613,0.0040459945,0.010028724,-0.016589604,0.0010440355,0.027903555,0.020550124,-0.011697976,-0.04706967,-0.04517156,-0.00500821,-0.014276801,-0.028602378,0.025082042,0.018405752,0.00763983,0.011800587,-0.01671883,-0.017983051,0.009827551,0.02387552,-0.0063537164,-0.028620055,0.03383738,0.009170263,0.05233523,-0.08317336,-0.021044707,-0.0019034297,-0.006585879,-0.007638876,-0.058318112,-0.021227555,-0.049683996,-0.023971327,-0.023590628,0.0033246162,0.021937,-0.014932166,-0.014217736,-0.05231451,-0.0075107566,-0.007831853,-0.027249662,0.03956734,-0.010307296,-0.035149463,0.021420697,-0.018463822,0.0069572977,-1.3447681e-05,0.037328277,-0.078035586,0.019768545,0.021270834,-0.003937329,0.023105415,-0.016173566,-0.013406302,0.004239611,0.03227984,0.027995491,0.0031552194,0.014926843,-0.028416011,-0.034310363,-0.0255082,0.018719468,0.0025632528,0.04857029,0.0033560002,0.032426722,0.03570142,0.03410489,-0.027348455,-0.039492,-0.0380074,-0.007287692,0.0140237585,-0.009842,0.024108699,0.0059111,-0.034200646,-0.0089071905,-0.01767943,0.032794297,0.045600284,-0.0039568515,-0.006207815,-0.005300087,0.022718605,0.038195375,-0.025688078,0.021291973,0.07224695,0.014397039,0.02218804,0.0321303,0.018579686,0.0050742477,-0.07907523,-0.01703722,-0.025261413,0.026874036,-0.0017592562,-0.0016411969,0.041366044,-0.004903553,-0.016431296,0.05321226,-0.005571097,-0.064873,-0.042566024,0.0067970445,0.03275326,-0.051405217,-0.01767321,0.029433528,-0.008838222,0.0012397039,-0.017225472,-0.013578739,0.038072664,-0.019172855,-0.064191036,0.044355687,0.050076693,0.028264709,0.086410426,-0.007851183,0.03345401,-0.018010356,0.03560707,0.019245809,-0.013919265,0.054341666,0.020821782,-0.037692178,-0.005730148,0.055082757,0.047680758,-0.06733821]	\N	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796
eae48cd0-2ee7-47b2-8c72-e953b14d8b18	20230412162051_egoeqbqv	1765263330173.jpg	88815	목표: Corgly API 사용 시작하기\n작업                               마찰 로그\n1. Corg ly 유료 계정에       1. Corgly 웹사이트를 열었음\n가입한다.               2. 가입을 위해 웹 양식으로 이동함. 페이지 맨 아래로\n스크롤해야 했음, 찾기 어려움. 페이지 상단에 추가\n해야 할까?\n3. 양식 작성을 완료함. 신용 카드 정보를 입력했음\n4. 제출 HES 클릭함. 제출되었다는 확인 메시지를\n받지 못했음. 오류가 발생하지 않음\n5. 일부 양식 필드가 비어 있는 것이 눈에 E. 필드가\n비어 있어서 양식 제출이 중단되었을까?\n6. 빈 필드에 내용을 직성했음\n7. 제출 버튼을 클릭함. 확인 메시지를 받았고 재확인\n정보가 전송되었음	\N	2025-12-09 06:55:31.996876+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.012045334,0.07553523,-0.08841633,0.0058211433,0.041347597,0.04391115,0.01602117,0.03741529,0.017321007,0.022467148,-0.020417491,0.0208327,0.040801074,-0.0032410582,0.03000906,-0.05394866,0.022165278,0.057841968,-0.061198488,-0.003180835,-0.05725048,0.014801341,0.039657857,0.01877868,-0.012375224,0.017441737,0.006822947,-0.010015743,0.002844285,-0.058142807,0.059903327,0.039832298,-0.01746751,0.011477987,-0.0015616085,-0.0042386497,0.002664632,0.08656945,0.028503625,-0.09109832,0.0075891204,-0.004794544,0.01716443,0.022115627,0.0018815545,-0.030847454,0.018952016,0.032516394,-0.07437023,0.065680474,0.034976564,-0.033367634,0.019728975,-0.0049484973,-0.025820661,-0.040022243,-0.03772107,0.003772852,0.10829322,-0.00080612855,-0.036571834,-0.01635718,0.0026852933,-0.060668796,-0.0146279195,-0.050905462,-0.044732634,-0.008524933,-0.107593805,0.04725228,-0.0057321,0.012061337,-0.043570977,-0.016853496,0.019119836,0.01032204,0.0077447607,0.034886505,0.018863609,0.018356286,-0.041240107,-0.012834972,0.055236544,0.09973803,0.0064088777,-0.010924626,-0.011977722,-0.0026612068,-0.08842167,-0.00493349,0.06182407,0.024225198,-0.023331793,-0.0044390275,0.0049583134,-0.054146413,-0.05861421,-0.13401775,0.03741853,0.124251604,0.010096278,-0.01396602,-0.023709401,0.0256543,0.0047056265,0.03643361,-0.020730382,-0.038251735,-0.06405513,0.015948752,0.0041314997,-0.00428327,-0.029779008,-0.0455717,-0.014944595,0.018954063,-0.009692578,0.0174285,-0.030250173,-0.041630458,0.025122173,0.045821715,0.0118100755,0.05984538,0.06314435,0.01180557,0.016110884,-0.019935802,-0.05690669,0.008756456,0.021873837,-0.01586903,0.008385085,-0.0011529841,0.034331024,-0.03754853,0.06853678,0.010686913,0.021372344,0.0060591423,0.0014227125,-0.025886793,-0.04390171,0.06260644,-0.007678739,-0.043140177,0.047209334,0.05831998,-0.02059525,0.0028267428,-0.01586005,0.01743707,0.024745617,-0.075045645,-0.01408718,0.028234154,-0.008365767,-0.06977225,0.039582226,-0.0064195613,0.009561757,-0.05607682,-0.014401538,0.04215899,-0.058468673,-0.10720096,-0.0500689,-0.09846227,0.037549198,-0.022153743,0.010532896,-0.0063418527,-0.007757795,-0.064676784,-0.057679005,0.045543477,-0.055608444,-0.030164981,-0.10810444,-0.009676683,0.037455037,-0.008802511,0.009204083,-0.044432912,0.034834977,0.039468944,-0.013287618,-0.0041282997,0.02661457,0.09447381,-0.026746267,0.016624635,0.019178811,0.008801658,0.03276818,0.029144607,0.02463107,0.019507673,0.0006097353,-0.024368273,0.042531118,-0.0075478447,0.0132853,-0.024545675,0.05114776,-0.0016339562,-0.06044119,-0.034185473,-0.012938394,0.01444253,0.032670137,0.0097337635,0.012888675,-0.031741615,0.00012634943,0.043418486,0.052599885,-0.012704761,0.06814456,-0.056576088,-0.027719455,0.0018153158,-0.017965358,0.021280482,-0.019568752,0.011038956,0.007718489,-0.022857761,-0.0048482856,-0.04557767,0.0504713,-0.01086029,6.0665432e-05,-0.011805335,-0.0030949113,0.019628303,-0.03575553,-0.0551886,-0.015344549,0.019360092,-0.011472692,-0.021204697,0.034790974,-0.023365801,0.02268373,-0.027412621,0.06506668,0.03601504,-0.008402343,-0.036120933,-0.032815177,-0.009078353,-0.07881576,-0.025410907,-0.026130768,-0.006559508,0.033763226,-0.07650776,0.0359902,0.035710238,0.04268402,-0.0138767855,-0.00031977284,-0.03583769,-0.051601917,-0.08090896,0.0034923488,-0.008445426,0.042147923,-0.0493127,0.022023682,-0.08517331,-0.026917733,-0.019396152,-0.017982306,-0.007946387,0.012045218,0.005742488,-0.05567949,-0.049812246,0.008071606,-0.0093148155,-0.011207917,-0.006487921,0.031274002,-0.07179358,0.010890534,0.00219056,-0.0056475233,0.02009182,0.0026317881,0.030380018,0.004019915,-0.10655385,0.031743903,0.0057628877,0.033770055,0.027903775,0.024355533,-0.022534322,0.022509148,0.04807514,-0.016020844,-0.009075485,0.035724025,0.016046407,-0.018009098,-0.01814482,-0.016082464,-0.024902662,0.023685798,0.05672396,1.5216653e-05,0.02467674,-0.01747932,0.008884129,-0.13961516,-0.0060568294,-0.023523722,0.0108941365,0.027106572,0.020994376,-0.04818843,0.016529545,0.036977705,-0.014700824,-0.0027382374,-0.0016828814,0.00043465052,0.0044257985,0.023913207,0.029300684,-0.013685846,0.015541876,0.061503395,-0.037760295,-0.052740745,0.021426328,0.039898958,-0.008477597,-0.025032146,0.008167022,0.04715649,0.040368788,0.0046857824,-0.026572295,0.00937243,-0.011292868,-0.019727152,0.037946653,0.005869957,0.023237864,-0.023395734,-0.0029897885,0.0036046642,0.016768178,-0.02049493,0.025920661,0.0066566425,0.012068297,0.011326151,0.020785078,-0.027602715,0.045313198,0.028814962,0.008225742,0.015846692,0.04605852,-0.041572843,-0.039509695,0.032642014,-0.0121218925,0.012061862,0.044147443,0.012767489,-0.001321529,-0.012741854,0.017359603,0.05272609,-0.037161488,-0.055257864,-0.0223377,0.009929156,0.03132324,0.0014946146,0.04432416,-0.062022023,0.021495864,0.005185135,-0.014803168,-0.045645002,0.04220754,-0.0068665287,0.0043605887,0.010465623,0.0039526345,-0.002201636,0.021783683,0.028108977,0.014314791,-0.015274394,0.0019976546,0.03558147,0.008571545,0.00337935,-0.0531548,0.07639596,0.030853005,-0.05086419,0.033057377,-0.06476555,-0.016942566,-0.00960277,0.028174523,-0.038060375,0.013403791,0.029776303,-0.046361584,0.014857603,0.04065492,-0.018376447,0.029630516,0.06899839,0.03201342,-0.010906456,-0.02900599,-0.044651646,-0.009157989,0.014667752,-0.0037737212,0.058458753,-0.0180769,0.0041593406,-0.028475631,0.0071763806,0.024929373,0.0023548633,-0.022404436,-0.057446923,0.015585589,0.012393225,0.019186283,0.04312152,0.01025471,0.007015084,0.034875274,0.014620239,0.022468243,0.0022147445,-0.044424884,-0.027299639,-0.005867163,-0.016608015,-0.060252327,-0.09460021,0.027296282,-0.012191793,0.08277399,-0.012825691,0.018666176,-0.05331141,-0.031763975,0.094478756,-0.006077971,0.016316224,-0.08481236,-0.03798596,0.021554096,-0.005781234,0.013050498,0.035071567,-0.013823014,0.031047538,0.020223327,-0.03612418,-0.005422008,0.02781407,0.032228626,-0.011780295,-0.012046882,-0.04728039,0.039889164,0.008711561,0.022688981,0.033156723,-0.011058827,-0.02550438,0.0048814486,-0.010847822,0.0038154155,0.029107848,-0.0053971508,-0.05127633,-0.03511255,-0.032924157,-0.012847944,0.042954188,0.008503398,-0.02382008,0.07919286,0.018121269,-0.0020888192,-0.04576518,-0.039546072,0.011258273,0.037266504,-0.045985017,-0.012724887,0.06555011,0.04255476,0.0031628334,-0.022339653,0.024437787,-0.008836334,-0.072248876,-0.03648261,-0.020668684,0.037876956,-0.0697538,0.033503518,-0.03247062,0.0031901882,0.009585351,0.010289839,-0.035549093,0.029242812,0.049529843,0.006125135,0.028570952,-0.022373157,0.0042634537,0.05472804,-0.030242817,0.042735755,-0.015483667,0.04201936,0.03659474,0.030810112,0.011570659,0.05270556,0.007896528,0.0036090594,0.030315122,0.02577968,0.018837618,0.009634478,0.02279135,0.04054024,-0.0077045807,0.05309202,-0.03828696,-0.001479137,-0.018342268,0.012729831,0.005925785,-0.023224853,0.08112955,-0.0113214785,0.05236363,-0.010626605,0.039294578,-0.010355306,0.032177888,-0.027743582,0.03174003,-0.0003888001,-0.012130172,0.055351794,-0.0067863814,-0.021916421,0.021335602,0.025793148,-0.027195344,-0.01672395,0.039662868,-0.0017091498,-0.053650327,-0.004973537,0.03818262,0.031667598,-0.009101032,-0.039454844,0.09919425,-0.02635987,-0.012631592,-0.030740825,-0.032803632,0.004340791,0.016010169,0.049911957,0.027918274,0.03833455,0.030821402,-0.04368222,0.022442495,-0.06545557,-0.053192936,0.025163732,0.023001004,0.03215726,-0.022503862,-0.023509499,0.023762008,-0.010988344,-0.023155212,-0.025014445,-0.031365413,-0.12121214,0.009434925,-0.0006500335,-0.048837923,0.045862988,0.020089217,-0.045278687,-0.078704074,-0.0051014135,-0.07421868,-0.007112018,0.005506863,0.028679432,-0.01595642,0.033185482,0.019059656,-0.0005110546,-0.027742233,-0.008187976,-0.0007643552,0.00056107057,-0.008076477,0.031247932,0.030846765,0.0036139085,0.019010296,0.00604422,-0.010985354,-0.016259696,0.006789223,0.018065905,0.010363964,-0.012141823,9.250682e-05,0.025857916,0.03848129,-0.0019527136,-0.04135307,0.041237757,-0.0518192,0.027340489,-0.0071695778,0.04457516,0.04201777,0.08457444,-0.045081526,0.017318344,-0.04094752,-0.020441024,-0.021732798,-0.04002673,-0.012242238,-0.0054462017,-0.018514683,0.008333153,-0.0043892185,0.03935507,-0.026773242,-0.03580654,-0.04079042,0.013661921,0.03058402,-0.033916567,-0.04270419,0.0031026378,-0.012078459,0.07931385,0.0043673352,-0.017289188,0.01620823,0.048022475,-0.018449444,0.050674357,-0.013934473,-0.033231396,-0.013156051,-0.015766004,-0.007932893,0.008819417,0.05349234,-0.015448746,0.013932894,0.005641154,-0.0030517562,-0.010024279,-0.034659542,0.068908386,-0.017233819,0.014583039,0.026643464,0.03841035,-0.0141099235,0.014901513,-0.026676748,-0.016562516,-0.092156164,0.014568086,-0.027129136,0.0012568707,0.049771283,0.005775022,-0.07221351,-0.0052987956,-0.056539334,0.025721615,0.03842962,-0.002628001,-0.023541382,-0.013662787,0.05575328,0.0526817,0.014796094,0.023451531,0.036131848,-0.026829327,0.04023397,0.045967404,0.06826058,-0.010179709,-0.08540201,0.0014565234,-0.0074548507,0.039349258,0.031364836,-0.019095354,0.003808277,0.027955784,0.037307985,0.01018171,-0.021041848,-0.03202542,0.007159409,0.041035715,0.048129044,-0.0066236765,0.007852184,-0.004676748,-0.04624768,0.02329544,0.027267447,-0.003348704,0.00064800994,-0.031166632,-0.030780893,0.0023432593,0.06549622,0.013680841,0.027180905,-0.029038068,-0.028683543,-0.06689361,0.045032214,-0.0022905504,-0.02534587,0.055267897,-0.053937078,0.024811411,-0.07070597,-0.007500516,0.013761777,-0.016967725]	\N	bac0023a-8673-4269-8b53-fea6e60a8374	27cc66ba-4ef2-445f-bdc5-19a4637bd790
d670cd89-254a-4a6d-93a9-019046461a8f	기업1	1765436292127.png	77236	2. 국내 중소기업 대출 촉진 관련 제도\n중소기업 대출 시장 전반을            기술성 등 특정 중소기업에\n확대하기 위한 제도                         대한 여신 할당을 높이기\n위한 제도\nox           금율통화위원회가 중소기업 및 지맥            ho      기술력를 지닌 혁신적인 중소기업이\n금융중개지원 Sesvsesz 2asamn  기술금융  gessusnesEsass\n축              건을 고려하여 정한 한도                    받을수 있는\nfede HELE                  ;           .\nCmasIasilEiE:               onsmsEnEE 수 기슬금동(68 다층\n리자금즐지층하는저도                  부실 발생시 의존할수 있는 ome\n행으로하여글 중스기얻이 비우량흘지라도\nTEER Cert Seg\n~             [ET —            있게 만드는 Fea 요인임플 Rol\n중소기업대출 급고담보력도부족한중소기업이        벤처대출 관련 _ 2023변'벨처투자축진별」 tase\n2           은행 여신을 좀 더 수물하게 활용할        더       느는      년 12될부터 투자조건부육자\n비율제도      Spdissizne         법제           wud ugFH 투자주건부을자.\nsexs TE      >기술금융대출의 경우 사실상\n비기술기업에도 기술평가서를 발급하는 등,\n신용이 우수 한 경우 시행되고 있다는 한계,\n>질적인 측면에서 은행의 혁신적      벤처대출의 경우 시중 은행으로 확산되고\n중소기업 선별 및 신용 할당 역량       있지 않는 현실\n제고에는 한\nAnd 한계                               >? 담보대출의 성장 과정은 벤처대출의\n성장을 위한 유인책 설계에 정책적 시사\nHe 제공	\N	2025-12-11 06:58:13.992202+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.03208785,0.058349386,-0.05333484,-0.0022736695,0.043949272,0.0570147,0.028794859,0.026318494,0.0067091323,-0.022278072,-0.010906756,0.06468137,0.066560805,0.031116638,0.030761851,-0.032940563,0.013758653,0.039723415,-0.03119922,-0.01185306,-0.020396566,0.011037262,0.05263976,-0.020070152,-0.027397387,-0.08254674,0.0057618,-0.02947827,0.014777725,-0.076474115,0.054008532,0.054630697,0.009394417,0.033099066,0.048059322,-0.029666407,0.021488877,0.035196472,0.015443025,-0.07745072,0.0004433942,-0.065960966,-0.000690875,-0.006118814,-0.012378667,-0.04134866,0.04152352,0.017406557,-0.08788744,0.04337721,0.023252439,-0.03528425,0.008020493,0.018123137,-0.019784996,-0.04377673,-0.02394948,-0.042506248,0.058771875,-0.0139898155,-0.03942592,0.010737233,-0.036646865,-0.057795048,-0.0032301093,-0.007346251,-0.024038054,-0.0037524619,-0.08642587,-0.01373912,-0.0019785424,0.031808756,-0.014753031,-0.011482448,0.053328495,0.022401439,-0.003092575,-0.0002232685,0.027053684,0.04941913,-0.05013705,-0.012377735,0.062571496,0.05069841,-0.021053629,-0.0013254617,-0.011558672,-0.03773926,-0.062303547,-0.00984547,0.08010517,0.060920812,-0.038294468,0.028351061,0.04458104,0.024056638,-0.059428982,-0.090860434,0.045982543,0.09143328,0.049551755,0.031560477,-0.004461721,-0.0015374311,0.034938604,0.021530366,-0.039597742,-0.01332445,-0.08658896,0.035928573,0.015141601,-0.022384817,0.023887344,-0.038340066,-0.027160313,0.0087266015,-0.038067892,-0.011039443,-0.042550527,0.03651181,0.030719912,0.03340634,-0.024203641,0.0142086055,0.014283241,-0.0058421427,-0.017485922,-0.013477422,-0.06429346,0.0018143147,0.037060175,-0.026734335,0.047494385,0.015775815,-0.020294398,-0.062099926,0.03823791,0.02097766,-0.007291508,-0.056008957,-0.010255514,0.047218047,-0.094674446,0.018687952,-0.012283646,-0.05523433,0.043887682,0.08477102,0.0055478294,0.012931314,-0.06376507,0.015340407,-0.01234496,-0.01618787,-0.0068079703,-0.0003076159,0.042955726,-0.064181454,0.0060773245,-0.012441065,0.04616488,-0.062804826,-0.01870116,0.042683356,-0.024262257,-0.060986828,-0.032155823,-0.07080525,0.017033402,0.02350532,0.018436579,-0.012388571,-0.044989686,-0.04699805,-0.01036679,0.029470485,0.004185056,0.012447621,-0.023721812,-0.00057200977,0.047194023,0.014863235,-0.053179484,0.012699798,-0.017011963,-0.029607017,0.00076870003,0.006650275,0.010081155,0.026557915,-0.014338334,0.031781908,0.0076339063,0.05369607,-0.007668862,0.050271407,0.03545027,0.00075676455,-0.03138322,-0.03141999,0.019378671,0.020004164,-0.004404194,-0.024549821,-0.0006818795,0.038829762,-0.036338124,-0.040124185,0.0038514435,0.0036353683,-0.018461175,-0.015705328,0.038460758,0.00066003954,-0.022709167,0.03688378,0.047481038,0.0006215131,0.08864301,-0.021852665,0.00026088388,-0.030415658,0.010236414,0.06641676,-0.017230747,0.011489954,0.016832856,0.0006776942,-0.011041525,-0.02994418,0.0012357058,0.0027289381,-0.012638321,0.010600736,-0.07176121,0.029430438,-0.044161465,-0.065373786,-0.012565885,-0.02612819,0.054714087,-0.030362027,0.06854951,-0.009755868,0.0011835098,0.007645954,0.036660783,-0.006633023,-0.010535772,-0.026526487,-0.062790915,-0.023598751,-0.040403858,0.01512372,-0.08140402,-0.003098647,0.013281529,-0.03752272,-0.008412406,-0.009438937,0.049115658,0.011769893,0.016693577,-0.022279391,-0.061853796,-0.07740494,0.008361148,-0.014721419,0.06968129,-0.039846107,0.03066313,-0.055123642,-0.022697126,0.002294352,-0.042053796,0.031324055,-0.0057557435,-0.011823701,-0.030204855,-0.03727754,0.04280087,-0.020414941,-0.040095136,-0.010846476,0.0018863853,-0.07222082,0.0184283,-0.0029080056,0.0010539177,-0.019808164,-0.0168339,0.059304416,-0.039984513,-0.08906203,0.063201524,-0.011078535,0.0015338595,0.0402905,-0.009093037,-0.005744288,0.012693097,0.005736704,-0.05659293,0.006159063,-0.025746126,-0.034089845,-0.043398336,-0.053355753,-0.014363344,-0.006963823,0.012024959,0.06801731,-0.039338846,0.012002332,0.0019304388,-0.038708728,-0.14058265,0.016016338,-0.008444885,0.045479234,-0.022955375,-0.008555535,-0.057951007,0.031645637,0.05313923,0.017227324,-0.0028684763,-0.017638672,0.010310058,0.011516502,0.014385749,-0.02127311,-0.043538455,-0.004721237,0.001453399,-0.04603666,-0.05288674,-0.031999722,0.032146964,0.035448667,0.033837546,-0.005902137,0.036528066,0.041530423,-0.02079839,-0.010860347,-0.018228715,-0.0092196,0.044197116,0.023082197,0.031073427,0.0073605455,-0.011622939,-0.082657315,-0.01600868,-0.025505725,-0.003967257,0.03348926,-0.025421819,0.012877188,0.043298885,0.039296143,-0.020391181,0.047017805,-0.016927427,-0.013336954,0.015831864,0.01938712,0.0002076144,-0.01830637,0.01207328,0.005859932,-0.017100085,0.027424071,-0.011844187,0.0034451997,0.010963345,0.017421952,0.016503284,-0.03832119,-0.02905166,-0.03341939,-0.03195098,0.047886062,0.034469645,0.04441326,-0.07076953,-0.014448676,-0.012924387,0.018661175,-0.016563015,0.0293825,-0.026502283,0.026258847,0.015620592,-0.0076515717,0.027401548,0.052540135,-0.017428664,0.031329837,-0.047966044,-0.01049637,0.102608725,-0.024012333,0.03185485,-0.003835192,0.02311305,0.04134434,-0.026892804,0.009780521,-0.017153254,-0.01902005,-0.004634018,-0.0075572236,-0.05985155,-0.022585668,0.04577476,-0.008658641,0.006277898,0.03687046,0.027274903,0.005556028,0.09558952,0.01109922,0.011530238,-0.08292234,0.009462698,-0.014506011,-0.029570058,-0.026559012,0.023559866,0.022670945,0.034575887,0.020973794,0.0042197923,0.018372282,-0.028668702,-0.031479944,0.019266907,0.019665439,-0.0071766116,0.004082147,0.029145492,0.026870962,0.020656144,0.031341795,0.004345475,0.01775007,0.020964583,-0.06874683,-0.020403381,-0.020646866,-0.0060949544,-0.03836629,-0.08809354,0.037372086,0.03269751,0.03594437,-0.017330782,0.03598995,-0.073143676,-0.053067587,0.02934351,-0.00065115694,0.028925138,-0.06123579,-0.020004658,0.040352825,-0.033158176,0.030038359,-0.0023183792,-0.014917281,0.02973428,-0.019586077,-0.02772252,0.023027027,0.021777935,-0.028840652,0.024210801,0.033809025,-0.046239678,0.036393788,0.006964579,0.010439986,0.03400408,-0.020081613,-0.039269723,-0.035921432,-0.035697374,-0.012488421,0.08021229,0.018810125,0.006772197,-0.039812155,0.023721317,-0.008458902,0.06551776,0.04321097,-0.021832014,0.043945383,0.06602509,0.036835894,0.015548237,-0.0306166,0.019255834,0.04563392,-0.034460813,-0.031040944,0.0727599,0.047802944,0.0186481,-0.03138414,0.031871032,-0.021394843,-0.045107245,0.033563033,-0.052625883,-0.021940686,-0.05262811,0.06111817,-0.0101283435,-0.018504437,-0.005246703,-0.021273805,0.006566234,0.02456154,0.039271336,-0.028242385,0.019877069,-0.070729926,-0.062395807,0.07546592,-0.04384047,0.043382283,0.020096136,0.040962808,0.057422724,0.013115339,0.043803923,0.042606305,0.03255669,0.00036246594,-0.012097797,0.048112128,0.040832743,0.03137362,0.0035872573,-0.010326386,-0.02551114,0.022657268,-0.014562164,0.0026159643,0.005058371,-0.010248282,-0.02069198,-0.013793748,0.07810551,0.043349486,-0.08036147,-0.0015200488,0.022945521,-0.05299105,0.018937027,-0.032553233,-0.032107633,-0.014135475,-0.058863666,0.055078454,-0.029128423,-0.00082165125,0.024769386,-0.019267246,0.02159525,-0.027615814,0.046234358,-0.058342382,-0.031389758,-0.005164975,0.0060798773,0.025200222,-0.028440982,0.0018771081,0.040723182,-0.02505814,-0.017000297,-0.039743897,0.008619089,-0.016160572,0.010065513,0.029709065,0.004802437,0.017393453,0.040514607,-0.053031296,0.084882356,0.017882772,-0.008897536,0.034551952,-0.0034358227,-0.014082073,-0.021436574,-0.04906851,-0.004165328,-0.043310516,0.0069758035,-0.066359565,-0.006719991,-0.060579192,-0.00035925303,0.008680211,-0.04480755,0.022325812,-0.034446638,-0.020016512,-0.03737086,0.022593893,-0.034507584,-0.0034571576,0.0066052997,0.021945504,0.034737177,0.02620437,-0.055058002,0.0013482942,-0.027636303,-0.03939436,0.0291816,-0.004108682,-0.014451033,-0.014771359,0.028811432,-0.0035054905,0.022092918,0.0074794814,-0.028529024,0.025039515,-0.05969248,-0.011365749,0.023463733,-0.049861036,0.030212337,0.118223846,0.088899694,0.025831033,-0.0311004,-0.029516745,-0.050024796,0.069738306,-0.011149181,0.029448504,-0.023338236,0.03310549,-0.04086772,-0.012401956,0.0089721745,0.04959259,0.026718603,-0.046776727,-0.01866821,0.01036384,-0.03362577,0.0082863765,0.027270576,0.028258119,-0.01397062,-0.04211885,-0.04381729,0.034847792,0.017273529,-0.037396096,0.025329668,-0.041682806,0.010108869,0.1076765,0.032338783,-0.016784217,0.050293192,0.020614078,-0.04223164,0.028749743,0.006165424,-0.018877521,0.01974208,-0.011179636,-0.004871717,0.017969431,0.03729891,-0.011623786,0.009810234,0.046766773,0.023371104,-0.025882224,-0.0115811825,0.036454555,-0.039008643,0.05774461,-0.025264947,0.047731902,0.0304327,-0.0235332,-0.032356493,0.014903087,-0.05008681,-0.03585528,-0.0010981332,0.0047178296,0.06826772,0.021774368,-0.02643749,-0.005498095,-0.03365137,0.01722542,0.026783235,-0.011428692,0.043701027,0.058459315,0.016435277,0.040532287,0.094026595,0.019112932,0.04341594,-0.050003342,0.060549032,0.033978015,0.006108179,0.01538398,-0.038139313,0.023380185,-0.039867926,0.027041864,0.048059892,0.017854834,-0.01251419,-0.003961632,0.0013582746,-0.0042945743,0.014624185,-0.04441859,-0.035140917,-0.015434593,0.006533605,-0.04291688,-0.018662512,0.0022707288,0.00092358433,0.041282125,0.017333565,-0.016567415,0.007253427,-0.024285696,-0.045309156,0.02270974,0.05330543,0.024576424,0.027711568,-0.042127926,-0.004908684,-0.025541326,0.029658446,-0.00074356253,-0.06763347,0.050039954,-0.07717735,0.008007236,-0.0019544463,0.008432456,0.06748297,-0.022800265]	\N	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352
bcc2ffa9-33dd-4441-b385-908f4e903827	20251226_110205	1766714986581.jpg	601543	<테          용 문서입니다.>\nN\nbe or         a\n0\nSCs\nNe\nSacer AN\nSE CR\nsr BAC TE 노스\nSE Ee   기\naA ES\neae\nTT NE RE 0      3\nBE OE RE  266노0.\nEy       CAR RE\nfe\ny        CE SSR 00져\nge\n_\nREE         ?\n73066 이룬         ”\nEE MTR Se      a\nERE Re RT\nIRS nee EE                                        :\ncee SURE St He\ni a AE SR TR\nEis hoa 래자재 EC a   LRN                      :\nTH 가 하아아 3 아고 오헤세 가사 아제\n:      a\n5    Si AE ee 고32리\nge RE SE 아게레에\nTh ene RE 제     tk\n20000.\n5  i  BA   El ei oe 헤아  2            2\n노가 1 러리 이 (봉이                    fi\n8 AaB NET 00 우러                 Sie\nBi  i nets REE ac	\N	2025-12-26 02:09:50.881351+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.017910074,0.06443698,0.010905574,0.016022252,0.038228564,0.039449427,0.052130308,0.023892496,0.039060764,0.010037219,0.0038354008,0.007932701,0.06279483,0.0007042875,0.040188577,-0.027050989,0.04572091,0.019854316,-0.014040925,-0.027736062,-0.03516453,0.011575167,0.014058452,0.008955778,-0.00024453615,-0.035978355,0.0075447974,-0.027181396,-0.007684102,-0.06515835,0.035358842,0.079100415,-0.05089457,0.006553877,0.034830756,-0.044052783,-0.025010625,0.03778399,0.026738461,-0.11234262,-0.016221816,-0.012936365,-0.012764711,0.031997506,-0.032803446,-0.007918991,0.013152156,0.006090871,-0.054298226,0.015322246,0.03043652,-0.016377026,0.008406751,0.021379856,-0.033186633,-0.0668228,0.004047816,-0.07193107,0.017579656,-0.011988565,-0.023830809,0.017986082,-0.020035155,-0.029065456,-0.038632397,-0.06068236,-0.020116173,-0.033121906,-0.06439599,-0.015405603,-0.002286035,0.024270827,-0.033022605,-0.013806705,0.028966663,-0.0019418261,0.0076163188,-0.00072133116,0.07038159,0.019699426,-0.038509376,-0.03093681,0.04839411,0.078298874,0.014573032,-0.004268062,0.024514895,-0.036069624,-0.07729172,-0.028789321,0.08176546,0.019687152,-0.005813569,0.03596586,0.08371413,-0.057569373,-0.048803445,-0.15080018,0.05089773,0.06922163,0.016384104,0.01839443,-0.0049317274,0.04189937,0.032072943,-2.194466e-05,-0.06113311,-0.017639125,-0.09410959,0.02461875,-0.005429834,0.0039686575,-0.013097264,-0.019705774,-0.02160774,0.014783621,-0.008892793,0.017006315,-0.0113122165,-0.0069184545,0.047234774,0.044662848,-0.0039836564,0.02471343,0.027023299,0.020977812,0.002188897,0.0072747353,-0.0035356635,0.026967041,-0.015455979,-0.0073246043,-0.0073130364,0.029194584,-0.019871956,-0.015653431,0.055181004,0.03444678,-0.0304055,-0.006178892,-0.0025125414,-0.0022662429,-0.09401717,0.03476251,0.040603373,-0.04410691,-0.01522116,0.064912625,-0.018925512,0.036065474,-0.043271415,0.008266003,-0.01135309,-0.013731315,-0.020009827,0.018282993,0.004522102,-0.06920694,0.016037313,0.001495929,0.03309069,-0.017005237,0.012909274,0.0013170493,-0.012897092,-0.075792424,-0.03215411,-0.053860832,0.0056127124,-0.045746014,-0.042469338,-0.04812895,-0.048481297,2.2276685e-05,-0.017847074,-0.0055599655,-0.016002752,0.00051424466,-0.049030535,0.0061396477,0.05532951,0.005040054,-0.025724726,0.008530143,-0.016202392,-0.00613261,0.013514759,0.05375087,0.040223874,0.056095354,0.017964838,-0.008929802,0.027277831,0.026923291,-0.0006922161,0.05919206,0.037802044,-0.006441812,-0.04786279,-0.027501598,0.04455473,-0.0065851454,-0.03135637,-0.04196211,-0.029594814,0.032388512,-0.043678213,-0.04580874,-0.056882348,-0.010957739,0.006387973,-0.038792927,-0.008097414,-0.010713272,0.012517982,0.036540143,0.061275557,0.013523528,0.075060405,-0.028747477,0.0278759,-0.0032493079,0.0065558767,0.02969289,-0.00070110394,-0.05116646,-0.0048274,-0.0019813753,0.0053611235,-0.062143456,-0.023751725,0.0005223266,-0.024743522,-0.011872666,-0.009753064,0.029561888,0.0003833418,-0.06351361,0.0024519423,0.03369444,0.035624456,-0.0133448485,0.048163988,-0.018492734,-0.0010064457,0.045793872,0.039136544,0.008152699,0.0062470604,0.009924725,-0.042068075,0.043887034,-0.08687137,0.025894085,-0.08300531,-0.008232977,0.017852936,-0.022405364,0.005117231,-0.0043489067,0.032857053,0.0019639248,0.0053063547,-0.0081675,-0.101663195,-0.09092673,-0.020725252,0.00045982096,0.0039485674,-0.041500926,0.05542538,-0.06573484,-0.021584077,-0.0019084342,-0.05082499,0.03333034,-0.028915962,0.011772973,-0.017611343,-0.06327165,0.019846244,0.0060329405,-0.039246887,-0.031148246,-0.020278918,-0.0357317,-0.010844542,-0.010175462,0.038402826,-0.031273477,0.028321149,0.094065316,-0.017272586,-0.0727749,0.06859986,0.026791938,0.035275478,0.06940171,-0.00081404514,-0.010710903,-0.010645997,0.006600155,-0.024757627,-2.7400147e-05,-0.022702131,-0.029580254,-0.024275731,-0.026734877,-0.033630326,-0.02596737,0.06098914,0.05812014,-0.050581444,0.0068537523,0.0025882625,0.021126894,-0.12878808,-0.011797171,0.004937212,0.014561393,-0.024773397,-0.01529481,-0.061808787,-0.020131782,0.05218737,-0.0041629663,0.001590971,0.01105374,0.0075078495,0.012048407,0.025204912,0.02472091,0.000576006,-0.011452936,-0.022205189,0.030159084,-0.029093439,0.0030283658,0.015396887,0.0011881012,0.022908073,-0.019314604,0.02334967,0.014166806,-0.030622147,-0.04861634,-0.029921345,-0.044662155,0.05028359,0.00029667004,0.01989337,-0.0056810398,-0.0037272284,-0.005486408,-0.02959508,-0.013658845,0.04859637,0.036010005,0.0023982674,0.009362426,0.024184937,0.085910425,-0.053731706,0.045341425,0.012748724,-0.0038267141,0.019922767,0.054732352,-0.033630684,0.021185743,-0.03767776,0.00048487866,-0.017014677,0.0023665025,0.02050822,-0.012683609,0.010965479,0.028087858,0.03123366,-0.08217118,-0.0059248,0.006469161,-0.0034136744,0.057610992,-0.018878955,0.061052892,-0.04619602,-0.021927334,-0.020715972,0.043711748,-0.03679291,-0.03266484,-0.0006271005,0.045199044,0.0014838912,-0.008413718,0.013579962,0.014501901,-0.037955493,0.03836041,-0.047265418,-0.035423618,0.066425115,-0.031720676,0.01886693,-0.02966107,0.035585955,0.039546985,-0.034166437,-0.02431452,-0.01859578,-0.031296164,-0.0063531175,0.030167501,0.006097471,-0.036664408,-0.0004125426,-0.035641164,-0.010673729,0.026975844,0.03372021,0.020838425,0.036637604,0.030186014,-0.008789171,-0.08623047,0.0152722765,-0.015574934,0.0026646985,-0.009237999,0.028800607,0.022948101,-0.016215611,-0.017609356,-0.003512764,-0.004229669,-0.015790388,-0.034242902,0.0017349239,0.003126669,0.029567143,0.03759975,0.015398117,-0.011595564,0.008853089,0.028312994,0.015351484,0.006040573,-0.013642773,-0.07577475,-0.02887062,-0.013139625,0.033377092,-0.04810761,-0.06653184,0.025298314,0.0465545,0.06625741,0.00045803175,0.03470993,-0.082373984,-0.04743665,0.02584879,-0.0001011021,0.059417404,-0.06384892,-0.049242727,0.0429493,-0.020509953,-0.0024718305,0.03349141,-0.037401237,0.054836627,-0.020873204,-0.02053218,0.04640558,0.021423401,-0.001527807,0.0035058525,0.0068489444,-0.046448138,0.03015403,-0.027176302,0.02334084,0.07303992,-0.005693582,-0.038453605,-0.03171154,-0.003910747,0.00334371,0.037112273,0.0115989065,-0.028108224,-0.045017786,0.0586082,0.015264196,0.06894588,0.015324026,-0.051645428,0.01842958,0.03248789,0.034183748,-0.023360448,-0.019833805,-0.0102073485,0.03871421,-0.044216245,-0.04264879,0.07802014,0.027924595,0.03134864,-0.00039437952,0.03758504,0.012497179,-0.06846008,-0.0183038,-0.03134276,0.0065611247,-0.032169156,0.07510487,-8.0034215e-06,-0.04690121,-0.011787563,-0.021982756,-0.00577435,0.026353603,0.016370665,-0.02888547,0.030718083,-0.0098436335,-0.06033704,0.06350405,0.029790223,0.016345898,0.04766295,0.09047876,0.03371047,0.0019515364,0.019909495,0.024386603,0.025292872,0.011190605,-1.6188564e-05,0.0281814,0.044105124,0.050016627,0.008985172,-0.036552586,0.007856379,0.03208411,-0.0241669,-0.004755095,-0.06327081,-0.016861903,-0.026944702,-0.044570874,0.10031347,0.03419011,-0.07772431,-0.0158609,0.050090984,0.013709462,0.016751254,0.02870656,-0.0023310522,-0.017224016,-0.048884876,0.0828664,-0.008939581,0.04374375,0.041022476,-0.02019895,0.008627467,-0.027771087,0.042569995,-0.04324713,-0.067634694,-0.011380961,0.021288335,0.027713925,0.037050817,-0.0032450352,0.048867624,0.009102796,0.0041679638,-0.032962453,-0.00781271,-0.010407903,0.0172708,0.026166033,-0.011362872,0.008346796,-0.015194203,-0.076492004,0.04266519,0.009623583,-0.0354224,0.00907009,0.030866606,0.0082486225,0.015715009,-0.045928176,0.024636006,5.7045498e-05,0.008005959,-0.0366319,-0.052192524,-0.09807021,-0.0002459324,0.0005934794,-0.02846335,0.020435628,-0.010272988,-0.053955447,-0.04875294,0.007944122,-0.049816906,-0.008632074,0.029465761,0.023209317,0.0045185457,0.025051432,-0.012339462,-0.01578536,-0.0065480024,0.012321458,0.026059454,-0.0031665282,-0.035583567,-0.032089483,0.00070613186,0.015337956,0.06153234,-0.020593423,-0.0237134,-0.008827167,-0.00033913445,-0.0096797235,0.025357354,-0.057767306,0.02694039,0.062645294,0.12727214,0.027224444,-0.05201296,-0.027342869,-0.0081953835,0.042746905,0.008248185,0.034181867,-0.011731004,0.046783052,-0.07213099,-0.02664072,-0.031467546,-0.013813412,0.0013522428,0.052509636,0.009337988,0.017131595,-0.015491697,-0.020104542,0.0002820244,-0.0077879285,-0.05401435,-0.036810093,-0.035233583,0.012759068,-0.016632453,-0.012939805,0.008559775,-0.054606758,0.0021680067,0.10564075,-0.0033400836,-0.03358084,0.032733336,0.036382142,-0.015470169,0.031191498,-0.008469389,-0.012104418,0.020136176,-0.03201755,-0.03502495,-0.0045326417,0.013984735,-0.012620073,-0.01996133,0.028304886,-0.0076567833,-0.020326644,-0.003861769,0.026703998,-0.01570182,0.06052118,-0.0114406515,0.011167809,-0.013184857,0.01465847,0.0021738727,-0.008897239,-0.063231714,-0.062557936,0.019823367,0.048317935,0.0447103,0.0079868445,-0.02653554,-0.00566024,-0.044054825,0.026889427,0.05871506,-0.0004942225,0.07029924,0.05482217,0.04377718,0.022162838,0.07366229,0.0128107155,0.021671675,-0.008070463,0.08113626,0.037985757,0.0033600314,-0.00095414533,-0.059898898,0.018206654,0.0002774041,0.03234316,0.035584334,0.0067044958,-0.021404685,0.01830801,-0.0042800955,0.013122391,0.018624762,-0.0452651,0.024279969,-0.025051653,0.062127363,0.006982083,-0.017340962,0.01605913,0.016898895,0.07790031,-0.025458444,-0.052657492,0.016736431,-0.03602972,-0.07300207,0.03058502,0.02228462,-0.009015985,0.008227288,-0.0017385583,-0.0073800636,-0.027734559,0.036655754,-0.02006151,-0.028440922,0.07237216,0.009982587,0.012834061,-0.07065646,0.02072244,-0.0025270372,-0.05336782]	\N	bac0023a-8673-4269-8b53-fea6e60a8374	27cc66ba-4ef2-445f-bdc5-19a4637bd790
80731eb1-c20d-406b-a323-a2ba2e6fb5a2	20251226_110205	1766715090176.jpg	601543	<테          용 문서입니다.>\nN\nbe or         a\n0\nSCs\nNe\nSacer AN\nSE CR\nsr BAC TE 노스\nSE Ee   기\naA ES\neae\nTT NE RE 0      3\nBE OE RE  266노0.\nEy       CAR RE\nfe\ny        CE SSR 00져\nge\n_\nREE         ?\n73066 이룬         ”\nEE MTR Se      a\nERE Re RT\nIRS nee EE                                        :\ncee SURE St He\ni a AE SR TR\nEis hoa 래자재 EC a   LRN                      :\nTH 가 하아아 3 아고 오헤세 가사 아제\n:      a\n5    Si AE ee 고32리\nge RE SE 아게레에\nTh ene RE 제     tk\n20000.\n5  i  BA   El ei oe 헤아  2            2\n노가 1 러리 이 (봉이                    fi\n8 AaB NET 00 우러                 Sie\nBi  i nets REE ac	\N	2025-12-26 02:11:33.428778+00	f	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	[0.017910074,0.06443698,0.010905574,0.016022252,0.038228564,0.039449427,0.052130308,0.023892496,0.039060764,0.010037219,0.0038354008,0.007932701,0.06279483,0.0007042875,0.040188577,-0.027050989,0.04572091,0.019854316,-0.014040925,-0.027736062,-0.03516453,0.011575167,0.014058452,0.008955778,-0.00024453615,-0.035978355,0.0075447974,-0.027181396,-0.007684102,-0.06515835,0.035358842,0.079100415,-0.05089457,0.006553877,0.034830756,-0.044052783,-0.025010625,0.03778399,0.026738461,-0.11234262,-0.016221816,-0.012936365,-0.012764711,0.031997506,-0.032803446,-0.007918991,0.013152156,0.006090871,-0.054298226,0.015322246,0.03043652,-0.016377026,0.008406751,0.021379856,-0.033186633,-0.0668228,0.004047816,-0.07193107,0.017579656,-0.011988565,-0.023830809,0.017986082,-0.020035155,-0.029065456,-0.038632397,-0.06068236,-0.020116173,-0.033121906,-0.06439599,-0.015405603,-0.002286035,0.024270827,-0.033022605,-0.013806705,0.028966663,-0.0019418261,0.0076163188,-0.00072133116,0.07038159,0.019699426,-0.038509376,-0.03093681,0.04839411,0.078298874,0.014573032,-0.004268062,0.024514895,-0.036069624,-0.07729172,-0.028789321,0.08176546,0.019687152,-0.005813569,0.03596586,0.08371413,-0.057569373,-0.048803445,-0.15080018,0.05089773,0.06922163,0.016384104,0.01839443,-0.0049317274,0.04189937,0.032072943,-2.194466e-05,-0.06113311,-0.017639125,-0.09410959,0.02461875,-0.005429834,0.0039686575,-0.013097264,-0.019705774,-0.02160774,0.014783621,-0.008892793,0.017006315,-0.0113122165,-0.0069184545,0.047234774,0.044662848,-0.0039836564,0.02471343,0.027023299,0.020977812,0.002188897,0.0072747353,-0.0035356635,0.026967041,-0.015455979,-0.0073246043,-0.0073130364,0.029194584,-0.019871956,-0.015653431,0.055181004,0.03444678,-0.0304055,-0.006178892,-0.0025125414,-0.0022662429,-0.09401717,0.03476251,0.040603373,-0.04410691,-0.01522116,0.064912625,-0.018925512,0.036065474,-0.043271415,0.008266003,-0.01135309,-0.013731315,-0.020009827,0.018282993,0.004522102,-0.06920694,0.016037313,0.001495929,0.03309069,-0.017005237,0.012909274,0.0013170493,-0.012897092,-0.075792424,-0.03215411,-0.053860832,0.0056127124,-0.045746014,-0.042469338,-0.04812895,-0.048481297,2.2276685e-05,-0.017847074,-0.0055599655,-0.016002752,0.00051424466,-0.049030535,0.0061396477,0.05532951,0.005040054,-0.025724726,0.008530143,-0.016202392,-0.00613261,0.013514759,0.05375087,0.040223874,0.056095354,0.017964838,-0.008929802,0.027277831,0.026923291,-0.0006922161,0.05919206,0.037802044,-0.006441812,-0.04786279,-0.027501598,0.04455473,-0.0065851454,-0.03135637,-0.04196211,-0.029594814,0.032388512,-0.043678213,-0.04580874,-0.056882348,-0.010957739,0.006387973,-0.038792927,-0.008097414,-0.010713272,0.012517982,0.036540143,0.061275557,0.013523528,0.075060405,-0.028747477,0.0278759,-0.0032493079,0.0065558767,0.02969289,-0.00070110394,-0.05116646,-0.0048274,-0.0019813753,0.0053611235,-0.062143456,-0.023751725,0.0005223266,-0.024743522,-0.011872666,-0.009753064,0.029561888,0.0003833418,-0.06351361,0.0024519423,0.03369444,0.035624456,-0.0133448485,0.048163988,-0.018492734,-0.0010064457,0.045793872,0.039136544,0.008152699,0.0062470604,0.009924725,-0.042068075,0.043887034,-0.08687137,0.025894085,-0.08300531,-0.008232977,0.017852936,-0.022405364,0.005117231,-0.0043489067,0.032857053,0.0019639248,0.0053063547,-0.0081675,-0.101663195,-0.09092673,-0.020725252,0.00045982096,0.0039485674,-0.041500926,0.05542538,-0.06573484,-0.021584077,-0.0019084342,-0.05082499,0.03333034,-0.028915962,0.011772973,-0.017611343,-0.06327165,0.019846244,0.0060329405,-0.039246887,-0.031148246,-0.020278918,-0.0357317,-0.010844542,-0.010175462,0.038402826,-0.031273477,0.028321149,0.094065316,-0.017272586,-0.0727749,0.06859986,0.026791938,0.035275478,0.06940171,-0.00081404514,-0.010710903,-0.010645997,0.006600155,-0.024757627,-2.7400147e-05,-0.022702131,-0.029580254,-0.024275731,-0.026734877,-0.033630326,-0.02596737,0.06098914,0.05812014,-0.050581444,0.0068537523,0.0025882625,0.021126894,-0.12878808,-0.011797171,0.004937212,0.014561393,-0.024773397,-0.01529481,-0.061808787,-0.020131782,0.05218737,-0.0041629663,0.001590971,0.01105374,0.0075078495,0.012048407,0.025204912,0.02472091,0.000576006,-0.011452936,-0.022205189,0.030159084,-0.029093439,0.0030283658,0.015396887,0.0011881012,0.022908073,-0.019314604,0.02334967,0.014166806,-0.030622147,-0.04861634,-0.029921345,-0.044662155,0.05028359,0.00029667004,0.01989337,-0.0056810398,-0.0037272284,-0.005486408,-0.02959508,-0.013658845,0.04859637,0.036010005,0.0023982674,0.009362426,0.024184937,0.085910425,-0.053731706,0.045341425,0.012748724,-0.0038267141,0.019922767,0.054732352,-0.033630684,0.021185743,-0.03767776,0.00048487866,-0.017014677,0.0023665025,0.02050822,-0.012683609,0.010965479,0.028087858,0.03123366,-0.08217118,-0.0059248,0.006469161,-0.0034136744,0.057610992,-0.018878955,0.061052892,-0.04619602,-0.021927334,-0.020715972,0.043711748,-0.03679291,-0.03266484,-0.0006271005,0.045199044,0.0014838912,-0.008413718,0.013579962,0.014501901,-0.037955493,0.03836041,-0.047265418,-0.035423618,0.066425115,-0.031720676,0.01886693,-0.02966107,0.035585955,0.039546985,-0.034166437,-0.02431452,-0.01859578,-0.031296164,-0.0063531175,0.030167501,0.006097471,-0.036664408,-0.0004125426,-0.035641164,-0.010673729,0.026975844,0.03372021,0.020838425,0.036637604,0.030186014,-0.008789171,-0.08623047,0.0152722765,-0.015574934,0.0026646985,-0.009237999,0.028800607,0.022948101,-0.016215611,-0.017609356,-0.003512764,-0.004229669,-0.015790388,-0.034242902,0.0017349239,0.003126669,0.029567143,0.03759975,0.015398117,-0.011595564,0.008853089,0.028312994,0.015351484,0.006040573,-0.013642773,-0.07577475,-0.02887062,-0.013139625,0.033377092,-0.04810761,-0.06653184,0.025298314,0.0465545,0.06625741,0.00045803175,0.03470993,-0.082373984,-0.04743665,0.02584879,-0.0001011021,0.059417404,-0.06384892,-0.049242727,0.0429493,-0.020509953,-0.0024718305,0.03349141,-0.037401237,0.054836627,-0.020873204,-0.02053218,0.04640558,0.021423401,-0.001527807,0.0035058525,0.0068489444,-0.046448138,0.03015403,-0.027176302,0.02334084,0.07303992,-0.005693582,-0.038453605,-0.03171154,-0.003910747,0.00334371,0.037112273,0.0115989065,-0.028108224,-0.045017786,0.0586082,0.015264196,0.06894588,0.015324026,-0.051645428,0.01842958,0.03248789,0.034183748,-0.023360448,-0.019833805,-0.0102073485,0.03871421,-0.044216245,-0.04264879,0.07802014,0.027924595,0.03134864,-0.00039437952,0.03758504,0.012497179,-0.06846008,-0.0183038,-0.03134276,0.0065611247,-0.032169156,0.07510487,-8.0034215e-06,-0.04690121,-0.011787563,-0.021982756,-0.00577435,0.026353603,0.016370665,-0.02888547,0.030718083,-0.0098436335,-0.06033704,0.06350405,0.029790223,0.016345898,0.04766295,0.09047876,0.03371047,0.0019515364,0.019909495,0.024386603,0.025292872,0.011190605,-1.6188564e-05,0.0281814,0.044105124,0.050016627,0.008985172,-0.036552586,0.007856379,0.03208411,-0.0241669,-0.004755095,-0.06327081,-0.016861903,-0.026944702,-0.044570874,0.10031347,0.03419011,-0.07772431,-0.0158609,0.050090984,0.013709462,0.016751254,0.02870656,-0.0023310522,-0.017224016,-0.048884876,0.0828664,-0.008939581,0.04374375,0.041022476,-0.02019895,0.008627467,-0.027771087,0.042569995,-0.04324713,-0.067634694,-0.011380961,0.021288335,0.027713925,0.037050817,-0.0032450352,0.048867624,0.009102796,0.0041679638,-0.032962453,-0.00781271,-0.010407903,0.0172708,0.026166033,-0.011362872,0.008346796,-0.015194203,-0.076492004,0.04266519,0.009623583,-0.0354224,0.00907009,0.030866606,0.0082486225,0.015715009,-0.045928176,0.024636006,5.7045498e-05,0.008005959,-0.0366319,-0.052192524,-0.09807021,-0.0002459324,0.0005934794,-0.02846335,0.020435628,-0.010272988,-0.053955447,-0.04875294,0.007944122,-0.049816906,-0.008632074,0.029465761,0.023209317,0.0045185457,0.025051432,-0.012339462,-0.01578536,-0.0065480024,0.012321458,0.026059454,-0.0031665282,-0.035583567,-0.032089483,0.00070613186,0.015337956,0.06153234,-0.020593423,-0.0237134,-0.008827167,-0.00033913445,-0.0096797235,0.025357354,-0.057767306,0.02694039,0.062645294,0.12727214,0.027224444,-0.05201296,-0.027342869,-0.0081953835,0.042746905,0.008248185,0.034181867,-0.011731004,0.046783052,-0.07213099,-0.02664072,-0.031467546,-0.013813412,0.0013522428,0.052509636,0.009337988,0.017131595,-0.015491697,-0.020104542,0.0002820244,-0.0077879285,-0.05401435,-0.036810093,-0.035233583,0.012759068,-0.016632453,-0.012939805,0.008559775,-0.054606758,0.0021680067,0.10564075,-0.0033400836,-0.03358084,0.032733336,0.036382142,-0.015470169,0.031191498,-0.008469389,-0.012104418,0.020136176,-0.03201755,-0.03502495,-0.0045326417,0.013984735,-0.012620073,-0.01996133,0.028304886,-0.0076567833,-0.020326644,-0.003861769,0.026703998,-0.01570182,0.06052118,-0.0114406515,0.011167809,-0.013184857,0.01465847,0.0021738727,-0.008897239,-0.063231714,-0.062557936,0.019823367,0.048317935,0.0447103,0.0079868445,-0.02653554,-0.00566024,-0.044054825,0.026889427,0.05871506,-0.0004942225,0.07029924,0.05482217,0.04377718,0.022162838,0.07366229,0.0128107155,0.021671675,-0.008070463,0.08113626,0.037985757,0.0033600314,-0.00095414533,-0.059898898,0.018206654,0.0002774041,0.03234316,0.035584334,0.0067044958,-0.021404685,0.01830801,-0.0042800955,0.013122391,0.018624762,-0.0452651,0.024279969,-0.025051653,0.062127363,0.006982083,-0.017340962,0.01605913,0.016898895,0.07790031,-0.025458444,-0.052657492,0.016736431,-0.03602972,-0.07300207,0.03058502,0.02228462,-0.009015985,0.008227288,-0.0017385583,-0.0073800636,-0.027734559,0.036655754,-0.02006151,-0.028440922,0.07237216,0.009982587,0.012834061,-0.07065646,0.02072244,-0.0025270372,-0.05336782]	\N	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319
3447e8f3-8b26-401e-a070-10b5258bc940	1766715170524456558357432207432	1766715190672.jpg	1294482	as\na\n§         ble 의\nFol 066 25206 a\n:     =.\n=   1                                                                                                                                                                                                           ey   5 7 Lea\nemer 골골\nhe al\n                                                                                                                                                                               0...\n|                                                                                                                                                                                                                                                PE a  ...    5\n12222                                                                                                                                                   ~ pe Gl oe bc    :   :\nLo a RE 가구       =\n                                                                                                                                          ee 5\nCoE\nhp is Lk  a\n*      룬 AE\na.\nEo Sy\nFEEL 0 기\n<                                                                                                                                                                    Ee\n=                    pi CHA\n|                                                                                                oN)                                                            Vos\nSet\n(< )                                                                                        ~ 노스\nC  )                                                                                             ea\n|                                                                                                 (    )                                            oO        Ee\nhad\nka\n-\n                                                                                                                                                                                                                                                               a A\n—                                                                                                                                                                                                                                                               Lon\nT                                                                                                                        뿔. 0 ..\n조아\nah\nx                          oe\noR 소 하에\nSieh 7 이\npe .\n0...\nwed\n그.\nfe a\n대     Se SEE 제\nfe\n|                                                                                                                                         eo i 1\n|                                                                                                                                                   5                 Ed SRC\niss   EET\ndons 000으로\n본...\n호    Ts 스2363 과에   :\na 이이 에 시.	\N	2025-12-26 02:13:13.158284+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.022052132,0.020825326,-0.019373816,0.01556513,0.098042816,0.024909401,0.037360016,-0.009814431,0.0020532927,-0.028154783,-0.011014868,0.06003546,0.04993182,-0.033903267,0.045199934,-0.03229755,0.06325796,0.028359087,-0.021170482,-0.0421694,-0.02498715,-0.02204667,0.035084624,-0.0204937,-0.0011180631,-0.025840214,0.022026775,-0.036081493,-0.009232372,-0.048131913,0.013917584,0.033454027,-0.017720882,0.019314393,0.058160387,0.018259957,-0.039343253,0.030698562,0.014871729,-0.06998066,-0.043587293,-0.001203099,-0.046232857,0.037118986,-0.04217966,-0.031088633,0.027703451,-0.029742362,-0.036705304,0.026789904,0.0100566875,-0.010681907,0.003375591,0.014035009,-0.0094171725,-0.0036988768,-0.014716312,-0.080514364,0.025064992,-0.028379587,-0.04471805,0.016902732,-0.0057668593,-0.05627564,-0.035741005,-0.043006416,-0.022283344,0.004835773,-0.06025979,-0.031566817,0.01027763,0.050379716,-0.07254736,0.0146738,0.017947664,0.020013366,0.034088824,-0.03482227,0.045848656,0.03477224,-0.02928424,-0.026562642,0.02315939,0.012560193,0.011849061,0.032760628,0.049871173,-0.042842705,-0.062146146,-0.029428624,0.08669028,0.028691417,-0.058050886,0.057140842,0.0754203,-0.04894007,-0.0035071534,-0.12089173,0.020569298,0.095029384,-0.005382577,-0.0077945306,0.009956856,0.0036050158,0.032518566,0.019362306,0.01204702,-0.049980003,-0.0822663,0.038665034,-0.0011384534,-0.012006709,0.0083464105,-0.035032567,-0.049241014,0.012186209,0.0020885074,0.010965187,0.01440068,-0.027771018,0.015708277,0.03479562,0.0021106047,0.014595654,0.012152172,0.01660362,-0.04603743,-0.008806952,-0.023741584,-0.036321744,0.015092195,-0.028203411,-0.008698976,0.011291313,-0.022877738,0.004923707,0.037167735,0.058390494,0.0009451586,-0.00033037944,-0.0062701097,0.015022673,-0.11161782,0.01945731,-0.011007211,-0.13034809,-0.02462472,0.03801658,0.009128786,-0.01888801,-0.01241905,0.01817629,-0.027778875,0.015233268,-0.017714098,-0.020320252,0.008933506,-0.034322407,0.047626957,-0.027576791,0.002473298,-0.049647957,-0.0017808101,0.031124737,-0.009083271,-0.033060264,-0.0193592,-0.07668174,-0.024073415,-0.021535674,-0.033080358,-0.037692834,-0.103532866,0.011763078,-0.033099085,-0.0018736317,-0.028928502,0.018120263,-0.06303096,0.015719896,0.037769485,0.0034911458,0.006422347,0.017804593,-0.011935576,-0.008388496,0.017387018,-0.023627799,0.042543698,0.05848214,-0.0038216335,-0.032664705,0.075028464,0.0062412736,-0.025272207,0.04017722,0.08657321,-0.0083371885,-0.019635648,-0.08165919,0.01814623,-0.0065471437,-0.03588068,-0.044932965,0.013685768,0.037695944,0.015128651,-0.013557587,0.021641476,0.007173049,-0.001749608,-0.022111768,0.040742017,0.00028787594,-0.018390056,0.0366906,0.09370994,0.019142002,0.08632872,-0.0087504955,0.01382734,0.021304976,0.0066046524,0.026347445,-0.0028454661,-0.054118223,0.0074445345,0.008656258,-0.0032890595,-0.010038846,-0.010768746,-0.0029207943,-0.013183332,-0.002369327,-0.0067288475,-0.062111463,0.0322761,-0.0351738,-0.026849126,0.023923494,0.008586934,-0.03763975,0.022161707,-0.0017066643,-0.013234574,0.02315184,0.041203,-0.026598597,-0.016699402,-0.0023419333,-0.04862565,-0.008213975,-0.089219645,0.015890134,-0.030540867,-0.004476001,0.048445474,-0.044514652,-0.032427672,0.005956533,0.013615834,0.004463728,-0.0028556753,-0.0077072503,-0.07149549,-0.060505837,-0.03845962,0.005104324,0.009519521,-0.023619484,0.04500989,-0.0052249585,-0.0080057345,-0.0009989832,-0.011922029,0.035313435,-0.012093638,0.02801432,-0.00625088,-0.054678943,-0.010201821,-0.022997709,-0.01429604,-0.04699961,0.013380157,-0.0506508,-0.02417332,0.0033860218,-0.033259884,-0.0048994888,0.02266171,0.027815465,-0.011145543,-0.108663894,0.020147165,0.051896438,0.068728015,0.059700746,-0.027227169,-0.017488511,-0.025854653,0.022916181,-0.055574242,0.04516258,-0.008741301,-0.022258278,-0.040830582,-0.041192114,-0.022288077,-0.035783198,0.0558879,0.08324713,-0.008872587,0.018516151,-0.026906163,-0.008371637,-0.14236487,0.027981633,0.014977788,0.03808454,0.010437453,-0.003058724,-0.047660824,0.005719654,0.07968047,-0.024799436,-0.009958612,-0.014478347,-0.0013523267,-0.008356716,0.010239007,0.015246128,-0.019364685,-0.03184086,-0.004032463,0.017041197,-0.05675608,-0.00045786583,0.025472794,-0.00993739,0.02154809,0.023488227,0.025729587,0.027947688,0.0145368045,-0.042316277,-0.026766341,-0.035538405,0.05376016,0.0004901513,0.048153877,0.03302789,-0.022049077,-0.002815724,-0.03190891,0.031608526,0.035288565,-0.006499,0.013168755,-0.01787747,0.026968632,0.028538572,-0.00018632942,0.05031192,-0.015950127,-0.002752524,0.023171926,0.02801522,-0.029571332,-0.0033332643,-0.03596658,0.016782282,-0.016686581,0.019396437,0.045675892,-0.016855981,-0.017542455,0.0051696002,0.022163665,-0.04943269,-0.028440915,-0.03201337,-0.013167216,0.026630145,-0.0010093783,0.04902759,-0.065827645,-0.018013736,-0.012871028,0.045458354,-0.027202541,-0.022057606,-0.01008031,0.038976587,0.019890953,0.04161298,0.015985578,0.02175239,-0.0064838994,0.035187673,-0.009526066,-0.046832178,0.048695143,-0.039936505,0.020733187,-0.0068269814,0.03825869,0.047281176,-0.033251565,0.0037612503,0.0024126624,-0.02987855,0.00083892426,-0.0027739743,-0.034288708,0.020631908,0.011611979,0.018344274,0.027581813,0.028430033,-0.018010916,0.007698076,0.039977755,0.020477854,-0.045280527,-0.028274806,0.0010729115,0.009612271,-0.014045348,-0.047387306,-0.008438326,0.021450475,0.023010416,0.015708558,-0.006804662,0.030678911,0.0005826053,-0.048540086,-0.023429643,-0.0050006122,0.026138185,0.042540208,0.0021256253,0.017040892,-0.0047561205,0.02420136,0.0038742856,-0.0064354003,0.008833804,-0.04812218,-0.0034380269,-0.026930755,-0.018622318,-0.052545343,-0.088291824,0.024675308,0.029051678,0.010827522,-0.0018221195,0.018099086,-0.054994766,-0.027229546,0.04930022,-0.018328294,0.034524906,-0.023572609,-0.078182824,0.03589267,-0.007024513,0.044688534,0.032920074,-0.026432414,0.021032266,-0.0072120028,-0.014771882,0.060919557,0.007257167,0.029109335,-0.010254308,0.018284552,-0.029158825,0.015751868,-0.0036731919,0.005014994,0.054077778,-0.006694685,-0.026195602,0.0139402235,0.024184251,-0.034743804,0.0489572,-0.02290247,-0.058021132,-0.005988256,0.074086845,-0.007976033,0.08451946,0.00053386233,-0.012327389,0.011185683,0.04934765,0.06716988,-0.02295735,-0.027339434,0.00073757966,0.017979544,-0.07190792,-0.03439882,0.08625317,0.009996784,0.03106282,-0.019551985,0.02135326,0.01950955,-0.030950258,0.01218862,-0.014851922,-0.019808738,-0.025994075,0.09228608,0.014953108,-0.051072314,-0.030967714,-0.015074213,-0.03294634,0.029824477,0.020533824,-0.031783674,-0.010325526,-0.04009522,-0.040751584,0.0806106,0.03885587,0.0401716,0.025905546,0.07438562,0.053030796,0.014437144,0.06978894,0.028867802,0.0048935288,0.022486065,-0.0032832099,0.038125403,0.066627294,0.04025597,0.04676984,0.005236074,-0.018482352,0.0549126,-0.010900189,-0.012080107,0.012335526,0.035418697,-0.007959986,-0.044153016,0.06444376,0.049426008,-0.08603129,0.017643163,0.072689205,-0.032841884,0.04210759,-0.030912887,-0.02434862,-0.05358118,-0.06762314,0.10142181,0.009605253,0.064685345,-0.028880358,-0.0004787725,0.015813524,-0.046621863,0.014740386,-0.03741387,-0.0066560763,-0.0033340438,0.002621856,0.008630529,0.012116675,-0.033245508,0.012718805,-0.0011864114,0.008931172,-0.0012600748,-0.01365713,-0.00018177078,0.015802989,0.031086965,0.0006502391,0.03255249,-0.015770018,-0.050063577,0.079693496,-0.015904708,-0.016779622,0.014695926,0.022355115,-0.015195181,0.034677446,-0.052797657,0.050009396,0.014195074,0.005276682,-0.043372896,-0.028155487,-0.10162041,0.002438447,0.022156538,-0.048894,0.025468538,-0.02870773,-0.026695482,-0.05391597,0.017781248,-0.043696698,0.010285071,0.019663306,0.02139444,0.009897092,-0.0022771237,-0.023218175,0.023757126,0.019946551,-0.011498598,0.011623216,0.005679522,0.020659411,-0.03593172,-0.021616131,0.039270878,0.07506445,-0.023797456,-0.014368485,-0.012171704,0.026845217,0.030666448,0.003980929,-0.0119370185,0.023056904,0.08325611,0.10195582,-0.039384913,-0.074873604,-0.030457336,-0.013163841,0.055620063,0.025795907,0.073229805,-0.014093695,0.049418658,-0.042951636,0.020273512,-0.03456195,-0.027480934,-0.030479554,-0.025333108,0.03385449,0.0055564125,0.024012806,-0.0052669747,-0.011942804,0.024976073,-0.023804476,-0.03374231,-0.0334665,-0.0101535395,-0.033395197,-0.04024,-0.027335498,-0.07238192,0.011128821,0.069709785,0.03746234,-0.026138332,0.012707785,0.0054461877,-0.026175933,-0.0067581115,0.011487272,-0.019621385,0.02476573,-0.02938828,-0.025719713,0.0028257158,0.020239847,-0.027822541,0.027578903,-0.037440665,-0.004207344,-0.042778436,-0.04624247,0.032173056,-0.023818914,0.035279557,-0.032576587,-0.024264855,-0.021153724,0.029156936,0.0115892235,-0.0010142564,-0.015840007,-0.040148355,0.058540277,-0.016514665,0.068262815,0.00024293644,-0.042243864,-0.0072705727,-0.0504003,0.02496069,0.07837329,-0.011120575,0.038010366,0.024477035,0.028174369,0.057200927,0.06108096,-0.0036445358,0.042375468,0.0118436245,0.06943843,0.07762557,-0.012765395,0.021650476,-0.04721279,0.03060088,-0.06261338,0.012532937,0.053659733,-0.010311938,-0.036855686,0.011411399,-0.03354473,0.014807723,-0.028093416,-0.015136995,0.009633018,9.507774e-05,0.034803603,-0.04382338,-0.033151895,-0.014383719,0.005943461,0.047759578,-0.0073739043,-0.06339132,-0.025077429,-0.04135033,-0.06836266,-0.004110176,0.0024670698,-0.01004705,0.020686964,-0.015678937,-0.012842508,-0.020102464,0.053389203,-0.015852164,-0.054133207,0.06317595,-0.021670163,-0.007815194,-0.078942776,0.009962983,0.044615567,-0.05536836]	\N	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed
930ae2eb-15d5-4037-84a6-1971026d9a90	20230412162051_egoeqbqv	1767059119189.jpg	88815	목표: Corg.ly API 사용 시작하기\n작업 마찰로그\n1. Corg.ly 유료 계정에 1. Corg.ly 웹사이트를 열었음\n가입한다. 2. 가입을 위해 웹 양식으로 이동함. 페이지 맨 아래로\n스크롤해야 했음. 찾기 어려움. 페이지 상단에 추가\n해야 할까?\n3. 양식 작성을 완료함. 신용 카드 정보를 입력했음\n4. 제출 버튼을 클릭함. 제출되었다는 확인 메시지를\n받지 못했음. 오류가 발생하지 않음\n5. 일부 양식 필드가 비어 있는 것이 눈에 띔. 필드가\n비어 있어서 양식 제출이 중단되었을까?\n6. 빈 필드에 내용을 작성했음\n7. 제출 버튼을 클릭함. 확인 메시지를 받았고 재확인\n정보가 전송되었음	\N	2025-12-30 01:45:27.313407+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[-0.011404053,0.06253908,-0.08555941,0.01067737,0.0553801,0.058937907,0.03420121,0.009997599,0.021222254,0.04591917,-0.01909291,0.028510863,0.06796306,-0.012691286,0.045846257,-0.04124101,0.021661144,0.071959145,-0.042750936,-0.01710566,-0.048211683,0.0001662958,0.005035439,0.033559296,-0.016860822,0.014905551,0.024520516,-0.0066466527,0.012758692,-0.05447781,0.04821585,0.029354451,-0.00096737675,-0.0074465987,-0.0034482684,0.013462509,0.0059712194,0.04960192,0.02812876,-0.08604034,-0.007815715,-0.009088629,-0.008785127,0.070881784,0.0137595385,-0.037327897,0.0061468724,0.025309643,-0.057578564,0.052686546,0.039610602,-0.04104811,0.0076189213,0.0077289497,-0.033781227,-0.032944724,-0.048814822,-0.036759958,0.092515245,-0.015784798,-0.030923093,0.014614929,0.006537179,-0.049351595,-0.009227935,-0.01891286,-0.013270422,-0.00014497386,-0.08791092,0.03818791,-0.0019100423,0.044995613,-0.034732647,-0.020781094,0.0040104636,-0.02684386,-0.010115309,0.025901778,0.011716362,-0.0008013897,-0.04134199,-0.011509072,0.050094232,0.07352468,0.038218506,-0.017603055,-0.0028723343,-0.013165832,-0.10703544,-0.0016360956,0.09572176,-0.013385007,-0.016761094,-0.022710918,0.02441879,-0.06714172,-0.04191299,-0.11941274,0.02917343,0.12579812,0.0015311538,-0.010128198,-0.00058803393,-0.016111957,0.017931309,0.01053172,-0.049857788,-0.03426265,-0.06130268,0.005896452,-0.0018789875,0.008889414,0.015392191,-0.057783514,-0.027369391,0.024185123,-0.016950909,0.032965533,-0.015445498,-0.02786958,0.01441876,0.059650958,-0.0049061207,0.08770434,0.07739943,0.0024822277,0.02650898,-0.018424202,-0.04364689,0.0007102809,0.022974309,0.002964009,0.000806643,-0.0071089854,-0.009762171,-0.03868886,0.054648872,-0.01702067,-0.0126505485,0.003553487,-0.010649401,-0.017647425,-0.0785602,0.058145143,-0.003662914,-0.02554182,0.039837264,0.0850212,-0.024393817,0.044574413,-0.036441144,0.004322462,-0.007374619,-0.05349494,-0.015148153,0.027424352,-0.009422878,-0.044303365,0.05747024,-0.00013480459,0.018999485,-0.04614307,-0.005727066,0.036429893,-0.040890522,-0.12951848,-0.03152666,-0.06919582,0.043073606,-0.019700784,0.006592093,-0.0036100694,0.006923877,-0.033031363,-0.07018104,0.037601754,-0.03740734,-0.030115083,-0.105241954,-0.051252373,0.050446805,0.023206873,-0.0019376404,-0.022612777,0.010160644,0.033776373,-0.046481766,0.028547006,0.009742676,0.114552066,-0.006160072,-0.018981764,0.016220745,-0.00019650078,0.020431789,0.026193287,0.039876882,-0.012286725,0.024156127,-0.03276484,0.035865717,-0.036786642,-0.03427594,-0.048746873,0.0245056,-0.017268853,-0.060743123,-0.04760837,-0.013708736,0.024581727,0.014198107,-0.00235746,0.008003256,-0.021399816,-0.011588573,0.04847299,0.05992666,-0.008236073,0.06794607,-0.031892527,-0.03845196,0.008193746,-0.018106328,-0.008610114,-0.0058579883,0.0022361183,0.022148574,-0.004798045,-0.0075822403,-0.040336855,0.058589324,0.010161373,-0.0077222553,0.0065670395,0.038113046,0.04709175,0.0021496941,-0.06436402,-0.013891897,0.029926334,-0.032890398,-0.0032374458,0.03301645,-0.026135698,0.023869785,-0.018750831,0.044547778,0.018684465,-0.0006581825,-0.04805824,-0.026319642,-0.0028553728,-0.05931545,-0.03071086,-0.028818045,0.009607786,0.03050217,-0.07272705,0.030850653,0.02986744,0.02818125,-0.002163277,-0.024838826,-0.029204002,-0.04995987,-0.07576161,-0.015160231,-0.007197744,0.03258389,-0.047860973,0.017751914,-0.077462755,-0.033799175,-0.0022519517,-0.01130544,-0.008878756,-0.005094637,0.0038271558,-0.060834784,-0.05947539,0.007835186,-0.0022898547,-0.0019847823,-0.003309081,0.024224814,-0.082764566,0.015732227,-0.00818663,-0.022992931,0.02200519,0.018531784,0.037018027,-0.0054748026,-0.10387347,0.028716248,0.037900392,0.048583332,0.026494484,0.034840234,-0.016785765,0.041845188,0.06170737,-0.012416104,0.02885796,0.025976088,0.002348939,0.012320792,-0.0124849165,-0.0002749591,-0.014756209,0.044243746,0.025612248,0.004453724,0.0035369222,-0.022721225,0.025283603,-0.13978605,-0.010983471,-0.0064375284,-0.016608845,0.03952593,0.003406954,-0.04778488,-0.004545205,0.030985048,-0.023656907,-0.009061228,0.004620716,-0.004318824,0.017066414,-0.00053241244,0.031201674,0.007808717,0.030482134,0.057715017,0.0022890402,-0.05550064,0.034805585,0.02823443,-0.015970988,-0.012797204,0.033328034,0.05770734,0.059006486,0.0027155152,-0.009867944,0.041536536,-0.008896861,-0.0037526602,0.065345146,0.023403367,0.01328972,-0.00837999,0.03224666,0.04081431,0.015402378,-0.005344748,0.035231225,-0.0012089793,0.0064417855,0.023318822,0.024556966,-0.044966813,0.058482606,0.0057308297,-0.019463584,0.025455277,0.039384354,0.0017033084,-0.037153993,0.023142625,0.00041447175,0.015901702,0.05589774,-0.006011006,-0.01631715,-0.013700158,0.028052162,0.059738997,-0.06610774,-0.043072212,-0.014504998,-0.011916279,0.031546365,-0.01318381,0.020198211,-0.04374528,0.031672876,-0.0006547303,0.007889021,-0.067945555,0.03587801,-0.02821874,0.005178898,0.031159779,0.009412486,-0.023601364,0.020985885,0.022079924,0.031272046,-0.030435083,-0.0052360613,0.005840217,0.010239722,-0.006560448,-0.03868856,0.10092192,0.006097588,-0.04425519,0.004338826,-0.042803515,-0.07170384,-0.018822387,0.03898986,-0.02547158,0.019119032,0.017534243,-0.020384876,0.013890356,0.0406044,-0.01454896,0.02316564,0.06789246,0.02832175,0.0013313231,-0.044445936,-0.050363593,-0.002470113,0.008074584,-0.021914482,0.054270882,-0.015755776,0.0168441,-0.02235772,-0.02471039,0.040134024,-0.014792909,-0.03843582,-0.0419999,0.019448858,0.0017649396,0.030032307,0.052480426,-0.004336585,0.00030627384,0.051085763,0.009024921,0.04062432,0.0082368,-0.029942513,-0.029802699,-0.034422982,0.0054694484,-0.054588612,-0.10213377,0.02720977,-0.012011337,0.07548714,-0.006130798,-0.0049382164,-0.040958244,-0.03940908,0.07946588,-0.013621939,0.005346975,-0.05837756,-0.053693235,0.02482775,-0.016541636,0.029462505,0.026759751,-0.010878998,0.034776896,0.013440006,-0.046840437,-0.0008327284,0.040479586,0.01444218,-0.03923999,-0.030925892,-0.043494385,0.029506048,0.003122297,0.024858125,0.042808983,-0.040783662,-0.013528613,0.0076610306,-0.013927216,0.0074160383,-0.010302957,-0.017329186,-0.0631194,-0.03656431,-0.03321702,-0.0016701081,0.058070347,0.006281966,-0.018420458,0.055492114,0.030866109,0.035095066,-0.010275901,-0.04208057,-0.0038791427,0.009369562,-0.03712506,0.008643078,0.067413375,0.022900935,5.4636203e-05,-0.006448404,0.01436103,-0.022773316,-0.06116615,-0.04087543,-0.025394024,0.012574992,-0.055969335,0.039009336,-0.061927084,-0.013806387,0.016440244,0.03036471,-0.019937916,0.018995782,0.014697582,0.019165631,0.024743142,0.0009661837,0.0037642252,0.07217356,0.0060658487,0.051819716,-0.008701325,0.046215806,0.018258605,0.028522888,0.021263054,0.029929684,0.011166806,0.0030997205,0.035224266,0.039395835,0.03222287,-0.021376794,0.015595778,0.008830962,-0.018175038,0.041529763,-0.010382075,-0.020411497,-0.014864658,0.029035797,0.023112886,-0.024970079,0.034424134,-0.016738378,0.04511374,-0.017030459,0.050116755,-0.010904404,0.019634753,-0.023555899,0.039741624,-0.008835281,-0.033801366,0.06427188,-0.021063147,-0.01963849,0.029865857,0.006800701,-0.005400928,-0.03524421,0.034552507,0.01645535,-0.046020053,0.006143257,0.032498796,0.019367123,0.00047945944,-0.043963376,0.1071243,-0.01138981,-0.02120139,-0.031888653,-0.030525321,-0.025496446,0.01700274,0.05542875,0.01148002,0.017406652,0.0105230715,-0.027767252,0.05294035,-0.071602166,-0.05976268,0.017711708,0.029178705,0.024588078,-0.0058766925,-0.031157663,0.03656637,-0.016073266,-0.031866003,-0.038937606,-0.044651743,-0.11542506,0.008702799,0.0007057772,-0.028353479,0.03340188,0.017240174,-0.055080384,-0.08980448,0.007858236,-0.0671946,-0.0055591855,0.014726651,0.043032736,0.0019296787,0.030659527,0.040435337,0.010311559,-0.03324479,-0.017874822,-0.00839098,0.008837097,0.025677215,0.004158241,0.037869904,0.006853958,0.034440693,0.006971621,0.01956074,-0.013518987,0.01803005,0.021263087,0.010768606,-0.01793783,-0.00924839,0.010200997,0.06288208,0.005215938,-0.03019788,0.0574391,-0.020362144,0.03782308,0.00781171,0.050230205,0.04485213,0.09004774,-0.03230104,0.031066353,-0.046886586,-0.0049992404,-0.017892743,-0.011754412,-0.00831189,-0.0026662461,-0.03527858,0.01728391,-0.018757885,0.028507441,-0.03916485,-0.03666413,-0.04446771,0.0034735857,0.0004945673,-0.023873046,-0.03917006,0.008358803,-0.009658478,0.08231424,0.0134579,-0.0089923795,0.008369357,0.013410412,-0.016892513,0.05270655,-0.021834161,-0.03539977,0.01174223,-0.008356993,0.0007591834,0.00044791945,0.048542377,-0.015612521,0.0013770291,-0.021826124,0.012150739,-0.013892759,-0.029636834,0.057130847,-0.02220203,0.016138647,0.020645604,0.056429334,-0.009897592,0.026117278,0.0014786704,-0.00597619,-0.07858657,-0.0060933786,-0.0348513,0.0051230458,0.044218812,-0.0015937764,-0.072966486,-0.011327226,-0.027749207,0.036270935,0.036785062,0.03702246,-0.010926483,-0.027240453,0.048033863,0.033357408,0.017479502,0.013874326,0.03324086,-0.03401865,0.03740144,0.037237324,0.06589527,-0.012114697,-0.061601166,0.002428268,-0.024485836,0.05042301,0.028804177,-0.0022101342,-0.005141859,0.042894203,0.042656824,-0.0125121055,-0.02181177,-0.019397356,-0.023758035,0.022575537,0.069928676,-0.030652734,-0.0056794547,-0.0123424865,-0.017263412,0.02106177,0.03658074,-0.002687021,-0.017150063,-0.015913896,-0.02933284,0.010795016,0.066780314,-0.002248019,0.031526286,-0.049597546,-0.019178344,-0.064916626,0.036897052,-0.01435051,-0.03885113,0.03539445,-0.03264347,0.050755147,-0.072134785,-0.015936205,0.012853851,0.0075489287]	\N	a70aa08d-e279-482f-8ae0-c0c3276a01fa	8365ba25-1b79-44b1-b44f-4a4e078109c9
036a857e-f429-47a5-882e-957c2a2fb052	Screenshot_20260203_182737_Chrome	1770374076944.jpg	517049	11:28\n78\n응 orageconnect.com + 33\n세부 스토리지 수정 실패\n네트워크 오류로 인해 세부 스토리지를 서버에 반영하지\n못했습니다.\n전체\n대분류\n전체\n세부 스토리지 목록\n목록에서 세부 스토리지를 선택하여 상세 페이지\n로 이동하거나 삭제할 수 있습니다.\n1분기\n근로계약서 2025년\n문서 3개 · NFC 미등록 보관\n·\n만료일 2026.05.03\n2분기\n근로계약서 2024년 ·\n문서 0개 · NFC 미등록 . 보관\n만료일 2028.12.27	\N	2026-02-06 10:34:19.429+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
3eb6a6ca-1729-46d3-9841-70be68e674d8	20260208170039_01_059_3337335_0639003231	1770539981179.tif	45368	\N	\N	2026-02-08 08:39:46.558+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
9f5c57f0-9acd-4daf-b13a-efa7023f99cf	img005 (1)	1770557207076.jpg	173275	\N	\N	2026-02-08 13:26:52.073+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
1113347d-ccb3-457f-9683-0bba184b4509	img005	1770557236666.jpg	173275	문서 테스트용 이미지입니다.\n반갑습니다.	\N	2026-02-08 13:27:21.543+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
fdc5bc6f-5279-4145-a125-5a4d66bed190	img005	1770557297821.jpg	173275	문서 테스트용 이미지입니다.\n반갑습니다.	\N	2026-02-08 13:28:22.673+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
12c33be1-a968-4c64-a894-f2c729948cb6	img005	1770558296099.jpg	173275	문서 테스트용 이미지입니다.\n반갑습니다.	\N	2026-02-08 13:36:11.569+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
cdb63596-cc6a-4f65-aa19-8aa779447668	tv구매거래명세서	1770715814478.jpeg	1104649	\N	\N	2026-02-10 09:30:14.938+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
0657bdf8-1393-4ca6-8cf8-358ba5f19c45	tv구매거래명세서	1770715844485.jpeg	1104649	거래명세서\n구매일 2025-12-22 상호(법인명) 다솜프라자(주)\n전화번호 010-6617-6548 사업자등록번호 206-86-73314\n수취인 정도천 사업장 주소 서울 광진구 광나루로 56길 85 테크노마트 5층 B-66\n대표이사 이수환\n정도천 님 귀하 전화번호 02-3424-3210\n거래내용은 아래와 같습니다. 고객담당 오승환\n금 백삼십구만 구천원\nNO 품명 상품명 수량 단가 공급가액 VAT 합계\n1 KQ50LSD01AFXKR TV 1 1,399,000 1,271,818 127,182 1,399,000\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n합계 1,271,818 127,182 1,399,000\n참고사항 상기금액은 네이버 10243737878 상품번호/ 2025122269371511 주문번호 고객구매가격입니다.\n206-86-73314\n다솜프라자주식회사 이수환\n서울시 광진구 광나루로56길 85\n(구의동,테크노-마트21판매동4층[K72회\n도매입 가전제품\n소매업 전자상거래	\N	2026-02-10 09:30:46.172+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
56bcd764-9a00-4478-86e9-88c1a8fded55	tv구매거래명세서	1770715883708.jpeg	1104649	\N	\N	2026-02-10 09:31:24.187+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
2e252f73-aeac-4ff3-b929-96c1610025f3	스크린샷 2025-11-18 144517 (4).png	1763965710580.png	145390	1 지원팩터 도입 방안\n\n© CRR27} 바젤 최종안 발표 이후 중소기업 대출 금액에 따라 위험가중치를 차등 적용한\n방안을 벤치마크하여, 일정 규모 이하의 중소기업 대출에 대해서는 0.7619 위험가중\n적용\n\nㅇ (정부보증대출 위험가중치 완화) 공적 보증이 포함된 중소기업 대출 비중이 높은 한국의\n실정에 맞게 이에 대한 건전성 관리 지침을 별도로 제정하여 은행의 실질적인 건전성이\n반영되도록 함\n\nㅇ (예대율 규제로 중기대출 유인) 정부보증대출 위험가중치 완화로 발생한 완충자본이\n중소기업 대출로 이어질 수 있도록 예대율 규제를 통해 유인 제공\n\n- 위험가중치 완화로 확보한 완충자본이 중소기업 대출로 연결될 수 있도록 중소기업\n대출 잔액에 적용되는 15% AMINE 감액 기준*을 상향\n\n© 바젤[[는 소매 중소기업(6131 SME) 익스포저에 대해 무등급 중소기업(8596)보다 낮은\n위험가중치인 75%를 적용하고 있는데, 소매 중소기업의 범위를 현재보다 포용적으로\n적용 가능	\N	2025-11-24 06:28:31.412456+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.035334714,0.036703017,-0.027232567,0.025301035,0.043114584,0.07822551,0.018422365,-5.346466e-05,0.021669228,-0.034844656,0.019841943,0.08924057,0.025570951,0.015800636,0.03576582,-0.02105026,0.07495972,-0.0005173614,-0.047634725,-0.040447257,0.002448421,0.0034732625,0.029867643,0.0010516323,-0.011898099,-0.058044687,-0.011841806,-0.003295407,0.0055979285,-0.05995062,0.0059990827,0.057119586,0.021273293,-0.006860582,0.013977454,0.03906386,0.005746594,0.05745283,0.036319986,-0.091308914,-0.058942214,0.011701656,-0.024686582,0.052838206,-0.018817052,0.006753457,0.031512644,0.0060462365,-0.033337668,0.045728277,0.03720276,-0.008058472,-0.026764866,-0.013784535,-0.054053713,-0.040710986,-0.017009431,-0.03448817,0.07928175,-0.018800909,-0.024103485,-0.011758982,-0.027861701,-0.027759368,0.005694484,-0.050154198,0.022973692,-0.011482164,-0.07679953,-0.04161229,-0.005048397,-0.024602713,-0.034208678,0.017786898,0.092327185,-0.0012454642,0.007281221,0.008851231,0.03939557,0.04484655,-0.028316824,0.018080058,0.026570417,0.0645034,0.013027031,-0.039776508,0.026731316,-0.025644816,-0.055472784,-0.029305028,0.05082383,0.064051665,-0.034716114,0.005572256,0.039772764,-0.06254017,-0.08871416,-0.14690518,0.0735297,0.06162152,-0.01718929,-0.027572677,-0.005141385,0.011133277,0.074268736,-0.0075571635,-0.021604234,-0.024324454,-0.0793937,0.0021483535,-0.013495832,-0.007492285,-0.010107975,-0.0037546603,-0.013693939,0.016337816,-0.039652217,0.015335128,-0.06697059,-0.050296865,0.0061729155,0.01112323,0.017671887,-0.005204645,-0.0281551,0.019030197,-0.024682004,-0.0029382056,-0.007939805,0.017186128,0.0013502897,-0.02126106,0.021668343,0.020197295,0.03138469,5.4372875e-05,0.043443803,0.00818872,0.008908138,-0.011030664,-0.023312997,-0.060578484,-0.09876536,0.012719,-0.015124854,-0.022661785,0.043830507,0.042488877,-0.0546345,0.003998047,-0.028464943,0.019385083,0.029906368,-0.012681337,0.0014534348,0.044978034,0.02551182,-0.089656666,0.050366785,-0.01814523,0.017275747,-0.0017569237,0.0029953886,0.039830428,-0.010407809,-0.08069739,-0.03735831,-0.064294375,-0.005977904,0.03536044,0.020991584,-0.019900506,-0.08203993,-0.03806488,-0.0054504485,0.028817404,-0.000976511,0.0011335841,-0.06366006,-0.023278253,0.044592563,0.016829258,-0.016454857,-0.024032982,0.007091682,-0.004071308,0.064435415,0.05274189,0.032445196,0.018796485,0.008200751,-0.025750596,0.00016852879,-0.0048031677,-0.00030287757,0.021336207,0.013001441,-0.02347205,-0.02212451,-0.06792084,0.0074876347,0.003145348,-0.0002972009,-0.02856839,0.019102162,0.037472915,-0.040261924,-0.048376996,-0.0137632275,0.0011593668,-0.045499753,-0.02076897,0.02886976,-0.046710394,-0.011439616,0.018140819,0.05388741,0.0024697925,0.09143979,-0.05928863,-0.010499068,-0.0199376,-0.014559415,0.025159305,0.03600678,0.02595444,0.011318173,0.017702611,-0.02110052,-0.03486134,0.05965924,0.035061385,-0.019252542,0.017405357,0.00822426,0.04086479,-0.025378417,-0.05226771,-0.006889155,0.023449708,0.009343349,-0.0013260166,0.057755988,-0.0035681252,-0.018829195,0.0028896471,0.04744826,0.0044164546,0.0062954435,-0.045142043,-0.046918884,-0.023070958,-0.074936315,0.034534834,-0.03761321,-0.038976584,0.05493011,-0.008861036,-0.024235604,-0.014043262,0.060002487,-0.017144488,-0.010555698,-0.017785575,-0.05746307,-0.052592598,-0.0114551,-0.019599922,0.027094357,-0.039146256,0.02711218,-0.054292213,-0.06060613,0.014458081,-0.0813413,-0.0053781066,-0.011950004,0.025733763,-0.029506527,-0.021061355,0.019969232,-0.0046699597,0.011434361,-0.008868458,0.01991183,-0.034880307,-0.022908553,-0.009203966,0.0065610637,-0.02987498,0.0089301905,0.055551495,-0.0335737,-0.078032844,0.064449705,-0.006283921,0.024628252,0.024151303,-0.028843392,0.016734451,0.03650664,0.0068744705,-0.010128624,-0.039100975,0.022002019,-0.0119540235,-0.04385119,-0.057275955,-0.021158827,-0.008931209,0.048746314,0.060808107,-0.042432286,0.012139587,-0.030183543,-0.004327492,-0.11372842,-0.008542963,-0.029270867,0.001871671,-0.008651629,0.0026543697,-0.016139803,0.01382996,0.047563467,-0.0071288436,0.0021286872,0.006818751,0.016190745,0.0051325806,0.036096003,0.00816143,-0.028616462,-0.045253243,-0.009621673,-0.02040768,-0.04570175,-0.0047284532,0.071982615,0.0264374,0.020587612,-0.016364595,0.048953235,-0.0055645094,-0.014270816,-0.057878964,0.013216488,0.0017729929,0.021682426,-0.0026352354,0.012523993,0.017502706,-0.017852716,0.004689048,-0.013540334,-0.050970335,0.007863784,0.01812755,0.029807791,-0.017051447,-0.0018163872,0.05471955,-0.032359395,0.031719673,0.06713614,0.022360828,0.0392456,0.047933664,-0.010704387,0.0018464144,-0.0055480287,0.010847275,-0.0054678274,0.021589251,0.008516403,-0.027873725,-0.02095807,0.048965063,0.047097363,-0.09235794,-0.037800834,0.034006067,-0.00064272195,0.021233514,-0.021292185,0.027592264,-0.052011356,-0.014915165,-0.022039779,0.029314127,-0.028646428,-0.010899059,-0.0019543488,0.010497339,0.035026703,0.027203972,-0.012662246,0.025000885,-0.023893109,0.05692709,-0.0012152747,0.003425843,0.030002933,-0.022213805,0.014276981,-0.053781293,0.089698724,0.0473932,-0.006631971,0.023914611,-0.025502175,-0.01913267,-0.011602933,0.017353032,-0.052025747,-0.03525261,-0.033845734,-0.03769635,-0.009807122,0.04297546,0.01658694,0.013845556,0.045688547,0.016530761,-0.0503389,-0.0759492,-0.01936292,-0.0042912867,0.028045774,-0.00072386995,0.042887516,0.023658536,-0.047736607,-0.035048395,-0.010620561,-0.0025996563,-0.018900204,-0.05799445,0.02479352,0.0314076,0.0023065882,0.04438167,0.0032208718,-0.026960928,-0.024986362,0.04182962,-0.0035818205,0.0041044783,-0.012693233,-0.065761834,-0.024313299,0.0017131385,-0.013570761,-0.06994771,-0.06653851,0.021234872,0.03586872,0.0578042,-0.024493312,0.007225184,-0.08101592,-0.0034061593,0.033164315,0.032115523,0.013328329,-0.06653417,-0.033967648,0.06649269,-0.014036822,0.015372793,0.049005102,0.022515707,0.009189562,-0.022972086,-0.0094865775,0.036920257,0.03581142,0.04538459,0.036584374,0.01177569,-0.05833766,-0.009108383,-0.01989182,0.039867703,0.081669755,0.02530656,-0.014240466,-0.012376832,0.025322694,-0.0060959505,0.05807106,-0.03559669,-0.016518202,-0.020903938,0.021125177,0.005795882,0.062222484,0.019362118,-0.039453685,0.0030835911,0.04213068,0.0058597075,-0.0032151889,-0.048365176,0.03183122,0.02126466,-0.033234373,-0.008247049,0.030440131,0.04066049,0.017144727,-0.0382627,0.010926457,0.037078872,-0.044127334,0.020399593,-0.042718302,-0.018109811,0.0012146386,0.065119885,-0.03393361,-0.03588696,0.021775607,-0.019100353,-0.027620802,0.007203552,0.022204826,-0.014922686,0.007475087,-0.02680957,-0.048737913,0.025048207,-0.015579966,0.018588739,0.015992405,0.05301402,0.0437588,0.008648062,0.038724422,-0.0010323181,0.043297093,0.04043879,-0.0014349145,0.013408392,0.081432804,0.023299387,-0.010350062,-0.012364829,-0.033082154,0.044268306,-0.022649048,-0.018463027,-0.039606594,0.023790957,0.017078701,-0.030705756,0.1018083,0.043658134,-0.06329591,0.018848073,0.035583504,-0.01648274,0.041469693,-0.00033520896,0.028858272,-0.01909491,-0.030027304,0.08748794,0.045368467,0.004847956,0.015655173,0.016424218,-0.0009748554,-0.030610412,0.046987575,-0.06292391,-0.03275203,-0.024534194,0.020969696,0.01025226,0.028371906,-0.033425853,0.08354233,-0.061703395,0.015284034,-0.049222957,0.004572874,-0.00072407495,-0.0009173218,0.03423958,-0.0036851757,0.037181042,0.02379566,-0.05493871,0.04731267,-0.014169887,-0.01002041,0.013375072,0.016936176,-0.023780756,0.028801193,-0.017308269,0.03478975,0.033219196,-0.029428028,-0.05778089,-0.017638296,-0.080941886,-0.023199558,0.030227005,-0.057016503,0.042585474,-0.033630405,-0.042327214,-0.04105372,0.03186239,-0.025381425,-0.0043243608,0.05339469,0.07463489,-0.000826183,0.0075022774,-0.05103902,-0.00065692037,-0.019048426,0.010220691,-0.0032477858,-0.001435111,0.005347609,0.02362093,0.021882506,0.026394151,0.045968443,-0.011500564,-0.026887996,0.022450317,0.0051858514,-0.013034214,0.007513057,-0.06292169,0.032888286,0.07965893,0.057482075,-0.006068237,-0.041394785,-0.021081045,-0.018322049,0.044794116,-0.027249001,0.06414551,0.025274152,0.08639945,-0.06674382,-0.00057052827,-0.044209454,0.027377367,0.020904474,-0.0042089545,0.006784144,0.022275588,0.0035897635,0.0026064403,0.029876359,0.0133754695,-0.01051217,-0.04466745,-0.0199471,-0.009634709,0.034261808,-0.047793787,0.017753888,-0.043852434,-0.014009244,0.0490036,0.010663151,-0.032743655,0.013520961,0.03865843,-0.058439985,0.01574111,-0.0018518923,-0.026704626,-0.061452985,-0.036615316,0.0145483,0.018396443,0.040686157,-0.0053422777,0.03641884,0.010807725,-0.019597553,-0.020962227,-0.0030885744,0.0119761815,-0.030204091,0.0122430995,-0.03044906,-0.0061279032,0.015338187,0.029341927,-0.040729314,-0.04816009,-0.044296436,-0.039716013,0.015574368,-0.004994398,0.077821024,0.014189553,-0.0039907587,0.045430098,-0.064360276,0.051070616,0.115177594,-0.06267912,0.010089213,0.0067276526,0.013148967,0.046359304,0.013478859,0.025935043,0.023474606,-0.01593128,0.00471896,0.034349613,0.019224163,-0.023721451,-0.057247274,0.013977411,-0.07796924,0.029413829,0.040427808,-0.016825119,0.005474032,0.046215586,0.015419692,0.018499559,0.058286432,-0.021740982,0.040014666,-0.039285783,0.03856368,-0.018294038,-0.008310721,0.0130831245,-0.0050534825,0.06631406,0.03106796,-0.033183906,0.033631694,-0.018345661,-0.08621325,-0.020267507,0.021538064,-0.017005038,0.08660707,-0.006163501,0.034627497,-0.036235742,0.012382592,0.0057417145,-0.0052693896,0.042935483,-0.024367403,-0.020493528,-0.021400806,0.002938565,0.049552817,-0.08406024]	3f9ccd94-e6d6-4267-a156-434186524ac9	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
b907a8df-8b66-4e2d-85f7-57808a3a1f44	기업1	1770773958841.png	77236	2. 국내 중소기업 대출 촉진 관련 제도\n중소기업 대출 시장 전반을 기술성 등 특정 중소기업에\n확대하기 위한 제도 대한 여신 할당을 높이기\n위한 제도\n금융통화위원회가 중소기업 및 지역 기술력을 지닌 혁신적인 중소기업이\n금융중개지원 금융 동향 등의 상황 및금융시장과 기술금융 신용등급이 높지 않더라도 대출을\n대출제도 경제 여건을 고려하여 정한 한도규 받을수 있는 제도\n모내에서, 은행의 중소기업대출실\n적 등에 따라은행에 한국은행의 저 1 지식재산권(IP) 금융 2 기술금융(TCB) 대출\n리자금을 지원하는 제도\n부실발생시의존할수 있는 안전장치가은\n행으로 하여금 중소기업이 비우량할지라도\n기술력에 근거해 과감한 대출을 실행할 수\n있게 만드는 주요한 요인임을 확인\n중소기업대출비율제도는 신용도가\n중소기업대출 낮고 담보력도 부족한 중소기업이 벤처대출 관련 2023년 「벤처투자촉진법」 개정으로\n비율제도 은행 여신을 좀 더 수월하게 활용할 2023년 12월부터 투자조건부융자\n수 있도록 1965년 4월 도입 법제 도입\n은행의 원화자금대출 증가액 중 50%\n이상을 중소기업에 대출하도록 규율\n하는 제도 > 기술금융대출의 경우 사실상\n비기술기업에도 기술평가서를 발급하는 등,\n신용이 우수한 경우 시행되고 있다는 한계,\n> 질적인 측면에서 은행의 혁신적 벤처대출의 경우 시중은행으로확산되고\n중소기업 선별 및 신용 할당 역량 있지 않는 현실\n제고에는한계\n>IP 담보대출의 성장과정은 벤처대출의\n성장을 위한 유인책 설계에 정책적 시사\n점을 제공	\N	2026-02-11 01:39:19.272+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
85ef460d-327b-4d71-8b1d-da12e6ed03f9	기업1	1770773984729.png	77236	\N	\N	2026-02-11 01:39:45.111+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
96698861-7460-48ce-904d-8e6bd459cd84	기업1	1770774001411.png	77236	\N	\N	2026-02-11 01:40:01.745+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
8309039c-9113-4e68-a43f-84d8cbc6788b	기업1	1770774048613.png	77236	2. 국내 중소기업 대출 촉진 관련 제도\n중소기업 대출 시장 전반을 기술성 등 특정 중소기업에\n확대하기 위한 제도 대한 여신 할당을 높이기\n위한 제도\n금융통화위원회가 중소기업 및 지역 기술력을 지닌 혁신적인 중소기업이\n금융중개지원 금융 동향 등의 상황 및금융시장과 기술금융 신용등급이 높지 않더라도 대출을\n대출제도 경제 여건을 고려하여 정한 한도규 받을수 있는 제도\n모내에서, 은행의 중소기업대출실\n적 등에 따라은행에 한국은행의 저 1 지식재산권(IP) 금융 2 기술금융(TCB) 대출\n리자금을 지원하는 제도\n부실발생시의존할수 있는 안전장치가은\n행으로 하여금 중소기업이 비우량할지라도\n기술력에 근거해 과감한 대출을 실행할 수\n있게 만드는 주요한 요인임을 확인\n중소기업대출비율제도는 신용도가\n중소기업대출 낮고 담보력도 부족한 중소기업이 벤처대출 관련 2023년 「벤처투자촉진법」 개정으로\n비율제도 은행 여신을 좀 더 수월하게 활용할 2023년 12월부터 투자조건부융자\n수 있도록 1965년 4월 도입 법제 도입\n은행의 원화자금대출 증가액 중 50%\n이상을 중소기업에 대출하도록 규율\n하는 제도 > 기술금융대출의 경우 사실상\n비기술기업에도 기술평가서를 발급하는 등,\n신용이 우수한 경우 시행되고 있다는 한계,\n> 질적인 측면에서 은행의 혁신적 벤처대출의 경우 시중은행으로확산되고\n중소기업 선별 및 신용 할당 역량 있지 않는 현실\n제고에는한계\n>IP 담보대출의 성장과정은 벤처대출의\n성장을 위한 유인책 설계에 정책적 시사\n점을 제공	\N	2026-02-11 01:40:26.062+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
01bda2de-63b2-4b90-8712-aceff60668d6	20230412162051_egoeqbqv	1770777643932.jpg	88815	\N	\N	2026-02-11 02:40:44.331+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	\N	\N	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f
5e27ba81-a1d5-4075-a39a-ab44a4bd32f0	art_14908641930849	1770777862524.jpg	97819	\N	\N	2026-02-11 02:44:22.868+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	\N	29dc26d3-6fc0-4015-98fd-a9c9e047f91c	62ca205f-28bc-40da-971d-913001a46352
73ccbe50-117f-4520-9329-649385fdf384	tv구매거래명세서	1770860735762.jpeg	1104649	거래명세서\n구매일 2025-12-22 상호(법인명) 다솜프라자(주)\n전화번호 010-6617-6548 사업자등록번호 206-86-73314\n수취인 정도천 사업장 주소 서울 광진구 광나루로 56길 85 테크노마트 5층 B-66\n대표이사 이수환\n정도천 님 귀하 전화번호 02-3424-3210\n거래내용은 아래와 같습니다. 고객담당 오승환\n금 백삼십구만 구천원\nNO 품명 상품명 수량 단가 공급가액 VAT 합계\n1 KQ50LSD01AFXKR TV 1 1,399,000 1,271,818 127,182 1,399,000\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n합계 1,271,818 127,182 1,399,000\n참고사항 상기금액은 네이버 10243737878 상품번호/ 2025122269371511 주문번호 고객구매가격입니다.\n206-86-73314\n다솜프라자주식회사 이수환\n서울시 광진구 광나루로56길 85\n(구의동,테크노-마트21판매동4층[K72회\n도매입 가전제품\n소매업 전자상거래	\N	2026-02-12 01:45:36.358+00	f	e3da437e-4d84-41d1-8127-f553a0352e02	\N	\N	2f65161e-420f-4c7c-8ef0-f91154f0002f	fc606c20-02d9-4cde-bcf0-569374ed61f7
0f7f9bb3-8eec-4e1a-a588-86306805fc30	기업1	1770873679160.png	77236	2. 국내 중소기업 대출 촉진 관련 제도\n중소기업 대출 시장 전반을 기술성 등 특정 중소기업에\n확대하기 위한 제도 대한 여신 할당을 높이기\n위한 제도\n금융통화위원회가 중소기업 및 지역 기술력을 지닌 혁신적인 중소기업이\n금융중개지원 금융 동향 등의 상황 및금융시장과 기술금융 신용등급이 높지 않더라도 대출을\n대출제도 경제 여건을 고려하여 정한 한도규 받을수 있는 제도\n모내에서, 은행의 중소기업대출실\n적 등에 따라은행에 한국은행의 저 1 지식재산권(IP) 금융 2 기술금융(TCB) 대출\n리자금을 지원하는 제도\n부실발생시의존할수 있는 안전장치가은\n행으로 하여금 중소기업이 비우량할지라도\n기술력에 근거해 과감한 대출을 실행할 수\n있게 만드는 주요한 요인임을 확인\n중소기업대출비율제도는 신용도가\n중소기업대출 낮고 담보력도 부족한 중소기업이 벤처대출 관련 2023년 「벤처투자촉진법」 개정으로\n비율제도 은행 여신을 좀 더 수월하게 활용할 2023년 12월부터 투자조건부융자\n수 있도록 1965년 4월 도입 법제 도입\n은행의 원화자금대출 증가액 중 50%\n이상을 중소기업에 대출하도록 규율\n하는 제도 > 기술금융대출의 경우 사실상\n비기술기업에도 기술평가서를 발급하는 등,\n신용이 우수한 경우 시행되고 있다는 한계,\n> 질적인 측면에서 은행의 혁신적 벤처대출의 경우 시중은행으로확산되고\n중소기업 선별 및 신용 할당 역량 있지 않는 현실\n제고에는한계\n>IP 담보대출의 성장과정은 벤처대출의\n성장을 위한 유인책 설계에 정책적 시사\n점을 제공	\N	2026-02-12 05:21:19.564+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
56aa952d-a4c5-4c0f-9d4b-da5b5a408f47	문서 02-19 140233	1771477519741.pdf	74451	홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n홍길동\n이순신장군	\N	2026-02-19 05:05:20.341+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
c931519c-6afb-4fca-91a3-8f8aad43f12c	Screenshot_20260221_100027_All PDF Reader	1771645138060.jpg	496937	Kingshot >\n광고\n- 57 -\n시설소위원회 사업계획\n1. 비전\n아이들에게 "더 안전하고 쾌적한 공간 환경" 제공\n2. 사업목표\n-안전하고 쾌적한 터전 환경 마련\n-협동돌봄센터 평가/유지에 대비한 명확한 시설 근거 마련\n-소위 구성원에 대한 역할 분장 및 소위 참여 활성화\n3. 사업계획\n1) 안전하고 쾌적한 터전환경 마련\n-안전 정밀 진단 및 개선(천정형 소화기, 노후화 스위치, 멀티탭 교체, 위험물 표기 등)\n-가구 및 집기류에 대한 위험 진단 및 개선(가구 모서리 마감, 손 끼임 방지장치 등)\n-실내 공기질 개선(공기질 측정기, 공기 청정기 도입)\n-누수에 대한 시설 문제 지속 진단(우천 시기 대비 위한 전체 배관 청소 및 공사상태 재확인)\n-창호에 대한 비산 방지 필름 부착(난연소재 비산 방지 필름 구매 부착)\n-하절기 실내 유입 해충 방지(출입문, 창문 방충방 설치 및 보수)\n-응급 상황 대비 매뉴얼 정비 및 상비 의약품 분류 관리(기한 초과 비상약 폐기 후 재구매)\n-터전 내 이불, 침구류 개선(노후 된 침구류 교체 및 추가 도입)\n2) 명확한 시설 근거 마련\n-협동돌봄센터 인증 유지 제고(시설, 물품에 관한 항목 문서화/재물 바코드 부여 관리)\n-주요 인증 서류 구비 및 지속 관리(실사 대비한 파일철 생성 및 버전별 관리)\n-공기질 측정에 대한 기록(공인 인증 측정기 구매후 pm5, pm2.5 평균 수준 이상 관리)\n-가구 및 집기류에 대한 재물 조사 및 문서화(터전 내 의자 데스크 재물 바코드 부여 관리)\n-재난 안전 대처 방안 제고(피난 안내도 및 대피 동선 추가 보완, 안전 시나리오 작성, 화재, 범죄, 지진 시 대처 방안\n마련)\n3) 소위 구성원에 대한 역할 분장\n-업무 분장(업무 전문성 및 스케쥴에 따른 "소위장 : 소위원" 분장 배정)\n-유지보수 히스토리 기록(유지보수에 따른 시설 작업일지 작성(사진+견적서 첨부))\n-소위 모임 친목 활성화(시설 유지 노하우 등 공유, 도배/페인트/장비기술 등)\n-업무 지원(각종 공식 행사에 따른 시설 부문 업무 지원)\n4. 사업결과\n-협동돌봄센터 차기를 위한 명확한 근거 마련\n-더 깨끗하고 쾌적한 터전환경 마련\n-시설 소위의 역할 증대와 더 열심히 일하는 시설소위 이미지 파격 개선\n모든 파일 권한이 필요합니다 허용	\N	2026-02-21 03:38:59.238+00	f	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	\N	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad
f81c45fa-40f8-48f7-b15d-46e6711abee2	카드뉴스_7호_251023	1764045082627.pdf	2588604	\N	\N	2025-11-25 04:31:25.23975+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	[0.03841105,0.0077239494,-0.006837269,0.029754762,0.08435649,0.069247045,0.060680248,0.032371935,0.015003143,0.021780184,-0.013882783,0.0034968175,0.027525552,-0.01395656,-0.021678064,-0.021880342,0.022265213,-0.017126076,-0.09091891,0.029320886,-0.00027880442,0.031507656,0.013310653,-0.0016724519,0.003767483,-0.03542817,-0.002990739,0.075969025,-0.017352287,-0.060073044,-0.0018009184,0.04983441,0.0113828415,-0.021253407,-0.0190886,0.05519471,-0.029526664,0.07938694,0.023781817,-0.10208992,-0.06468669,0.04720079,-0.012445673,0.03415025,-0.039317545,0.014182907,0.021857426,-0.012429761,0.002620739,0.024262924,-0.010874899,-0.023618264,-0.007131841,-0.037571892,-0.076362394,0.0034456537,-0.019984854,-0.043318063,0.032158375,0.010149286,-0.044659056,0.059793532,0.0014661452,-0.033089034,-0.026745379,-0.035525694,-0.063478224,0.0048730806,-0.06192809,0.022370221,-0.006278341,0.015933646,-0.08197733,-0.00913608,-0.0021692407,-0.02005901,0.038561232,-0.022818033,0.014522437,0.08777065,0.014887881,-0.032448824,0.0018300492,0.06741258,0.05488684,0.03780889,0.06406753,-0.045378774,-0.06590453,-0.029990809,0.06794884,0.047170326,0.040376805,-0.015541539,0.06891893,-0.00014137343,-0.04606667,-0.08033978,0.06423107,0.059488837,0.01185273,-0.021152653,-0.0004185737,-0.04920905,0.047711473,0.026158612,-0.028000087,-0.031106448,-0.08493674,-0.017813616,-0.036973853,0.035763692,-0.0047670263,0.021230614,0.03615581,0.032145098,0.012482156,0.028247608,-0.08573375,0.0042113564,0.013236842,-0.013264505,-0.04912823,-0.020348279,0.036111843,-0.017018495,-0.039923504,-0.013269963,-0.020990146,0.0152147915,-0.009033344,-0.097368166,0.04563535,-0.023299757,-0.012517068,0.0034943575,0.015199426,0.020238968,0.0147039695,-0.04179105,0.012181899,-0.013486283,-0.07558256,0.04277557,-0.002362206,-0.033037763,-0.0065304055,0.093634576,-0.045214802,0.0016002833,-0.056762088,0.010723217,-0.0015453482,-0.011290759,-0.058391325,0.01398191,0.0014194496,-0.014590647,0.042132143,0.06313117,-0.015983133,-0.05727242,0.0013857398,0.02713574,-0.046817835,-0.020321669,-0.016158147,-0.065764695,0.016114596,-0.03446009,0.022860916,-0.024920184,0.0040759896,-0.024362886,0.011434967,-0.0017920078,0.014026238,-0.041295722,-0.052045114,-0.04494246,0.066889696,-0.013049217,-0.012049015,-0.011902097,-0.061278056,0.026021848,0.05318596,0.05679823,0.031227415,0.049895387,0.0433001,-0.010265146,-0.012836101,-0.0016598061,-0.03388252,-0.023229849,0.026542852,-0.0086819455,-0.019705772,-0.06907404,0.003193368,0.0043909913,-0.013249004,0.023380712,0.0012193319,0.0100525925,-0.0598089,-0.08807409,-0.019437052,0.024107069,-0.0147416275,0.012336697,0.01553252,0.016905341,0.022965211,0.04204799,0.071238905,-0.025104858,0.10490359,-0.041108597,-0.009171691,-0.006200271,0.004261215,-0.0020533388,0.041487567,-0.037724946,-0.012854778,0.0018540586,-0.008163633,-0.048640314,0.026907142,0.013402418,0.006476195,0.03000019,-0.027309421,0.015025323,-0.0037819494,-0.056743048,-0.026488367,0.018284932,-0.033461645,-0.042787272,0.017763413,0.0076377853,0.025410037,0.027169714,0.015547668,-0.008761295,0.022233486,-0.027033892,-0.034274753,0.0030102641,-0.04240675,0.005772986,-0.028534694,-0.024427839,0.0440241,-0.006644783,0.0607376,-0.008904109,0.076712705,-0.0015015957,0.05357227,-0.012840862,-0.04787951,-0.059349507,-0.019191204,-0.019612294,0.043767393,-0.093054354,0.042773258,-0.03376173,-0.035934914,-0.04329004,-0.047447316,0.038738236,0.014527605,-0.011677121,-0.041467037,-0.066955626,0.03293461,0.014547907,-0.015790747,-0.017854469,-0.04407142,-0.033438854,0.041714333,0.012295525,-0.024168054,0.0006762093,0.0040329113,0.047619257,0.0039217127,-0.027963033,0.05516979,-0.016545096,0.012119849,0.031400133,-0.0068711843,0.035979025,-0.019062411,0.05035586,-0.03671451,0.007786287,0.03663108,-0.014111031,-0.0055773635,-0.009989424,-0.05020523,-0.0051044305,0.0322612,0.0455671,-0.039868254,0.023430582,-0.0011041556,0.03203021,-0.13096452,-0.022215473,-0.02479526,-0.012039672,0.0023609675,-0.013535211,-0.036596194,-0.022172496,0.06818082,0.00378184,0.019991254,0.008587918,0.06614359,-0.038359467,0.048941847,0.022460725,-0.051167402,-0.004588007,-0.018217048,0.06508209,-0.030614285,0.013987926,0.0613941,0.039947275,0.0460096,0.021807931,-0.005699814,0.043712292,-0.0021931715,-0.067528985,0.026705682,0.032047186,-0.024165591,-2.6434262e-05,-0.0037703237,0.08838812,-0.010068421,-0.009858549,-0.03408848,-0.02926977,0.019515926,-0.008511626,0.020920154,-0.023316214,0.0029299182,0.0013578553,0.010455465,-0.018599318,0.00056203717,-0.036741126,0.033241097,0.056502476,-0.06934382,0.03885209,-0.008856925,-0.01109545,0.0019142904,0.007579864,0.03377065,-0.008004208,-0.0093147475,0.013194293,0.01563813,-0.08983989,-0.022357013,-0.02557829,-0.016510064,0.059896357,-0.026402796,0.015532659,-0.04252193,0.009637495,0.030706678,0.046169017,-0.073783025,0.044684928,-0.03425342,0.040584724,0.030646732,0.05738179,0.026757563,0.033638623,0.012596985,0.022586564,-0.008227828,0.012893623,0.109511286,0.006813424,-0.004968389,-0.0010948955,0.061524425,0.00396338,0.024696972,-0.057518773,-0.034963142,-0.04631734,-0.011771116,0.015013068,-0.013988596,0.011350809,0.012222056,-0.0018889771,-0.022293627,0.056253057,-0.023012543,0.017478533,0.030628307,0.027687276,-0.02983794,-0.026770577,-0.028245786,0.017392961,0.026384128,-0.009652229,-0.023487138,0.022142408,-0.001714308,-0.016011631,-0.011075015,0.046796415,-0.014857713,-0.037362136,-0.011980868,0.021004621,-0.0046144696,0.03394367,0.014846668,0.00877889,0.023457192,0.035940766,0.04939034,0.037965905,0.019982778,-0.07417619,-0.04270758,-0.022324264,0.046752002,-0.069864675,-0.046679456,0.037171803,-0.005425526,-0.025568064,-0.017874757,-9.5725845e-05,-0.07839831,0.011631335,0.041145038,0.014571491,0.059335083,0.012889058,-0.026048342,0.022846494,-0.019421589,0.042706385,0.00742653,0.0382719,0.0063950466,0.00927436,-0.0025616086,0.04677039,0.022176083,0.028156772,0.02901404,0.0066473456,-0.008883384,0.03033191,-0.013794774,0.057379566,0.0980228,0.016881378,-0.035699748,-0.004031334,0.00449353,0.05583757,0.051459294,0.014010185,0.026646884,-0.029054986,-0.00021104145,-0.07303262,0.008477105,-0.020397902,-0.06436906,0.043789215,0.033922344,-0.011434194,0.0116076805,-0.05890033,-0.0027946832,0.026949594,-0.009950016,-0.025417523,0.05033,0.0002656435,0.03478129,0.014369061,0.037099812,-0.0110853175,-0.019174308,-0.016795812,-0.07511899,0.012420148,-0.032409616,0.051866274,0.033136025,-0.026391666,0.023226814,-0.050349593,-0.004859581,-0.021659534,0.018823965,0.01271142,-0.027549958,-0.038447484,-0.008471363,0.07647886,-0.002297786,0.05342494,0.03464806,0.047671277,-0.019081,-0.0059828055,0.030421663,-0.01904933,0.04268189,0.027946403,-0.0140811475,0.0051653637,0.027738081,0.02513218,0.04471793,0.009640212,-0.011522069,0.07897812,-0.011087982,-0.014027887,-0.016921258,0.0032495577,0.055321846,-0.025275936,0.007335057,0.056600444,-0.0186204,-0.00094037404,-0.017447762,-0.057429105,0.031103663,-0.0030737412,-0.005332144,-0.013289115,-0.014024612,0.029516155,-0.010499195,-0.021004714,0.016023913,0.0057167863,0.0044104396,-0.06294297,0.07467665,-0.023748815,-0.048237212,-0.019612145,0.0516219,-0.0030320126,0.0045150565,0.017288236,0.040520567,0.022587547,0.020300418,0.007240273,0.0030187545,-0.03625,0.043408982,0.051994044,-0.045108072,0.036989022,0.014553773,-0.034058504,0.04824732,-0.019806724,-0.018934594,-0.026436074,0.03334538,-0.0059440066,0.031876452,-0.045241393,0.05566731,0.018399257,-0.009597966,-0.07282446,-0.03898123,-0.06843193,0.03406387,0.019514585,-0.0264644,0.008463575,-0.036832742,-0.029804,-0.05385622,0.047338035,-0.047225565,-0.050111998,0.046825446,-0.005108467,0.060723603,-0.017965538,0.0029815712,-0.023756215,-0.042904634,0.04020357,-0.052155964,-0.012851345,-0.019654976,-0.011498692,-0.008235814,0.050871495,0.012646248,0.022540191,-0.019272199,0.03192169,-0.017352324,0.037637405,0.0052224975,-0.054609306,0.02047598,0.06421622,0.088655725,-0.025712222,-0.07490401,-0.011423999,0.0068020998,0.020703634,-0.018714923,0.022332432,-0.0074812933,0.05912998,-0.03911211,-0.017598746,-0.029104015,-0.018378126,-0.03208018,0.0045717913,-0.012805119,-0.007563309,-0.043386076,-0.030806145,0.0059922338,0.017533384,-0.04211432,0.009569435,-0.013366853,0.020548208,0.01081873,-0.043471504,0.03212943,-0.04111954,0.039840978,0.05017609,0.021055672,-0.014200442,0.0067148493,-0.018902317,-0.043240197,0.02431188,0.012119425,-0.009624044,0.012347489,-0.04351536,-0.037882593,0.017351354,0.006742617,-0.018034166,0.0038416162,0.030092193,-0.018555291,-0.0049482393,0.013717972,0.0133340685,-0.031028837,0.056458257,-0.027272219,0.0434556,-0.049858782,0.020957537,-0.023445763,-0.03631404,-0.03913602,-0.017204825,0.041010913,0.0065046255,0.0518249,0.008506356,-0.014234133,-0.015045507,-0.065075114,0.057367492,0.06993773,-0.0011444071,0.05530052,0.02126789,0.044834945,0.019373508,0.044872563,0.0041562193,-0.043484896,-0.037973147,0.079688735,0.046588093,0.038629957,0.014903657,-0.0485742,0.00522566,0.0026721426,0.05282531,0.02702244,-0.034836005,0.03246691,0.011550871,-0.01905714,-0.03183739,0.03002862,-0.033538174,0.02458552,-0.023441598,0.010027615,-0.026524175,0.004493957,0.03129759,0.040236168,0.05632095,0.018660652,-0.0041717705,0.008548628,-0.005834307,-0.0981807,0.0047747684,0.03499516,-0.009992858,0.006701979,-0.014947293,0.0151749365,-0.028574135,0.008075268,-0.0094947405,0.012429918,0.026504444,-0.032621276,-0.012511511,-0.046539437,-0.012168357,0.016410436,-0.06865254]	3f9ccd94-e6d6-4267-a156-434186524ac9	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f
46639f00-0f9c-42e3-b2d3-16efb692b599	스크린샷 2025-11-18 144517.png	1763707604034.png	145390	1 지원팩터 도입 방안\n\n© CRR27} 바젤 최종안 발표 이후 중소기업 대출 금액에 따라 위험가중치를 차등 적용한\n방안을 벤치마크하여, 일정 규모 이하의 중소기업 대출에 대해서는 0.7619 위험가중\n적용\n\nㅇ (정부보증대출 위험가중치 완화) 공적 보증이 포함된 중소기업 대출 비중이 높은 한국의\n실정에 맞게 이에 대한 건전성 관리 지침을 별도로 제정하여 은행의 실질적인 건전성이\n반영되도록 함\n\nㅇ (예대율 규제로 중기대출 유인) 정부보증대출 위험가중치 완화로 발생한 완충자본이\n중소기업 대출로 이어질 수 있도록 예대율 규제를 통해 유인 제공\n\n- 위험가중치 완화로 확보한 완충자본이 중소기업 대출로 연결될 수 있도록 중소기업\n대출 잔액에 적용되는 15% AMINE 감액 기준*을 상향\n\n© 바젤[[는 소매 중소기업(6131 SME) 익스포저에 대해 무등급 중소기업(8596)보다 낮은\n위험가중치인 75%를 적용하고 있는데, 소매 중소기업의 범위를 현재보다 포용적으로\n적용 가능	\N	2025-11-21 06:46:44.564917+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	cb012c55-1aad-44d1-9e4d-dcd840ae2d34	8365ba25-1b79-44b1-b44f-4a4e078109c9
34f0ada6-da9f-4eb1-bcf9-b8476753fe13	스크린샷 2025-11-10 131844.png	1763963669557.png	227823	3. 인덱스 스티커\n“\n\n| |                       트레이로 문서를 꺼냈을 때, 한번에\nSHE 롤 수 있는 인덱스 AEF\nSHE 내부에서 개별 BNE 구분하\n기 위해 표시=\n둘이는 부분은 문서 원본에 FBS\n주지 않도록 해당 페이지의 뒷면에\nOIL 투명 절착면 사용.\nCf: 8001-&-#001에서 #00101 해당\n하는 최소 개별 문서 단위 PRO\n#002, #003, #004. 에 해당하는 개별\n문서도 스티커로 한번에 구분.	\N	2025-11-24 05:54:30.890576+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	[0.058940105,0.05530123,-0.05850707,-0.0085394895,0.0144333625,0.03646089,0.033158716,0.030051984,0.023806723,0.0113603,0.0031082095,0.054589838,0.030136295,0.0043344744,-0.0139616225,-0.03337182,0.041485578,-0.014244494,-0.047734898,0.007247317,-0.05294809,-0.03444031,0.03043372,-0.025172135,-0.032120787,-0.03849186,-0.00041206303,-0.021982465,-0.025447154,-0.074488014,0.03420917,0.04023987,0.0012885832,0.01774029,0.032074835,-0.050481297,-0.025873026,0.065123074,0.01806345,-0.059050173,-0.065175,-0.044308413,-0.007606241,0.048709877,-0.034098297,-0.014263814,0.0048282617,-0.054106906,-0.051808614,0.07128601,0.0047005047,-0.04920487,-0.012646186,0.010660719,-0.03527372,-0.024258591,-0.016092975,-0.027139738,0.08386425,-0.010422041,-0.04153887,-0.021286687,-0.059009146,-0.038737617,-0.01679193,-0.09431867,-0.0090998635,-0.03139337,-0.06694401,0.023102112,-0.025484294,0.065109394,-0.033187456,-0.025709711,0.037385385,-0.0019508072,0.030519515,0.04605083,0.048608597,0.059650853,-0.025590394,-0.019219585,0.05520153,0.0716274,0.023986883,0.030123534,0.005614844,-0.011170243,-0.05596026,-0.0071127997,0.04325559,0.03435927,-0.027557794,0.03533344,0.09431156,-0.01667989,-0.08098209,-0.1604526,0.065059245,0.06766908,0.035110217,0.0073305997,-0.040730152,0.051033672,0.0311357,-0.057456337,-0.025032626,0.00059178297,-0.08211567,0.0137993395,0.009585464,-0.0192054,-0.008444419,-0.017503265,0.019513465,-0.012581634,-0.04723086,0.020963041,-0.04414017,-0.012700032,0.010177748,0.0044386,-0.007146141,0.0020834166,0.017269839,-0.017110111,0.0029270193,-0.023862623,-0.025275733,0.019466395,0.020117044,-0.03245638,0.0055236784,0.044607874,-0.032656744,-0.021366188,0.03808215,0.049499996,0.010188564,0.036196344,0.011811415,0.027196664,-0.121793576,0.02773976,0.042359676,-0.020086883,-0.003268321,0.027051114,-0.016767748,-0.018061416,-0.034545213,0.025324102,-0.005984632,-0.035433054,-0.045423705,0.018763535,0.01710252,-0.041321512,0.048958465,0.008224552,0.050445806,-0.043829836,0.004162761,0.008616827,-0.024603767,-0.049978096,-0.0449309,-0.08869277,0.012508039,-0.004870335,-0.001198553,-0.021063998,-0.07009465,-0.07675358,0.0041065053,0.01682784,0.0316684,-0.016909935,-0.05810909,-0.041298736,0.06356523,-0.04080938,-0.010357996,-0.068684034,-0.0015285123,0.023955017,0.024604075,0.049165837,0.05683317,0.005718743,-0.011589343,-0.010922159,-0.0069934377,0.026457647,-0.022510473,0.06707168,-0.00072424783,0.010875141,-0.027858822,-0.062832974,0.023481322,-0.0017920884,0.040759277,0.021476716,0.04746631,0.042307224,-0.07195481,-0.045955755,-0.009082263,0.007347172,-0.023782074,-0.02451925,0.034576982,-0.028924502,0.0069199125,0.041371383,0.014357345,0.015021409,0.09994252,-0.04668923,0.01326785,-0.005069396,-0.013493815,0.042555053,-0.005963575,0.008824945,-0.0053890687,9.087724e-05,0.006537611,-0.041313156,0.019765569,0.028472938,0.003164364,-0.019488825,-0.015389926,0.028897261,-0.01210229,-0.05785265,-0.007935149,0.019018542,0.019355051,-0.01494401,0.025615003,-0.0170739,-0.0018557698,0.008867051,0.02249803,0.014060147,-0.00078581134,-0.043155007,-0.014309022,-0.0062653497,-0.051714726,0.036172308,-0.034679454,-0.006796722,0.013474136,-0.012915911,0.013148745,-0.017298078,0.013783404,-0.023653693,0.0067303004,-0.02658465,-0.09514109,-0.08847046,0.0029117179,-0.053643182,0.010869821,-0.04261635,0.03207779,-0.09242084,-0.003006081,0.0035151802,-0.06729256,-0.007756764,0.003670053,0.022185193,-0.030713137,-0.048582733,0.012645026,0.037337407,-0.024296494,-0.027071275,0.020247724,-0.05711848,-0.040482376,-0.01202603,0.022180619,-0.03739921,-0.0036266537,0.059573337,-0.0072690914,-0.06081169,0.06181814,0.02505665,0.048482202,0.017460851,-0.02182464,0.015375803,0.013843103,0.040731173,-0.024084914,-0.017450733,-0.041068308,0.014052224,-0.09311145,-0.024710558,-0.06556324,0.003031408,0.015172316,0.08594133,-0.00418009,0.02807599,0.0042352267,-0.037816633,-0.1131012,-0.012570294,-0.02780208,0.022559317,0.014660814,0.030613769,-0.08268003,0.020984134,0.070514314,-0.0026489566,0.0558374,0.0033670797,0.028699182,0.003605792,0.04515805,-0.004004653,-0.045254696,-0.047226094,0.0054881056,-0.029244926,-0.037548117,-0.036997847,0.03131618,0.052791283,0.023611829,0.037613157,0.03994969,0.021728475,0.005166195,-0.07340585,-0.023260618,0.02275866,0.014623101,-0.02429484,0.011669233,0.0187028,-0.02450867,-0.021646315,-0.0029342533,-0.025340427,0.02501749,-0.0011964714,0.023550978,0.02547994,-0.00058727275,0.069393344,-0.017664537,0.06161067,0.036738347,-0.016334558,0.044515625,0.034071807,-0.05482834,0.010797321,-0.02175184,-0.013302699,-0.0208825,0.0034398378,0.041647766,-0.02899697,0.0046642977,0.026933923,0.024480922,-0.04039462,-0.02459784,-0.0023035738,0.011304368,0.03908544,-0.0055177626,0.013108611,-0.049982417,0.0037391535,-0.02639686,-0.0163898,-0.033961497,0.016315566,-0.012329281,0.041784193,0.027290296,0.025130263,-0.017030545,0.027539235,0.0044521196,0.01802325,-0.049643148,0.020354677,0.070791334,-0.039222173,0.029458199,-0.05161045,0.05938432,0.032000266,-0.026189478,0.040941965,-0.028171351,0.006812066,0.038499046,0.002269034,-0.037985053,-0.016880345,0.036195293,0.005066365,0.0038213443,0.06099508,0.02668999,0.044520847,0.03636393,0.03653745,-0.02620315,-0.042782888,0.017588269,-0.012700339,-0.027103517,-0.036146916,0.009787722,0.013120502,0.015297399,-0.025861166,0.006147004,0.014374353,-0.020849705,-0.047721528,-0.0145910075,0.050268214,0.010813531,0.06676875,0.01371653,-0.00038507543,-0.0061472445,-0.0030999098,0.0026345088,-0.023780588,-0.019474825,-0.06716421,-0.013122079,0.008359904,0.016975818,-0.053415783,-0.070523314,0.03340871,0.03250927,0.009201344,-0.012601431,0.04695538,-0.06689693,-0.009415212,0.023285309,0.028106868,0.031724773,-0.018718047,-0.048312873,0.04887149,-0.04800098,-0.030466778,0.051080655,0.0005588184,0.044020973,-0.014003682,-0.013114487,-0.0023593968,0.060653947,0.0105723115,0.025556076,0.011467271,-0.041385733,0.026960079,-0.027195936,0.015871396,0.08316103,-0.0023221816,-0.05466617,-0.031379193,-0.009593205,0.02235384,0.0636425,-0.0075302627,0.04141327,-0.049660984,0.0040952824,-0.017975563,0.038704395,0.012298467,-0.05152587,0.034022115,0.025354356,0.021492308,-0.009627353,-0.045959238,-0.0056911665,0.043287072,-0.029249808,0.011159556,0.07547078,0.029861622,0.018375462,0.0027781043,-0.0020452135,0.04053087,-0.05483506,0.006179,-0.07558902,0.024005132,-0.049452584,0.054251816,-0.026293905,-0.048939217,0.011406947,-0.029437618,-0.002807281,-0.020300156,-0.002356254,0.0027821872,0.03408096,-0.031370614,-0.02778596,0.07772407,-0.010709425,0.019582698,0.050782613,0.07041285,0.06537947,0.051698845,0.009122963,0.004604263,0.053208273,0.02220265,-0.0027407457,0.026785893,0.02107838,0.04382892,-0.0113874255,-0.009934751,-0.021300716,0.05761546,-0.025587492,-0.016356109,-0.03986791,0.031146746,0.030617053,-0.04619929,0.05536882,0.05976586,-0.05544536,0.0016975292,0.01873282,-0.018554429,0.047260217,-0.05224728,-0.004389139,-0.016771836,-0.00094927097,0.07063833,0.0042753615,-0.006236073,0.006309852,-0.0036764736,0.021668376,-0.012147439,0.09506528,-0.035007756,-0.04605876,0.0053296187,0.027131101,0.040205047,0.0029273005,0.009472148,0.027890747,-0.008092756,-0.021721974,-0.019275026,0.013128205,-0.023270363,0.022977231,0.02400553,-0.023863427,-0.011692978,0.04554915,-0.06605807,0.02172226,-0.0023043682,-0.034115493,-0.011971341,0.00633493,-0.006508096,0.009942696,-0.035744406,0.02156836,0.011206576,-0.010619104,-0.029052915,-0.02084102,-0.048388902,0.0055361125,0.039985105,-0.059429932,0.057625715,-0.027165221,-0.044192776,-0.026471902,0.004569756,-0.07669505,-0.054172616,0.013002395,0.036643777,0.025106592,0.023258224,-0.007949905,0.006872136,-0.020901965,-0.015648684,-0.022697465,-0.00303517,-0.004924991,-0.01503747,-0.04413129,0.014301612,0.035121683,-0.03946491,-0.01541532,0.022886058,-0.00928587,0.029454306,0.028992934,-0.035654306,0.03843889,0.081809625,0.04923651,0.01619947,-0.03234234,-0.018144839,-0.04960221,0.035635937,0.0041655903,0.05120015,-0.040820617,-0.0032640572,-0.068029165,0.016931633,-0.0070434813,-0.021832878,0.011497206,-0.024755115,-0.02231571,0.0012054599,-0.02593298,-0.023782924,0.0567849,-0.0058429777,-0.00918912,-0.031794995,-0.031435356,0.010602942,0.008856384,-0.053392764,0.0076562604,-0.06550394,0.0011364114,0.039271396,-0.023539335,-0.016265525,0.054049414,0.050187152,-0.06539518,0.019687215,0.008922306,-0.017764082,-0.0068371496,-0.032283355,-0.018344665,-0.012149754,0.022655157,-0.007221613,0.021006638,0.029827258,-0.022018401,-0.009745928,0.022533165,0.032600652,-0.028798494,0.019087067,-0.027648818,0.0061756996,0.011748126,-0.0017472663,-0.0077352086,-0.017197574,-0.04158675,-0.00970386,0.012569329,0.009016014,0.073737495,0.028455582,0.003777081,0.0041986206,-0.051581725,0.014850455,0.0670555,0.0056269495,0.017238408,0.04349873,0.034783147,0.05913337,0.0467439,0.0104075745,0.02256107,-0.00793838,0.04228977,0.005681131,0.03078345,0.010018618,-0.063192084,0.03802955,-0.029198987,0.013741053,0.018040072,-0.03056619,-0.03261012,0.023848202,-0.008636649,-0.014749593,0.043726534,-0.076682836,0.058548693,-0.018517207,0.02336534,-0.018462334,0.002975615,-0.009272637,-0.01624651,0.051932227,0.021944808,0.0002690679,0.02990633,-0.033723574,-0.0589647,0.010295804,-0.0029989309,-0.0011967152,0.03915017,0.0051524322,0.011190608,-0.04039965,-0.013410608,0.023515152,-0.013897463,0.06075492,-0.07727809,0.012740968,-0.04441295,-0.014887261,0.0509794,-0.055932455]	3f9ccd94-e6d6-4267-a156-434186524ac9	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f
f95a2507-088e-4454-9b07-aeafb915cf99	111.jpg	1763960448321.jpg	384705	© 피고인이 컴퓨터 스캔 작업을 통하여 만들어낸 공인중개사 자격증의 이미지 파일은 BAH\n전자기록 장치에 전자적 형태로서 고정되어 계속성이 있다고 볼 수는 있으나, 그러한 형태는 그 자체로서 __\nA ell 의해 Off + 있는 것이 Otol oI BI Eo 관한 Ae 있어서의 E02 5\n어렵다.(대법원 2008도1019) (경간 14변시. Tagen 25520, BoA 19해경간부, 이하경간부, 22해경간두\nBEY\nETD 따라서 이미지 파일을 이메일로 전송하더라도 위조공문서행사죄가 성립하지 않는다.\n) 의사표시의 방법은 반드시 문자에 의할 것을 요하지 않으며 부호에 의한 경우도 포함된다. 다만,\n부호는 발음적 부호임을 요하지 않고, 문자에 대신할 수 있는 가독적 부호이면 족하다.\nEID 본인 또는 특정 당사자만 해독할 수 있는 USE 사용한 것은 문서라 할 수 없다.\n=X   생략문서)\n@ 이른바 생략문서도 그것이 사람 등의 동일성을 나타내는 Hol 그치지 않고 그 이외의 사항도 증명\nEss # eel 7127 이니라 문서로서 HEsielo da dia SE\n0 (0) AZ els NBEHS! TAUFEIE AUTH 관한 LAY ALG ANE AE\n넘어서 신용장에 허위의 접수일부인을 날인한 것은 사문서위조죄에 해당한나.(대법원 7/도879) (042\n11.법행 18순경차)\n© (이 구청세무계장 Bolo AUS 세금 BH 통지서에 Weise A ole Shs BAC 30 gE\n(THe 95도1269)                                   110                ;          fis\n자저 T=	\N	2025-11-24 05:00:49.813279+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.013779396,0.06081244,-0.027757518,-0.009726364,0.0551264,0.020884244,-0.023174204,0.034639493,0.025687426,0.020456428,0.0025136657,0.04803398,0.045660995,0.013271949,0.030427841,-0.053340502,0.025133321,0.014357854,-0.042133316,-0.047387023,0.00791907,-0.014323838,0.06889311,0.018103814,0.008740876,-0.031460494,0.014589815,-0.022870941,0.007721779,-0.06184377,0.034478046,0.037378494,0.005285537,0.03494979,0.035502285,0.026540946,-0.013411875,0.06841333,0.0008538262,-0.09889611,-0.039106637,-0.029592343,0.020776594,0.05142618,-0.024529312,-0.014140881,0.0038013437,0.017821822,-0.026270412,-0.0010264338,0.018947601,-0.0076807076,0.008457638,-0.025384303,-0.037809614,-0.041731734,-0.029235862,-0.02080816,0.074493416,-0.02683435,-0.042077955,0.0062194034,-0.04048659,-0.061264385,-0.025007237,-0.06718942,-0.005214258,0.00093982334,-0.066032074,0.0043514804,-0.019830847,0.024740487,-0.027832188,-0.001690598,0.040979862,0.011186093,-0.028900461,0.0190424,0.041223384,0.014763412,-0.037634194,-0.010501548,0.03990471,0.056702353,0.03128044,0.018654773,0.012072653,-0.019992214,-0.052487038,-0.018007835,0.10056708,0.0663587,-0.01934588,0.017199386,0.06399265,-0.021071827,-0.08192277,-0.13789041,0.05364455,0.04352341,0.011081026,-0.0040072273,-0.0068940776,0.024419114,0.009186949,-0.026674315,-0.03158843,-0.02442415,-0.09958039,0.017108554,-0.011360975,-0.010314761,0.011497095,-0.009162896,-0.0113629075,-0.004117709,-0.058541175,0.033763614,-0.05954635,0.020467388,0.009376982,0.0070255315,0.0018197796,0.0050149756,-0.022513807,0.014220954,-0.03289025,0.023755912,-0.017288487,0.032843206,0.019928053,0.0024175055,0.015965989,0.02959292,-0.016512567,-0.012248859,0.08217619,0.051457565,-0.010868166,0.0005495343,-0.00027127747,0.016788198,-0.09650824,0.02099315,0.009946509,-0.057472233,0.011273233,0.045709997,-0.026508572,0.007140592,-0.03967802,0.056794908,-0.0104841795,-0.025564944,-0.029127492,0.0025099146,0.010042363,-0.03716379,0.051382925,0.010286923,0.016770644,-0.072992556,-0.009248023,0.033122774,-0.06428018,-0.038335737,-0.016557232,-0.08863024,-0.018506743,0.016598927,-0.014227248,-0.031992637,-0.064709164,-0.05489511,0.024101283,-0.00082308,-0.0050350293,0.04740485,-0.035844404,0.03231003,0.08434213,-0.032587856,-0.022534005,-0.025359003,-0.0036934463,-0.0034030688,0.041933604,0.012688877,0.04831805,0.029772872,-0.01632424,0.0011943816,0.01848358,0.058175296,-0.032895077,0.05833963,-0.021865169,-0.022264542,-0.049966205,-0.0070105875,0.05651055,0.022862764,-0.014510228,0.009574555,0.0031328723,0.058393314,-0.04054998,-0.017508488,-0.056354795,0.04107942,-0.020062145,-0.045010027,0.0038435867,-0.023009855,0.028708652,0.04879672,0.044417,0.002995373,0.06621446,-0.050626222,0.0016950871,-0.010376765,0.010698098,0.07859792,0.025788924,-0.023349706,0.011385742,-0.03907247,0.017675223,-0.013506383,0.0053505446,-0.008983581,0.0012601237,-0.026692001,-0.028653894,0.02294966,0.025104957,-0.06604863,-0.03154442,0.0076667024,0.013746415,-0.02835566,0.082387835,-0.049645253,0.023315996,0.0011995857,0.02988131,0.036172982,-0.029237662,-0.023818715,-0.059396602,-0.01880343,-0.08098917,0.026803588,-0.080987886,-0.013128159,-0.01202723,-0.019674743,0.012192856,0.0028837856,0.022791991,0.0024070977,0.0055385,-0.030249568,-0.0706002,-0.047318693,-0.031814426,-0.019594045,0.03301934,-0.010224742,0.030658377,-0.07805258,-0.055177838,0.0096696755,-0.044540025,0.020986507,-0.018270018,0.026774606,0.0028585482,-0.047655445,0.025420107,0.012782778,-0.045719758,-0.015064509,-0.01966325,-0.056907922,0.008777941,-0.033367574,0.022878453,-0.012704769,0.023295954,0.08886625,-0.0064708716,-0.056969576,0.052822553,0.008819086,0.015502088,0.014443149,-0.024472136,-0.01319511,0.017068474,0.02781788,-0.03193923,-0.0058711977,-0.010229736,-0.02966457,-0.041123934,-0.0021372417,-0.0555733,-0.020495871,0.05926128,0.08710817,-0.026808893,0.027428837,-0.019737793,-0.02703949,-0.08827376,-0.04050669,0.00638346,0.034608327,-0.0011087764,0.011394377,-0.06467297,0.026200177,0.062233854,-0.010711566,0.021320267,-0.027441718,0.007630728,0.028342005,0.026918652,-0.012563019,-0.011027659,0.0012641555,0.01944872,-0.030507438,-0.06791356,-0.010241687,0.052221216,0.014276478,-0.03050713,-0.0009535713,0.024432966,0.043633755,-0.02219399,-0.065049544,-0.048850942,-0.035392724,0.0028525114,-0.012064103,0.03007326,0.022481654,-0.0021173868,-0.030878093,-0.0046055424,0.0064708972,0.021168,0.009622797,-0.03188877,0.0038109159,0.018636802,0.078108914,-0.0055073113,0.046534725,0.033539858,-0.0219358,0.030422842,0.04239252,0.0005709247,-0.03917091,-0.015865473,0.01151123,-0.02498007,0.008642628,0.0052438295,-0.008853836,-0.0020876364,0.038863353,0.0065992153,-0.050548583,-0.010298979,0.009007807,-0.014333765,0.043926764,0.007860593,0.07632712,-0.04503376,-0.032343276,-0.011825576,0.0017056534,-0.037323132,-0.00992278,0.008353994,-0.0115797,0.0131203495,0.010340003,0.019547649,0.018761687,-0.0005486768,0.01169005,-0.009143631,-0.035674978,0.08222933,-0.023379514,0.06804268,-0.004393557,0.021862486,0.01852658,-0.05214572,-0.012828317,-0.058846816,0.0030347516,0.008011307,0.001488034,-0.040619846,-0.0046321373,0.03546201,-0.013580094,0.016326144,0.015775485,0.028993428,0.06410502,0.0819919,0.0086728325,-0.030385166,-0.053639174,0.019826218,-0.021193093,-0.0022051968,-0.012004755,0.026593983,0.030318003,-0.016380286,0.00055679044,0.010470305,-0.0153275775,-0.018063603,-0.012100558,-0.014165984,0.018790426,0.03600167,0.07223113,0.027177572,-0.02529125,-0.016160786,0.031964257,0.018262045,-0.030892095,0.0199502,-0.069363266,-0.03445282,-0.032895576,0.003529103,-0.030680045,-0.07738253,0.026830826,0.05057659,0.05986539,-0.02028368,0.0419875,-0.12742195,-0.052703276,0.038830563,0.023236373,0.057476558,-0.052604552,-0.07585274,0.04364977,-0.0065936274,0.015295569,0.049367838,-0.011435836,0.02917337,0.0056922524,-0.012101443,0.03712089,0.026096473,0.03996735,0.021735396,0.022446714,-0.018944072,0.05604865,-0.0032418997,0.009038568,0.06404793,-0.040024534,-0.024077132,-0.0105796065,-0.05636399,0.021534974,0.04893653,0.024180751,-0.0020938865,-0.043576457,0.014207189,-0.0010619976,0.055774186,-0.015303397,-0.021090485,0.03183271,0.057038356,-0.0025768012,-0.011107274,-0.041570354,0.03699453,0.057727296,-0.035859756,-0.024275145,0.026394844,0.016853768,0.02940108,-0.008748399,0.011152975,0.051800575,-0.07051374,-0.0131102055,-0.033947073,-0.0008812374,-0.03580269,0.07218401,0.015970076,-0.0011807996,-0.00241765,-0.050407913,0.0136238905,0.016371207,0.020678937,-0.0039971317,0.017035615,-0.036811955,-0.07525348,0.037623186,0.0063210484,0.061360158,0.016963413,0.073252685,0.044857167,0.012092102,-0.0065197567,-0.015755907,0.03834241,0.061325047,-0.00691451,0.0036787998,0.039865863,0.06627182,0.003397799,-0.022587214,-0.022191077,0.031196361,-0.009469285,-0.046147335,-0.031467192,-0.013868939,0.002430066,-0.052385386,0.09690339,0.0029593895,-0.07733805,0.023569595,0.06472319,-0.023699569,0.009846487,0.0028695413,0.0024747076,-0.040263418,-0.01193371,0.06822284,-0.039541185,0.02585242,0.030543352,-0.011574196,0.014189263,-0.0034025928,0.053379823,-0.04907491,-0.060713634,-0.011945339,0.04465157,0.011583695,-0.013893383,0.0024985776,0.051620223,-0.026860062,-0.020054959,-0.011425372,0.010988254,-0.017309483,-0.010087117,0.055223968,-0.007840177,0.0015257612,0.034133807,-0.06505252,0.058872137,0.018817643,-0.039171357,0.037508983,-0.011118665,-0.02028446,0.047276676,-0.021554854,0.015138456,-0.005565496,0.0038414688,-0.037540175,-0.035744723,-0.06408492,0.02862885,0.009489438,0.0005933689,0.028378373,-0.026059411,-0.05850507,-0.014825855,0.01693653,-0.05891627,-0.0027113429,0.05846118,0.04444539,0.007550932,0.018562522,-0.033505365,0.0009098237,-0.037562434,0.007214847,-0.016807433,-0.008900111,-0.025469223,-0.004717729,0.002464444,-0.0029570886,0.06693961,-0.018464455,-0.028081449,0.016448427,-0.01895319,-0.04099195,-0.002221457,-0.09181269,0.018977234,0.069161594,0.10571565,0.025722925,-0.038936354,-0.0004782048,0.006424802,0.055083904,-0.016712502,0.047326427,-0.0064222957,-0.0053794887,-0.044425573,0.030722447,-0.013144664,-0.006481317,0.030918323,-0.0020570296,0.04141872,0.011285204,-0.029111512,0.004692066,0.033341773,-0.009026569,-0.05057583,-0.008489279,-0.024786847,0.028500887,0.005924895,-0.03252542,0.01279203,-0.047495253,-0.016722439,0.0685177,0.0045811203,-0.026499007,0.06275075,0.03808102,-0.0440223,0.016871955,-0.02425985,0.017070314,0.00558798,0.0061963857,-0.039733108,0.021062125,0.03800476,-0.022659993,0.025069073,0.033048645,-0.0042239293,-0.039016172,0.018711274,0.016413335,0.006478324,0.064920194,-0.048311125,0.010242458,0.016505118,-0.0034289109,-0.034736954,-0.012185707,-0.026971772,-0.018147727,0.020780234,0.018379027,0.0437692,0.018407483,-0.014725423,0.032085,-0.04638312,0.04093866,0.055150557,0.010859713,0.05473482,0.05842546,0.02776659,0.036420994,0.015281655,0.041415796,0.030221049,-0.0064668963,0.07351657,0.03856837,0.009404557,-0.010645851,-0.056913774,0.0205293,-0.055664837,0.023362093,0.009818563,0.038069267,-0.054818284,0.005914762,0.0044335704,-0.027479462,0.03123797,-0.016705884,0.016317172,-0.015898436,0.043569814,-0.0143457,-0.0074681086,0.016522305,0.01919542,0.028136628,0.02575655,-0.032480065,-0.000883313,-0.032886714,-0.05191024,0.061297875,0.031281233,0.005609762,-0.0055960035,-0.025856178,0.024440253,-0.01883665,0.025312018,0.024862716,-0.02206021,0.06255809,-0.057437014,0.05216452,-0.06828921,0.018365167,0.03806876,-0.06055674]	3f9ccd94-e6d6-4267-a156-434186524ac9	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed
c9703614-8a4c-410b-afdf-237ed2f9e00b	스크린샷 2025-11-19 140035 (2).png	1763965709285.png	17835	혁신 주도형 성장 패러다임으로의 전환\n창업-중소기업>중견기업>대기업으로 이어지는 기업 성장사다리가\n우리 경제의 역동성을 제고합니다.\nKOSI 중소벤처기업연구원	\N	2025-11-24 06:28:30.41255+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.03362768,0.08127017,-0.012686212,0.011461365,0.024937583,0.0712305,0.0033363418,0.061785735,0.05541435,0.008579853,-0.0075337137,0.070100054,0.070477515,-0.024201103,-0.010267267,-0.051415555,0.03774675,0.0188924,-0.0026330731,-0.008295753,-0.04865493,-0.018963601,0.022993524,-0.0075015808,-0.013084841,-0.06528197,0.006748427,0.030668957,0.018484076,-0.03783536,0.01382896,0.04487394,-0.018941866,0.054209128,-0.040233575,0.0015336738,-0.0262334,0.07985997,0.031613242,-0.052114584,-0.057711218,-0.029499926,-0.033668622,0.057592917,-0.030815668,0.0077003525,0.023866832,0.020724734,-0.04486518,0.06832994,0.051634297,0.0076615517,-0.05113004,0.017475635,-0.011098568,-0.0031653307,-0.009320997,-0.051952664,0.06561312,-0.010948298,-0.039986253,0.034464598,-0.02644456,-0.056753475,0.012428306,-0.079529986,-0.019813985,-0.003184344,-0.061731286,0.007506846,0.036396142,0.05619245,-0.053297132,0.052303474,0.04244347,0.0004467848,-0.0090717105,0.032873433,0.054546256,0.028374327,-0.035215415,-0.010674897,0.029803656,0.07192802,-0.0010469251,-0.018473014,0.044404984,0.011379763,-0.09525302,0.007923611,0.07384581,0.0337558,-0.02355757,0.010344373,0.113281384,-0.02494992,-0.02986794,-0.13623698,0.031379897,0.07923626,-0.024229739,-0.015935808,-0.007059499,0.01464683,0.03040015,0.02136715,-0.034871574,-0.04730983,-0.06610835,-0.040315818,-0.046837457,0.027492024,0.0042964336,0.009798025,-0.02139,-0.018215485,0.0022508581,0.03680345,-0.033489086,-0.0066024666,-0.004751618,0.023925923,-0.029813865,0.006780524,0.030216847,0.0032769064,-0.039411075,0.0111261625,-0.061020296,0.03112227,-0.029903803,-0.0561934,0.03983991,0.01910847,-0.02810601,-0.03349252,0.063383,0.07406872,0.004655168,0.011540395,0.010073591,-0.010959031,-0.03736931,0.0017748772,0.031489905,-0.016109634,-0.013681875,0.02155802,-0.052400075,0.016051814,-0.03498267,-0.0038532347,-0.003968181,-0.07522006,-0.036772106,-0.0071585192,0.0341797,-0.06676811,-0.0031121634,-0.06555154,0.03816509,-0.05837647,0.022759436,0.043272734,-0.049190767,-0.030706035,0.013994052,-0.049614936,0.006528603,0.03772323,0.0075432425,-0.013801572,-0.07048766,-0.028125554,-0.033142857,-0.017988883,-0.027119098,-0.018124664,-0.021182261,-0.043460477,0.08717546,-0.03377679,-0.025766501,0.005746393,-0.023805173,0.03361657,0.06267393,0.020512454,0.027570162,0.033432238,-0.022624167,-0.034791976,0.026558777,0.000959368,-0.03233269,-0.004091778,0.008574717,-0.022400884,0.008609236,-0.066428654,0.002398982,-0.0033576686,0.01903334,-0.021154318,0.08995332,-0.01015637,-0.08328345,-0.021162568,-0.019321358,0.011744288,-0.032437533,0.016765602,0.026097717,-0.020398606,-0.009605952,0.032820623,0.03795485,0.032438632,0.077092856,-0.0674405,0.009861579,0.009421962,0.008334301,0.02669555,-0.018158061,0.0026039665,0.01662803,0.008004603,0.026601482,-0.086957395,-0.008821626,0.021310672,-0.019491926,-0.016221955,0.029939728,0.038625143,0.025332142,-0.06641486,-0.06793661,-0.009819293,-0.02175979,0.0015414023,0.057000805,-0.011019599,0.034359,0.020702915,0.03112459,0.010582081,0.014361813,-0.03897313,-0.024704361,-0.05524459,-0.061060037,-0.02789424,-0.042920377,-0.052011326,0.02616637,-0.028647391,0.012560254,0.014355629,0.022281643,0.017423999,0.0025765018,-0.035067845,-0.052140426,-0.0703312,-0.028720465,-0.010404107,-0.001994741,-0.047421645,0.05176396,-0.048567977,-0.05771695,-0.009746796,-0.056240316,0.016018907,0.0048223236,0.007644071,-0.0124109,-0.04606528,0.022075986,0.037661772,-0.015301306,-0.046688277,0.004638041,-0.07816126,-0.014046118,-0.008454344,0.022905182,0.017872876,0.0002812305,0.08028758,-0.0007078207,-0.081018634,0.083924145,0.04073632,-0.016997235,0.038530823,-0.020566262,0.0017000532,-0.015577667,0.060456246,-0.049802866,0.0015610778,-0.0007771262,0.06264649,-0.009230615,-0.025420096,-0.037227325,-0.024788339,0.0117852045,0.09852225,-0.038541805,-0.00064916624,0.0132471705,0.009344071,-0.13106073,0.015890682,0.014903275,-0.0039716875,0.012031944,-0.0026726255,-0.058733284,0.013853551,0.04410657,0.0059231925,0.0129962815,0.0287966,0.030495748,-0.025706008,-9.807153e-05,0.020012995,-0.026783034,-0.032795034,0.01299738,0.01563257,-0.074567966,0.018692693,0.039194126,0.010680884,0.009324967,-0.016149042,0.06039652,0.0097168535,0.010375566,-0.069235474,0.058468424,0.0324705,0.011679929,0.009692919,0.01444119,0.035736937,0.019059742,0.012648189,0.009521506,-0.011922892,0.047170408,-0.007524688,-0.006313147,-0.018302415,-0.023205053,0.026951533,-0.005801203,0.05533348,-0.0073376703,-0.009298192,0.039521936,0.06457816,-0.013070308,-0.026063792,-0.009912662,0.017649038,0.019282892,0.016472043,0.003736169,-0.023980582,0.005768714,0.036195513,-0.011664277,-0.10222715,0.024114361,-0.017074082,-0.030944705,0.05930402,0.017414168,-0.00087047217,-0.06436001,0.022402423,0.06319983,0.05211827,-0.0066297157,0.023108013,-0.05379432,0.01586567,0.026923161,0.016133415,-0.018185006,0.087912895,-0.0054954393,0.015335671,-0.06800602,0.024515847,0.1287813,-0.045645416,-0.0011880448,-0.02794798,0.03540108,0.011590657,-0.025736652,0.016040858,-0.022198731,-0.035739217,0.028739775,0.011065448,-0.06669244,-0.019309334,-0.012577249,-0.046070278,-0.03184093,0.037509833,-0.003295556,-0.0074621094,0.008428199,0.033914413,-0.013324856,-0.046515398,-0.008419027,-0.023599891,0.0020944213,-0.037937853,0.035983793,-0.00816048,0.007162779,-0.03433515,0.0014661809,-0.008144501,0.0014314743,-0.032339565,-0.0030720294,0.02964604,-0.00022549475,0.04617165,0.02368778,-0.03020707,0.012488381,-0.026828885,0.035714835,0.010643758,0.0073048165,0.005000347,-0.038629353,0.011634991,-0.020874828,-0.052842606,-0.012963411,0.041552816,0.037406746,-0.0044166814,-0.046813402,0.026891218,-0.07237083,-0.011072744,0.036244977,0.03148463,0.023548033,-0.019777196,-0.013714024,0.076609015,-0.06106819,-0.012376589,0.022481352,0.020149322,-0.007532934,-0.016493786,-0.0032316695,0.02996606,0.011534037,0.029580876,0.027765347,0.023003392,-0.040707354,0.021590214,-0.020796776,0.022790834,0.07196943,0.015713973,-0.01075728,0.014833108,0.021761313,0.029380977,0.0118692815,0.017199848,-0.010136335,-0.04675793,0.012580013,0.0033264214,0.048779428,-0.02054311,-0.034524467,0.048629604,0.04692607,0.01290651,-0.022240331,-0.08807875,-0.026334777,0.022760903,-0.017161403,-0.020324916,0.08043512,0.011187274,0.03510606,-0.032155488,0.019617168,0.020024208,-0.055799063,0.00013571646,-0.041685816,-0.020898638,-0.045094892,0.02806132,-0.049783695,-0.024738677,-0.002973155,-0.02281642,-0.028461374,0.0028956085,0.0032022614,-0.017857626,0.028364312,-0.034028262,-0.037816666,0.084662355,0.017206676,0.008759135,0.036190454,0.04507222,0.0417094,0.055351965,0.040438794,0.019386956,-0.0010184776,-0.0014374764,-0.025298981,0.018859044,0.06997372,-0.0051131244,-0.006865059,0.01467209,0.02607478,0.030180078,-0.010403135,-0.04078072,-0.018510818,-0.008575333,0.035611346,-0.044287797,0.03055576,0.051868763,-0.060563866,-0.02387949,0.034316827,-0.04203644,-0.0032132128,0.0018920625,0.022250708,-0.017451439,0.005315668,0.079994194,0.036586646,0.01858526,0.02611118,0.010918023,-0.0027394118,0.0130804125,0.06767717,-0.016719855,-0.049222957,0.022958497,0.04098989,0.025121028,0.04679484,-0.04189878,0.072038405,-0.0054717595,0.020398796,-0.01376157,-0.008722351,-0.03511126,0.008938283,0.06412946,-0.043046597,0.021413617,0.041334897,-0.04933961,-0.0029933956,-0.017400749,-0.036057744,0.04051292,0.031427864,-0.048274774,0.031271506,0.0034395058,0.045331694,0.019868148,0.0044261855,-0.0014395115,-0.06877234,-0.067529224,-0.009337179,0.052987255,-0.07420844,0.029986903,-0.026100144,-0.04091141,-0.013062212,0.051755074,-0.034142714,-0.025220737,0.049230106,0.026497072,0.07383456,0.027805096,-0.024434434,-0.0061375336,-0.034196038,0.014819263,-0.0096632,0.011283742,-0.014769575,-0.020274151,-0.031855877,0.034054637,0.024675645,-0.0028594455,-0.016811773,0.0012099285,0.016223473,0.027584197,-0.0048936596,-0.01842892,0.0183364,0.02676316,0.05808456,0.03432501,-0.04899602,-0.014544372,-0.01317886,0.03323357,0.007721101,0.07548406,-0.004610817,0.060608383,-0.08472163,0.034253914,-0.052770037,-0.030187827,-0.0073678675,-0.0128604565,-0.016402509,2.084876e-05,-0.031679638,-0.002240497,0.011686398,0.011452791,-0.0013070484,-0.011213921,-0.01296373,0.05008806,0.019790772,-0.057361405,-0.0011172923,-0.03230152,-0.027107831,0.04031874,0.021725928,-0.0012634129,0.00047233098,0.023694413,-0.03003583,0.037346367,0.0011119514,-0.032761883,0.0024260136,-0.037080977,-0.0199933,-0.011055174,0.0074122106,-0.02000442,0.002583598,-0.004547973,-0.004744637,-0.012096033,-0.022513386,0.006604145,-0.013971081,-0.013585079,0.02431614,0.011629778,0.012796687,0.025515158,-0.02089435,0.011577011,-0.013005613,-0.00044641865,0.03133344,0.002619032,0.05595746,-0.004138821,-0.030533962,-0.01269364,-0.018035844,0.035386667,0.05332823,0.006402668,0.031382207,0.004682415,0.029661704,-0.0019201305,0.014865935,0.03385471,0.038078066,-0.03484883,0.015818693,0.034147546,0.036415808,-0.008584874,-0.064641215,0.021618012,-0.019208016,0.01954004,0.005003163,-0.0041717323,-0.018658742,0.057681736,-0.0067939726,-0.025516242,0.0125050815,-0.011073269,0.042415902,-0.026522761,0.0024316276,0.0010047882,-0.033859517,-0.07228006,0.012767424,0.041255727,0.03942741,-0.037040368,0.007389877,-0.018259848,-0.098550975,-0.025988653,0.032533344,-0.00274033,-0.0023346515,-0.042655535,-0.007853003,-0.029097045,0.020955887,0.0128541505,0.014626612,0.08050065,-0.022603747,-0.017643968,-0.048410673,0.005796467,0.042350627,-0.04871277]	3f9ccd94-e6d6-4267-a156-434186524ac9	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
7e18dc45-8fe2-4526-89b9-2a1bca7ae33a	스크린샷 2025-11-19 140035 (1).png	1763965709297.png	17835	혁신 주도형 성장 패러다임으로의 전환\n창업-중소기업>중견기업>대기업으로 이어지는 기업 성장사다리가\n우리 경제의 역동성을 제고합니다.\nKOSI 중소벤처기업연구원	\N	2025-11-24 06:28:30.488123+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.036747433,0.08126442,-0.014143125,0.009061259,0.024459986,0.07018005,-0.0037406543,0.056470018,0.055364676,0.010093437,-0.008687853,0.063283466,0.06729517,-0.026857989,-0.010546763,-0.047964152,0.03648099,0.015554215,-0.007643875,-0.007822869,-0.050581045,-0.022408357,0.021413812,-0.004420115,-0.007631393,-0.06465831,0.013026353,0.032793738,0.019293152,-0.034917083,0.013263089,0.044376053,-0.02032836,0.056003224,-0.040465888,0.0016773893,-0.02779171,0.0832627,0.028802114,-0.052014753,-0.052929543,-0.024316441,-0.035031263,0.055963524,-0.028006839,0.002297312,0.024013493,0.020618554,-0.044126183,0.06724864,0.046419263,0.004647301,-0.05236551,0.01544857,-0.012802207,-0.0063310727,-0.010220073,-0.047798134,0.06861029,-0.009747815,-0.03718034,0.032440003,-0.030944172,-0.05853934,0.011918315,-0.07895668,-0.020264614,-0.0026593134,-0.05923254,0.004090575,0.036826257,0.061381757,-0.04548869,0.054023076,0.04312262,0.0021717527,-0.007616081,0.03148865,0.054869134,0.03573965,-0.039557967,-0.011252655,0.027564574,0.071934745,5.5958142e-05,-0.015744265,0.041489992,0.010396656,-0.09865496,0.004311599,0.07113481,0.0325888,-0.019222511,0.0065103043,0.114433475,-0.027801098,-0.031264152,-0.13532563,0.030151533,0.07934974,-0.02374179,-0.015343182,-0.011323753,0.012226248,0.02825576,0.026697088,-0.031731784,-0.046000198,-0.060496558,-0.040714096,-0.049081977,0.030729279,0.0041108993,0.010415242,-0.017912323,-0.012086424,0.0025284912,0.041437745,-0.0310005,-0.005633022,-0.008497649,0.028239308,-0.025968906,0.009033438,0.025875032,-0.0018013663,-0.042740032,0.012675205,-0.059845384,0.034497634,-0.027449923,-0.05249429,0.036577053,0.017020304,-0.027593078,-0.027387878,0.06693906,0.07681921,0.0046514375,0.01747204,0.010005374,-0.009047383,-0.037521783,0.004225748,0.034488745,-0.014954958,-0.0065562194,0.023739327,-0.044618983,0.012856307,-0.031502463,-0.008223625,-0.0039579887,-0.07694189,-0.034981776,-0.004993041,0.039842874,-0.0630302,-0.0055050375,-0.06300638,0.034335017,-0.057408664,0.022274792,0.037922118,-0.05694666,-0.024792632,0.013147263,-0.053154524,0.01036105,0.035383735,0.0068156626,-0.016014965,-0.07021721,-0.029320184,-0.031212026,-0.017264687,-0.029791009,-0.017831262,-0.025024923,-0.044362392,0.087774865,-0.035391577,-0.025960393,0.005866135,-0.02177849,0.033646457,0.065073065,0.01809936,0.026567658,0.033652015,-0.02571256,-0.034263883,0.028405836,-0.0016096856,-0.032744654,-0.004472056,0.00846355,-0.023217676,0.00529199,-0.064450495,0.0012676222,0.00076269795,0.016692428,-0.01747785,0.08982868,-0.009395237,-0.08617283,-0.017058976,-0.017358664,0.010765896,-0.03411806,0.018056821,0.028495127,-0.025727883,-0.0096457545,0.037314434,0.035511646,0.027933631,0.07692952,-0.06836474,0.008594812,0.008286155,0.009065396,0.028755996,-0.019317692,0.004059191,0.014324071,0.013232324,0.026190588,-0.088071726,-0.007092375,0.023065658,-0.015952706,-0.00946643,0.038743466,0.0405643,0.03568481,-0.06226553,-0.07129955,-0.011567072,-0.020986773,0.00010017,0.051483393,-0.013808273,0.03548402,0.019652462,0.033375353,0.007245901,0.007468311,-0.0396241,-0.029069236,-0.05623371,-0.061776843,-0.029059334,-0.04183967,-0.05088402,0.027471265,-0.027254093,0.015906194,0.013213724,0.022384148,0.017760012,-0.00025877048,-0.034831576,-0.05314964,-0.06811342,-0.030334054,-0.0112968255,-0.0042847004,-0.050155632,0.052009344,-0.04893042,-0.05917497,-0.00908236,-0.05113535,0.012082751,0.0068970113,0.010218432,-0.014493037,-0.047561105,0.025275698,0.035046477,-0.014490148,-0.048186038,0.0052842214,-0.076606564,-0.013672078,-0.0076937554,0.02341984,0.021951487,-0.00044703955,0.079732046,-0.0008225685,-0.080698855,0.08512703,0.04356922,-0.01983172,0.03858781,-0.026202014,0.0014597463,-0.013550801,0.06389874,-0.04894972,-0.00025161923,0.000625573,0.06522687,-0.006866992,-0.02566505,-0.036320213,-0.02717275,0.013285355,0.095260024,-0.03854528,-0.003827605,0.017867083,0.010906344,-0.13103431,0.012633503,0.015366318,-0.005328571,0.010763514,-0.00592024,-0.05960295,0.012262206,0.041663304,0.00010957779,0.013537778,0.032618213,0.03008731,-0.028997084,0.00038580378,0.025254074,-0.026194535,-0.026016444,0.011106163,0.014273393,-0.08013583,0.016499741,0.034924343,0.009835878,0.0048002442,-0.016977822,0.06605272,0.010780569,0.011183569,-0.06742741,0.05970166,0.033451993,0.009328723,0.010777727,0.016130824,0.03622423,0.018429026,0.012094595,0.011717585,-0.015149114,0.047374208,-0.012034366,0.0005508822,-0.016345454,-0.01864282,0.028321382,-0.0059697013,0.0547789,-0.005667136,-0.0057239286,0.03752497,0.06333008,-0.014549909,-0.024511565,-0.009966147,0.0180452,0.021932278,0.014743625,0.0019707414,-0.024337698,0.008061387,0.041259464,-0.009367325,-0.10222723,0.02414826,-0.014017506,-0.035393767,0.057769135,0.020762976,0.001610509,-0.06418135,0.02374618,0.06327334,0.047136802,-0.005698572,0.022898557,-0.052661404,0.012561728,0.029341029,0.014518299,-0.016258942,0.086354606,-0.007262155,0.015449225,-0.06593716,0.023287697,0.13127254,-0.040996317,-0.001998887,-0.026584309,0.0404312,0.010887474,-0.024915172,0.016683402,-0.019342778,-0.027156558,0.033185814,0.016935248,-0.06818232,-0.017924614,-0.014055927,-0.043456208,-0.029102586,0.04111898,-0.005346715,-0.00529945,0.009016514,0.028096233,-0.012255577,-0.042456523,-0.009997876,-0.02525156,0.00021298917,-0.036830384,0.037051953,-0.011211818,0.009870588,-0.030602932,0.00042539113,-0.0068444842,0.006382221,-0.029293045,-0.0036185374,0.026625019,-0.0020032425,0.046827063,0.021995828,-0.032373257,0.009284441,-0.029708434,0.035876017,0.012088447,0.0074183983,0.0049307467,-0.037669092,0.012375169,-0.018711157,-0.048743848,-0.013033278,0.04055027,0.03959279,-0.004667924,-0.047175333,0.02922098,-0.07441635,-0.0113325585,0.032882974,0.035959568,0.025227044,-0.022815537,-0.019615453,0.07812113,-0.055673752,-0.0068973494,0.029697405,0.02173899,-0.0053957114,-0.017723251,-0.0061735427,0.03258457,0.014160168,0.029643856,0.025300471,0.025805356,-0.045452606,0.021391766,-0.019624783,0.02125497,0.073207065,0.015228659,-0.016152475,0.016477581,0.02436817,0.03244612,0.015710762,0.017250257,-0.009543384,-0.049279522,0.01273613,0.0016459983,0.046163473,-0.016212648,-0.033887066,0.04237858,0.044943668,0.012234254,-0.017403783,-0.08791149,-0.024464123,0.020733966,-0.019331383,-0.018729605,0.07470199,0.014728544,0.030347735,-0.031979423,0.02222356,0.022714982,-0.054503147,0.0012492391,-0.04834087,-0.021118907,-0.043632735,0.025005272,-0.050965074,-0.020814655,0.00078916614,-0.019568555,-0.025580913,0.0034595625,0.002309039,-0.014424086,0.029007835,-0.030104404,-0.0430958,0.0853137,0.017059615,0.010003013,0.033158388,0.04411951,0.040125288,0.057110574,0.042276733,0.017297002,0.004794931,0.0016927862,-0.027176887,0.023582244,0.06693963,-0.003585278,-0.0078786025,0.016015388,0.02580285,0.030581597,-0.011678946,-0.03992285,-0.016194733,-0.0052792667,0.0376947,-0.04405101,0.02707683,0.051894315,-0.062915355,-0.01906762,0.037778992,-0.041271213,-0.0008479376,-0.0005503523,0.025406562,-0.016476305,0.007425205,0.08068819,0.034845743,0.01942669,0.023776798,0.013126803,-0.0026153831,0.014529158,0.06709619,-0.018384213,-0.047582243,0.02459492,0.04172413,0.024998404,0.04644333,-0.043613,0.072001785,-0.002788459,0.018154034,-0.011796312,-0.010232839,-0.029852735,0.0051091854,0.06654317,-0.04167378,0.021085585,0.04343213,-0.050085656,-0.0012926114,-0.014464335,-0.037604738,0.040432025,0.031552337,-0.049173146,0.02880143,0.006154558,0.04052496,0.018266743,0.0025140664,0.0020419478,-0.0655217,-0.069313295,-0.011369724,0.052367862,-0.0747101,0.035134368,-0.030924944,-0.04187417,-0.0104965735,0.054961924,-0.03765901,-0.024635311,0.047012314,0.029358556,0.07628416,0.026194546,-0.026946655,-0.002802558,-0.030401539,0.016007341,-0.019737793,0.012300993,-0.009327011,-0.015134001,-0.030453248,0.03085101,0.022764698,-0.006926163,-0.01643012,0.0026749528,0.01849927,0.029501822,-0.0063925423,-0.019308554,0.020002022,0.028104058,0.052115396,0.030587733,-0.048435997,-0.01811847,-0.011170549,0.034404356,0.007426785,0.080115944,-0.00020629959,0.058438983,-0.0890866,0.03240481,-0.053762145,-0.029040877,-0.0020517786,-0.016003286,-0.02102838,0.002941158,-0.031653058,-0.006552138,0.013082628,0.0030986394,-0.0036129504,-0.012324962,-0.012813156,0.05075846,0.018922828,-0.06037558,0.00022024158,-0.028851906,-0.031242728,0.03900584,0.020050315,-0.005280923,0.00064906746,0.024695192,-0.030740622,0.038250808,0.0020057461,-0.031100405,-0.0005166352,-0.03980301,-0.021765074,-0.010050694,0.010922783,-0.019761577,0.0029879839,-0.0065642823,-0.0055005006,-0.010196802,-0.021917358,0.008670062,-0.016686661,-0.018821595,0.026518084,0.011252227,0.014442026,0.02347778,-0.026537467,0.011702754,-0.015622696,0.0011525749,0.029743535,-0.0015928765,0.058792517,-0.003996596,-0.029852677,-0.008409745,-0.020779282,0.036428586,0.057583515,0.0072090076,0.030955134,0.006540523,0.031816535,0.004098769,0.015160253,0.036581952,0.037835598,-0.032430958,0.015616882,0.033623736,0.0340994,-0.010470375,-0.066153444,0.020199114,-0.017390264,0.01909513,0.0024312034,-0.006578973,-0.020494696,0.059912443,-0.008786368,-0.026162475,0.012565433,-0.01193117,0.044870403,-0.027062505,0.0018555418,-0.004299861,-0.029489597,-0.07107107,0.012991852,0.039968282,0.044567198,-0.036149878,0.008632003,-0.021961741,-0.095160306,-0.021894969,0.039964247,-0.0061967173,-0.007785851,-0.037701074,-0.005167051,-0.034997292,0.023325384,0.013526701,0.017438889,0.07811746,-0.021852018,-0.017084807,-0.04405887,0.005118279,0.039498966,-0.04899202]	3f9ccd94-e6d6-4267-a156-434186524ac9	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
7d281c7f-8aac-492c-9006-2508d27976dd	55555	1764751656114.png	22172	KGS! 중소벤처기업연구원\n소상공인 지원정책 및 제도 개선을 위한 기초자료 제공\n빅데이터를 활용한 소상공인 경영실태 분석\n12025-12101점잭이슈 인포그래픽.\n나수미 연구위원\n수시연구 2417\n<빅데이터를 활용한 소상공인 경영실태 분석>를 바탕으로 제작되었습니다.	\N	2025-12-03 08:47:37.881546+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.021768428,-0.023516592,-0.01518322,0.011748622,0.039119005,0.03754867,0.019144038,-0.0059109586,0.035290744,0.015708968,-0.016853813,0.021749727,0.044375498,0.0133990375,0.036849085,0.014803048,0.03789132,-0.015692621,-0.067532055,-0.011374595,-0.03480916,0.020043155,0.056271065,0.04920011,0.008893794,-0.005226842,0.010835928,0.010797735,-0.031790346,-0.055090453,0.017313685,0.06593395,-0.014875991,0.0074405046,0.05438348,0.041717798,-0.029911663,0.0849312,-0.016727597,-0.09942866,-0.044491474,0.033075187,0.040422697,-0.0011321115,-0.012492328,-0.011596933,-0.033551253,0.0001893061,-0.06278783,0.023788428,0.0035878632,-0.026629554,-0.018216021,-0.007614441,-0.054594,-0.012171205,-0.0137765445,-0.01642092,0.021040877,-0.03989434,0.016389038,0.020064438,0.009851815,-0.0077068657,-0.0025919145,-0.045535263,-0.033592355,-0.0094683645,-0.089507364,-0.0100283595,0.008287019,0.030276619,-0.0606059,0.016577536,0.028076487,-0.029936321,0.002679403,0.0046530566,0.07488792,0.039692283,0.02215287,-0.009100441,0.04096019,0.034701474,0.026087198,0.045177925,0.05964573,-0.0057167457,-0.11087974,-0.0077205407,0.07324498,0.026818667,-0.020706808,-0.005946673,0.08713466,-0.05458075,-0.062327627,-0.1020583,0.04822961,0.037043445,-0.03812747,-0.032974478,0.010930479,0.010864201,0.019316668,-0.003657833,-0.045594215,-0.021807635,-0.04043969,-0.022672623,-0.021973161,-0.008835264,-0.036146864,0.034173284,-0.03032539,0.013538738,-0.0012715899,0.07763793,-0.006656319,0.006808147,0.013679584,-0.008517387,-0.0047669844,0.011064849,0.0055283215,0.030151483,-0.03819269,-0.007253753,-0.032396246,0.033573404,0.03753609,-0.034360908,0.044153824,0.015032642,-0.04986539,-0.003911754,-0.006430327,0.010321808,0.020071715,0.017850952,0.004999349,-0.027905675,-0.075106755,0.028856069,-0.012028646,-0.060702402,-0.049852148,0.004762535,0.026598355,0.018583076,-0.048414428,-0.015888888,-0.011555419,-0.033038218,-0.04099938,0.0227717,0.02746749,-0.05624121,0.016773488,-0.0037582447,-0.017186763,-0.054171942,0.017102005,-0.00091417367,-0.038555693,-0.05666745,-0.044863313,-0.04900212,-0.010135682,0.013024215,0.01001581,-0.0024070756,-0.038905706,-0.02133166,0.01720332,-0.057156075,-0.012396682,-0.044778474,-0.100310706,0.038314607,0.075233966,0.029306278,0.0035507896,0.024978125,-0.05881485,-0.029785497,0.032763716,0.059060134,0.08856549,0.025284015,-0.031705413,-0.0063909977,0.019586284,0.016824858,0.012497094,0.036028758,0.011003849,-0.0061474387,-0.020110385,-0.05694654,0.050695997,-0.017674608,-0.010409907,-0.0080429,-0.015406919,0.048060734,-0.0764698,-0.047836956,0.008190318,0.0007940022,-0.0002440053,-0.008237108,-0.020218423,-0.07964222,0.05132822,0.04036881,0.09090043,0.04064864,0.07263176,-0.055793405,0.011635852,0.05525682,0.059758957,-0.0107963495,0.027141377,-0.019150358,-0.021418419,-0.006112394,0.014190733,-0.023911044,0.007272023,0.0485495,-0.008639005,0.014695435,-0.014920063,-0.022906736,0.028462682,-0.046737142,-0.08613251,0.01335236,0.048285663,-0.015964558,0.06933964,-0.04722796,-0.02803898,0.031570915,0.05299422,0.001259362,-0.016936408,-0.048054125,-0.017331421,0.0119324345,-0.0164184,0.010211689,-0.02037134,0.008567879,0.0050187088,-0.0019235671,-0.009317398,0.020440716,0.042902183,0.011301967,-0.006190993,-0.004034367,-0.058461957,-0.0620827,0.00059936714,-0.012654703,-0.014139217,-0.07662578,0.037773997,-0.070028864,-0.07008061,0.01760945,-0.046856023,0.0197858,-0.033602666,0.028418178,-0.046939105,-0.03163528,0.020112611,0.02497261,0.011009215,-0.024685612,-0.004446074,-0.105806276,-0.029619025,0.024429914,-0.011911359,-0.018577414,0.028393015,0.038062897,-0.012528979,-0.06018746,0.061448205,0.043784693,0.021009041,0.0113178715,-0.06477318,0.030689638,-0.018006936,0.087856136,-0.0048008095,-0.033101134,0.019771602,-0.03529417,0.01257429,-0.017734915,-0.025399743,0.0025952943,0.04970375,0.10527003,-0.057776086,0.0031289284,-0.0072189188,0.0065915124,-0.115275584,-0.006271669,0.024082644,0.016699068,-0.0012641652,-0.012763077,-0.060772814,0.008159656,0.047569226,-0.013065858,-0.024707623,-0.020589015,0.026510665,0.031145161,0.019719318,-0.014503475,-0.027312739,0.0059161168,0.00026824523,0.015269808,-0.07068649,0.0023169676,-0.0028496897,0.0072230967,0.025668109,0.019385543,0.048611544,-0.031913057,0.0234837,-0.05258732,0.00128707,-0.00618947,0.0020857283,0.01186615,0.00036227537,0.024498655,-0.024520908,-0.0050193924,0.028135197,0.00531026,0.03949921,-0.0072352733,-0.033565596,0.005013202,-0.01097374,0.024330705,0.038827438,0.06954029,0.02217969,-0.011334339,0.0096075665,0.037153073,-0.05534354,0.00992789,-0.0043833167,0.04887026,-0.0020266427,0.040526107,0.020510899,-0.009272904,-0.00478854,0.019564003,0.030768033,-0.06374595,-0.032555502,-0.004553952,-0.023172779,0.014785272,0.0017174468,0.068055704,-0.034727104,-0.019269222,-0.00056281005,0.015201913,-0.023981078,0.016739383,0.008707339,0.032539,0.037574448,0.024797574,0.028391412,0.016120901,-0.014403511,0.026743168,-0.01873205,-0.027924558,0.059342694,-0.068462916,0.010802707,-0.027532047,0.0745792,0.018238207,-0.040278777,0.0062211026,0.002762849,0.014303666,-0.017909698,0.0018495349,-0.04545398,-0.050620884,-0.00040031908,-0.050946716,0.010008131,0.05362227,0.010896969,0.023365697,0.027850028,0.035101313,-0.033854175,-0.06193576,-0.011885612,-0.031370696,0.016508985,0.01211295,0.020860327,0.021151109,-0.042641737,-0.022029834,-0.028652925,0.018701985,-0.02004852,-0.021820096,-0.013919666,0.0067978525,-0.009311316,0.0012449573,-0.006247832,0.024801763,0.016395725,0.041601576,0.010722382,-0.0668407,-0.0036779712,-0.024200302,0.0088128,0.0050447946,0.013253374,-0.038409032,-0.076390855,0.008388283,0.036241762,0.022508394,-0.03299914,0.041774265,-0.0713674,-0.07264382,0.043900695,0.06958835,0.004846529,-0.0209167,-0.027657235,0.054957874,-0.04300321,0.028335318,0.006426117,-0.02291761,0.011895831,-0.009166759,-0.059423834,0.02713583,-0.008313041,0.008803751,-0.018325906,-0.032165095,-0.013545665,0.02730746,-0.024715569,0.0057566664,0.06304518,0.036975518,-0.009737943,0.012423718,0.054483093,0.05267658,0.012342575,0.047725618,-0.030605529,-0.029065156,0.012229272,-0.006414975,0.067230836,-0.009366277,-0.02617257,0.011391343,0.04303519,0.009222268,-0.00759855,-0.040004976,-0.03862127,0.04418722,-0.047940724,-0.01107779,0.024100564,-0.03993852,0.015143883,-0.038427822,0.069022916,0.010909949,-0.02508041,0.0344096,-0.03870587,-0.02447584,-0.06066613,0.056601845,0.038672317,-0.020336386,-0.030153852,-0.046226814,-0.0026112003,-0.004513362,0.03317789,0.007058923,0.046630215,-0.044311028,-0.05187202,0.05304961,0.0012715259,-0.0057804077,0.045543663,0.028319987,0.07036621,0.027557056,-0.008876244,-0.021157416,0.027878864,0.023228446,-0.0018725662,0.028066952,0.045383815,0.003961038,-0.017421316,-0.06653617,0.018878615,0.019430088,-0.032815326,-0.0028547358,-0.04229364,0.0057568783,0.04524645,-0.027854148,0.03226116,0.031416707,-0.093262635,0.011025828,-0.039791197,-0.0029164487,0.061558224,-0.0061229505,-0.017884301,0.004200522,-0.061253954,0.13573883,0.0029158976,0.011878102,-0.015348614,0.00022837368,0.0077048335,-0.03868695,0.04620337,-0.006482314,-0.07215694,-0.03022296,0.0017803016,0.0134481555,0.020776559,-0.010773011,0.011368839,0.011845464,0.01360606,-0.0003608594,0.022803646,-0.029147314,0.015289778,0.032501068,-0.009739309,0.036154803,0.016080562,-0.041160744,0.05187632,-0.01625798,-0.049981263,-0.0073063835,0.015550508,-0.00055753253,0.045699697,-0.018336108,0.025580963,0.075433634,0.0013732812,-0.061189946,-0.0035531248,-0.08892103,-0.0025402762,0.033077367,-0.057095546,0.029104415,-0.025106538,-0.042156834,-0.056177206,0.0066117644,-0.046195056,-0.021351688,0.053694878,0.042758375,0.025927857,0.0100801,0.029227687,0.020898106,-0.03918488,0.02029933,-0.048022147,0.03978573,0.017568048,-0.016666222,0.0060384874,0.0215309,0.020746412,-0.06615518,-0.0041890736,0.04273774,0.007857985,-0.00474767,-0.00474759,-0.06400949,0.008757158,0.034046624,0.09494434,-0.023846366,-0.023038799,-0.056892857,0.03452405,0.034822397,-0.0081353355,0.034644164,-0.023911355,0.023747556,-0.03472727,0.026949177,-0.036359776,-0.006806502,-0.007909939,-0.00078266894,0.045140322,0.025001338,0.01692593,0.0033184793,0.014610009,-0.0140136285,-0.011417558,-0.027295586,-0.00084447523,0.03346436,0.03858933,-0.08805764,0.017912058,-0.028254298,0.024174863,0.076039165,0.00016296815,-0.023080748,0.050691675,0.009898612,-0.051947966,0.026647402,-0.0014238004,-0.009143966,0.001261316,-0.046429303,-0.07197557,-0.02258375,-0.028009059,-0.033552893,-0.0010079794,-0.005006239,-0.00419676,-0.031491484,0.014823369,-0.024651852,-0.009111716,0.031420268,-0.03062403,0.030504694,-0.038095005,0.061745837,-0.06262295,-0.03801631,-0.032561205,-0.02745609,0.011320453,0.0278091,0.07670357,0.004054509,0.004933438,0.011200977,-0.04688699,0.012702884,0.085045695,0.024573443,0.022939991,0.022830743,0.057560556,-0.004354049,0.023428226,0.033066135,-0.0051361863,0.03255739,0.077303134,0.020838512,0.02801324,-0.0075646103,-0.057330247,-7.3121846e-05,-0.025963778,0.013969817,0.020374754,-0.009880627,-0.04358863,0.008964705,-0.02084676,-0.0020399794,0.020317486,-0.023302486,0.0176894,0.010148509,0.04220873,-0.018742232,-0.023350323,-0.004789296,0.03516811,0.07954788,-0.014649068,-0.017153136,-0.014186868,-0.0448286,-0.082800664,-0.005842193,0.008169449,-0.018105691,-0.01745202,-0.03615078,0.040439706,-0.045220345,0.017354997,0.0026155764,-0.03657333,0.04313316,-0.035911158,-0.013559192,-0.04625879,0.025305403,-0.02371945,-0.059035186]	\N	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
bfd0a52b-4b80-4774-aeb6-028096cfc7bb	1111	1763970310627.pdf	2087262	--- 페이지 1 ---\n10때 생활업종 선정\n한식음식점, 교습소.공부방, 미용실, 옷가게, 실내장식가게,\n편의점,생선가게,자동차수리점, 화장품가게, 헬스클럼\n*최근 기준 가맹점 수 비중 고려\n+\n슈퍼마켓,커피음료점\n*창업 성장세가 가장 가파름\nㅁㅁ 사업자 수로 살펴본 생활업종 전체 경제 규모는 2017년 이후 지속하여 성장하였음\n0 코로나19가 가장 극심했던 2020~2021년 기간 동안 생활업종 사업자 수는 오히려\n빠르게 증가하였음\nㆍ 지역별로는 경기도의 성장셰가 가장 두드러졌으며, 산업 대분류별로는 기타 서비스업의\naol 빠르 성장율 duns\nㆍ 기타 서비스업의 성장은 통신판매업 사업자의 빠른 증가가 가장 큰 요인이었으며, 피부관\n라임 및 eh 관련 Avie oe 성장도 AG\nㆍ Geel 규모 와대는 ARGS FAA LE\nㅁ 이러한 성장세는 2022년부터 둔화되고 있는데, 2022년 하반기부터 시작된 고금리의\namos 판단\n\n--- 페이지 2 ---\n10때 생활업종 선정\n한식음식점, 교습소.공부방, 미용실, 옷가게, 실내장식가게,\n편의점,생선가게,자동차수리점, 화장품가게, 헬스클럼\n*최근 기준 가맹점 수 비중 고려\n+\n슈퍼마켓,커피음료점\n*창업 성장세가 가장 가파름\nㅁㅁ 사업자 수로 살펴본 생활업종 전체 경제 규모는 2017년 이후 지속하여 성장하였음\n0 코로나19가 가장 극심했던 2020~2021년 기간 동안 생활업종 사업자 수는 오히려\n빠르게 증가하였음\nㆍ 지역별로는 경기도의 성장셰가 가장 두드러졌으며, 산업 대분류별로는 기타 서비스업의\naol 빠르 성장율 duns\nㆍ 기타 서비스업의 성장은 통신판매업 사업자의 빠른 증가가 가장 큰 요인이었으며, 피부관\n라임 및 eh 관련 Avie oe 성장도 AG\nㆍ Geel 규모 와대는 ARGS FAA LE\nㅁ 이러한 성장세는 2022년부터 둔화되고 있는데, 2022년 하반기부터 시작된 고금리의\namos 판단\n\n--- 페이지 3 ---\n3. 영세 개인사업자 및 양극화 현황\n- 영세 개인사업자는 2018년부터 꾸준히 증가하다가 2021년 정점 이후 감소하는 추세\n- 전체 가맹점 수의 증가 속도가 더 247] 때문에 영세 개인사업자 비중 자체는 2018년\n에 비해 2023년 더 빠르게 감소함\n- 영세 개인사업자의 평균 매출은 2020년 이후 증가하나, 전체 평균 매출에 비해 증가\nSEE 느림\n- 전체 생활업종 평균 매출과의 격차는 4천만 원에서 SAT 원 범위의 격차 존재\n138 3-1] 영세개인사업자 수 및 비중 추이(좌),평균매출 추이(우)\n생활업종 전체                     8053 기디자인\n= | |     Elm —\n전체 평균과 영세가맹점 평균의 격차가 전 업종에서 증가하여 양극화 수준 심화는\n생활업종의 전반적인 현상으로 판단\n	\N	2025-11-24 07:45:11.922764+00	f	05c8cab4-694a-48ae-9bfb-394f8dce13a9	[0.033620697,0.04511995,-0.07761745,0.027940677,0.079289995,0.034382436,0.014778997,0.038043693,0.048121244,0.028893849,-0.008289976,0.073697396,0.03562829,0.047266055,0.025596889,-0.04894914,0.035635907,0.026458457,-0.060725883,-0.027767725,-0.021848084,0.001332472,0.020796694,-0.0075099887,-0.02997899,-0.038890067,0.023696056,-0.020417973,0.005148724,-0.06316523,0.010542674,0.06049246,0.009467509,0.032785617,0.018658023,0.028184341,-0.005293131,0.019217044,0.0069584735,-0.08259747,-0.07714142,-0.0221555,-0.0018466081,0.03963367,-0.050034314,-0.085010104,0.028311847,0.017041696,-0.071152665,0.03715564,0.030731466,-0.031819496,-0.021538984,0.010915514,-0.039299317,-0.03953912,-0.031216793,-0.026086425,0.0416215,-0.011149245,-0.0648034,-0.0076612663,-0.011443357,-0.052121554,0.0036745672,-0.018334908,0.004048261,-0.007859396,-0.09468744,-0.041512225,-0.01751197,0.038666494,0.0051700072,0.016975567,0.03160988,0.042405955,-0.0012354346,-0.01444316,0.051708158,0.05281135,-0.030947464,0.0077405944,0.09632656,0.047331035,0.016242657,-0.027365575,-0.0046785185,-0.052406374,-0.06763236,-0.033096045,0.04559209,0.01934439,-0.05830168,0.030614518,0.07173264,-0.065264866,-0.086320184,-0.102237195,0.036418427,0.058065083,-0.004315912,-0.032849852,-0.03477809,-0.010102402,0.043820698,0.006046838,-0.040588424,-0.0357269,-0.121719286,-0.028381659,0.017970065,-0.0041443636,0.0081221005,-0.041900378,-0.005066281,-0.018783875,-0.043504342,0.017276341,-0.05452241,0.006272462,-0.034294456,0.013577744,0.010637649,0.027854936,-0.018816411,-0.018837327,0.010362674,-0.0068832706,-0.023241896,0.009208529,0.025233231,-0.0076352116,0.0057334946,0.015039739,0.0028766652,-0.04661018,0.030880114,-0.0030202852,-0.010765607,0.007649932,-0.0010438783,0.0034840072,-0.10542393,-0.0066399886,-0.025559116,-0.041646276,0.043041926,0.039828695,-0.018543132,0.02466738,-0.055299215,0.014230093,-0.020495113,-0.02308182,-0.0102399215,0.014075936,-0.0053242864,-0.078311294,0.078847684,0.02328901,0.03509554,-0.04852417,-0.0038852037,0.0053750356,-0.045799535,-0.041915257,-0.0008964319,-0.09960218,-0.027555171,0.019983958,0.0019988571,-0.015322495,-0.058512747,-0.016711561,-0.005679235,0.01956685,-0.008266697,0.015893662,-0.03578964,0.007248601,0.074675106,-0.0076538394,0.0074864496,-0.041131776,-0.018455964,0.014627029,-0.002761102,0.05779829,0.059594966,0.033438686,-0.0020265218,-0.026973458,0.028975023,0.026572376,-0.0329911,0.033264007,0.009633592,-0.02450074,-0.03227513,-0.072169244,0.01929164,-0.004477529,-0.025069186,-0.020817054,0.01714029,0.033827197,-0.037947,-0.02084502,-0.027174117,0.040267624,-0.054389656,-0.017566347,-0.0020739592,0.0020779406,-0.0145944115,0.008739185,0.051166542,-0.008099007,0.09937541,-0.052393105,-0.017165484,-0.012800969,-0.01697169,0.02904869,0.010934033,0.006150722,0.043916855,0.0044290107,-0.044636894,-0.029153727,0.016157907,-0.0114391465,-0.00076550414,0.037256096,-0.015282284,0.030414375,-0.030819966,-0.06744935,-0.029566092,0.04828639,0.03754144,-0.025364857,0.056593366,-0.047911298,0.01851308,0.02316382,0.04393529,0.001774913,-0.021545948,-0.009241922,-0.038161162,-0.031917028,-0.08962226,0.003989729,-0.04817686,0.0029466809,0.014223319,-0.05587555,-0.005376992,-0.024392053,0.016858011,-0.016101899,-0.0137709975,-0.04671054,-0.074984476,-0.07274018,-0.045421623,-0.05063886,0.03600222,-0.020785317,0.042795826,-0.06994318,-0.026797133,-0.021236815,-0.021495013,0.008550641,-0.0021632358,0.0042732083,-0.03353558,-0.054296616,0.011647081,-0.017580703,-0.047114458,-0.007338461,0.03845375,-0.042336907,0.013262783,-0.008915132,-0.035731815,-0.016278796,0.047803648,0.07125127,0.00903689,-0.06375701,0.05002066,0.020955408,0.050063964,0.008350851,-0.062854595,-0.01420328,0.03350253,0.010106843,-0.058117047,-0.012814469,0.010930432,-0.02879919,-0.026306089,0.025268586,-0.0036643776,-0.012975081,0.04849158,0.07293632,-0.043737378,-0.003035121,-0.017427893,-0.03588266,-0.12946567,-0.012433909,-0.029879954,0.023829572,-0.0517382,0.0190439,-0.049129367,0.022131272,0.03503251,0.012269027,0.0060881115,-0.006776995,0.019584224,0.022447553,0.025276594,-0.02839177,-0.013401091,-0.044748448,0.048657898,-0.01263351,-0.038435638,0.013431245,0.052429814,-0.0058634253,0.00021798605,0.042085845,0.03575756,0.038981646,0.052586716,-0.018941723,-0.011771782,0.0021472313,0.00030210477,0.004794239,0.047855593,0.006436331,0.029724542,-0.0039860117,0.02137551,-0.011912538,0.010158053,-0.0054107355,-0.04161616,0.006598688,0.013576665,0.030265965,-0.018085487,0.0351894,0.03287777,0.005952363,0.03442873,0.04217635,-0.031349476,-0.031195853,0.0111685945,0.023895033,0.022021672,-0.0067819343,-0.010547243,0.00239373,-0.029801233,0.032007292,0.0013408555,-0.05442417,-0.02845389,0.0023579644,-0.0035536955,0.02499371,0.0038487006,0.07969606,-0.053630766,-0.0014475564,-0.019717911,-0.010713706,-0.017537583,0.004731071,0.0041985586,0.0043624425,0.00939802,0.032508712,0.021906547,0.007367603,0.016572108,0.04855495,-0.004068309,-0.008478428,0.049203224,-0.029200515,0.019802943,-0.024985608,0.051844925,0.04950043,-0.03136759,0.027301906,-0.02487773,-0.025230115,-0.00064390915,0.0007854008,-0.050116997,-0.038467593,0.034103595,-0.003012276,0.0060293027,0.057589497,0.0015840065,0.0052226353,0.05068533,-0.0135422135,0.022420948,-0.04107291,0.00686721,-0.03321863,0.0018132705,0.025305245,-0.0070072887,0.046787146,0.01420638,0.029045926,-0.021453502,0.016151963,-0.01906863,-0.026586508,0.013029507,0.029268917,0.026047159,0.034560084,0.011396448,0.017673384,-0.0030119661,0.030905928,-0.0035128058,-0.024809433,-0.021600757,-0.039594676,-0.009448255,0.00051681197,0.0029704387,-0.042339645,-0.06675416,0.017331988,0.019367224,-0.00026286175,-0.0010116871,0.032671176,-0.06748712,-0.05545089,0.036215138,0.022923576,0.07948051,-0.046766806,-0.048432812,0.07468311,-0.011721038,0.03435658,0.048044976,-0.034225814,0.035843894,-0.020151982,-0.002051677,0.030799028,0.025388224,0.032718748,-0.005386297,-0.01833673,-0.05617584,0.031604894,0.0022113444,0.03222247,0.03410991,-0.016154971,-0.035996344,-0.02634711,-0.043365344,-0.020033676,0.06811591,-0.0015810855,0.0270214,-0.03257701,0.042187467,-0.025080137,0.070966765,0.06166375,-0.012590202,0.021095876,0.026600556,0.040819786,-0.01663218,-0.0032018758,0.021682967,0.04082084,-0.026130201,-0.04965548,0.045267005,0.057411138,0.025606425,-0.016279802,-0.029624972,0.022163419,-0.05861264,0.046878908,-0.05487618,0.04396537,-0.031476106,0.063277155,-0.027855095,-0.03923207,-0.010327311,-0.023784736,-0.012673701,0.01425029,0.055816725,-0.012833449,0.033474546,-0.038608313,-0.07884466,0.057994302,-0.011207682,0.023720302,0.011940046,0.047249775,0.021671815,0.037010957,0.040651295,0.00064342964,0.017698407,0.049455877,-0.01168924,0.037782807,0.08144271,0.017552981,-0.000762455,0.03366776,-0.041923337,0.025576329,-0.0016888686,-0.006310535,0.01734189,-0.006787964,-0.008893453,-0.010391635,0.07063592,0.037170246,-0.06096109,-0.0010320566,0.011054573,-0.04291335,0.016285062,-0.02169796,-0.026791615,-0.023820115,-0.02513924,0.047581226,-0.072369084,0.0047508636,0.029518422,-0.0069931024,0.013951458,0.0031939445,0.04143519,-0.06827252,-0.058455374,0.0032067227,0.014387148,0.0114577,-0.02965057,0.013629486,0.059300993,-0.03710871,-0.034159407,-0.058448233,0.013437604,0.008095909,0.004984655,0.04989962,0.0065626916,-0.01949431,-0.015779274,-0.063123405,0.056094572,0.0092220055,-0.0075251833,0.029346695,0.019867068,0.011962552,0.011873393,-0.017618679,0.009106073,-0.03549104,-0.014361261,-0.070168525,-0.007861058,-0.06139241,-0.018081488,0.016001679,-0.03744335,0.059026785,-0.020990621,-0.009014597,-0.06757476,0.0043418645,-0.060564358,-0.01002046,0.005391625,0.0303748,-0.007551926,0.018274479,-0.04287074,0.014679826,0.0009983485,-0.03105284,0.02318268,0.0051645814,-0.002126658,-0.0032375585,0.01755068,-0.018693844,0.016666716,0.011421743,-0.011255732,0.012163517,-0.020068271,-0.02470208,-0.016662689,-0.08728041,0.027469447,0.058209706,0.076767646,0.0036965143,-0.028333317,0.0044660396,-0.043954864,0.03672431,0.0050696717,0.03262453,0.02307874,0.03227102,-0.03432594,0.021789039,-0.0010416639,0.009177069,-0.023416612,-0.060762014,0.026860243,-0.0075510107,-0.085422024,-0.018380307,0.050134335,-0.0051046703,-0.044215094,-0.04682631,-0.028697053,0.0055495473,0.023688497,-0.053300753,0.036835622,-0.026668204,-0.003508073,0.06924839,0.01923993,-0.015367888,0.026849056,0.036518287,-0.06527223,0.029812537,-0.0022790793,-0.039203614,-0.008578611,0.0018891738,-0.012116246,-0.023993198,0.062787205,-0.0053314767,0.028976604,0.023214731,-0.014925454,-0.0370815,-0.018873593,0.012045267,-0.026610158,0.06325349,-0.0044060643,0.0008347288,-0.034654416,0.0044274903,-0.017316421,0.010991388,-0.011301518,-0.04023379,0.0030944028,0.0057791476,0.06288849,0.014839302,-0.022458158,0.01694377,-0.027520949,0.03102383,0.07815861,-0.027368365,-0.011496205,0.032572288,0.017388081,0.031243932,0.017832015,-0.0067068576,0.07609545,-0.0312137,0.09600742,0.057859913,-0.009048959,-0.0012106574,-0.054436732,0.037576307,-0.04850668,0.035135422,0.031174518,-0.0058353078,-0.014354175,-0.009379287,0.0013969709,-0.03556922,0.028011553,-0.0047000195,-0.028888574,-0.021618394,0.030204855,-0.013445333,-0.045684032,-0.028971558,0.00013107211,0.05787835,0.017114548,-0.03316946,0.024868088,-0.007859333,-0.072211936,-0.002547825,0.016092679,-0.012888615,0.06309834,-0.034683835,-0.0029329888,-0.05065955,0.0641599,-0.025608985,-0.039219413,0.0059975153,-0.07466067,0.047578327,-0.018671896,0.0055170516,0.10003497,-0.04717794]	3f9ccd94-e6d6-4267-a156-434186524ac9	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3
421e86eb-b1fb-4d98-a0c6-75c3b2aed6d3	0000	1764057115395.png	73550	[최초로 보낸 기관]\n\n효자동\n수신 종로구청장(행정지원과장)\n(경유이 문서의 제1차 경유기관의 장은 종로구청장이고, 제2차 경유기관의\n장은 서울특별시장이며, 최종 수신기관의 장은 행정안전부장관입니다.\nHg ocococ0o0 0000000000000\n(브룬 내용)\n\n효자동장\n\n1차 경유기관 처리 예시]\n\n종로구\n수신 서울특별시장(행정지원과장)\n(경유)이 문서의 제1차 경유기관의 장은 종로구청장이고, 제2차 경유기관의\n장은 서울특별시장이며, 최종 수신기관의 장은 행정안전부장관입니다.\nMe 경유문서의 이송 … ~ 0\n(보문 내용)\n붙임 1. 시행문(효자동 경유분서) 1부.\n\n2. 의견서 1부(있는 경우어만 첨부. 끝.\n종로구청장	\N	2025-11-25 07:51:56.896724+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	[0.032057166,0.0959311,-0.04814357,0.0064866184,0.027032735,0.026763482,0.062693134,0.05125554,-0.038729217,-0.01324705,-0.03713271,0.05354166,0.04052095,0.008951731,0.0035961254,-0.07713996,0.04069953,0.007605666,-0.077324614,0.05227362,-0.031219875,-0.014667806,0.06616846,0.032307323,-0.010334442,-0.060568493,0.001599114,-0.025063163,0.017278029,-0.034209233,0.05520415,0.052613955,-0.014312478,0.04533078,0.04840593,-0.015643343,-0.016422978,0.08172047,-0.02387568,-0.09191348,-0.011984942,-0.025645854,0.054852594,0.01239025,-0.039370056,-0.014909599,0.024831943,0.0089978,-0.069234125,0.042383667,0.045555115,-0.004157418,-0.04783501,0.0059872754,-0.027634712,-0.0052748066,-0.03288284,-0.014783951,0.072433986,-0.018177124,-0.06235324,-0.012224513,-0.011324074,-0.04312815,0.022199586,0.015184938,-0.012793365,0.007307188,-0.073103525,-0.007103423,-0.00027634326,0.051004957,-0.005894842,0.020214314,0.050834827,-0.039326124,-0.022431096,0.01813002,0.03735364,0.04237212,-0.07640474,0.019670865,0.04081012,0.08855544,-0.0029667153,0.035530273,0.02177892,0.0018270266,-0.020649908,-0.01800576,0.07263428,0.016065462,0.009034769,0.023883391,0.083906814,-0.037875786,-0.0815308,-0.112402864,0.013362073,0.056281783,0.04133618,-0.010085804,0.004403369,-0.01735661,0.028665833,0.025635704,-0.024377206,-0.03479966,-0.09457734,0.004369944,-0.019850304,-0.047262628,0.05107567,-0.041911874,-0.008599112,-0.04019856,-0.031183552,0.04402843,-0.053210277,0.009566199,0.0011695988,0.0070953635,-0.028380552,0.003917199,0.045725066,-0.050429765,-0.009462366,0.028874245,-0.03243331,0.023599006,0.042231273,-0.058415562,-0.0022395768,0.06839018,0.022904787,-0.022452706,0.012554544,0.0031406865,0.01349828,0.009652048,0.012948961,-0.034927595,-0.07346987,-0.008790457,-0.013636768,-0.017431093,-0.005431744,0.041191842,0.006375213,-0.011672786,-0.07449764,0.024584306,0.020458011,0.030646218,0.006758351,0.000396465,0.0072501358,-0.03378982,0.010736747,0.004164365,-0.027500829,-0.031880967,0.021786736,0.043437872,-0.0865244,-0.06295686,-0.029637566,-0.07861932,0.050927892,0.025807226,-0.019339941,-0.018302614,-0.027715784,-0.06315428,0.018757707,0.018149253,-0.017338721,0.0034028199,-0.045269545,0.039609928,0.046249043,0.014929644,-0.047469635,-0.03295801,0.026288418,0.0143332025,0.029121414,0.034592967,0.034192953,0.07222247,-0.012161329,0.0005525849,0.01601236,0.036198057,0.021716652,0.038663767,0.019922411,-0.023768408,-0.021877287,-0.033626515,0.023887444,0.011749709,0.050083287,-0.024878308,0.040876213,0.03222067,-0.029147137,-0.017736917,0.021881433,0.012542749,0.023320269,-0.03941659,0.018836971,-0.036640823,0.007194887,0.033209305,0.09145639,-0.032910816,0.07370496,-0.004138539,0.0026015867,0.014292085,0.009420843,0.060300842,0.008434888,0.0045881197,-0.0030797091,0.005775184,-0.004077125,-0.018719027,-0.016887339,0.014586422,0.022735571,-0.02836045,-0.05339027,0.041540846,0.008610974,-0.071774885,-0.06178725,0.03097293,0.018774837,-0.008867066,0.07100864,-0.02864784,-0.0010761472,-0.04637642,0.04790572,-0.0056875115,-0.012896045,-0.055918396,-0.049917083,-0.019502783,-0.0063908324,-0.033973016,-0.035246,-0.019202573,0.060357895,0.004943181,-0.005880289,0.015553884,0.022720259,0.0015390594,0.030533284,-0.030980652,-0.04728308,-0.062968425,0.008346327,-0.0011526273,0.011480278,-0.038149502,0.0037642512,-0.07318491,-0.03775364,0.006818414,-0.06423967,0.051109318,-0.026820699,-0.0017784911,-0.02561059,-0.060364187,0.01835359,-0.0034711028,0.011791503,-0.011162155,-0.022587825,-0.06329537,0.032867335,0.010210506,0.0062263943,-0.0031880776,0.021267952,0.11122253,0.016512278,-0.07671994,0.07378523,0.010201227,0.04596739,0.025350364,0.01607624,-0.046981238,-0.010004918,0.043456946,-0.032368172,-0.016319007,0.009146636,-0.0058855447,-0.0055403896,-0.029055825,0.016696805,-0.016689595,0.023017509,0.081089355,-0.03209426,0.018513173,-0.009105836,0.019880634,-0.10661493,-0.00843915,-0.035271727,0.016165156,-0.020178488,0.015519511,-0.0687166,-0.014729451,0.05159994,0.020040717,-0.004185203,-0.01959341,0.028991418,-0.005770175,0.028010111,0.01427146,-0.04035017,-0.026991548,0.041668687,-0.019047769,-0.042631835,-0.017040031,0.037263405,0.06272604,-0.008512341,0.036300853,0.024921007,0.03282057,0.0035039475,-0.054431103,-0.029069753,-0.032096777,-0.004188518,0.008301115,0.06461133,0.013414291,-0.050420888,-0.04166274,-0.044210948,0.039662518,0.014358407,0.017736545,-0.023956519,0.003388607,-0.013734855,-0.010883467,-0.01323812,0.0525579,0.013714435,-0.024459112,0.010940885,0.020787915,-0.022179447,-0.03429625,-0.02552789,0.013495463,0.0079020895,0.019260086,-0.0180306,-0.022973312,-0.009198666,0.020683045,-0.0007050285,-0.028949035,-0.050891742,-0.0310446,-0.042499434,0.04360286,0.0029561082,0.080105245,-0.08308294,-0.017751854,-0.005970452,-0.032101862,-0.030803122,0.031819914,0.031718627,0.03201414,0.070592776,0.031483475,-0.0032361564,0.037761454,0.010556429,-0.02630634,-0.032255653,0.017532919,0.08305387,-0.019874988,-0.021737026,-0.025839305,0.055354957,0.0052399174,-0.012701137,0.06406299,0.008168307,-0.00096098223,0.006608633,-0.0071491273,-0.03021359,-0.023415979,-0.043701027,0.00072984205,0.038955778,0.018733697,0.004280712,0.033123106,0.06343072,0.05668244,0.0006590479,-0.042673662,-0.015207835,-0.023873573,0.0026448653,-0.030724898,0.00814825,0.030274283,-0.020536728,0.010749846,0.06342271,-0.018522404,-0.034526885,-0.028771864,-0.008954206,0.03207788,0.022351144,0.027896341,0.045206193,0.008677004,-0.016430555,0.008497652,0.013127347,0.010802318,0.0060226163,-0.048060086,0.0024580394,0.0007793933,0.016797539,-0.026803512,-0.10257305,0.024809532,0.012499008,0.082548395,-0.018971462,0.06669884,-0.06521798,-0.00271145,0.03553547,0.0120920045,0.0324883,-0.021758584,-0.0519467,0.019531853,0.020652601,0.028152645,0.054914106,0.011554415,0.018597469,0.0025849016,0.015426734,0.0030951826,-0.01421419,0.02921668,0.006233001,0.03733523,-0.019002909,0.0350593,0.031830095,-0.019045394,0.0652086,-0.043263685,-0.037010588,-0.03333493,-0.03103624,0.008391088,0.08896548,0.034049783,-0.007610409,-0.032461256,0.022211548,-0.0021850108,0.005545538,0.025566742,0.006899013,0.01379071,0.06582213,0.0071868864,-0.01449355,-0.04209587,-0.0016280579,0.059937436,-0.04125914,-0.05567606,0.032111958,-0.007018163,0.03294159,-0.008924127,-0.00036227444,0.033785593,-0.013625586,-0.023238221,-0.04201023,0.007847187,-0.0187144,0.038700476,-0.022187745,-0.0056570526,-0.018634507,-0.00088467065,-0.030986166,0.025238747,0.021495637,0.026940767,0.031606693,-0.035712183,-0.060962047,0.07729445,-0.030261423,0.038866136,0.038237017,0.102387026,0.01137742,0.016495883,0.045190718,0.017860701,0.03476793,-0.0009094806,-0.020615174,0.018561222,0.020482369,0.0144325495,0.009996327,0.02694565,-0.00534531,0.08672433,-0.025155934,-0.023104366,-0.039075375,0.04773306,0.005822365,0.0060738134,0.015582579,-0.0036329357,-0.03431586,-0.0014125529,0.019080225,-0.025706787,0.019355498,-0.03245714,-0.0032203668,-0.0028377457,-0.015890328,0.06034309,0.015622703,0.025424823,0.023055173,0.012536578,-0.020390792,-0.0016476914,0.050761178,-0.017111072,-0.056884293,0.0038734898,0.024567321,-0.019677375,0.013266683,0.02925037,0.088813506,0.005288587,-0.030148234,-0.010315887,0.024142848,-0.0137679465,0.006438833,0.035574645,-0.02591645,0.050872914,0.03538285,-0.03689087,0.028861905,0.016485436,-0.02113698,-0.08119368,-0.0044227154,-0.029944574,0.01459571,-0.039725997,0.027079614,-0.0104268305,-0.0013945245,-0.059328824,-0.04958484,-0.07279199,0.02553077,-0.003818812,0.0043830643,0.04956133,-0.060895223,-0.05453769,-0.06417282,-0.009491555,-0.03484551,-0.014473188,0.024969913,0.05545306,0.0037169752,0.025215372,-0.011335779,-0.04000311,-0.050167564,0.02223387,0.042006887,-0.03590962,0.027634349,-0.019693851,-0.0044484753,0.022506392,0.01043986,-0.01888392,-0.021838812,-0.012718082,-0.00217368,-0.0060093114,0.012477181,-0.08071437,0.06464069,0.07469661,0.08770146,0.012448167,-0.044990547,-0.009063797,-0.024203103,0.041723505,-0.0041722488,-0.006280241,-0.016402965,0.0020861847,-0.029032234,0.019388888,-0.027639061,0.022355672,0.04871664,-0.02497316,-0.0097799655,0.03949358,-1.85803e-05,0.011191288,0.05813862,-0.0024936656,0.00073167036,-0.0417765,-0.033779833,-0.019247796,-0.0009826977,-0.055948827,-0.03871719,-0.028849537,-0.019516049,0.09218738,-0.037752304,-0.03617013,0.002661376,0.052151855,-0.048120573,0.026190862,0.03872832,0.016901549,-0.043343488,-0.020532003,-0.024075102,0.0030056846,0.016783448,-0.021568753,-0.004558276,0.026684105,0.026750805,-0.03128061,0.0017476104,0.04113393,-0.033882212,0.05025317,-0.04473404,0.01424377,0.0116455,-0.018446287,-0.03472822,-0.008744022,-0.025864568,0.010825584,0.025548728,0.021685382,0.05872221,0.033401363,0.0052140937,0.010444497,-0.043603115,0.03488007,0.053618245,-0.016799357,-0.015701357,0.010239604,0.047692306,0.0020597149,0.0061344397,0.013027126,0.032736707,-0.05059975,0.038397644,0.013718594,0.035834804,-0.013203166,-0.040812846,0.034026153,-0.08280986,0.022102244,-0.035104875,0.021955347,-0.030968463,0.0030406122,0.0108857695,-0.013991921,0.0048962515,-0.03542569,0.0023738642,0.009804341,0.030586509,0.013087123,0.016231818,-0.034491524,0.009236662,0.04840527,0.007773902,-0.0005796754,-0.017104013,-0.0144036515,-0.09100386,0.014859017,0.031878024,-0.02933326,0.031428672,-0.030680712,-0.019780781,-0.06147445,0.010037896,0.006783286,0.007174533,0.046487533,-0.055286758,0.016152427,-0.06337529,-0.027352791,0.07176172,-0.055282194]	3f9ccd94-e6d6-4267-a156-434186524ac9	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f
6ddfeaa4-c01f-492e-be75-6821322e3808	스크린샷 2025-11-27 153109	1764225106027.png	4515	검색 테스트\n김철수 사원의 연봉은 9000.\n김철수 사원의 입사일은 2025.11.11	\N	2025-11-27 06:31:48.521484+00	f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	[0.06389666,0.058288015,-0.040531784,-0.0070590964,0.048916645,0.074904636,0.0007489732,0.022221759,0.030681642,-0.026899321,0.008322428,0.012485843,0.040402763,0.0003419307,-0.012714269,-0.050292235,0.0354802,-0.031904344,-0.08956464,0.0010209435,-0.036982156,0.018115869,-0.010463068,0.0465466,-0.03436394,-0.028549815,-0.028626423,0.0084169125,0.021512816,-0.043144565,-0.0044948882,0.059876636,0.005740495,-0.015252181,-0.017820673,0.044527024,0.013854008,0.058020327,0.04566141,-0.10134892,-0.016797608,0.012205502,0.01022576,0.057043742,-0.032268323,-0.030728163,-0.047701146,-0.01009382,-0.035190843,0.002828688,0.05453933,-0.04386041,-0.02711233,-0.034536704,-0.070143014,-0.028464904,-0.015064857,-0.014049859,0.058770023,0.028695863,-0.020148978,0.0106010465,-0.032495983,-0.041615594,-0.0100011425,0.0028707623,-0.022071913,-0.04169614,-0.08899504,-0.0053660073,0.0035588618,0.02427507,-0.033652,-0.00022669064,0.043906108,0.0014004895,0.014784233,-0.007443516,0.06680388,0.083346255,0.0046560606,-0.015853819,0.034667205,0.025788335,0.010186276,0.013983074,0.034782216,-0.028804341,-0.06086776,-0.04633986,0.02914983,0.034925256,0.015179858,-0.01073853,0.099976666,-0.021813942,-0.011293649,-0.12069903,0.08159163,0.028990606,-0.02243639,-0.004505903,0.051900152,0.020790305,0.024600077,0.02520738,-0.04349325,-0.022156525,-0.07327165,-0.027207399,-0.029664904,0.017901465,0.015588348,0.058640726,0.024144178,0.04936602,0.042764023,0.058223065,-0.027345184,-0.017153991,0.044180628,0.0049995524,-0.014790248,0.032331444,0.0055623287,-0.026358465,-0.06963628,0.025233641,-0.04509654,0.0681943,0.0060096905,-0.044951733,0.0423387,-0.001901299,-0.062402684,-0.01297391,0.029346699,0.03413347,-0.028887395,-0.025925018,-0.013917447,-0.0083144475,-0.052941665,-0.004030367,0.013324031,-0.0203221,0.005142572,0.083785996,-0.019548347,-0.0026609867,-0.034548115,-0.0043370826,0.037098955,-0.037417885,-0.03360576,-0.013098531,0.015802326,-0.027680492,0.002723404,-0.012855945,0.009533295,-0.07005814,-0.007492649,0.057268195,-0.03940805,-0.01760802,-0.04717229,-0.052877977,-0.0085863,0.019278856,0.0028171875,0.00987239,-0.039354436,-0.029266987,0.015978359,0.0028232124,-0.0077915015,-0.02485239,-0.056016408,-0.022887323,0.051528025,0.031822816,0.02157867,0.02241745,-0.040464275,0.052122965,0.077182084,0.07246893,0.06438507,0.05910486,-0.010598677,-0.01376063,-0.02782313,-0.0064228754,-0.039750792,-0.022427484,0.013547829,-0.043399077,-0.010157387,-0.08317703,0.0030129687,-0.0036522707,-0.009681488,0.0024156098,0.01702666,0.012194934,-0.05222018,-0.061981145,-0.005662898,0.054952804,-0.03248713,-0.012066171,0.047559667,-0.019671472,-0.03341823,-0.01965757,0.070363015,0.026150845,0.08317629,-0.027517373,0.0148875825,-0.0036022104,0.0017599894,0.022803787,0.05198387,-0.022523241,0.03097439,0.02851564,-0.018421857,-0.03902933,0.030046647,0.02312407,-0.011109822,0.025272971,-0.021837393,0.08966089,0.029998815,-0.0023938057,-0.036860913,-0.0038032949,0.03992898,-0.038889103,0.04344345,-0.025851607,-0.013733998,0.03298105,0.011797595,-0.012136983,0.0052889944,-0.04189452,-0.019637112,0.00855733,-0.011159245,0.04235634,-0.019325925,-0.015809577,0.03999542,0.033663865,-0.009836918,0.0057876417,0.048480377,0.008514886,-0.014283319,0.008447422,-0.06292171,-0.0963323,-0.038720537,-0.028382637,0.010146941,-0.07245233,0.05462087,-0.052838687,-0.07549767,-0.004434088,-0.056845535,0.008626622,-0.011495187,0.014780275,-0.04445159,-0.07370945,0.025632659,0.04316692,-0.024740614,-0.028135097,-0.010863067,-0.05570324,-0.017797012,-0.015564996,0.011947972,-0.02900972,0.017411705,0.10230113,-0.009670469,-0.054016434,0.07832162,-0.009365269,-0.018871093,0.05200933,-0.04685895,0.042246673,-0.024671452,0.06392317,-0.009044048,-0.037770852,-0.0067789597,0.0011320097,0.012754112,-0.022869386,-0.048180636,-0.023802942,0.0405778,0.0497947,-0.037555043,-0.051969357,-0.030699512,0.02347318,-0.08588729,-0.012710271,0.009982455,-0.023345634,-0.015344257,-0.0116521865,-0.04174493,-0.010473514,0.017896432,-0.0065808706,0.03505382,0.03742743,0.040914044,-0.02541919,0.05059487,0.035006464,-0.013592169,-0.031971768,-0.020555478,0.053277247,-0.07027678,0.04918093,0.013340009,0.0020442791,0.02456957,0.013439855,-0.0009008888,0.030110406,0.0249106,-0.034869935,0.025717914,-0.013108863,-0.027801448,-0.015520153,-0.027886705,0.017828805,0.0021536897,0.010309345,0.017208973,0.00702766,0.02347525,0.0034804621,-0.014067612,0.0078089396,-0.0042475522,0.080060855,0.01482576,0.020704437,0.010384346,-0.029526228,0.062259976,0.048159037,-0.054350108,0.04885323,0.0035603114,0.03032315,-0.0114678275,0.0079991,0.025004439,-0.042680886,0.020622673,0.016875155,0.057139374,-0.08131786,-0.032818135,-0.008369403,-0.024245093,0.04702825,0.01893191,0.028517935,-0.04706435,0.022437612,0.009608504,0.02787547,0.00029817704,0.008032597,0.005292952,0.02197532,0.041866023,0.059446115,0.04503952,0.028393319,-0.0028440647,0.027132705,-0.007087105,-0.009851498,0.108478025,-0.03283223,0.0019013833,-0.014882028,0.046955626,0.007824566,0.00021880888,0.006202003,0.005813851,-0.036235306,0.009299343,-0.01512338,-0.013576513,-0.02190223,0.013582901,-0.059197664,-0.021224618,0.050848898,0.036825072,-0.006783305,-0.0029549832,0.009341857,0.0009882714,-0.07082347,0.0019069752,-0.0037620487,0.00067808054,0.010342191,0.0029075958,-0.0048904633,-0.014460654,0.016354617,-0.023641912,0.017974606,-0.0056875423,-0.041492693,-0.0036471854,-0.0032597035,-0.027097814,0.018714065,0.03436013,-0.02240045,-0.0019314644,0.013406817,0.02559372,-0.039612375,0.021868745,-0.006931964,-0.014766285,-0.0042089447,0.023301274,-0.061300073,-0.015014917,0.03925507,0.026104787,-0.0024635098,-0.04586415,0.049094312,-0.028113011,-0.0062347474,0.027507288,0.089897715,-0.0035977566,-0.021739598,-0.0059504304,0.020126013,-0.04156437,0.008880018,0.064511694,-0.0018590351,0.01369822,-0.04851294,-0.04751031,0.028057285,0.0012802632,0.01724546,0.003680914,-0.03503362,-0.045439266,0.02487903,-0.04677814,0.022574,0.06660685,0.026066696,0.0048159882,0.010715422,0.0049718404,-0.0009883086,0.05667455,0.023759693,0.019519906,-0.060440406,0.003321308,-0.045932814,0.06558549,-0.02807733,0.007721207,0.04742853,0.021731684,-0.0015173046,-0.011969601,-0.04822614,0.0072790817,0.0410669,-0.01585407,0.00069940905,0.062419318,-0.018249089,0.015324794,0.006249627,0.0031916848,0.022381015,-0.027155906,-0.016174467,-0.108187094,-0.0121996645,-0.013760647,0.08199059,0.043501392,-0.043235455,0.02577156,-0.033790387,-0.007375296,0.022738336,-0.0014954442,-0.018608509,0.03379165,-0.04645162,-0.006260175,0.0568305,-0.014664759,0.028437158,0.02944152,0.058875225,0.030196847,0.026129786,-0.013546325,0.03366591,0.053016897,0.06540107,-0.00023556786,0.008647073,0.055253454,0.039808046,0.010152221,-0.04488166,-0.0074990164,0.0593586,-0.04976381,0.008735757,-0.050532408,0.015775729,0.049990945,-0.03475694,-0.013670296,0.011173699,-0.08048078,0.0011793242,0.01634565,-0.0031464756,0.029573832,0.02913985,-0.023232576,0.0028720393,-0.02524772,0.06474019,-3.960896e-05,-0.031316396,0.011781539,0.015132709,-0.029318374,-0.01937897,0.05116214,-0.007821232,-0.07698994,-0.001710233,0.031901155,-0.01891987,0.024850708,0.015249469,0.03727556,-0.03262876,0.0030490481,-0.034168627,0.025903247,-0.0027258273,0.029260347,0.04179294,-0.03780431,0.0009218961,0.042740233,-0.044940803,-0.0050178054,-0.040130068,-0.057143837,-0.008802638,0.034436777,-0.030920446,0.054140665,-0.035771586,0.011328891,0.031083759,-0.027878651,-0.054407254,-0.02340523,-0.040376917,-0.00086547964,-0.018720357,-0.03581723,0.02237702,-0.03722153,0.010730104,-0.028893407,0.06923566,-0.045540906,-0.029719526,0.027330117,0.015233417,0.033472463,0.0402161,0.0036538588,0.00348865,-0.074414924,0.03489375,-0.011280308,-0.011436628,-0.007162421,-0.0027004017,-0.02557848,0.019103633,0.041305188,-0.014184735,-0.015081527,0.025979923,0.022413107,0.012047226,-0.017987242,-0.041002255,0.028305722,0.028125007,0.07701417,-0.018015517,-0.014679984,-0.06585105,0.0072048474,0.068019845,0.054789674,0.04963546,-0.00271735,0.07138847,-0.07042587,-0.010856217,-0.062261965,-0.025028292,-0.054368407,0.021228496,0.029302614,-0.007702303,-0.065960385,-0.0015772585,0.021609195,0.029722435,0.0019929209,-0.028784053,0.001378734,0.045865268,0.020293074,-0.058111086,-0.017167501,-0.06192127,-0.0195875,0.05183029,0.043826595,-0.008758627,-0.0023541937,0.0014983197,-0.048587125,0.02247907,0.01852319,-0.035469886,0.011396173,-0.039686475,-0.045715094,0.021046236,0.011249133,-0.046324756,-0.011508571,0.06271263,-0.010217774,-0.00054423214,0.018965822,0.011641262,-0.052121043,0.05653878,-0.036203224,0.022746103,-0.025032131,0.06367605,-0.03354927,-0.055513676,0.007909399,-0.033808388,-0.010769447,0.049267393,0.0040374002,0.005416698,0.018945761,0.009412343,-0.05456796,0.038248066,0.0708854,-0.019818952,0.02161826,0.012988766,0.03242035,-0.04630785,0.010667013,-0.006063917,-0.010908451,-0.04514915,0.085655525,0.044656903,0.040260796,-0.009984319,-0.030415999,-0.013860391,-0.029252492,-0.007954674,0.019046988,-0.016467601,-0.041960746,0.048144117,0.009960663,-0.026567364,0.055226583,-0.06685816,0.015286553,-0.03080649,0.013069955,0.012457059,-0.0183543,-0.0052373256,0.037289318,0.05519884,-0.0024818222,-0.005428197,-0.024234118,-0.025133211,-0.07076885,-0.003590325,0.0511548,0.013572759,0.044823352,0.004147162,0.030570785,-0.032289892,0.04038466,-0.012502255,0.0014884503,0.06134855,0.004688071,-0.025517497,-0.034817904,0.02323246,0.02642497,-0.051052865]	3f9ccd94-e6d6-4267-a156-434186524ac9	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f
043f5d73-c4fe-49b9-8a33-b76a13036a80	index002	1764315159507.png	182293	[별점 1】\n응 시 원 서(원본)\n본인은 한경대학교 육아휴직대체 기간제근로자(간호사) 채용시험에\n옹시하고자 원서를 제출하며 다음 사항을 서약합니다.\n_ 아래 기재사항은 사실과 다틀없으며 만일 시험결과에 부담한 영향을 끼칠 목적으로\n허위사실을 기재하였을 때에는 관계법령에 의거 담해시험이 정지 또는 무효가 되고\n향후 5년간 옹시 자격이 정지되머도 이의들 제기하지 않겠습니다.\n2020년   월    일\n한경대학교총장 귀하\n|                성명\n|             간호사     |\n| 융시직중 mse        |\n|\n생년월일           성별                 ㅣ\n1, .®       )                          |          |\n전자우편 |               EFS)                        |\n전 화                휴대전화|                        |\nCEE  음 시 포(한경대학교 484%)\nTET\n#448 | Gime |"                         |\n| 생년월일             aw |\nES J SL A   월 일\n|              한경대학교총장 @\n주 의 A 항\n먼점시험탕인은 SAE, 신분중을 지참하고 시험시작 30문전까지 지정된 장소로 입신하여야 합니다.\n우편 전수자는 면점당일 응시표틀 베무합니다.\n[ 보완사항 ]  _ _ 름68) 원 일까지 보완하여야 합니다. ㅣ\n7	\N	2025-11-28 07:32:39.471557+00	f	ed15289a-165d-4768-b160-6ed4bf180bf7	[0.014674104,0.04621046,-0.03138397,-0.006923365,0.053463697,0.034204092,0.028107395,0.00030388092,0.005971182,0.027343411,-0.006488034,0.04619989,0.032139156,-0.012472578,0.0478552,-0.07392533,0.023432767,-0.0011609835,-0.06875549,-0.033781335,-0.03155193,0.0031856997,0.05083304,0.03190441,-0.04284056,-0.034660872,-0.0113111185,-0.013076349,0.024473682,-0.026628092,0.051894296,0.01719712,-0.036335237,0.044499494,0.016550902,0.019436043,0.0018249451,0.030356308,0.0124755185,-0.07141281,-0.051231142,-0.039940678,0.0005759479,0.022514872,-0.03528586,-0.042710707,0.037843607,-0.010808159,-0.06149558,0.027873434,0.010108863,-0.027620308,-0.03848857,-0.009023396,-0.042815614,-0.026682205,-0.015113151,0.009048739,0.0921347,-0.042572606,-0.052479472,-0.0053145452,-0.04668637,-0.026286202,-0.016901692,-0.0106228525,-0.019971445,-0.0036731388,-0.08114651,0.00047401048,-0.03720495,0.044308987,-0.019799631,0.032697782,0.035452202,-0.018832203,0.030987972,0.006931649,0.03859728,0.07112938,-0.030592179,0.02393995,0.08578095,0.05741362,0.0009663714,-0.0022336962,-0.018658048,-0.023475789,-0.050450325,-0.03324006,0.031921744,0.018727206,-0.035812974,0.05199114,0.09921973,-0.02476883,-0.056157388,-0.16434488,0.041005205,0.055100888,0.004147123,-0.014693691,-0.02283783,0.0148429,0.053307746,-0.005643404,-0.03280232,0.0076753125,-0.13093941,-0.002408306,-0.019327622,-0.05149292,0.017747093,-0.04890576,-0.002193642,-0.020246541,-0.034954544,0.0035797835,-0.033920765,0.010184115,-0.016055714,0.01297025,-0.006127157,0.010765349,-0.003892519,-0.017088078,-0.0133126015,0.021574339,-0.0038619903,0.034037832,-0.027765037,-0.008634762,0.028909225,0.020052819,0.011208875,-0.028654354,0.049691673,0.033749253,0.0026475103,0.028106056,-0.009206357,-0.011595727,-0.06310863,-0.014064151,-0.035546444,-0.031601097,0.047629453,0.036666904,-0.011137444,-0.005366728,-0.09862611,0.0085981125,-0.010624824,-0.014502125,-0.017376173,0.019431872,0.01306293,-0.054414526,0.05710096,-0.024560742,0.029528111,-0.025453448,-0.00038302646,0.041523524,-0.039548934,-0.08199335,-0.02643768,-0.09508596,0.00049910333,-0.013243882,-0.038540825,-0.041611515,-0.06634216,-0.028439708,-0.0031472794,0.024138395,-0.009299676,-0.037693545,-0.042221956,0.031739518,0.010198584,0.024372265,-0.001801785,-0.011966114,0.010186908,0.00718457,-0.0039286823,0.062314566,0.013978704,0.07498848,-0.025065813,0.04668743,0.06859383,0.014698618,-0.0028457947,0.055954766,0.032774724,-0.029878754,-0.03711379,-0.055912953,0.028535651,-0.03257562,-0.024071885,0.010668528,-0.015081703,0.009905217,-0.030065408,-0.03683789,0.00127232,0.0017573045,-0.032241426,-0.021886822,0.04858103,-0.022539996,0.017401263,0.041722294,0.05522968,-0.0011207504,0.09106129,-0.01726323,-0.001760529,-0.0031407338,0.024072608,0.012722907,-0.00890305,-0.020718567,0.010945475,-0.029959217,-0.036207613,-0.039654985,0.022727864,-0.01773214,0.019385109,0.019210309,-0.027916545,0.060175363,-0.008335237,-0.05753368,0.0064662383,0.012309273,0.017487979,-0.044061515,0.07485551,-0.047531866,-0.004490655,0.012897377,0.02425086,0.008028903,-0.01568653,-0.0032823393,-0.061982792,-0.02394802,-0.080842406,0.006147398,-0.044969924,-0.0015353089,0.020860797,-0.04404178,-0.0073914407,-0.016908718,0.017965999,0.00104729,0.008508557,-0.05770182,-0.07285964,-0.11709656,-0.01780205,0.0040220856,0.010223378,-0.053098578,0.040909085,-0.05422896,-0.029836338,-0.001986865,-0.049155243,0.005981762,-0.035489097,-0.019936264,-0.045128454,-0.056256212,0.033105835,0.011874717,0.0071012015,-0.032175567,0.011270183,-0.049990334,0.014736376,-0.014141131,0.013960225,-0.017442664,0.002288879,0.06656901,-0.047988553,-0.056240615,0.06676125,0.009920484,0.007484444,0.022595122,-0.023554903,-0.014732022,0.018398322,-0.006762399,-0.026486661,-0.025924414,0.0027227318,-0.010672721,-0.042504746,-0.022984836,-0.039054573,0.007824854,0.04750205,0.059258983,-0.05894769,0.008095548,0.03362504,-0.014581823,-0.12395296,-0.006003325,-0.03474122,0.016243018,-0.041587796,-0.00053601415,-0.0731446,-0.023378331,0.06425414,0.018496092,0.009427544,0.01836458,0.011454457,-0.010457059,0.017702663,-0.04065983,-0.04469268,-0.032528114,0.012626625,0.0039487556,-0.045511972,-0.0067779175,0.05980255,-0.0113902725,0.011879258,0.014362815,0.05703413,0.013125634,0.019341052,-0.057469163,-0.014051746,-0.01468668,0.027492598,0.015844088,0.017792111,-0.017132439,-0.021705758,-0.014403312,-0.0298436,-0.0022592463,0.014592527,0.018578049,-0.031235833,-0.017264683,0.021172749,0.022186184,-0.027702553,0.037166547,0.017277375,0.0022662939,0.03862194,0.011004796,-0.036615536,6.5193606e-05,-0.0055126804,0.02605932,-0.04306954,-0.0023754572,0.0013545403,-0.016642435,0.0034696402,0.012927273,0.03299433,-0.024728144,-0.018792361,-0.020909788,0.009569888,0.05800197,0.02343536,0.05489107,-0.0705764,-0.018201217,-0.01164776,-0.027303914,-0.00042175,0.017003495,-0.018223595,0.002279127,0.01141934,0.021902112,0.0016020441,0.03567877,0.007903926,0.073938556,-0.04534983,-0.01683118,0.07410633,-0.035538588,0.04734477,-0.055792477,0.046382423,0.036711656,-0.015755195,-0.0012687299,-0.0065098265,-0.022686508,-0.014502871,0.011898196,-0.03759727,-0.021338856,0.026731549,-0.0467436,-0.0063740895,0.056840003,0.0033261261,0.048197776,0.07452806,0.047481257,-0.00027826597,-0.068883985,-0.009398137,-0.02713996,0.010660019,-0.021826126,-0.005313176,0.043676767,-0.017506253,-0.022712791,-0.006168286,-0.018819805,-0.030731104,-0.035286624,0.01846425,0.03586938,0.0215087,0.029631302,0.047176,0.006114257,-0.007381641,0.02175285,0.021095583,-0.012400303,-0.009468333,-0.0711261,-0.0006608929,-0.021480137,0.014528805,-0.015425839,-0.09399165,0.040128786,0.018911002,0.0423204,-0.020585582,0.0060627447,-0.0830147,-0.020524288,0.033227593,0.021791093,0.04788978,-0.044138797,-0.051401336,0.05919047,-0.02441494,-0.018404515,0.03618749,-0.03358317,0.039292883,-0.0065947184,-0.008080581,0.025828607,0.04472593,0.026549643,0.024413494,0.03159389,-0.04119776,0.032536827,0.019399347,0.025761098,0.03952667,-0.02622566,-0.052276306,-0.038615584,-0.030982738,-0.041389637,0.040679906,0.0073164073,0.024953628,-0.032231383,0.06766167,0.009067748,0.03998804,0.046843622,-0.0196589,0.02480623,0.049379017,0.025633521,-0.0017271562,-0.010204963,0.002876132,0.046044763,-0.05374232,-0.028227437,0.065281615,0.032213107,0.024029942,0.012772039,0.034706444,-0.005364583,-0.03966527,0.016386848,-0.05923867,0.030129878,-0.03438452,0.063256405,-0.015240333,-0.036154285,0.0068597677,-0.008150978,-0.013139102,0.016885126,0.046309598,-0.029820872,-0.008528889,-0.04917184,-0.071911335,0.038980816,-0.0153890485,0.029733466,0.036386162,0.08511697,0.022405053,-0.013932971,0.035249062,-0.00021363948,0.016997328,0.018003058,-0.019425182,0.026142282,0.028436838,0.035674535,0.021494191,0.010966291,-0.01349012,0.0335422,0.01287895,-0.0026855129,0.013761565,0.017262077,-0.008565102,-0.042989068,0.08703399,0.048833188,-0.073288955,-0.016066842,0.025792375,-0.033472504,0.015369811,-0.0026925472,-0.019886669,-0.009908792,-0.037705295,0.05613433,-0.02945853,0.020794092,-0.0033095535,-0.0093288515,0.002641494,-0.018749202,0.0644404,-0.021938905,-0.022859158,0.029054755,0.013602993,0.021887677,0.002037913,-0.0018171071,0.046764977,-0.031344082,0.0013215761,-0.004904461,0.037703022,-0.01495264,-0.009840993,0.039306477,-0.0040310137,0.030277697,-0.002332661,-0.054081097,0.066302046,0.012117416,-0.019809423,-0.0066607357,0.003061341,-0.007229892,0.0027029994,0.0056075035,0.0032080251,0.00345713,0.0042672954,-0.06548082,-0.021355739,-0.07285076,-0.0072769434,0.006046275,-0.041834895,0.03239589,-0.045684297,-0.012169009,-0.05139996,-0.00796332,-0.028238056,-0.030164955,0.036194824,0.052488267,-0.024111794,0.025921714,-0.06280221,-0.00818942,-0.008535958,0.0031223078,0.046347875,0.010241551,0.008132738,-0.022303244,-0.004613972,0.0053712986,0.0023504219,0.017351761,0.009960532,0.022527492,-0.031322535,-0.036713365,0.008929286,-0.07584985,0.02898927,0.107050546,0.081173904,0.0042317817,-0.055260777,0.00814245,-0.038512312,0.0640352,-0.030041046,0.04610544,0.013664526,0.049372613,-0.008116308,0.0055245147,-0.027854748,0.00282149,0.042486828,-0.012494209,0.013730031,0.045642477,-0.04696923,-0.026857099,0.059786055,0.019185664,-0.034137223,-0.009344076,-0.033077203,0.02550026,0.017651968,-0.06281172,0.027529588,-0.06173229,-0.005727759,0.08728393,-0.04088843,-0.018090086,0.01737904,0.02443852,-0.051059447,-0.0052917846,0.0150906695,0.0014653153,0.02134587,-0.00566406,0.02437249,0.0019555844,0.017371114,0.012663385,0.036813144,0.037293606,0.010047308,-0.03837755,-0.005927311,0.009251564,-0.025153967,0.04903676,-0.021221505,0.025120204,0.02763803,0.009431508,-0.017107157,-0.0032003005,-0.04056086,-0.0487239,-0.005439087,-0.0076317578,0.067563154,0.012401941,-0.0281685,0.006013981,-0.024511907,0.0151569685,0.09526948,-0.038423404,-0.0014493318,0.033541635,0.007160302,0.04392667,0.0684138,0.027920952,0.047054663,-0.016937314,0.05781158,0.058130063,-0.008636512,-0.024103148,-0.062386874,0.038521316,-0.031510223,0.018210659,0.028602526,-0.02292783,-0.013952703,0.010257712,-0.010088701,-0.03939238,0.03994538,-0.03765618,-0.00035119965,-0.031551544,0.02450858,0.031519778,-0.015171165,0.005352863,-0.019305082,0.07299882,0.018690731,-0.010691896,0.023893017,-0.0235365,-0.0930021,-0.019196052,0.035022,-0.013330773,0.033311523,-0.025030414,-0.01769065,-0.032716732,0.06301022,0.017449323,-0.023931522,0.038539395,-0.07708001,0.033075172,-0.07939619,-0.020325702,0.07414755,-0.04951303]	3f9ccd94-e6d6-4267-a156-434186524ac9	d1273aaf-0ec2-4d02-aab4-38600f980bb8	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796
949f38a8-5066-4560-9d3d-7f035a32ba1f	제목 없음	1764651694906.png	69402	@ Document Management System X\n< OC 이 localhost:3000/admin/category/7725515a-fc7f-4de8-888d-005fc7a12ca3                               23 습, 슨 호 ~ -@\n문서 7a                                                                                                   을 333      관       “\nFA ㅁ\n에                 ca\n 부서 관리              으르                                                               ㅁ     됨\nB® 문서 관리                   채 으  문서\n의 팀원 관리\nLh 통계                             부서 코드                           문서 수                             빠ㅇ상태                            © 보관 위치\nAZ 2증 캐비닛 3\nHROO1                5                     활성\nimg005                                                           미리 보기\n쁘  2005거261070613640827-                                                          J\n‘COPYRIGHT © TRAYSTORAGE CONNECT.\nALL RIGHTS RESERVED.                                              111\nB                                                                 미리 보기\n관리자3                                                 2025-11-24T07:45:11.922764 -\n관리자\n1. -ㅡㄱ222000022222222222222222222222도도도22022	\N	2025-12-02 05:01:37.465717+00	f	b860e052-39b8-444f-bf2a-fbafdafafdc8	[0.039292857,0.054577623,-0.025428284,0.03300864,0.060551155,0.04446862,0.08218895,0.020894565,0.047852322,0.009655656,-0.0036191493,0.04665618,0.046813864,0.011534988,0.02275434,-0.021551702,0.09419211,0.03610437,0.008659153,-0.0348528,-0.045851722,0.030033434,0.019690754,0.008731253,0.034103878,-0.040518202,0.029666232,-0.008510514,-0.005323655,-0.067240134,0.02119347,0.058954313,-0.0013635141,-0.040249083,0.033127867,0.004338795,-0.05048929,0.054918885,0.0030336853,-0.082658,-0.042665143,-0.025877442,-0.0413043,0.004648544,-0.03609839,0.002033913,-0.01143623,-0.0075805006,-0.03953562,0.025363732,0.02231391,-0.005229465,0.0046555474,0.015913315,-0.03278865,-0.041669,-0.02954229,-0.07343582,0.0035814857,-0.050060067,-0.05275388,-0.007385374,0.030076899,-0.033763763,-0.030865243,-0.05086735,-0.022644354,-0.0039662505,-0.058618058,0.013557223,-0.006305967,0.074941546,-0.03762033,0.012412743,0.0418068,0.012169114,-0.017843148,-0.018944556,0.03497137,0.0130176395,-0.023755193,-0.0014474716,0.038426094,0.022918802,0.043441303,0.0014125161,0.030680567,-0.02541298,-0.055205293,-0.008366857,0.10997383,0.048633613,-0.03508219,0.026598375,0.06342187,-0.029313989,-0.06923283,-0.15152386,0.018434929,0.06400576,-0.0063844253,0.007777464,0.01227574,0.02382627,0.03786203,-0.010674053,-0.057547435,-0.029880855,-0.09483004,0.002331481,-0.0024967354,0.016574308,0.031817943,0.02481252,-0.04229908,0.0066298256,0.0056838705,0.012100456,-0.020339794,-0.006329501,0.038323376,0.051999044,-0.0033080666,0.040244035,0.043424353,0.023533728,-0.0010073585,-0.014504588,-0.008860705,0.01754573,-0.00011151261,-0.048037603,0.028754883,0.0129806455,-0.025392912,-0.0047688726,0.032896537,0.03865503,-0.034712892,0.02247772,-0.03015358,0.014526879,-0.071420476,0.008313372,-0.023138445,-0.10504452,0.010179565,0.061416738,-0.051590446,0.03739448,-0.025793083,-0.008060404,-0.017310483,-0.012987592,-0.022773085,0.020415446,-0.012492846,-0.019767934,0.07471397,0.014502697,0.035237722,-0.035390057,0.027644133,0.007789179,-0.011892549,-0.07041844,-0.037620783,-0.029285422,-0.005456765,0.016301455,-0.039047126,-0.03751691,-0.04044789,0.036883745,-0.008483032,0.008950864,-0.008641724,-0.023208125,-0.050183937,0.0012393717,0.06446414,0.008593164,-0.01551929,-0.009262475,-0.004730959,0.02886941,0.00038614357,0.03838331,0.026776899,0.05972798,0.010347692,-0.04091594,0.025855279,0.02895513,-0.043574158,0.04299021,0.01665469,0.009606128,-0.057783373,0.0014390514,0.04784519,-0.00035593845,-0.008788177,0.004362722,0.007023873,0.06842155,0.010029837,-0.044229377,-0.019432865,-0.0014861884,0.0074280594,-0.039629996,0.03357632,-0.03561951,0.02493314,0.039102342,0.05864907,0.01689191,0.06923885,-0.024678472,0.03331878,-0.013528904,-0.011393872,0.013986376,0.009056334,-0.03840335,-0.016200364,-5.7621288e-05,0.012862841,-0.04525389,0.011830365,0.02840121,0.01766377,-0.0021931748,0.012326648,0.018318774,0.010906362,-0.08956734,-0.053615414,0.025995461,-0.006515812,-0.021951593,0.058521677,-0.00060832954,0.023177836,0.026820341,0.02647089,0.007574369,0.018345473,-0.024599893,-0.007391493,0.008526786,-0.10099421,-0.017304044,-0.013154934,0.0035963657,0.037612494,-0.016350366,0.021265568,0.011572987,0.048062865,-0.01684793,-0.028627183,-0.016399322,-0.08242953,-0.0512701,-0.02128969,-0.023782931,0.019509204,-0.06070466,0.030681947,-0.046933126,-0.030430937,-0.024214689,-0.04220391,0.026288819,-0.016907921,0.0010916246,-0.008253578,-0.07245271,0.02517163,-0.0008248643,-0.0017221177,3.282091e-05,-0.031530045,-0.059700325,-0.008419965,-0.023010146,0.035785697,-0.011807156,0.011038101,0.075580575,-0.012289357,-0.07654187,0.034079663,0.048439037,0.034713402,0.045706302,0.012605329,-0.035165798,0.009848945,0.044069055,-0.03291623,0.03398919,-0.019107623,-0.017273186,-0.03702131,-0.011513078,-0.014971639,-0.012970562,0.0552993,0.0701948,-0.017938253,0.025114054,-0.011605624,-0.024163747,-0.15163043,-0.0005522977,-0.017312985,0.025796771,0.02772816,0.01220249,-0.038229384,-0.005251159,0.045847416,0.007303185,0.00867201,-0.010318731,0.02325397,-0.007245753,0.028445818,0.011677184,0.002680984,-0.025197696,-0.004345099,0.022974517,-0.032278404,0.013163741,0.048412595,0.0074404934,0.02717103,0.007804673,0.03264615,0.033039454,-0.020952476,-0.0384249,-0.017835222,-0.0071028885,0.019011939,-0.020543251,0.04246309,0.017232904,-0.026911225,0.008945246,-0.013561386,0.015813489,0.052368913,0.031894423,0.01785711,-0.010634695,0.011675847,0.024570607,-0.017625967,0.06353514,0.024973556,-0.0014608309,0.020660702,0.037675355,-0.0034890037,0.009316894,-0.036771547,0.0022410895,-0.02979998,-0.006802146,0.011547018,-0.038546953,-0.022097513,0.029844448,0.03926866,-0.11345245,-0.02447175,0.008780601,-0.020378776,0.06502862,-0.021802267,0.058084365,-0.066173114,-0.018348804,-0.012314243,0.022339286,-0.03957705,-0.017764067,0.007044805,0.037098885,0.006370084,-0.0034945616,0.018206488,0.013389492,-0.015810357,0.02240343,-0.065995745,-0.03353605,0.059468124,-0.051293265,0.01568411,-0.038614433,0.028143467,0.045176283,-0.03584944,0.015766593,-0.015874399,-0.055673223,0.023740735,0.017277634,-0.029767636,9.973747e-05,0.0052780304,-0.025779562,-0.00500647,0.020378528,0.021243788,0.013243495,0.039287668,0.0009886334,-0.015114585,-0.086255684,-0.03540107,-0.0077355644,0.030152848,-0.030410355,0.022266662,-0.0016288039,-0.020612763,0.0077812136,-0.0052122,0.021437636,-0.05890273,-0.045902085,-0.03254061,0.027489534,0.037174728,0.04969776,0.0698261,0.014537819,0.0043418114,0.026381046,-0.00087408465,0.027896456,0.01031394,-0.07283418,-0.016393209,0.0040737465,0.00719199,-0.032136403,-0.08198726,0.0161176,0.016864352,0.03320962,-0.050196216,-0.0054620616,-0.08705947,-0.030922804,0.030816782,-0.0077512194,0.023456369,-0.043464333,-0.08162226,0.029695181,0.0190461,0.031866707,0.034967113,-0.010647098,0.042608727,-0.0026149743,-0.013104473,0.038242143,0.013012785,0.01071056,0.009631056,-0.012452493,-0.046844132,0.022255221,-0.021782784,0.0053458926,0.041986264,0.0035017931,0.0075146314,0.002578687,-0.031142848,-0.01612071,0.0004826071,-0.009017037,-0.029187823,0.0037301658,0.058252033,-0.03397505,0.08585463,-0.02893914,-0.035133123,0.022909077,0.050041307,0.018631954,-0.014317001,-0.045078505,-0.013224184,0.014376781,-0.034384973,-0.0323954,0.056486376,0.020578632,0.03681463,-0.011535003,0.033413693,0.023163171,-0.06155454,-0.006363033,0.0033674578,-0.017114528,-0.039229296,0.056223236,0.018028453,-0.028209966,0.013707426,-0.03360074,-0.0058304043,-0.004196767,0.019914908,0.0023384239,0.014375276,0.020513602,-0.047065392,0.07944867,0.042724293,0.0369682,0.0322746,0.1157028,0.053874217,-0.0035435383,0.062837444,0.0077670366,0.037870068,0.0062981746,-0.009247926,-0.0071498486,0.040680323,0.040323913,-0.0040886546,-0.0070390953,-0.007892135,0.032724854,-0.05153738,-0.01033386,-0.04009845,0.008884965,-0.021831209,-0.018745996,0.06646683,0.032633934,-0.008626198,-0.0008406731,0.07540297,-0.02033102,0.054947745,0.0018965934,-0.013847543,-0.011154985,-0.04802367,0.079418674,0.0019371856,0.029771328,-0.009813546,-0.017450133,0.020176573,-0.023557536,0.076461926,-0.051073562,-0.07327655,-0.011971947,0.035389,0.01922311,0.004067066,0.000329689,0.03217474,-0.0074568843,0.0027634136,-0.032631107,0.026821107,-0.028564801,0.0025977672,0.03757296,0.00027210862,0.01599663,0.007924561,-0.04603567,0.03435029,0.006303659,-0.042388823,0.014229499,0.046502657,-0.029102195,0.052457787,-0.04518395,0.06621739,0.002559883,-0.029743096,-0.03180944,-0.052312925,-0.077901356,0.011797935,0.028839279,-0.0058176117,0.025590071,-0.04035124,-0.060666554,-0.09378152,0.022207081,-0.018738508,-0.032791167,0.06006418,0.035109855,0.029005967,0.025198678,-0.020827899,0.0077634566,0.016130699,-0.0021122673,0.014830061,-0.0012669079,-0.010016385,-0.040195923,-0.0130854,0.015769014,0.051115286,-0.025214834,0.007238843,-0.008827329,-0.016983628,0.051214073,0.027042538,-0.053664036,0.040005423,0.08440762,0.11634688,0.00734141,-0.038167812,-0.026782697,0.017269751,0.022998977,0.010895187,0.02797279,-0.021887204,0.05056955,-0.03589727,-0.012443621,-0.037499253,-0.0036041248,-0.001441825,0.0109170005,-0.023771556,-0.036195017,-0.012078729,-0.0028246955,-0.008488029,-0.030797942,-0.04277855,-0.01124272,-0.052337956,0.0015884559,-0.03219486,-0.026680505,0.019443061,-0.025434105,-0.0030515252,0.092813954,0.008101692,-0.02717908,0.035739705,-0.01897721,-0.027676513,0.018809654,0.018949272,0.008219396,-0.004729964,-0.028578868,-0.019580377,0.0046817223,-0.0007601544,-0.012167263,-0.0017896434,-0.0063484474,-0.02008019,-0.0035372518,-0.029996749,0.04479326,0.0042005633,0.07247168,-0.044400685,0.011663831,0.023699747,0.014630033,0.005142325,-0.0087319845,-0.032384787,-0.052240834,0.037068762,0.004689711,0.084241055,0.035824228,-0.04445486,-0.006025355,-0.08843745,0.054147385,0.09055688,0.00073132716,0.056681473,0.0054843836,0.013410222,0.03574706,0.037850592,0.010059758,-0.0067937775,-0.022560481,0.063724905,0.047416102,-0.004050104,0.008250722,-0.057649516,0.04923393,-0.05846836,0.0017304983,0.022568889,-0.0068946676,-0.032229092,0.032763816,-0.024964336,-0.010802955,0.041592125,-0.03211653,-0.01743023,0.01937389,0.06485177,-0.023649363,-0.072820514,0.0022123833,0.0009051228,0.033264175,-0.012038753,-0.028792486,0.016445126,-0.033276353,-0.08622729,0.031673204,-0.0013529804,0.010907294,0.02202432,-0.02780564,-0.0037512016,-0.02268184,0.048227534,-0.008873678,-0.017495349,0.050038956,-0.034913052,0.012654917,-0.06108883,0.009202836,0.06785495,-0.022010526]	\N	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed
9e4da82d-e4f8-4eb3-bd46-22b7031af75e	20260228_172231	1772681699399.jpg	1648964	세제로 승인하게 -\n(잠깐 묵상)/ 5초쉬기\n영광송\n제12처로 가며\n어머니께 청하오니 제 맘속에 주님상처 깊이 새겨주소서.\n제12처 예수님께서 십자가 위에서 돌아가심을 묵상합시다.\n신부님 무릎을 꿇으실때 - 무릎을 꿇습니다.\n? 신자들 무릎을 꿇고 나서 20초 뒤 - 모두 일어서십시오.\n+ 주님께서는 십자가로 온 세상을 구원하셨나이다.\n해실적 20\n예수 그리스도님, 경배하며 찬송하나이다. (깊은 절)/\n(이동 j\n구세주 예수님, 저희를 위하여 십자가 위에서 숨을 거두셨으니\n저희도 십자가에 못박혀 다시는 저희 자신을 위하여 살지 않고\n주님을 위하여 살게 하소서\n구세주 예수님, 혹시라도 영원히 주님을 떠날 불행이 저희에게 닥칠 양이면\n차라리 지금 주님과 함께 죽는 행복을 내려주소서.\n(잠깐 묵상)/ 15초쉬기 hu	\N	2026-03-05 03:35:01.407+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
3c1ee4c0-5d40-4cac-bbcd-faca9adaa234	Screenshot_20260304_230724_Chrome	1772766775579.jpg	392262	11:07 W 100\n문서 검색... 유\n많이 사용하는 부서\n인사팀\n1\n방문 2회\n총무회계팀\n2\n방문 1회\n부서별 문서 현황 전체 보기\n인사팀 8\nHR001 문서\n기획팀\nPL001 문서\n홍보팀\nPR002 문\n<	\N	2026-03-06 03:12:57.107+00	f	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	\N	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7
\.


--
-- Data for Name: nfc_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nfc_mappings (id, tag_id, subcategory_id, registered_by, registered_at, last_accessed_at, access_count) FROM stdin;
\.


--
-- Data for Name: nfc_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nfc_tags (id, subcategory_id, tag_uid, tag_data, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, document_id, company_id, department_id, parent_category_id, subcategory_id, message, created_at, target_user_id) FROM stdin;
4d6fe41c-488e-497e-ac7d-f692bdb5a151	document_created	9e4da82d-e4f8-4eb3-bd46-22b7031af75e	e7134118-47d4-4d4d-998d-0b0bd2a1c445	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	8da8923e-2700-4e07-a298-b336b99e7df7	9381966d-c836-44eb-bf77-db8c8f693923	문서 등록 [총무회계팀] 4대보험 > 국민연금_2026 - 20260228_172231	2026-03-05 03:35:01.91255+00	\N
82fa471f-3e5c-44b5-a255-5c9d5d2cdc91	document_created	3c1ee4c0-5d40-4cac-bbcd-faca9adaa234	e7134118-47d4-4d4d-998d-0b0bd2a1c445	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	8da8923e-2700-4e07-a298-b336b99e7df7	9381966d-c836-44eb-bf77-db8c8f693923	문서 등록 [총무회계팀] 4대보험 > 국민연금_2026 - Screenshot_20260304_230724_Chrome	2026-03-06 03:12:57.595012+00	\N
\.


--
-- Data for Name: permission_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permission_requests (id, user_id, department_id, company_id, reason, status, requested_at, processed_at, processed_by) FROM stdin;
\.


--
-- Data for Name: phone_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.phone_verifications (id, phone, purpose, otp_hash, expires_at, attempts, send_count, last_sent_at, verified_at, consumed_at, consumed_for_email, created_at) FROM stdin;
7f8fc43d-5ab9-44a2-bcf1-8ab6134b4ea5	01043065320	admin_signup	05c346a9c0e9992d085a524c1e7b73d547b29a828d234dc158ec78113cfa9296	2026-02-09 07:37:38.796+00	0	1	2026-02-09 07:32:38.796+00	\N	\N	\N	2026-02-09 07:32:38.832116+00
4c0af020-b6ef-419e-ba0e-8f80e8e68d21	01043065320	admin_signup	db4dda64671f15750184051793e6258ac0a4e4e9f081d0680bed43598d43d396	2026-02-09 08:55:02.837+00	0	1	2026-02-09 08:50:02.838+00	\N	\N	\N	2026-02-09 08:50:02.923005+00
8197711e-3124-4389-8547-ceaf933eabfb	01043065320	admin_signup	626fed653104fdab42452a76ee5bdc38b1dfc86dcb91613e291fc32ac969f494	2026-02-11 04:48:10.928+00	0	1	2026-02-11 04:43:10.929+00	\N	\N	\N	2026-02-11 04:43:11.239899+00
b81fd215-4369-4e7d-927c-aa4ec728f85e	01043065320	admin_signup	eb69b3354accfbd476fbc81a4de93f0da0e31f0741f71ad297e33c4e4b01b251	2026-02-11 04:48:21.984+00	0	1	2026-02-11 04:43:21.986+00	\N	\N	\N	2026-02-11 04:43:22.145141+00
c40461ad-ed4a-4d2b-9cfa-360358441adc	01043065320	admin_signup	233027b82380ac0477fe8bcfac44a10bf495c489d36bdb85d2b1d058e5bcd833	2026-02-11 04:58:02.323+00	0	1	2026-02-11 04:53:02.323+00	\N	\N	\N	2026-02-11 04:53:02.866414+00
c90156c9-2a44-4e66-9f6a-f18fca702a75	01043065320	admin_signup	36c8a94a6d6ef1b82939fadcd79cf13d5a091405fd7b0a00c8fa1f44eb0bb397	2026-02-11 04:58:27.463+00	0	1	2026-02-11 04:53:27.463+00	\N	\N	\N	2026-02-11 04:53:27.510032+00
259e06a6-62b1-4520-aee3-a999f328472c	01043065320	admin_signup	40776c8a5a49f8f9de60ee11d90543658c7a05c7a9e62157d35c59b5f785beea	2026-02-11 05:00:19.035+00	0	1	2026-02-11 04:55:19.035+00	\N	\N	\N	2026-02-11 04:55:19.132039+00
6fa95388-cdde-4cb1-9a7d-060f6d23f594	01043065320	admin_signup	2fb6c17bb1ec6c4c8cbe5fe000b67ed538f02f71215afef1d391473c0b60019d	2026-02-11 05:02:08.567+00	0	1	2026-02-11 04:57:08.568+00	\N	\N	\N	2026-02-11 04:57:08.668091+00
7bf49d50-eae4-4f6c-8959-dfc9f31d430b	01043065320	admin_signup	b7d790f4e815839711e0d75f1be56e7d53553ca145dc963b157f1f95d1a6c716	2026-02-11 05:02:48.67+00	0	1	2026-02-11 04:57:48.67+00	\N	\N	\N	2026-02-11 04:57:48.761223+00
c0f7afa9-3c42-4c2e-8833-6764159c978f	01043065320	admin_signup	5100558f7f7054b3cd599d4fe10a1ee8788894d258b38a2dad0d82a318440b3e	2026-02-11 05:05:14.869+00	0	1	2026-02-11 05:00:14.87+00	\N	\N	\N	2026-02-11 05:00:15.090551+00
00b802ac-78eb-47fc-97c3-4a95014e1b9b	01043065320	admin_signup	825b4362cf372cb1ec91370f7b96dc39ff98b44f9bdadf2cb9814b237c0a85a5	2026-02-11 05:05:27.271+00	0	1	2026-02-11 05:00:27.271+00	\N	\N	\N	2026-02-11 05:00:27.473329+00
ba45f2b7-c129-4fc5-86af-c49576ce39a9	01043065320	admin_signup	6a1a2bbe1740bdfd9905cc4c7cd8f7368c9a7a672ecc28e2b3064409ecf8ea82	2026-02-11 05:10:49.287+00	0	1	2026-02-11 05:05:49.288+00	\N	\N	\N	2026-02-11 05:05:49.506447+00
171cc903-bceb-4cfb-8e18-df875d0d5682	01043065320	admin_signup	ea79ec60459ffb36868721ddc34199a73a42b707ce4662388fea923384aeba64	2026-02-11 05:10:56.27+00	0	1	2026-02-11 05:05:56.271+00	\N	\N	\N	2026-02-11 05:05:56.348883+00
7920318b-115e-4526-adfe-e5514a7f8941	01043065320	admin_signup	8aaa04c3eac0989fe8c130b7780918991113e71d8e5fe053f1bc4a59c4cac5ed	2026-02-11 05:46:52.941+00	0	1	2026-02-11 05:41:52.941+00	\N	\N	\N	2026-02-11 05:41:53.330075+00
4960873d-4fed-4da1-b67b-bfa423a01d3d	01043065320	admin_signup	98853b48ff802e73cd1fa7a9a2e123dc43bd4249891ff2810465fd99d0d342b1	2026-02-11 06:07:34.027+00	0	1	2026-02-11 06:02:34.028+00	\N	\N	\N	2026-02-11 06:02:34.598632+00
5af824b0-9ad8-447e-9a19-bf620c70aa1e	01043065320	admin_signup	d25bb89b7c9511d80bed0b86a874827d71d816449fba0b0b1bf7cdbdc06dd6d9	2026-02-11 06:08:41.116+00	0	1	2026-02-11 06:03:41.116+00	\N	\N	\N	2026-02-11 06:03:41.528412+00
992e52a0-800b-4a6f-8f3f-51a14a2f2e45	01043065320	admin_signup	b982bdacb671b1882251e1867437cca8b95db1c4454811c8a01b9573a2a999ac	2026-02-11 06:08:48.36+00	0	1	2026-02-11 06:03:48.361+00	\N	\N	\N	2026-02-11 06:03:48.699731+00
14358d41-6d76-49d2-ace5-a5e3ea626603	01043065320	admin_signup	38c6dbd58ac0d842ca82afb4d780bf25f33062e7773e6e5f011f5e5b6592f449	2026-02-11 06:14:22.468+00	0	1	2026-02-11 06:09:22.468+00	\N	\N	\N	2026-02-11 06:09:22.582611+00
f559a159-4850-48f9-b572-eccdfe2f8175	01043065320	admin_signup	bb30db95ec4748c7f271fdad9529d70b4a6a5a09fe85cf6440e378ceb507d334	2026-02-11 06:14:33.04+00	0	1	2026-02-11 06:09:33.041+00	\N	\N	\N	2026-02-11 06:09:33.141197+00
359725c2-4616-4452-acb9-44e184c8e5b2	01043065320	admin_signup	a258bc6476744ff7bd16e3d2284673765e6240a113269120c2b86c22f43c56ab	2026-02-11 06:14:59.54+00	0	1	2026-02-11 06:09:59.54+00	\N	\N	\N	2026-02-11 06:09:59.640528+00
37b03830-6f11-43cf-8641-56911263db79	01043065320	admin_signup	bc6a20f743cde0bd483a633f4683b0e9ddfb8c084cdee4e565a1593cbac5691c	2026-02-11 06:32:55.683+00	0	1	2026-02-11 06:27:55.683+00	\N	\N	\N	2026-02-11 06:27:55.992139+00
f4728afc-9be0-492f-b719-154d6ff8fa16	01043065320	admin_signup	4eb4d7d631dcc9589d90a99243359b1656fc2ad8505df6036b2ca256d531838a	2026-02-11 07:40:27.555+00	0	1	2026-02-11 07:35:27.555+00	\N	\N	\N	2026-02-11 07:35:27.935541+00
adce16d7-3ef3-42bf-b0c2-9041e5d28a31	01043065320	admin_signup	adcad046dade9291497e8fef53b6dfa1fa72501a36379260ba96efef0826265a	2026-02-11 07:43:02.32+00	0	1	2026-02-11 07:38:02.321+00	\N	\N	\N	2026-02-11 07:38:02.450372+00
43d8cb3a-ea64-4150-a91b-47032692318b	01043065320	admin_signup	3f42db241b715267fb65e0780961f2f401cfa299c1cabbc631e93c9a24cf6155	2026-02-11 07:43:07.983+00	0	1	2026-02-11 07:38:07.983+00	2026-02-11 07:38:53.367+00	\N	\N	2026-02-11 07:38:08.357907+00
86491c42-bb43-4a98-bec3-554760f42a95	01043065320	admin_signup	407b8d43e99fba71ec66ed491d90512398513bbc89fad8fac9ca204b8e0c3ab5	2026-02-11 07:45:25.495+00	0	1	2026-02-11 07:40:25.496+00	2026-02-11 07:40:39.075+00	\N	\N	2026-02-11 07:40:25.599509+00
45655672-0873-4742-bdb5-58dc2e9068ef	01043065320	admin_signup	fe677274d67fe8446b39889855e46b88bf6b707b241e81384aa0658123eed1ff	2026-02-11 07:47:47.059+00	0	1	2026-02-11 07:42:47.06+00	2026-02-11 07:42:59.067+00	\N	\N	2026-02-11 07:42:47.15143+00
cd3ce7d3-963d-4c86-aadd-b3a98b355d6c	01043065320	admin_signup	09b7edb0ab228c6562d577c37324d0d2e53ea1f33e5eff08e15a6ca3dc13663f	2026-02-11 07:49:41.607+00	0	1	2026-02-11 07:44:41.607+00	2026-02-11 07:44:51.811+00	\N	\N	2026-02-11 07:44:41.717609+00
d7fb72d7-db73-4c8d-90ab-89a50d31cf48	01066176548	admin_signup	29592d1c7b2ecc10df515c4c51b787f0d6e55f51eec52f1d8cd80493d878230e	2026-02-12 01:42:35.901+00	0	1	2026-02-12 01:37:35.902+00	2026-02-12 01:37:51.994+00	\N	\N	2026-02-12 01:37:35.968229+00
\.


--
-- Data for Name: search_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.search_history (id, user_id, query, searched_at, search_count, company_id) FROM stdin;
17cf0e25-a220-4c8a-8bc8-dfb490deb93a	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1111	2025-11-26 02:27:17.939+00	1	\N
5f4a4a17-3398-46ed-b903-8d3417d550d5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	스크린샷	2025-11-26 06:57:53.48+00	1	\N
e6a21215-5040-4a08-ae47-9433a46d1b42	55f27d3b-6e75-4603-a15d-0d39578a4bf7	111	2025-12-03 06:55:22.241+00	8	\N
a07d0eaf-bd45-4c82-8649-28704ac51935	55f27d3b-6e75-4603-a15d-0d39578a4bf7	222	2025-12-08 07:44:20.977+00	1	\N
01ee4771-0177-411b-8571-e7c3b074f3b3	55f27d3b-6e75-4603-a15d-0d39578a4bf7	555	2025-12-09 08:57:39.345+00	2	\N
88417e71-d87e-4ab9-ab75-847220e43540	55f27d3b-6e75-4603-a15d-0d39578a4bf7	인사팀	2025-12-09 08:57:51.05+00	1	\N
8f8e7144-7b88-45d7-ae6c-c969f400d64b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	계약	2025-12-16 00:53:15.68+00	1	\N
77cf055a-ab0a-4b7e-b37d-9a4889ef6200	55f27d3b-6e75-4603-a15d-0d39578a4bf7	계약	2025-12-16 00:53:16.099+00	2	\N
c342c788-2ddb-4527-a48d-11e122ea110d	0a69d5d8-6247-45f3-8188-50c2f1a2b780	111	2025-12-17 08:09:43.625+00	1	\N
fb4dbe8c-5da1-4444-bb3d-5fec6503c938	55f27d3b-6e75-4603-a15d-0d39578a4bf7	채용문서	2025-12-17 08:23:09.817+00	1	\N
c7d7a650-f41d-4537-9bfa-f1d4629d693d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2025년	2025-12-17 08:24:37.276+00	3	\N
1d1969bd-19c4-41c9-82bf-e5d52381b521	f42df23d-f599-4cb8-9bee-a90ae6370bb7	123	2025-12-26 14:32:41.634+00	1	\N
73cfcfd5-fd04-4e18-8999-6401e7015340	f42df23d-f599-4cb8-9bee-a90ae6370bb7	참고용	2025-12-26 14:32:54.984+00	1	\N
99cd6501-73fd-4f88-894d-771a6d301866	2d832ad2-c8c1-4d03-823f-f0dd8f9559de	계약서	2025-12-26 14:40:45.499+00	1	\N
b1b1d141-e809-434d-ac84-e8d911932edd	2d832ad2-c8c1-4d03-823f-f0dd8f9559de	123	2025-12-26 14:40:56.802+00	2	\N
c478ce63-ec1b-4109-8398-be340bcd18c8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	근로계약서	2026-01-07 07:34:23.937+00	2	\N
0ee15815-6138-4bbc-8990-dbe39a55a493	f42df23d-f599-4cb8-9bee-a90ae6370bb7	테스트용	2026-01-13 09:30:18.086+00	1	\N
12ec0f33-a6e1-44b1-88a7-29ecf408a02d	f42df23d-f599-4cb8-9bee-a90ae6370bb7	인사	2026-01-29 11:13:42.91+00	1	\N
5ef5a157-9f31-4e5e-b427-bf31e3933012	f42df23d-f599-4cb8-9bee-a90ae6370bb7	정유준	2026-02-01 05:29:43.906+00	4	\N
521f523c-948c-49c9-a479-603571cbcddc	87c6642a-8fcd-417f-a881-862a9131b9fe	중소	2026-02-21 05:53:32.168+00	1	\N
073c59b4-781b-4bc5-823f-580534ca3ffd	55f27d3b-6e75-4603-a15d-0d39578a4bf7	admin@company.com	2026-02-25 03:06:12.681+00	1	\N
12000e35-c3d7-4824-ab82-92ebf03a1245	f42df23d-f599-4cb8-9bee-a90ae6370bb7	다솜프라자	2026-03-04 08:29:10.709+00	2	\N
\.


--
-- Data for Name: shared_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shared_documents (id, document_id, shared_by_user_id, shared_to_user_id, permission, message, shared_at, is_active, created_at) FROM stdin;
b6ce349a-d16f-46e1-8744-ffabf7413c87	7aed3db3-c216-443c-a04b-ae784d670e62	87c6642a-8fcd-417f-a881-862a9131b9fe	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 04:17:23.443928+00	t	2026-01-07 04:17:23.443928+00
73811831-0efd-4995-a684-e44124519933	7d281c7f-8aac-492c-9006-2508d27976dd	87c6642a-8fcd-417f-a881-862a9131b9fe	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 04:17:50.526641+00	t	2026-01-07 04:17:50.526641+00
b628b44d-7be6-4b73-a4a8-1c73c69c4f5e	7aed3db3-c216-443c-a04b-ae784d670e62	55f27d3b-6e75-4603-a15d-0d39578a4bf7	87c6642a-8fcd-417f-a881-862a9131b9fe	download	\N	2026-01-07 04:29:32.20516+00	t	2026-01-07 04:29:32.20516+00
7984813b-2bb7-4c70-b06f-19aa9c431ea7	80731eb1-c20d-406b-a323-a2ba2e6fb5a2	55f27d3b-6e75-4603-a15d-0d39578a4bf7	87c6642a-8fcd-417f-a881-862a9131b9fe	download	\N	2026-01-07 04:43:23.181811+00	t	2026-01-07 04:43:23.181811+00
996fb8a9-92eb-4390-a325-b2c560dd3626	16030ccb-7157-456e-bf9f-6c77d8c177cd	55f27d3b-6e75-4603-a15d-0d39578a4bf7	87c6642a-8fcd-417f-a881-862a9131b9fe	download	\N	2026-01-07 04:43:28.912145+00	t	2026-01-07 04:43:28.912145+00
857649d5-d873-4632-8541-45c5b815c7b3	af8f1b85-3017-4c8b-aae5-2d85049a5cba	55f27d3b-6e75-4603-a15d-0d39578a4bf7	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 04:54:16.438717+00	t	2026-01-07 04:54:16.438717+00
a91653d8-297b-4827-b121-392c1b63a324	af8f1b85-3017-4c8b-aae5-2d85049a5cba	55f27d3b-6e75-4603-a15d-0d39578a4bf7	87c6642a-8fcd-417f-a881-862a9131b9fe	download	\N	2026-01-07 05:12:55.064425+00	t	2026-01-07 05:12:55.064425+00
9cdebe8e-95c0-44c0-a2fd-3ecc195e1fb7	7d281c7f-8aac-492c-9006-2508d27976dd	55f27d3b-6e75-4603-a15d-0d39578a4bf7	87c6642a-8fcd-417f-a881-862a9131b9fe	download	\N	2026-01-07 05:17:17.622918+00	f	2026-01-07 05:17:17.622918+00
9dd4816e-5ba2-42b7-8cd1-5721d13e6a41	930ae2eb-15d5-4037-84a6-1971026d9a90	55f27d3b-6e75-4603-a15d-0d39578a4bf7	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 05:27:56.75708+00	f	2026-01-07 05:27:56.75708+00
31c38ece-bcca-4239-84d1-2f68edc70a9d	af8f1b85-3017-4c8b-aae5-2d85049a5cba	55f27d3b-6e75-4603-a15d-0d39578a4bf7	9c4614a7-296b-40db-9b30-10389dabaa35	download	\N	2026-01-07 06:34:36.251408+00	t	2026-01-07 06:34:36.251408+00
d6c8b64b-5a56-4261-b317-955ff8ec1793	2289e077-829b-4467-b256-3d267f9c7d92	55f27d3b-6e75-4603-a15d-0d39578a4bf7	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 06:35:51.727244+00	t	2026-01-07 06:35:51.727244+00
35ea9109-6ced-4f57-98fd-64d649ca9944	846c1a09-234b-4256-aad4-3498a463e730	55f27d3b-6e75-4603-a15d-0d39578a4bf7	13280183-dc92-430d-ab61-fd510c4a36eb	download	\N	2026-01-07 06:36:10.950657+00	f	2026-01-07 06:36:10.950657+00
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subcategories (id, name, description, parent_category_id, department_id, nfc_tag_id, nfc_registered, storage_location, company_id, created_at, default_expiry_days, expiry_date, color_label, management_number) FROM stdin;
29dc26d3-6fc0-4015-98fd-a9c9e047f91c	근로계약서(2024년) - 2025년	근로계약서(2024년) (2025년 자료)	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	4811	2039-02-23 05:42:51.30279+00	8800a0	97998
2f65161e-420f-4c7c-8ef0-f91154f0002f	2026년	2026년	fc606c20-02d9-4cde-bcf0-569374ed61f7	e3da437e-4d84-41d1-8127-f553a0352e02	\N	f	회의실 문서함	\N	2026-02-12 01:45:06.38303	1826	2031-02-12 01:45:14.12+00	ff7f00	\N
7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	555	555	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	555	\N	2025-12-09 07:12:27.394001	1825	2030-12-21 05:42:51.30279+00	\N	\N
cb012c55-1aad-44d1-9e4d-dcd840ae2d34	11 - 2025년	1 (2025년 자료)	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	047364B2767281	t	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	2555	2032-12-20 05:42:51.30279+00	\N	\N
a2300d8e-9a6a-44ef-b6f1-d1df57929c35	383838	383	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	8	\N	2025-12-17 04:36:31.027845	1095	2028-12-21 05:42:51.30279+00	\N	\N
d1273aaf-0ec2-4d02-aab4-38600f980bb8	5727 - 2024년	272 (2024년 자료)	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	\N	f	선반 A	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	1095	2028-12-21 05:42:51.30279+00	\N	\N
7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	534	546	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	\N	f	456	\N	2025-12-17 08:05:08.912031	1825	2030-12-21 05:42:51.30279+00	\N	\N
d31ab13e-59ad-48c3-bc0e-97a771230e7c	475284475284	475284475284	97177207-ec1c-4ce5-9ac8-2b2dd2956fad	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	f	\N	\N	2026-02-21 05:20:47.131139	\N	\N	ffffff	\N
d6cae502-8c47-4172-a5f4-47d0cb5c7983	기술 문서123 - 2025년	시스템 아키텍처 및 API 문서1231312 (2025년 자료)	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	\N	f	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	5	2025-12-27 06:00:10.19+00	\N	\N
188704b7-553c-4974-8213-1bd00d13feeb	근로계약서(2025년) - 2025년	근로계약서(2024년) (2025년 자료)	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	17	2026-01-07 15:00:00+00	\N	\N
a331cfea-1dc0-44f0-981b-9e64e7479572	채용 문서 - 2024년	신입 및 경력 채용 관련 문서 (2024년 자료)	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	042614E2F36481	t	선반 A	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	-7	2025-12-15 15:00:00+00	\N	\N
fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	1111 - 2025년	222 (2025년 자료)	3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	043E64B2767280	t	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	\N	\N	\N	\N
777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	이력서	이력서 요요	97177207-ec1c-4ce5-9ac8-2b2dd2956fad	57aa959a-90f9-440d-9c28-1a381c1aabb8	045B66B2767281	t	지하문서고	\N	2026-02-06 10:31:07.701531	365	2027-03-05 12:32:50.417+00	e80000	m382
bac0023a-8673-4269-8b53-fea6e60a8374	14	14	27cc66ba-4ef2-445f-bdc5-19a4637bd790	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	14	\N	2025-12-08 06:35:09.54268	\N	\N	\N	\N
ad5598f1-7fd4-42fa-a0b9-eaf4ba2cd6fe	545	5445	c8a69a0a-c47d-486c-9688-aafc678e8974	e7a4b0f9-af44-49a7-a758-1857e91a96a3	\N	f	554	\N	2025-12-08 08:37:47.21112	\N	\N	\N	\N
30cb0ce1-69c4-4040-8a42-c570cd64ed79	777	777	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	\N	f	777	\N	2025-12-08 08:47:25.021598	\N	\N	\N	\N
a87574e3-e055-4f51-8997-85b1f5eb9acc	1	2	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	\N	f	3	\N	2025-12-09 01:23:40.454742	\N	\N	\N	\N
9ee05474-e856-4851-8a42-0118d322fb15	1	1	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	t	1	\N	2025-12-10 07:51:28.273165	\N	\N	\N	\N
a70aa08d-e279-482f-8ae0-c0c3276a01fa	11 - 2024년	1 (2024년 자료)	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	선반 A	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	\N	\N	\N	\N
ef480a19-d3f6-4077-be3f-b5dbed27af48	이력	\N	ff596867-3dc9-4917-89c1-97b19412b59c	8cc4a1ce-d211-4e33-8fe4-86e020a6a84c	\N	f	\N	\N	2026-01-28 11:31:09.299706	\N	\N	\N	\N
2cfed06f-68fc-4fff-8627-7a39cf356ae6	653312453435	434354	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	2323	\N	2025-12-08 01:54:07.750192	\N	\N	\N	\N
9381966d-c836-44eb-bf77-db8c8f693923	국민연금_2026	2026년 국민연금 관련 서류 스토리지	8da8923e-2700-4e07-a298-b336b99e7df7	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	\N	f	대표실 캐비넷 위	\N	2026-02-08 08:37:29.943992	1826	2031-02-08 08:37:27.727+00	8800a0	2026-01
2f28b94b-3b61-446b-a74d-d479b33feece	test - 2025년	1111 (2025년 자료)	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	04959AF2B10F90	t	선반 B	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	365	2026-12-26 05:51:59.821+00	000000	
95a6b5a3-878b-4a60-8ef4-766a1a64142a	기술 문서123 - 2024년	시스템 아키텍처 및 API 문서1231312 (2024년 자료)	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	04959AF2B10F90	t	선반 A	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	\N	\N	\N	121
e2fe8303-86bb-40f2-86be-61ee4e54532f	77777777	53453	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	3534535	\N	2026-02-06 03:35:45.514545	\N	\N	000000	543543
c2ff1989-34e4-439f-99e7-5d78c64a27e4	453	3453	52b94ac2-b933-4b79-a0b2-533de539d5f1	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	f	\N	\N	2026-02-06 06:26:10.609519	\N	\N	ffff00	\N
1df44756-5631-4eb4-b993-cd7fec8ab2a8	근로계약서(2024년) - 2024년	근로계약서(2024년) (2024년 자료)	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	\N	t	선반 A	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 01:49:47.425379	23	2026-01-29 15:00:00+00	000000	
\.


--
-- Data for Name: user_favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_favorites (id, user_id, subcategory_id, company_id, created_at) FROM stdin;
76ccee4c-d8ec-45f5-af2e-2e39caad18c8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 01:26:50.984321+00
fbfcc1c4-ec90-404e-b070-a3c5c94a4bad	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:15.211043+00
\.


--
-- Data for Name: user_notification_muted_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notification_muted_categories (id, user_id, parent_category_id, muted_at) FROM stdin;
\.


--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notification_preferences (id, user_id, company_id, document_created, document_deleted, document_shared, category_changes, expiry_alerts, notify_my_department_only, created_at, updated_at) FROM stdin;
98388c31-623e-4ede-9d42-0a4cea4665b9	55f27d3b-6e75-4603-a15d-0d39578a4bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	t	t	f	t	t	f	2026-01-22 05:44:39.821748+00	2026-01-22 05:56:15.427+00
\.


--
-- Data for Name: user_notification_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notification_status (id, user_id, notification_id, is_read, is_dismissed, created_at) FROM stdin;
98102f3e-e3a5-49bd-81f2-2407ae5ef76a	f42df23d-f599-4cb8-9bee-a90ae6370bb7	4d6fe41c-488e-497e-ac7d-f692bdb5a151	t	t	2026-03-05 12:32:05.820748+00
dda15258-0b94-4420-aecf-f318bdde454a	f42df23d-f599-4cb8-9bee-a90ae6370bb7	82fa471f-3e5c-44b5-a255-5c9d5d2cdc91	t	t	2026-03-07 00:01:13.9545+00
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_permissions (id, user_id, department_id, created_at, updated_at, company_id, role) FROM stdin;
1d101929-8e3b-4e50-825d-f2d5dfcfb5a7	88284e97-d1bb-425c-8320-7d7a29f14482	e7a4b0f9-af44-49a7-a758-1857e91a96a3	2025-12-17 05:09:57.222432+00	2025-12-17 05:09:57.222432+00	\N	viewer
34eb7463-fea8-4116-98e5-7ab914994925	def3564b-73bd-4238-958f-4cc58ca59f50	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	2025-12-17 05:28:10.540887+00	2025-12-17 05:28:10.540887+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
86d6deff-7c7c-4212-b8ea-a82a4e37d219	def3564b-73bd-4238-958f-4cc58ca59f50	b860e052-39b8-444f-bf2a-fbafdafafdc8	2025-12-17 05:28:10.540887+00	2025-12-17 05:28:10.540887+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
78c4fcfc-3847-416e-8181-aea4672577c5	def3564b-73bd-4238-958f-4cc58ca59f50	e7a4b0f9-af44-49a7-a758-1857e91a96a3	2025-12-17 05:28:10.540887+00	2025-12-17 05:28:10.540887+00	3f9ccd94-e6d6-4267-a156-434186524ac9	manager
5550c0c3-68ab-4140-8db7-ca692b8a1a39	0a69d5d8-6247-45f3-8188-50c2f1a2b780	2bb2eeec-9865-4e3e-8cfe-43391e812e62	2025-12-17 05:28:28.770717+00	2025-12-17 05:28:28.770717+00	3f9ccd94-e6d6-4267-a156-434186524ac9	editor
6d9c4ae3-d025-4d4c-a19d-e1df785034c5	0a69d5d8-6247-45f3-8188-50c2f1a2b780	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	2025-12-17 05:28:28.770717+00	2025-12-17 05:28:28.770717+00	3f9ccd94-e6d6-4267-a156-434186524ac9	manager
eb642c93-851b-464d-820a-ae60b2154578	0a69d5d8-6247-45f3-8188-50c2f1a2b780	b860e052-39b8-444f-bf2a-fbafdafafdc8	2025-12-17 05:28:28.770717+00	2025-12-17 05:28:28.770717+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
b76cb324-ba4a-49aa-b65c-74e15f52e64f	313ed743-fc8b-4bb7-bd4e-b66460edb9b4	2bb2eeec-9865-4e3e-8cfe-43391e812e62	2025-12-17 06:21:15.379333+00	2025-12-17 06:21:15.379333+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
4a9822dc-d675-4a83-8b3f-487f754284ad	313ed743-fc8b-4bb7-bd4e-b66460edb9b4	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	2025-12-17 06:21:15.379333+00	2025-12-17 06:21:15.379333+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
8b7b57da-708e-4b30-9984-fe1a61fa75a0	313ed743-fc8b-4bb7-bd4e-b66460edb9b4	ed15289a-165d-4768-b160-6ed4bf180bf7	2025-12-17 06:21:15.379333+00	2025-12-17 06:21:15.379333+00	3f9ccd94-e6d6-4267-a156-434186524ac9	editor
e5da3e93-56a2-4979-9985-e1f3b5850ea7	2d832ad2-c8c1-4d03-823f-f0dd8f9559de	6c79e555-1c43-45bf-9a28-1164658bc412	2025-12-26 14:52:44.860368+00	2025-12-26 14:52:44.860368+00	e7134118-47d4-4d4d-998d-0b0bd2a1c445	viewer
ddcd7b1c-e2af-464d-a620-5d5fd3b53363	2d832ad2-c8c1-4d03-823f-f0dd8f9559de	57aa959a-90f9-440d-9c28-1a381c1aabb8	2025-12-26 14:52:44.860368+00	2025-12-26 14:52:44.860368+00	e7134118-47d4-4d4d-998d-0b0bd2a1c445	editor
5e062269-0eee-4672-abe2-ecedc79af6b2	0c5887ec-f8ea-470f-86ab-ac9b0766c302	6c79e555-1c43-45bf-9a28-1164658bc412	2026-02-01 06:08:31.783466+00	2026-02-01 06:08:31.783466+00	e7134118-47d4-4d4d-998d-0b0bd2a1c445	editor
f3a5b7ad-7916-4ebb-8c09-ce5d146f1094	87c6642a-8fcd-417f-a881-862a9131b9fe	2bb2eeec-9865-4e3e-8cfe-43391e812e62	2026-02-19 02:27:27.685062+00	2026-02-19 02:27:27.685062+00	3f9ccd94-e6d6-4267-a156-434186524ac9	viewer
81350aa8-e256-4a0c-ac6d-b30c34474e4d	87c6642a-8fcd-417f-a881-862a9131b9fe	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	2026-02-19 02:27:27.685062+00	2026-02-19 02:27:27.685062+00	3f9ccd94-e6d6-4267-a156-434186524ac9	editor
f2838925-0aa8-4bd1-ac6e-9ae8129458c1	87c6642a-8fcd-417f-a881-862a9131b9fe	27787d1b-18f9-4141-9486-ee1d75ce3aec	2026-02-19 02:27:27.685062+00	2026-02-19 02:27:27.685062+00	3f9ccd94-e6d6-4267-a156-434186524ac9	manager
68fbec37-6571-4541-8e22-7dd9680584ca	87c6642a-8fcd-417f-a881-862a9131b9fe	b860e052-39b8-444f-bf2a-fbafdafafdc8	2026-02-19 02:27:27.685062+00	2026-02-19 02:27:27.685062+00	\N	editor
b74d458c-ecb7-41c2-a9b4-e6c090f8bb0b	87c6642a-8fcd-417f-a881-862a9131b9fe	05c8cab4-694a-48ae-9bfb-394f8dce13a9	2026-02-19 02:27:27.685062+00	2026-02-19 02:27:27.685062+00	\N	manager
\.


--
-- Data for Name: user_recent_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_recent_visits (id, user_id, subcategory_id, parent_category_id, department_id, company_id, visited_at, visit_count) FROM stdin;
3a23bbd0-6fe0-4e2e-b04f-288e69999d3e	f42df23d-f599-4cb8-9bee-a90ae6370bb7	d31ab13e-59ad-48c3-bc0e-97a771230e7c	97177207-ec1c-4ce5-9ac8-2b2dd2956fad	57aa959a-90f9-440d-9c28-1a381c1aabb8	e7134118-47d4-4d4d-998d-0b0bd2a1c445	2026-03-04 23:27:29.306+00	5
39c94852-37d5-4099-abd0-3673fd7ccf4f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-03-06 02:23:45.639624+00	1
c7917933-d56c-4797-9a0b-95ae269713e8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 05:58:33.050298+00	1
febea18f-b0b5-408c-b690-f6918fc51553	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-04 05:58:33.195683+00	1
ca5d44dd-0733-4ad3-8153-603ecf6ded7e	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:06:46.006824+00	1
9bc9a6f3-3a7c-4948-9a1a-3d569a396fad	55f27d3b-6e75-4603-a15d-0d39578a4bf7	d1273aaf-0ec2-4d02-aab4-38600f980bb8	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-26 02:20:34.754+00	12
25031091-2ae6-4ed8-9928-f1e265b50123	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-06 06:33:22.890723+00	1
ab4d8b82-7142-4446-a24c-968d1e5ebe52	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 07:16:31.404367+00	1
d1ca0012-af36-460b-86de-3acce7877607	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 07:16:31.543988+00	1
247c5a35-88f7-4b2b-8f64-b4c91056e2cc	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 07:27:31.908978+00	1
7b325b37-d78c-416b-9ad3-396b6b327f2d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 07:27:32.038243+00	1
173bb28b-5ce8-4c78-b7b2-f516b2dead99	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 08:47:37.726605+00	1
5f772361-0d38-494b-804b-01b2fbefb835	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-08 08:47:37.822253+00	1
ed3ac114-d26d-48fa-898c-cb78ceace9b2	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 01:51:55.449169+00	1
942bec67-2b3b-4ef1-945f-9cba89d63dd5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 04:39:01.790905+00	1
759219a9-e3e4-4371-af27-272402eadf7d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:07.162111+00	1
06483d92-55d1-436c-b331-b8e8090a3fbf	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:07.268003+00	1
39b2915c-01bc-490b-a8c5-a42c5a41bad8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:15.172289+00	1
fab861fb-5624-4424-bf88-1b1bb74ca234	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:15.286511+00	1
8313829d-6123-4dfb-9fc5-350c34cf433d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:19.303665+00	1
d5222077-c815-41e9-b295-54e54d01af32	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:06:49.879914+00	1
0ad53435-d2f8-400e-a386-4a57265395e2	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:07:54.359835+00	1
e879a548-30df-45d4-a91a-45d56f6fe491	87c6642a-8fcd-417f-a881-862a9131b9fe	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-21 06:37:14.783+00	4
a288ebd5-1faa-4e45-8a93-cd12349bacf1	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:25:58.644161+00	1
dbcfb3b1-2958-445c-8bce-e7b6bebc7535	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:30:12.217453+00	1
bf386fa7-efcd-4cf5-ad0e-c4dbe95f61c8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:36:18.046182+00	1
efd16c7b-f73e-4e95-b9ea-09c1dc169365	0a69d5d8-6247-45f3-8188-50c2f1a2b780	a87574e3-e055-4f51-8997-85b1f5eb9acc	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:04:56.367447+00	1
7d052bcd-da2e-42e8-bc7c-ff0c718774e5	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:12.864807+00	1
419d9220-d1e4-4dc6-becf-d17fb2bec234	0a69d5d8-6247-45f3-8188-50c2f1a2b780	a87574e3-e055-4f51-8997-85b1f5eb9acc	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:25.835484+00	1
b420858e-b784-47f7-bb06-2247514d6f62	0a69d5d8-6247-45f3-8188-50c2f1a2b780	a87574e3-e055-4f51-8997-85b1f5eb9acc	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:25.992229+00	1
928d6e4a-4c75-4b21-8a69-b33ba487e457	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:28.020187+00	1
b9a2e047-4084-441d-822d-54cc3368f5e5	0a69d5d8-6247-45f3-8188-50c2f1a2b780	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:08:59.340307+00	1
95bbb6a3-f7f7-4872-9f16-407a53ec3fb4	0a69d5d8-6247-45f3-8188-50c2f1a2b780	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:02.943316+00	1
7487c9a4-3a09-48f0-af43-ca94095a9805	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:07.350127+00	1
57ec7388-2783-4bf8-a073-6e81aeeccbc2	0a69d5d8-6247-45f3-8188-50c2f1a2b780	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:12.613847+00	1
100cd8d7-0808-49fe-a2cb-85a47d13320a	0a69d5d8-6247-45f3-8188-50c2f1a2b780	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:13:27.204469+00	1
39d84f5b-7e8f-4ebb-8b8e-aa2b37fb3f32	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:13:32.90259+00	1
7dd22df8-5dd0-4a3c-91b7-7a066f3d64f8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:45:26.219517+00	1
9054bd55-2661-49b1-b48c-a9234a97b9ef	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-03-06 02:37:34.48723+00	1
b14e3646-9373-4c31-87eb-fb1ded2be099	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:41:56.788277+00	1
29424349-cf3a-4a40-8be7-2aa89fd13124	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:42:44.161841+00	1
bf06e700-552f-409d-a553-1dd9034d4bc3	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:44:22.099415+00	1
f154e1f8-bd71-41e1-8780-6c5fe47dc882	55f27d3b-6e75-4603-a15d-0d39578a4bf7	a2300d8e-9a6a-44ef-b6f1-d1df57929c35	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:46:38.904776+00	1
14a9dbdc-3b71-47f0-8bae-83c6753edc18	55f27d3b-6e75-4603-a15d-0d39578a4bf7	a2300d8e-9a6a-44ef-b6f1-d1df57929c35	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:46:39.035393+00	1
c9a57aab-9a90-45cf-bdf1-6488fc09da5e	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:48:51.4845+00	1
ef4dfd94-04a7-4779-a146-66bceae98b36	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:48:51.630926+00	1
63b3aff2-9576-4902-928d-ce091b47310f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:50:09.946756+00	1
ebf43621-5b53-45fb-aae4-a6f63e018312	55f27d3b-6e75-4603-a15d-0d39578a4bf7	a2300d8e-9a6a-44ef-b6f1-d1df57929c35	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-18 12:33:06.703924+00	1
353da5a7-8d91-457f-82b5-a949ef7c965c	55f27d3b-6e75-4603-a15d-0d39578a4bf7	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-19 07:43:24.463513+00	1
2942a69f-3466-4099-8488-ff41f1e08116	87c6642a-8fcd-417f-a881-862a9131b9fe	cb012c55-1aad-44d1-9e4d-dcd840ae2d34	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-21 14:31:50.185067+00	1
a699751a-993f-49a3-a265-3905ebb18484	87c6642a-8fcd-417f-a881-862a9131b9fe	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-21 14:32:01.654771+00	1
4c17ec0e-e145-4798-af3c-9bd61c8a1ac7	87c6642a-8fcd-417f-a881-862a9131b9fe	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-21 14:34:33.5+00	2
3197a84d-5845-4030-ba9e-236767896072	87c6642a-8fcd-417f-a881-862a9131b9fe	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-21 14:35:43.002+00	3
e834ce5a-557d-4016-9ac6-19f8670df658	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:16:19.435198+00	1
0fc4bff8-feba-4cc3-9734-aa58008bf8d6	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:25:18.537524+00	1
957bc123-85df-410f-a10d-590ec2a714fc	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:39:01.356884+00	1
8bd7d6f6-468b-45de-a5d0-52f2b04bbbf0	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:57:39.259586+00	1
f59a50f8-e9ad-4e49-b720-43e6d89a6aa3	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 06:58:31.35468+00	1
23bdcb2f-7989-4b22-8fc4-4cf420d28431	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 07:00:09.491669+00	1
edd0a433-9b35-4441-bddd-0edf788ba862	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 07:04:47.624201+00	1
84a2e037-e6ff-41a8-971c-8af528e724a7	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 07:14:17.642403+00	1
894de8a0-248f-42eb-8887-b75fff9fd969	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 07:14:46.710481+00	1
4275beb2-4ab8-4667-b1c6-2ebdfbe98120	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 07:15:21.872694+00	1
4136496a-c8b5-4af0-9224-cf562f66ef2b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-11 02:40:31.499017+00	1
99c7ab90-2e7f-4d01-8095-fc7e0ae4b783	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:07:34.07008+00	1
284bc35f-f9a5-4d5c-b002-315d6da558d5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-03-06 02:41:34.799537+00	1
6f1db8c1-5cd9-4dc9-839b-d1857eb85280	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:49:36.167059+00	1
cd967c21-5e9f-40b5-aaea-3f86c8c0d044	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:26:21.37571+00	1
a4e6b408-6a53-47d1-8715-86206ad8e527	55f27d3b-6e75-4603-a15d-0d39578a4bf7	cb012c55-1aad-44d1-9e4d-dcd840ae2d34	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-11 02:48:21.422+00	13
36a2c594-b05b-46eb-9a87-6ed7341d4676	87c6642a-8fcd-417f-a881-862a9131b9fe	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-07 06:47:21.847+00	2
d785bdbf-fef7-420d-8ad3-feba14f1cf20	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:02:56.16623+00	1
b5b62a9c-15f1-4a51-b7d0-f734e772c1f8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:03:00.737646+00	1
7cf3b5ac-1c58-4b00-b00d-95c1faa8b220	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:03:39.633625+00	1
2846ef6f-344b-4251-a1b0-4f4f62f09f77	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:03:50.687305+00	1
d8afac1b-bead-4e99-a03b-c4b3f895f77b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:03:55.321713+00	1
ec49893c-b3d4-4cdc-91a2-3ad565db91e4	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:04:02.188255+00	1
b5b81a1e-4539-4726-a61c-aa524cbf3bef	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:04:07.068388+00	1
118d223e-1afa-4616-ab38-8d31af587574	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:04:22.643151+00	1
1aa4f8f6-95e4-4ac6-8313-e5d67ba62acb	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:31:47.547344+00	1
24b8ff2a-a427-46cd-b0ac-58668aa30ed5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-11 06:17:11.503878+00	1
051a634d-9392-43f7-a1f3-4c9058424c0f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:39:16.218051+00	1
6a334257-288e-4e3e-a26b-1f3539ae7a3d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:39:45.57763+00	1
c8759dda-8253-43f6-a462-e242da2a1d11	55f27d3b-6e75-4603-a15d-0d39578a4bf7	a331cfea-1dc0-44f0-981b-9e64e7479572	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:51:11.645+00	11
f6a0ac60-2a73-4e44-ad0b-7cf07e778b68	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:41:01.867328+00	1
8cc2d4fb-3b00-4b72-9d15-7a2728b1041d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:41:12.120285+00	1
9c34c8d8-970f-4a04-9f80-1cdf56a8de37	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-10 08:49:37.096983+00	1
7785fe3d-d421-4187-a1ce-385e535ca1e7	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 00:58:00.653124+00	1
28592411-2be9-46de-8a1f-1d8ad85053b8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 01:24:18.749064+00	1
26ade5e2-24af-43d8-a1ed-a29ecbe60a5b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 01:26:49.383525+00	1
cff3babd-be87-44b2-af12-ad9e59a664cf	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-06 06:33:04.759021+00	1
e63fce88-df50-46e4-8d01-549205631bf1	55f27d3b-6e75-4603-a15d-0d39578a4bf7	a70aa08d-e279-482f-8ae0-c0c3276a01fa	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-06 06:33:16.617+00	22
b86123f9-8394-49e1-96b6-89ca626d1261	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-06 06:33:22.787448+00	1
0eebd31c-9924-4706-9525-2965ee61bef6	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:49:36.255393+00	1
9c9dadc4-0027-4e23-9d50-289b246db61b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2cfed06f-68fc-4fff-8627-7a39cf356ae6	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-02 07:32:57.005+00	4
c490a8f6-c24e-45e7-991d-2e54c73447a3	55f27d3b-6e75-4603-a15d-0d39578a4bf7	29dc26d3-6fc0-4015-98fd-a9c9e047f91c	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:56:05.569+00	29
551eaf60-67c2-4468-9cd0-b02035dc524e	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:28:25.953182+00	1
cecb4dbb-92c3-47c8-a1cd-df72a8034175	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 06:36:09.36547+00	1
afee4f3f-09f6-49ba-811f-35f642bb94b9	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:04:28.862449+00	1
845daa2a-d115-47e9-9fb9-289c30cb117a	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:04:29.002863+00	1
9ee0f220-bbfa-4557-9379-0570ee568e6c	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:07:26.243309+00	1
747e748c-9419-4c2d-8dc8-2234a9d817dc	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:07:26.357292+00	1
04424a6f-e259-48dc-9592-3b31f0286381	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:07:29.490774+00	1
1c8412ef-f2e9-41cd-97e5-9e11edf341b7	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:07:29.627004+00	1
55d10307-9180-444e-b1aa-a8bbf3e074bf	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 06:58:32.229929+00	1
771ca46c-2bfa-474f-8f7b-3f168bd4a098	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-11 07:30:21.118614+00	1
f16dff83-a5a5-414c-a9fe-7e7d206aa53f	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-13 02:30:00.288278+00	1
f4eceec9-795e-4ad6-8a9c-a563030d78c9	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-16 02:59:04.03452+00	1
9d3a1f1d-ee83-4fa6-975d-8ec9dff7cecc	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-16 02:59:04.034531+00	1
c60d1e61-d66a-4cdd-a421-1f525dda29b0	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-16 10:14:40.050073+00	1
a87b4a6e-b567-47c3-8555-e9ca50c9e534	0a69d5d8-6247-45f3-8188-50c2f1a2b780	a87574e3-e055-4f51-8997-85b1f5eb9acc	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:04:56.436505+00	1
83685e19-82dd-4253-a670-ee9da75cede0	55f27d3b-6e75-4603-a15d-0d39578a4bf7	30cb0ce1-69c4-4040-8a42-c570cd64ed79	fe25be4f-ef6d-4e06-8a07-c51f7f1e2796	ed15289a-165d-4768-b160-6ed4bf180bf7	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 05:54:02.617331+00	1
f3ba952b-58fc-47d6-a843-dbfaab80e25a	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:13.027335+00	1
b56c68c8-daf7-47d9-86f1-34b9682d2db1	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:05:27.891328+00	1
2423c98b-b3d9-475e-960f-050c547d5e57	0a69d5d8-6247-45f3-8188-50c2f1a2b780	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:08:59.456163+00	1
08a991d1-d6f6-47d4-80b5-a28c9738ca41	0a69d5d8-6247-45f3-8188-50c2f1a2b780	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:03.078529+00	1
05fad857-46e7-456f-8457-eb6b1fdbf6bf	0a69d5d8-6247-45f3-8188-50c2f1a2b780	7f29bc6f-2d09-4ec8-b5d4-fa1a007be603	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:07.47399+00	1
fdabf81c-6bf2-4806-8452-b9660add6158	0a69d5d8-6247-45f3-8188-50c2f1a2b780	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:09:12.489677+00	1
df8f9632-c54b-4d7e-bc75-2400c934f5a9	0a69d5d8-6247-45f3-8188-50c2f1a2b780	a87574e3-e055-4f51-8997-85b1f5eb9acc	6ff903a3-eb15-47d6-92ef-b204947a3319	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:13:17.777184+00	1
48bd7370-1e02-4f5f-a756-c377f2df2553	0a69d5d8-6247-45f3-8188-50c2f1a2b780	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:13:29.813316+00	1
32d25bb3-9055-4165-b830-3015af5c685a	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:41:56.653483+00	1
e8911551-24db-4cb7-9617-3bc4274960e5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-17 08:42:44.033744+00	1
3af6846a-7184-46a2-ae24-944538ff9314	87c6642a-8fcd-417f-a881-862a9131b9fe	9ee05474-e856-4851-8a42-0118d322fb15	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-21 14:35:22.796+00	5
7a6954a2-bdca-422b-bb99-1b3a3c1c3d2d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	d6cae502-8c47-4172-a5f4-47d0cb5c7983	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-22 06:00:03.781+00	19
99d97e23-4923-486f-99ec-a05f9c34e779	87c6642a-8fcd-417f-a881-862a9131b9fe	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-19 07:52:06.517+00	7
cfc49df8-f66b-44f4-ac7d-6b6edf3a7774	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-22 04:46:26.213301+00	1
bb46f63c-0417-406c-be07-1a87399f9e7c	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-26 02:11:44.136725+00	1
c0d92be7-40ed-4d82-8802-49523a27f6b4	87c6642a-8fcd-417f-a881-862a9131b9fe	a70aa08d-e279-482f-8ae0-c0c3276a01fa	8365ba25-1b79-44b1-b44f-4a4e078109c9	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-19 07:52:12.116+00	2
4152e65a-60ba-4bdb-8883-0daa13f0d5ab	87c6642a-8fcd-417f-a881-862a9131b9fe	29dc26d3-6fc0-4015-98fd-a9c9e047f91c	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-03-05 06:29:19.701+00	6
64f14da6-762e-4329-8b8d-abe1936f97e8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-26 05:29:11.293074+00	1
2bfe4350-e837-4b41-b5b4-d22a53e04a33	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2025-12-26 05:33:37.711917+00	1
5a364f59-544f-4303-b7a4-d4d741bd8624	f42df23d-f599-4cb8-9bee-a90ae6370bb7	777b09c0-db4c-47c0-aa80-0ffcf54e9c9f	97177207-ec1c-4ce5-9ac8-2b2dd2956fad	57aa959a-90f9-440d-9c28-1a381c1aabb8	e7134118-47d4-4d4d-998d-0b0bd2a1c445	2026-03-05 12:32:59.902+00	73
28acae41-717f-4f6b-96f4-75b1684c29f9	f42df23d-f599-4cb8-9bee-a90ae6370bb7	9381966d-c836-44eb-bf77-db8c8f693923	8da8923e-2700-4e07-a298-b336b99e7df7	518e6da2-71fa-4d35-a690-2fbf68b9ed1a	e7134118-47d4-4d4d-998d-0b0bd2a1c445	2026-03-07 00:00:57.379+00	35
daa59748-2dd8-4a30-a799-81f43266cceb	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-06 06:33:04.842601+00	1
d693abd2-f6e4-49a4-9918-0ddcb93f0e32	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-07 07:11:21.503702+00	1
74e98ae5-a8da-449f-a569-6999612cf890	55f27d3b-6e75-4603-a15d-0d39578a4bf7	188704b7-553c-4974-8213-1bd00d13feeb	b257df00-5b52-4739-85a1-b5cd5c839126	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-07 07:34:11.582917+00	1
6b965a90-03e1-492d-8cc5-5234a361c899	87c6642a-8fcd-417f-a881-862a9131b9fe	bac0023a-8673-4269-8b53-fea6e60a8374	27cc66ba-4ef2-445f-bdc5-19a4637bd790	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-08 09:05:17.196052+00	1
d0582a41-ade0-425f-ba2f-ba8a8f1c0bfe	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-11 15:33:26.758165+00	1
cabd406d-2720-47e0-a278-66e9f9a1bfde	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-02 05:09:27.227382+00	1
1e39b1f9-6f04-470c-9c64-c5741435087e	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-02 05:09:27.324059+00	1
d914a3ab-64bf-45c9-9cd1-08f9930db668	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-11 06:13:19.325215+00	1
883f79e3-5326-4149-b7a2-31b0ce5675d9	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-11 06:33:48.988876+00	1
0c636ac7-6ac6-46a0-a4b5-177e381842a5	a9472a7e-2ee0-4404-bcaf-3ba764f1823c	2f65161e-420f-4c7c-8ef0-f91154f0002f	fc606c20-02d9-4cde-bcf0-569374ed61f7	e3da437e-4d84-41d1-8127-f553a0352e02	22c65fbe-5e3b-4018-8eb9-11772e40f8f3	2026-02-24 08:49:58.45+00	5
f774e088-07c8-420c-9661-9301c583a13f	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:16.360464+00	1
cd259ec7-7e4e-4f8c-b645-55196311846b	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-14 06:32:11.506613+00	1
6758a1c2-675e-464e-a023-30072d9df68c	55f27d3b-6e75-4603-a15d-0d39578a4bf7	1df44756-5631-4eb4-b993-cd7fec8ab2a8	62ca205f-28bc-40da-971d-913001a46352	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-01-14 06:43:23.45145+00	1
238b7eab-f426-4f8c-ad08-451ae4a6c2b1	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:16.464798+00	1
ee3eecdd-ae09-4373-a5b5-8a7f4a8d6c9e	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:21.622528+00	1
26e204a3-c294-4091-8d82-51682b1c7258	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:21.745559+00	1
e275e0cf-cf61-4d9f-8d8c-0ec144c3c9a6	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:25.031563+00	1
60c2b6dd-f59d-4763-8f3e-869d5e2035e6	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:36:25.166682+00	1
c127a8fb-8f6f-4926-973d-568c18efd3bf	3f55810e-a70e-4466-a317-68412219342e	ef480a19-d3f6-4077-be3f-b5dbed27af48	ff596867-3dc9-4917-89c1-97b19412b59c	8cc4a1ce-d211-4e33-8fe4-86e020a6a84c	8a582b82-a62c-4a9c-a7a1-95c39efb4b7e	2026-01-28 11:31:49.635788+00	1
fcd86f03-d726-4a8d-a962-248ccf225a63	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:39:30.450911+00	1
ff297886-debf-4562-8a20-483575e9ff22	87c6642a-8fcd-417f-a881-862a9131b9fe	7fd21bc7-96c0-48ed-95e6-c83aeaa9407a	7725515a-fc7f-4de8-888d-005fc7a12ca3	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-04 08:39:30.583998+00	1
b19565d8-a9d7-4963-a836-ba5d954132b5	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:50:38.072787+00	1
c5056574-c8d8-4eed-adc9-88d8f13aa9e8	55f27d3b-6e75-4603-a15d-0d39578a4bf7	fcc2c66b-4bad-4ddb-8dbc-f2eddec10a7c	3dfa0828-7ea4-4003-966b-d90a01f423ed	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:55:10.194+00	9
abd59952-5821-4cc9-a537-a4a86ff81814	55f27d3b-6e75-4603-a15d-0d39578a4bf7	bac0023a-8673-4269-8b53-fea6e60a8374	27cc66ba-4ef2-445f-bdc5-19a4637bd790	05c8cab4-694a-48ae-9bfb-394f8dce13a9	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-19 06:08:50.136+00	6
d79d295f-da41-4220-b059-bd5c6c09002d	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-19 07:13:25.732469+00	1
ebeb7b6a-464c-4139-b928-260c163edaac	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-06 04:47:26.045702+00	1
d10f22a6-aff0-4c87-8f23-d6040ae55316	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-06 04:47:26.13712+00	1
5f73d8e4-85b4-4a05-a941-57d973f97946	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-06 04:47:42.825049+00	1
681a24b1-83f2-46a9-b2f6-493c382803ea	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-06 04:47:42.933864+00	1
3f406847-2c85-443f-a597-0749384c8e15	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-09 01:29:35.767372+00	1
92f1fb9a-c95e-4758-9464-bcae4fa25eef	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-09 01:29:35.867275+00	1
a7d508ef-4a51-4d09-919a-5ad4e1fa3e48	55f27d3b-6e75-4603-a15d-0d39578a4bf7	2f28b94b-3b61-446b-a74d-d479b33feece	4caed075-740e-4066-a0d2-a4a184a15f3f	e7a4b0f9-af44-49a7-a758-1857e91a96a3	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-19 07:13:25.851679+00	1
5bdecf37-f2f7-4581-9b85-bf98fe1e8625	55f27d3b-6e75-4603-a15d-0d39578a4bf7	95a6b5a3-878b-4a60-8ef4-766a1a64142a	bf9d98d5-9ac4-40a4-b4f1-90ba543a8eb1	b860e052-39b8-444f-bf2a-fbafdafafdc8	3f9ccd94-e6d6-4267-a156-434186524ac9	2026-02-25 06:50:38.18012+00	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, role, department_id, created_at, company_id, push_id) FROM stdin;
9f724d37-becc-4e22-a727-cb56cb853174	123abc@abc.com	1111	admin	\N	2025-11-25 06:21:48.064385	\N	\N
db45b580-b529-4281-b5fe-167a7cbb582e	a123@abc.com	232	admin	\N	2025-11-25 06:25:08.231801	\N	\N
88284e97-d1bb-425c-8320-7d7a29f14482	team1@company.com	팀원1	team	e7a4b0f9-af44-49a7-a758-1857e91a96a3	2025-11-28 01:42:44.767123	\N	\N
2e0583b2-b76f-490a-8180-131ccbd57422	admin3@company.com	관리자3	admin	\N	2025-11-28 06:08:26.482032	e34fb54b-87d5-4b82-858d-4d84e0e0600a	\N
9a565e9d-6e6e-48be-8790-3ef4ffdf63a4	jdc291@naver.com	정도천	admin	\N	2025-11-26 08:11:06.266472	1666bb6d-8003-44c1-bc50-b54b13730ad2	\N
34173854-fc68-4af1-883b-67b8c2139944	team4@company.com	team4@company.com	team	\N	\N	\N	\N
0a69d5d8-6247-45f3-8188-50c2f1a2b780	team5@company.com	팀원5	team	37eea1e3-2c23-426c-bca7-a0acbbafa5a0	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
def3564b-73bd-4238-958f-4cc58ca59f50	team2@company.com	이영희	team	e7a4b0f9-af44-49a7-a758-1857e91a96a3	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
313ed743-fc8b-4bb7-bd4e-b66460edb9b4	team3@company.com	박민수	team	ed15289a-165d-4768-b160-6ed4bf180bf7	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
3d70caea-80dd-41fe-9a50-620910a09801	dbkchrpjkz@privaterelay.appleid.com	dbkchrpjkz@privaterelay.appleid.com	team	2bb2eeec-9865-4e3e-8cfe-43391e812e62	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
9c4614a7-296b-40db-9b30-10389dabaa35	traystoragekor@gmail.com	트레이스토리지한국	admin	\N	2025-12-04 07:21:25.741621	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
080d144a-c9aa-40f7-902c-54fe2b63fc6a	admin0001@company.com	관리자	admin	\N	\N	2bf42ea4-8284-4739-a977-654856b2e79f	\N
2d832ad2-c8c1-4d03-823f-f0dd8f9559de	infojdc@infocreative.co.kr	홍길동	team	57aa959a-90f9-440d-9c28-1a381c1aabb8	\N	e7134118-47d4-4d4d-998d-0b0bd2a1c445	\N
0c5887ec-f8ea-470f-86ab-ac9b0766c302	tto@naver.com	김길동	team	6c79e555-1c43-45bf-9a28-1164658bc412	\N	e7134118-47d4-4d4d-998d-0b0bd2a1c445	\N
a807a941-7f9c-41bb-9c9e-2b9d38bdc56b	gwname1234@gmail.com	이름이름	admin	\N	\N	c82a58aa-aecb-4dd5-9f9e-c478b18c371a	\N
13280183-dc92-430d-ab61-fd510c4a36eb	regendhero5@naver.com	김민	team	b860e052-39b8-444f-bf2a-fbafdafafdc8	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
c8211af6-bf04-4c29-aa0d-a4a159358017	legendherokim@gmail.com	카카오	team	2bb2eeec-9865-4e3e-8cfe-43391e812e62	\N	3f9ccd94-e6d6-4267-a156-434186524ac9	\N
3f55810e-a70e-4466-a317-68412219342e	infocreativecoltd@gmail.com	주식회사 인포크리에이티브	admin	\N	2025-12-03 06:31:28.429668	8a582b82-a62c-4a9c-a7a1-95c39efb4b7e	\N
a865890a-0597-4f91-8491-803ac63633fb	min.kim9914@gmail.com	t	admin	\N	\N	07cbdd6e-6294-4883-9204-238d728e3d11	\N
a9472a7e-2ee0-4404-bcaf-3ba764f1823c	info@infocreative.co.kr	정도천	admin	\N	\N	22c65fbe-5e3b-4018-8eb9-11772e40f8f3	\N
d2d97c12-28ad-4e7e-884a-7b657f9c5a26	yellowin2@gmail.com	changkeun hwang	admin	\N	\N	f4d49713-b40a-4ac8-a0ca-36ee41aef974	\N
87c6642a-8fcd-417f-a881-862a9131b9fe	team@company.com	김철수	team	05c8cab4-694a-48ae-9bfb-394f8dce13a9	2025-11-25 06:02:09.374699	3f9ccd94-e6d6-4267-a156-434186524ac9	8ea7066b-a3e4-4477-909f-bfff27acbf31
55f27d3b-6e75-4603-a15d-0d39578a4bf7	admin@company.com	홍길동	admin	\N	2025-11-21 05:19:48.769787	3f9ccd94-e6d6-4267-a156-434186524ac9	2263dbbd-cd87-42f8-a505-34ee63a73c7a
f42df23d-f599-4cb8-9bee-a90ae6370bb7	infoceo79@gmail.com	정도천	admin	\N	\N	e7134118-47d4-4d4d-998d-0b0bd2a1c445	8c9eb3c2-84dd-4b66-9f23-c3c2c1d2ecef
\.


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: announcement_comments announcement_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: categories categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_code_key UNIQUE (code);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: companies companies_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_key UNIQUE (code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: nfc_mappings nfc_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_mappings
    ADD CONSTRAINT nfc_mappings_pkey PRIMARY KEY (id);


--
-- Name: nfc_mappings nfc_mappings_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_mappings
    ADD CONSTRAINT nfc_mappings_tag_id_key UNIQUE (tag_id);


--
-- Name: nfc_tags nfc_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_tags
    ADD CONSTRAINT nfc_tags_pkey PRIMARY KEY (id);


--
-- Name: nfc_tags nfc_tags_tag_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_tags
    ADD CONSTRAINT nfc_tags_tag_uid_key UNIQUE (tag_uid);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permission_requests permission_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_pkey PRIMARY KEY (id);


--
-- Name: phone_verifications phone_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_verifications
    ADD CONSTRAINT phone_verifications_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: shared_documents shared_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_notification_muted_categories user_notification_muted_categori_user_id_parent_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_muted_categories
    ADD CONSTRAINT user_notification_muted_categori_user_id_parent_category_id_key UNIQUE (user_id, parent_category_id);


--
-- Name: user_notification_muted_categories user_notification_muted_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_muted_categories
    ADD CONSTRAINT user_notification_muted_categories_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_company_id_key UNIQUE (user_id, company_id);


--
-- Name: user_notification_status user_notification_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_status
    ADD CONSTRAINT user_notification_status_pkey PRIMARY KEY (id);


--
-- Name: user_notification_status user_notification_status_user_id_notification_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_status
    ADD CONSTRAINT user_notification_status_user_id_notification_id_key UNIQUE (user_id, notification_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_department_id_key UNIQUE (user_id, department_id);


--
-- Name: user_recent_visits user_recent_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: documents_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_account_deletion_requests_scheduled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_deletion_requests_scheduled ON public.account_deletion_requests USING btree (scheduled_deletion_at) WHERE (status = 'pending'::text);


--
-- Name: idx_account_deletion_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_deletion_requests_status ON public.account_deletion_requests USING btree (status);


--
-- Name: idx_account_deletion_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_deletion_requests_user_id ON public.account_deletion_requests USING btree (user_id);


--
-- Name: idx_announcement_comments_announcement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcement_comments_announcement_id ON public.announcement_comments USING btree (announcement_id);


--
-- Name: idx_announcement_comments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcement_comments_user_id ON public.announcement_comments USING btree (user_id);


--
-- Name: idx_announcements_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_company_id ON public.announcements USING btree (company_id);


--
-- Name: idx_announcements_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at DESC);


--
-- Name: idx_categories_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_company_id ON public.categories USING btree (company_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages USING btree (user_id);


--
-- Name: idx_companies_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_code ON public.companies USING btree (code);


--
-- Name: idx_departments_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_company_id ON public.departments USING btree (company_id);


--
-- Name: idx_departments_company_id_code_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_departments_company_id_code_unique ON public.departments USING btree (company_id, code);


--
-- Name: idx_documents_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_company_id ON public.documents USING btree (company_id);


--
-- Name: idx_documents_ocr_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_ocr_trgm ON public.documents USING gin (ocr_text public.gin_trgm_ops);


--
-- Name: idx_documents_parent_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_parent_category_id ON public.documents USING btree (parent_category_id);


--
-- Name: idx_documents_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_subcategory_id ON public.documents USING btree (subcategory_id);


--
-- Name: idx_documents_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_title_trgm ON public.documents USING gin (title public.gin_trgm_ops);


--
-- Name: idx_muted_categories_parent_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_muted_categories_parent_category_id ON public.user_notification_muted_categories USING btree (parent_category_id);


--
-- Name: idx_muted_categories_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_muted_categories_user_id ON public.user_notification_muted_categories USING btree (user_id);


--
-- Name: idx_nfc_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nfc_category_id ON public.nfc_mappings USING btree (subcategory_id);


--
-- Name: idx_nfc_mappings_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nfc_mappings_category_id ON public.nfc_mappings USING btree (subcategory_id);


--
-- Name: idx_nfc_mappings_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nfc_mappings_tag_id ON public.nfc_mappings USING btree (tag_id);


--
-- Name: idx_nfc_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nfc_tag_id ON public.nfc_mappings USING btree (tag_id);


--
-- Name: idx_nfc_tags_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nfc_tags_company_id ON public.nfc_tags USING btree (company_id);


--
-- Name: idx_notifications_target_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_target_user_id ON public.notifications USING btree (target_user_id);


--
-- Name: idx_permission_requests_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_requests_company_id ON public.permission_requests USING btree (company_id);


--
-- Name: idx_permission_requests_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_requests_department_id ON public.permission_requests USING btree (department_id);


--
-- Name: idx_permission_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_requests_status ON public.permission_requests USING btree (status);


--
-- Name: idx_permission_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permission_requests_user_id ON public.permission_requests USING btree (user_id);


--
-- Name: idx_phone_verifications_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications USING btree (expires_at);


--
-- Name: idx_phone_verifications_phone_purpose_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_verifications_phone_purpose_created_at ON public.phone_verifications USING btree (phone, purpose, created_at DESC);


--
-- Name: idx_search_history_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_history_company_id ON public.search_history USING btree (company_id);


--
-- Name: idx_search_history_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_history_query ON public.search_history USING btree (query);


--
-- Name: idx_search_history_search_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_history_search_count ON public.search_history USING btree (search_count DESC);


--
-- Name: idx_search_history_searched_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_history_searched_at ON public.search_history USING btree (searched_at DESC);


--
-- Name: idx_search_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_history_user_id ON public.search_history USING btree (user_id);


--
-- Name: idx_shared_documents_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shared_documents_document_id ON public.shared_documents USING btree (document_id);


--
-- Name: idx_shared_documents_shared_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shared_documents_shared_at ON public.shared_documents USING btree (shared_at DESC);


--
-- Name: idx_shared_documents_shared_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shared_documents_shared_by ON public.shared_documents USING btree (shared_by_user_id);


--
-- Name: idx_shared_documents_shared_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shared_documents_shared_to ON public.shared_documents USING btree (shared_to_user_id);


--
-- Name: idx_subcategories_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_company_id ON public.subcategories USING btree (company_id);


--
-- Name: idx_subcategories_default_expiry_days; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_default_expiry_days ON public.subcategories USING btree (default_expiry_days) WHERE (default_expiry_days IS NOT NULL);


--
-- Name: idx_subcategories_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_department_id ON public.subcategories USING btree (department_id);


--
-- Name: idx_subcategories_dept_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_dept_parent ON public.subcategories USING btree (department_id, parent_category_id);


--
-- Name: idx_subcategories_expiry_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_expiry_date ON public.subcategories USING btree (expiry_date DESC) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_subcategories_management_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_management_number ON public.subcategories USING btree (management_number);


--
-- Name: idx_subcategories_nfc_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_nfc_tag_id ON public.subcategories USING btree (nfc_tag_id) WHERE (nfc_tag_id IS NOT NULL);


--
-- Name: idx_subcategories_parent_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_parent_category_id ON public.subcategories USING btree (parent_category_id);


--
-- Name: idx_unique_pending_deletion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_pending_deletion ON public.account_deletion_requests USING btree (user_id) WHERE (status = 'pending'::text);


--
-- Name: idx_user_favorites_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_favorites_company_id ON public.user_favorites USING btree (company_id);


--
-- Name: idx_user_favorites_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_favorites_subcategory_id ON public.user_favorites USING btree (subcategory_id);


--
-- Name: idx_user_favorites_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id);


--
-- Name: idx_user_notification_preferences_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_preferences_company_id ON public.user_notification_preferences USING btree (company_id);


--
-- Name: idx_user_notification_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences USING btree (user_id);


--
-- Name: idx_user_notification_status_notification_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_status_notification_id ON public.user_notification_status USING btree (notification_id);


--
-- Name: idx_user_notification_status_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_status_user_id ON public.user_notification_status USING btree (user_id);


--
-- Name: idx_user_permissions_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_company_id ON public.user_permissions USING btree (company_id) WHERE (company_id IS NOT NULL);


--
-- Name: idx_user_permissions_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_department_id ON public.user_permissions USING btree (department_id);


--
-- Name: idx_user_permissions_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_lookup ON public.user_permissions USING btree (user_id, department_id, company_id);


--
-- Name: idx_user_permissions_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_role ON public.user_permissions USING btree (role);


--
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);


--
-- Name: idx_user_recent_visits_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recent_visits_company_id ON public.user_recent_visits USING btree (company_id);


--
-- Name: idx_user_recent_visits_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recent_visits_subcategory_id ON public.user_recent_visits USING btree (subcategory_id);


--
-- Name: idx_user_recent_visits_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recent_visits_user_id ON public.user_recent_visits USING btree (user_id);


--
-- Name: idx_user_recent_visits_visited_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recent_visits_visited_at ON public.user_recent_visits USING btree (visited_at DESC);


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_push_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_push_id ON public.users USING btree (push_id) WHERE (push_id IS NOT NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: user_permissions set_user_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_user_permissions_updated_at();


--
-- Name: permission_requests trigger_auto_grant_permission; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_grant_permission AFTER UPDATE ON public.permission_requests FOR EACH ROW EXECUTE FUNCTION public.auto_grant_permission();


--
-- Name: account_deletion_requests trigger_update_account_deletion_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_account_deletion_requests_updated_at BEFORE UPDATE ON public.account_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.update_account_deletion_requests_updated_at();


--
-- Name: user_permissions update_user_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_deletion_requests account_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: announcement_comments announcement_comments_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_comments announcement_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: categories categories_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: departments departments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: documents documents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: documents documents_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: documents documents_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: documents documents_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: documents fk_documents_uploaded_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: permission_requests fk_permission_requests_processed_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT fk_permission_requests_processed_by FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: permission_requests fk_permission_requests_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT fk_permission_requests_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites fk_user_favorites_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT fk_user_favorites_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_permissions fk_user_permissions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT fk_user_permissions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits fk_user_recent_visits_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT fk_user_recent_visits_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users fk_users_departments; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_departments FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: nfc_mappings nfc_mappings_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_mappings
    ADD CONSTRAINT nfc_mappings_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES auth.users(id);


--
-- Name: nfc_mappings nfc_mappings_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_mappings
    ADD CONSTRAINT nfc_mappings_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: nfc_tags nfc_tags_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_tags
    ADD CONSTRAINT nfc_tags_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: nfc_tags nfc_tags_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nfc_tags
    ADD CONSTRAINT nfc_tags_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: permission_requests permission_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: permission_requests permission_requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shared_documents shared_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: shared_documents shared_documents_shared_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_shared_by_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shared_documents shared_documents_shared_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_shared_to_user_id_fkey FOREIGN KEY (shared_to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_muted_categories user_notification_muted_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_muted_categories
    ADD CONSTRAINT user_notification_muted_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_notification_muted_categories user_notification_muted_categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_muted_categories
    ADD CONSTRAINT user_notification_muted_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_status user_notification_status_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_status
    ADD CONSTRAINT user_notification_status_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: user_notification_status user_notification_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_status
    ADD CONSTRAINT user_notification_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits user_recent_visits_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits user_recent_visits_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits user_recent_visits_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits user_recent_visits_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: user_recent_visits user_recent_visits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recent_visits
    ADD CONSTRAINT user_recent_visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: announcements Admins can create announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text) AND (users.company_id = announcements.company_id)))));


--
-- Name: announcements Admins can delete announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: announcements Admins can update announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: user_permissions Admins can view all permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all permissions" ON public.user_permissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: companies Anyone can create companies for signup; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can create companies for signup" ON public.companies FOR INSERT TO anon WITH CHECK (true);


--
-- Name: companies Anyone can read companies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read companies" ON public.companies FOR SELECT TO authenticated USING (true);


--
-- Name: companies Anyone can view companies for signup; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view companies for signup" ON public.companies FOR SELECT TO anon USING (true);


--
-- Name: companies Authenticated users can create companies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: companies Authenticated users can insert companies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: companies Authenticated users can view all companies for verification; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all companies for verification" ON public.companies FOR SELECT TO authenticated USING (true);


--
-- Name: departments Authenticated users can view departments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING ((company_id = ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: users Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users" ON public.users FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: users Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: users Enable update for users based on id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update for users based on id" ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: nfc_tags Managers can create NFC tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can create NFC tags" ON public.nfc_tags FOR INSERT TO authenticated WITH CHECK (((company_id = ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))) AND ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM (public.subcategories s
     JOIN public.user_permissions up ON ((up.department_id = s.department_id)))
  WHERE ((s.id = nfc_tags.subcategory_id) AND (up.user_id = auth.uid()) AND (up.role = 'manager'::text)))))));


--
-- Name: nfc_mappings Managers can register NFC tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can register NFC tags" ON public.nfc_mappings FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM (public.subcategories s
     JOIN public.user_permissions up ON ((up.department_id = s.department_id)))
  WHERE ((s.id = nfc_mappings.subcategory_id) AND (up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['manager'::text, 'editor'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: nfc_mappings Managers can update NFC mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can update NFC mappings" ON public.nfc_mappings FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM (public.subcategories s
     JOIN public.user_permissions up ON ((up.department_id = s.department_id)))
  WHERE ((s.id = nfc_mappings.subcategory_id) AND (up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['manager'::text, 'editor'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: departments Only admins can delete departments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can delete departments" ON public.departments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: user_permissions Only admins can delete permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can delete permissions" ON public.user_permissions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: departments Only admins can insert departments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: user_permissions Only admins can insert permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can insert permissions" ON public.user_permissions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: departments Only admins can update departments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can update departments" ON public.departments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: user_permissions Only admins can update permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can update permissions" ON public.user_permissions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: phone_verifications Service role full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access" ON public.phone_verifications USING (true) WITH CHECK (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: account_deletion_requests Users can cancel own pending deletion requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can cancel own pending deletion requests" ON public.account_deletion_requests FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::text))) WITH CHECK ((auth.uid() = user_id));


--
-- Name: announcement_comments Users can create comments on allowed announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create comments on allowed announcements" ON public.announcement_comments FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.announcements
  WHERE ((announcements.id = announcement_comments.announcement_id) AND (announcements.allow_comments = true)))) AND (user_id = auth.uid())));


--
-- Name: account_deletion_requests Users can create own deletion requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own deletion requests" ON public.account_deletion_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: shared_documents Users can deactivate their shares; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can deactivate their shares" ON public.shared_documents FOR UPDATE TO authenticated USING ((shared_by_user_id = auth.uid())) WITH CHECK ((shared_by_user_id = auth.uid()));


--
-- Name: categories Users can delete categories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete categories with manager permission" ON public.categories FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = categories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: documents Users can delete documents with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete documents with manager permission" ON public.documents FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = documents.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: user_notification_muted_categories Users can delete own muted categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own muted categories" ON public.user_notification_muted_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: subcategories Users can delete subcategories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete subcategories with manager permission" ON public.subcategories FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = subcategories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: announcement_comments Users can delete their own comments or admins can delete any; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own comments or admins can delete any" ON public.announcement_comments FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: user_favorites Users can delete their own favorites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own favorites" ON public.user_favorites FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_notification_status Users can delete their own notification status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own notification status" ON public.user_notification_status FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: shared_documents Users can delete their shares; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their shares" ON public.shared_documents FOR DELETE TO authenticated USING (((shared_by_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: categories Users can insert categories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert categories with manager permission" ON public.categories FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = categories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: documents Users can insert documents with editor permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert documents with editor permission" ON public.documents FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = documents.department_id) AND (user_permissions.role = ANY (ARRAY['editor'::text, 'manager'::text])))))));


--
-- Name: chat_messages Users can insert own chat messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_muted_categories Users can insert own muted categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own muted categories" ON public.user_notification_muted_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: search_history Users can insert own search history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own search history" ON public.search_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: subcategories Users can insert subcategories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert subcategories with manager permission" ON public.subcategories FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = subcategories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: user_favorites Users can insert their own favorites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own favorites" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_status Users can insert their own notification status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own notification status" ON public.user_notification_status FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: users Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_recent_visits Users can insert their own recent visits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own recent visits" ON public.user_recent_visits FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: shared_documents Users can share their documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can share their documents" ON public.shared_documents FOR INSERT TO authenticated WITH CHECK ((shared_by_user_id = auth.uid()));


--
-- Name: categories Users can update categories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update categories with manager permission" ON public.categories FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = categories.department_id) AND (user_permissions.role = 'manager'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = categories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: documents Users can update documents with editor permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update documents with editor permission" ON public.documents FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = documents.department_id) AND (user_permissions.role = ANY (ARRAY['editor'::text, 'manager'::text]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = documents.department_id) AND (user_permissions.role = ANY (ARRAY['editor'::text, 'manager'::text])))))));


--
-- Name: user_notification_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own preferences" ON public.user_notification_preferences FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: search_history Users can update own search history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own search history" ON public.search_history FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: subcategories Users can update subcategories with manager permission; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update subcategories with manager permission" ON public.subcategories FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = subcategories.department_id) AND (user_permissions.role = 'manager'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = subcategories.department_id) AND (user_permissions.role = 'manager'::text))))));


--
-- Name: announcement_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own comments" ON public.announcement_comments FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: companies Users can update their own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own company" ON public.companies FOR UPDATE TO authenticated USING ((id IN ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: user_notification_status Users can update their own notification status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own notification status" ON public.user_notification_status FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_recent_visits Users can update their own recent visits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own recent visits" ON public.user_recent_visits FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: nfc_mappings Users can view NFC mappings in their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view NFC mappings in their company" ON public.nfc_mappings FOR SELECT TO authenticated USING ((subcategory_id IN ( SELECT subcategories.id
   FROM public.subcategories
  WHERE (subcategories.company_id = ( SELECT users.company_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: nfc_tags Users can view NFC tags in their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view NFC tags in their company" ON public.nfc_tags FOR SELECT TO authenticated USING ((company_id = ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: announcements Users can view announcements from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view announcements from their company" ON public.announcements FOR SELECT TO authenticated USING ((company_id IN ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: categories Users can view categories they have access to; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view categories they have access to" ON public.categories FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = categories.department_id) AND (user_permissions.role = ANY (ARRAY['viewer'::text, 'editor'::text, 'manager'::text])))))));


--
-- Name: announcement_comments Users can view comments from their company announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view comments from their company announcements" ON public.announcement_comments FOR SELECT TO authenticated USING ((announcement_id IN ( SELECT announcements.id
   FROM public.announcements
  WHERE (announcements.company_id IN ( SELECT users.company_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: documents Users can view documents they have access to; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view documents they have access to" ON public.documents FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = documents.department_id) AND (user_permissions.role = ANY (ARRAY['viewer'::text, 'editor'::text, 'manager'::text])))))));


--
-- Name: notifications Users can view notifications from their company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view notifications from their company" ON public.notifications FOR SELECT TO authenticated USING ((company_id = ( SELECT users.company_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: chat_messages Users can view own chat messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: account_deletion_requests Users can view own deletion requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own deletion requests" ON public.account_deletion_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notification_muted_categories Users can view own muted categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own muted categories" ON public.user_notification_muted_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own preferences" ON public.user_notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: search_history Users can view own search history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own search history" ON public.search_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: shared_documents Users can view shared documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view shared documents" ON public.shared_documents FOR SELECT TO authenticated USING (((shared_by_user_id = auth.uid()) OR (shared_to_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: subcategories Users can view subcategories they have access to; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view subcategories they have access to" ON public.subcategories FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))) OR (department_id = ( SELECT users.department_id
   FROM public.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.user_permissions
  WHERE ((user_permissions.user_id = auth.uid()) AND (user_permissions.department_id = subcategories.department_id) AND (user_permissions.role = ANY (ARRAY['viewer'::text, 'editor'::text, 'manager'::text])))))));


--
-- Name: user_favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own favorites" ON public.user_favorites FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_notification_status Users can view their own notification status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own notification status" ON public.user_notification_status FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_permissions Users can view their own permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_recent_visits Users can view their own recent visits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own recent visits" ON public.user_recent_visits FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: account_deletion_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: announcement_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: nfc_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nfc_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: nfc_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_verifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: search_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: user_favorites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_muted_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_notification_muted_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_notification_status ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_recent_visits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_recent_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION auto_grant_permission(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_grant_permission() TO anon;
GRANT ALL ON FUNCTION public.auto_grant_permission() TO authenticated;
GRANT ALL ON FUNCTION public.auto_grant_permission() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION match_documents(query_embedding public.vector, match_threshold double precision, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer) TO service_role;


--
-- Name: FUNCTION update_account_deletion_requests_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_account_deletion_requests_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_account_deletion_requests_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_account_deletion_requests_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION update_user_permissions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_permissions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_user_permissions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_permissions_updated_at() TO service_role;


--
-- Name: TABLE account_deletion_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_deletion_requests TO anon;
GRANT ALL ON TABLE public.account_deletion_requests TO authenticated;
GRANT ALL ON TABLE public.account_deletion_requests TO service_role;


--
-- Name: TABLE announcement_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.announcement_comments TO anon;
GRANT ALL ON TABLE public.announcement_comments TO authenticated;
GRANT ALL ON TABLE public.announcement_comments TO service_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_messages TO anon;
GRANT ALL ON TABLE public.chat_messages TO authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.departments TO anon;
GRANT ALL ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- Name: TABLE nfc_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nfc_mappings TO anon;
GRANT ALL ON TABLE public.nfc_mappings TO authenticated;
GRANT ALL ON TABLE public.nfc_mappings TO service_role;


--
-- Name: TABLE nfc_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nfc_tags TO anon;
GRANT ALL ON TABLE public.nfc_tags TO authenticated;
GRANT ALL ON TABLE public.nfc_tags TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE permission_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permission_requests TO anon;
GRANT ALL ON TABLE public.permission_requests TO authenticated;
GRANT ALL ON TABLE public.permission_requests TO service_role;


--
-- Name: TABLE phone_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.phone_verifications TO anon;
GRANT ALL ON TABLE public.phone_verifications TO authenticated;
GRANT ALL ON TABLE public.phone_verifications TO service_role;


--
-- Name: TABLE search_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.search_history TO anon;
GRANT ALL ON TABLE public.search_history TO authenticated;
GRANT ALL ON TABLE public.search_history TO service_role;


--
-- Name: TABLE shared_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shared_documents TO anon;
GRANT ALL ON TABLE public.shared_documents TO authenticated;
GRANT ALL ON TABLE public.shared_documents TO service_role;


--
-- Name: TABLE subcategories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subcategories TO anon;
GRANT ALL ON TABLE public.subcategories TO authenticated;
GRANT ALL ON TABLE public.subcategories TO service_role;


--
-- Name: TABLE user_favorites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_favorites TO anon;
GRANT ALL ON TABLE public.user_favorites TO authenticated;
GRANT ALL ON TABLE public.user_favorites TO service_role;


--
-- Name: TABLE user_notification_muted_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_notification_muted_categories TO anon;
GRANT ALL ON TABLE public.user_notification_muted_categories TO authenticated;
GRANT ALL ON TABLE public.user_notification_muted_categories TO service_role;


--
-- Name: TABLE user_notification_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_notification_preferences TO anon;
GRANT ALL ON TABLE public.user_notification_preferences TO authenticated;
GRANT ALL ON TABLE public.user_notification_preferences TO service_role;


--
-- Name: TABLE user_notification_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_notification_status TO anon;
GRANT ALL ON TABLE public.user_notification_status TO authenticated;
GRANT ALL ON TABLE public.user_notification_status TO service_role;


--
-- Name: TABLE user_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_permissions TO anon;
GRANT ALL ON TABLE public.user_permissions TO authenticated;
GRANT ALL ON TABLE public.user_permissions TO service_role;


--
-- Name: TABLE user_recent_visits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_recent_visits TO anon;
GRANT ALL ON TABLE public.user_recent_visits TO authenticated;
GRANT ALL ON TABLE public.user_recent_visits TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict 3eWnAngPcoH6vuDS8KrctblgfT15FTgHoX7WjE3Gz1DtEtxLkSS9n27agWUZVyP

