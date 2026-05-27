# NFC 기능 검증 시나리오

## 수정 사항 요약

| # | 수정 내용 | 파일 |
|---|-----------|------|
| 1 | NFC Intent Filter 추가 (NDEF/TECH/TAG) | `AndroidManifest.xml` |
| 2 | Cold start + onResume/onPause 라이프사이클 | `MainActivity.java` |
| 3 | NFCAutoRedirect 리스너 충돌 방지 | `NFCAutoRedirect.tsx` |
| 4 | writeNFCUrl mode 타이밍 수정 | `nfc.ts` |
| 5 | unmount 시 stopScan 제거 | `NFCAutoRedirect.tsx` |
| 6 | 이중 등록 시스템 통일 (subcategories.nfc_tag_id) | `NFCRegistrationDialog.tsx` |
| 7 | nfc_tech_filter.xml 추가 | `res/xml/nfc_tech_filter.xml` |

---

## 시나리오 1: 기본 NFC 태그 읽기 (앱 포그라운드)

### 사전 조건
- 앱이 열려있고 대시보드 화면 표시 중
- NFC 태그에 `https://traystorageconnect.com/nfc-redirect?subcategoryId=xxx` URL이 기록됨

### 테스트 단계
1. 앱이 대시보드에 있는 상태에서 NFC 태그를 폰 뒷면에 가져다 댐
2. **예상 결과:**
   - `MainActivity.onNewIntent()` → `NfcPlugin.handleNfcIntent()` 호출
   - `isScanning=false, isWriting=false` → cold start 분기 진입
   - `performRead()` → `notifyListeners("nfcTagDetected", {uid, payload, recordType})`
   - `NFCAutoRedirect`의 리스너가 이벤트 수신
   - `getNfcMode()` 체크 → 'idle' → 처리 진행
   - payload에서 subcategoryId 파싱 → DB 조회 → 해당 세부 스토리지 페이지로 네비게이션

### 로그 확인 포인트
```
D/NfcPlugin: NFC cold start tag: UID=04A3B2C1
D/NfcPlugin: Firing nfcTagDetected event: {"uid":"04A3B2C1","recordType":"url","payload":"https://..."}
```
JS 콘솔:
```
NFC 태그 감지! UID: 04A3B2C1
```

---

## 시나리오 2: Cold Start NFC (앱 완전 종료 상태)

### 사전 조건
- 앱이 완전히 종료된 상태 (recent apps에서 제거)
- NFC 태그에 앱 URL 기록됨

### 테스트 단계
1. NFC 태그를 폰에 가져다 댐
2. **예상 결과:**
   - AndroidManifest의 `NDEF_DISCOVERED` intent-filter가 매칭
   - 앱 실행 → `MainActivity.onCreate()`
   - `handleNfcFromIntent(getIntent())` 호출
   - Plugin이 아직 bridge 준비 전이라면 → bridge 준비 후 이벤트 전달
   - WebView 로드 완료 → NFCAutoRedirect 리스너 등록 → 태그 처리

### 주의사항
- Cold start 시 WebView(JS)가 아직 로드되지 않았을 수 있음
- `notifyListeners`는 Capacitor가 내부적으로 큐잉하므로 JS 준비 후 전달됨

---

## 시나리오 3: NFC 태그 등록 (쓰기 모드)

### 사전 조건
- 관리자로 로그인
- 세부 스토리지 생성 + NFC 등록 버튼 클릭

### 테스트 단계
1. "세부 스토리지 + NFC 등록" 버튼 클릭
2. `readNFCUid()` 호출 → `setNfcMode('writing')` 설정
3. 태그를 가져다 댐
4. **예상 결과 (순서):**
   - a. `readNFCUid()` 리스너가 UID 수신 → resolve
   - b. NFCAutoRedirect 리스너도 이벤트 수신하지만 `getNfcMode() === 'writing'` → 스킵
   - c. `writeNFCUrl()` 호출 → NFC 태그에 URL 쓰기
   - d. 쓰기 완료 후에도 mode는 'writing' 유지 (finally에서 idle 안 함)
   - e. `registerNfcTag()` → DB에 nfc_tag_id 저장
   - f. `setNfcMode('idle')` → 전체 플로우 완료

### 검증 포인트
- 등록 중 "미등록 태그" 토스트가 뜨지 않아야 함
- 등록 완료 후 "NFC 등록 완료" 토스트 표시
- DB의 `subcategories.nfc_tag_id`에 UID 저장 확인

---

## 시나리오 4: 백그라운드 → 포그라운드 전환 후 NFC

### 사전 조건
- 앱이 백그라운드에 있다가 다시 포그라운드로 전환

### 테스트 단계
1. 앱을 열고 대시보드 진입
2. 홈 버튼 눌러 백그라운드로 보냄
3. 다시 앱으로 복귀
4. NFC 태그 탭

### 예상 결과
- `onPause()` → `disableForegroundDispatch()` (백그라운드에서 NFC 비수신)
- `onResume()` → `enableForegroundDispatch()` (포그라운드 복귀 시 재활성화)
- 태그 탭 → 정상 감지 및 처리

### 이전 문제
- onResume/onPause 없었음 → 백그라운드 복귀 후 NFC 죽음
- **수정 후**: 항상 onResume에서 foreground dispatch 재활성화

---

## 시나리오 5: 등록 중 페이지 이동 (unmount)

### 사전 조건
- NFC 등록 플로우 진행 중 (`readNFCUid` 대기 중)

### 테스트 단계
1. NFC 등록 시작 (태그 대기 중)
2. 뒤로 가기 또는 다른 페이지로 이동
3. DashboardLayout unmount → NFCAutoRedirect cleanup

### 예상 결과
- NFCAutoRedirect cleanup: 리스너만 제거, `stopScan()` 호출하지 않음
- NfcPlugin의 `isWriting=true` 상태 유지
- foreground dispatch 활성 상태 유지
- 태그를 가져다 대면 여전히 write 동작 수행 가능

### 이전 문제
- `stopScan()` 호출 → foreground dispatch 비활성화 → 쓰기 실패
- **수정 후**: unmount 시 stopScan 미호출, 네이티브 lifecycle이 관리

---

## 시나리오 6: 미등록 태그 감지

### 테스트 단계
1. DB에 등록되지 않은 NFC 태그를 탭

### 예상 결과
- NFCAutoRedirect가 태그 감지
- payload의 URL에서 subcategoryId 추출 시도 → 실패
- UID로 `subcategories.nfc_tag_id` 조회 → 매칭 없음
- "미등록 태그" 토스트 표시

---

## 시나리오 7: 다른 앱 사용 중 NFC 태그 탭 (앱 백그라운드)

### 사전 조건
- 앱이 백그라운드에 있고, 다른 앱 사용 중
- NFC 태그에 `https://traystorageconnect.com/nfc-redirect?subcategoryId=xxx`

### 테스트 단계
1. 다른 앱 사용 중 NFC 태그 탭

### 예상 결과
- AndroidManifest의 `NDEF_DISCOVERED` intent-filter 매칭
- 앱이 포그라운드로 전환 (singleTask launchMode)
- `onNewIntent()` → `handleNfcFromIntent()` → 태그 처리
- 해당 세부 스토리지 페이지로 이동

---

## 디버깅 체크리스트

### Android Logcat 필터
```bash
adb logcat -s NfcPlugin:D MainActivity:D
```

### 확인할 로그 메시지
- `NfcPlugin loaded. NFC adapter: available` — 플러그인 초기화 성공
- `NFC foreground dispatch enabled` — 포그라운드 디스패치 활성화
- `NFC cold start tag: UID=...` — cold start NFC 처리
- `NFC tag detected: UID=... | scanning=... | writing=...` — 일반 태그 감지
- `NFC write successful` — 쓰기 성공
- `NFC scan stopped (foreground dispatch remains active)` — 스캔 종료 시 디스패치 유지

### JS 콘솔 확인
- `NFC 자동 리다이렉트 리스너 등록` — NFCAutoRedirect 초기화
- `NFC 쓰기 모드 중 - 자동 리다이렉트 스킵` — 쓰기 중 충돌 방지 작동
- `NFC 태그 감지! UID: ...` — 자동 리다이렉트 처리
- `NFC UID 읽음 (네이티브): ...` — UID 읽기 성공

---

## 빌드 & 테스트 명령어

```bash
# Android 빌드
cd android && ./gradlew assembleDebug

# 디바이스에 설치
adb install -r app/build/outputs/apk/debug/app-debug.apk

# NFC 로그 실시간 확인
adb logcat -s NfcPlugin:D MainActivity:D | grep -E "NFC|nfc"
```
