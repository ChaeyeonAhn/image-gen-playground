# Light Table

프롬프트를 쓰고 결과를 바로 확인하는 로컬 이미지 생성 플레이그라운드.
BytePlus Seedream 과 Google Nano Banana(Gemini) 를 같은 화면에서 번갈아 써볼 수 있다.
생성물은 로컬에 영구 보관되고, 갤러리에서 다시 열어 같은 설정으로 재생성할 수 있다.

## 시작하기

### 1. API 키 준비

둘 중 **하나만 있어도 된다.** 키가 있는 쪽 모델만 목록에 뜬다.

**BytePlus (Seedream)**
1. [console.byteplus.com](https://console.byteplus.com) 가입 — 휴대폰 인증 + 결제수단 등록 필요
2. **ModelArk → Model activation → Media** 에서 Seedream 활성화 — 빼먹으면 키가 있어도 실패한다
3. **ModelArk → API Keys → Create Key**

**Google (Nano Banana)**
1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 에서 키 발급

### 2. 환경변수

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|---|---|
| `ARK_API_KEY` | BytePlus ModelArk 키 |
| `ARK_BASE_URL` | 리전 엔드포인트. 비우면 `ap-southeast` |
| `GEMINI_API_KEY` | Google AI Studio 키 |

키는 서버에서만 읽는다. 브라우저는 이 앱의 `/api/*` 만 호출하므로 키가 클라이언트로 나가지 않는다.

### 3. 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 모델 추가하거나 바꾸기

모델 목록은 `src/lib/providers/index.ts` 의 `CATALOG` 한 곳에 있다.
콘솔에서 모델 이름이 바뀌었거나 다른 모델을 붙이고 싶으면 여기만 고치면 된다.

| 모델 | 프로바이더 | 참조 이미지 | 시드 |
|---|---|---|---|
| Seedream 4.0 | BytePlus | O | O |
| Nano Banana 2 | Gemini | O | X |
| Nano Banana 2 Lite | Gemini | O | X |
| Nano Banana Pro | Gemini | O | X |

모델이 지원하지 않는 설정은 화면에서 자동으로 감춰진다.

## 어떻게 동작하나

- `src/lib/providers/` — 프로바이더별 호출. `types.ts` 에 공통 인터페이스, `ark.ts` 와 `gemini.ts` 가 각자 구현, `index.ts` 가 모델 카탈로그와 라우팅을 맡는다
- `src/lib/storage.ts` — **프로바이더가 주는 이미지 URL 은 하루 안에 만료된다.** 생성 직후 바로 내려받아 `public/generated/` 에 저장한다
- `src/lib/db.ts`, `src/lib/repo.ts` — SQLite(`data/playground.db`)에 기록. 실패한 요청도 남긴다. 어떤 프롬프트가 막히는지가 플레이그라운드에서는 중요한 정보다
- `src/components/` — 왼쪽 프롬프트 패널, 오른쪽 갤러리, 타일을 누르면 상세

생성물과 DB 는 모두 `.gitignore` 에 있다.

## 데모 데이터 지우기

UI 확인용 더미 기록이 들어 있다면 아래로 비운다.

```bash
rm -rf data public/generated/* public/uploads/*
```

## 알려진 제약

- `better-sqlite3` 는 **12.x** 로 고정했다. 13.x 는 Node 22.12 에서 네이티브 모듈이 세그폴트를 낸다
- Gemini 응답 파서는 특정 필드 경로를 짚지 않고 `mime_type` + `data` 를 함께 가진 객체를 훑어서 찾는다. Interactions API 와 레거시 `generateContent` 의 응답 모양이 다르고 앞으로도 바뀔 수 있어서다
- 한 요청에 여러 장을 받는 옵션은 꺼 둔 상태다. DB 스키마와 갤러리는 이미 여러 장을 수용한다
- 참조 이미지는 base64 로 보낸다. 로컬 서버라 프로바이더가 접근할 수 있는 public URL 을 줄 수 없다
