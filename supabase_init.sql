CREATE TABLE schedules (
  date text PRIMARY KEY,
  orders jsonb DEFAULT '[]'::jsonb,
  details jsonb DEFAULT '{}'::jsonb
);

-- 2. 찬양 라이브러리(Songs) 테이블
CREATE TABLE songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  imageUrl text
);

-- 3. 교사/학생 명단(Settings) 테이블
CREATE TABLE settings (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}'::jsonb
);

-- 기본 멤버 데이터 세팅
INSERT INTO settings (id, data) VALUES (
  'members',
  '{"teachers": {}, "students": {}}'::jsonb
);

-- 4. 악보 저장을 위한 Storage Bucket 생성 및 공개 설정
INSERT INTO storage.buckets (id, name, public) VALUES ('sheet-music', 'sheet-music', true);

-- Storage에 대한 전체 공개 조회 권한 부여 (SELECT)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'sheet-music');

-- Storage에 대한 인증 없이 누구나 업로드 가능한 권한 부여 (INSERT)
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sheet-music');

-- Storage에 대한 누구나 삭제 가능한 권한 부여 (DELETE)
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'sheet-music');
