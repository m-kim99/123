import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kqurgsqmrmtpglrbzpoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdXJnc3Ftcm10cGdscmJ6cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzgwMDgsImV4cCI6MjA4ODYxNDAwOH0.sfcu2_uER_BltY3aPlBxVrAvXOqDwXeruTvWghDlpgs'
);

async function main() {
  // 전체 문서 수
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log('전체 문서 수:', count);

  // 샘플 문서
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, file_path')
    .limit(5);

  console.log('에러:', error);
  console.log('샘플 문서:', JSON.stringify(data, null, 2));

  // Storage 버킷 파일 목록
  const { data: files, error: storageError } = await supabase.storage
    .from('123')
    .list('', { limit: 10 });

  console.log('\nStorage 에러:', storageError);
  console.log('Storage 파일들:', JSON.stringify(files, null, 2));
}

main();
