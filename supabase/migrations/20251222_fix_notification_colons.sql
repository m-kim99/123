-- Remove colons from existing notification messages
UPDATE notifications
SET message = REPLACE(message, '문서 등록:', '문서 등록')
WHERE message LIKE '%문서 등록:%';

UPDATE notifications
SET message = REPLACE(message, '문서 삭제:', '문서 삭제')
WHERE message LIKE '%문서 삭제:%';

UPDATE notifications
SET message = REPLACE(message, '세부 카테고리 생성:', '세부 카테고리 생성')
WHERE message LIKE '%세부 카테고리 생성:%';

UPDATE notifications
SET message = REPLACE(message, '세부 카테고리 삭제:', '세부 카테고리 삭제')
WHERE message LIKE '%세부 카테고리 삭제:%';

UPDATE notifications
SET message = REPLACE(message, '대분류 카테고리 생성:', '대분류 카테고리 생성')
WHERE message LIKE '%대분류 카테고리 생성:%';

UPDATE notifications
SET message = REPLACE(message, '대분류 카테고리 삭제:', '대분류 카테고리 삭제')
WHERE message LIKE '%대분류 카테고리 삭제:%';

UPDATE notifications
SET message = REPLACE(message, '⚠️ 문서 만료 임박 (7일 이내):', '⚠️ 문서 만료 임박 (7일 이내)')
WHERE message LIKE '%⚠️ 문서 만료 임박 (7일 이내):%';

UPDATE notifications
SET message = REPLACE(message, '⏰ 문서 만료 임박 (30일 이내):', '⏰ 문서 만료 임박 (30일 이내)')
WHERE message LIKE '%⏰ 문서 만료 임박 (30일 이내):%';
