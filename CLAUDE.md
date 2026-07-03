@AGENTS.md

# Booking Flights — 항공권 예약 앱

## 기술 스택

| 항목 | 버전/선택 |
|---|---|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | SQLite (libSQL adapter) |
| ORM | Prisma 7.8.0 (`"prisma-client"` generator, **not** `"prisma-client-js"`) |
| React | 19.2.4 (Server Components 기본) |

## 핵심 규칙

- **Server Components 우선** — 클라이언트 상태가 필요할 때만 `'use client'`
- **DB 접근은 Prisma 단독** — `lib/mock-flights.ts`는 사용하지 않음 (레거시, 삭제 예정)
- **뮤테이션은 Server Actions** — `app/actions/*.ts`, `'use server'` 선언
- **Prisma client 싱글톤** — `lib/prisma.ts`의 `globalForPrisma` 패턴 사용
- **libSQL 제약** — `createMany({ skipDuplicates })` 미지원 → count 체크 후 createMany 사용
- `prisma generate` 산출물 위치: `lib/generated/prisma/`
- **알려진 단순화**: `Flight`에 날짜 컬럼이 없음 (`departureTime`은 시각일 뿐). 검색 시
  `departureDate`/`returnDate`는 표시용으로만 쓰이고 실제 필터링에는 반영되지 않음 — 모든
  노선이 매일 운항한다고 가정한 의도된 설계 (`app/search/page.tsx` 참고)
- **인증은 커스텀 구현** — NextAuth 등 라이브러리 미사용. bcrypt(`lib/password.ts`) + JWT
  세션 쿠키(`lib/session.ts`, jose) + DAL(`lib/auth.ts`의 `getCurrentUser`, React `cache`).
  `proxy.ts`는 쿠키 디코딩만 하는 옵티미스틱 체크(DB 접근 없음), 실제 보안 경계는 각 페이지의
  `getCurrentUser()` 체크. **`/reservation`, `/mypage`는 로그인 필수** (게스트 체크아웃 없음)
- **Next.js 16 주의**: `middleware.ts`는 deprecated → **`proxy.ts`**로 대체됨. `cookies()`는
  async — 항상 `await cookies()`
- **`README.md`는 포트폴리오 수준 문서** — 프로젝트 소개/주요 기능/기술 스택/ERD(Mermaid)/개발
  과정/트러블슈팅/향후 개선사항을 담은 GitHub용 소개 문서로 전면 교체됨 (원래의 create-next-app
  기본 README 아님).

## 프로젝트 구조

```
proxy.ts                    # 라우트 보호 (middleware.ts 대체, Next.js 16)

app/
  page.tsx                  # 홈 (항공권 검색 폼)
  layout.tsx                # 루트 레이아웃 (로그인 상태별 nav)
  search/page.tsx           # 검색 결과 (Prisma 조회)
  flights/[id]/page.tsx     # 항공편 상세 (+ 가격 예측 카드)
  reservation/page.tsx      # 예약 페이지 (좌석 선택 포함, 로그인 필수)
  mypage/page.tsx           # 내 예약 목록 (로그인 필수)
  login/page.tsx            # 로그인
  signup/page.tsx           # 회원가입
  actions/
    reservation.ts          # createReservation Server Action (트랜잭션)
    auth.ts                 # signup/login/logout Server Actions
    price-alert.ts          # setAlert / deleteAlert Server Actions
    planner.ts              # savePlannerSummary Server Action (AI 대화 요약 저장)
  api/
    airports/route.ts       # 공항 자동완성 API
    planner/route.ts        # AI 플래너 채팅 API (Gemini 스트리밍 + function calling)

components/
  flight-search-form.tsx    # 검색 폼 (클라이언트)
  reservation-form.tsx      # 예약 폼 + 좌석 선택 연동 (클라이언트)
  seat-selector.tsx         # 항공기 좌석 맵 UI (클라이언트)
  price-prediction.tsx      # 가격 예측 카드 (스파크라인 + 권고)
  login-form.tsx            # 로그인 폼 (클라이언트)
  signup-form.tsx           # 회원가입 폼 (클라이언트)
  ai-planner-fab.tsx        # AI 여행 플래너 FAB (Gemini 기반 대화형 채팅, 클라이언트)
  carbon-badge.tsx          # 탄소 배출량 뱃지/카드 (compact/detailed 변형)
  price-alert-button.tsx    # 가격 알림 설정/수정/삭제 (클라이언트, 항공편 상세 사이드바)
  delete-alert-button.tsx   # 가격 알림 삭제 버튼 (클라이언트, mypage)
  flexible-date-grid.tsx    # 날짜별 최저가 히트맵 그리드 (클라이언트, 검색 결과)
  ui/                       # shadcn/ui 기본 컴포넌트

lib/
  prisma.ts                 # Prisma 클라이언트 싱글톤
  password.ts               # bcrypt 래퍼 (hashPassword/verifyPassword)
  session.ts                # JWT 세션 쿠키 (jose, encrypt/decrypt/createSession)
  auth.ts                   # DAL — getCurrentUser (React cache)
  seat-types.ts             # SeatData 공유 타입 (서버/클라이언트 경계)
  airports.ts               # 공항 좌표 + haversine 거리 + CO2 배출량 계산 (탄소 배출량 기능)
  utils.ts                  # cn() 유틸
  mock-flights.ts           # 레거시 — 사용 금지

prisma/
  schema.prisma             # DB 스키마
  seed.ts                   # 시드 데이터 (항공편 + 좌석 + 가격 이력 + 예약 샘플)
  migrations/               # 마이그레이션 이력
```

## DB 스키마 요약

```
User          id, email, name, password(nullable)
Flight        id("fl-001"), airline, from/to, price, seats[], priceHistory[], reservations[], returnReservations[], priceAlerts[]
Seat          id(cuid), flightId, seatNumber("12A"), class, status, priceModifier, row, column
Reservation   id, bookingRef, flightId, userId, totalPrice, status, passengers[], reservationSeats[]
              tripType("ONE_WAY"|"ROUND_TRIP"), returnFlightId?(nullable), returnDate?(nullable)
Passenger     id, reservationId, firstName/lastName, dateOfBirth, nationality, passport
ReservationSeat  reservationId, seatId(@unique), passengerId(@unique)
FlightPriceHistory  id, flightId, price, recordedAt  (45일치 fake 이력, seed에서 생성)
PriceAlert    id, userId, flightId, targetPrice, triggered, triggeredAt?, createdAt
              @@unique([userId, flightId])  — 항공편당 알림 1개 제한
PlannerConversation  id, userId, destination, summary, createdAt  (AI 플래너 추천 요약 저장)
```

- `Seat.class`: `ECONOMY` | `BUSINESS`
- `Seat.status`: `AVAILABLE` | `RESERVED`
- `Seat.id` 포맷: cuid (seed에서만 `${flightId}-${seatNumber}` 형식으로 수동 지정)
- 좌석 배치: Business rows 1–4 (A C | D F), Economy rows 5–25 (A B C | D E F)
- 비상구 행: 12, 13

## 구현 완료 기능

| 기능 | 파일 |
|---|---|
| 홈 검색 폼 | `app/page.tsx`, `components/flight-search-form.tsx` |
| 항공편 검색 결과 | `app/search/page.tsx` |
| 항공편 상세 | `app/flights/[id]/page.tsx` |
| **가격 예측** ("지금 사는 게 좋을까요?") | `components/price-prediction.tsx` |
| **로그인/회원가입** (bcrypt + JWT 세션) | `app/login/page.tsx`, `app/signup/page.tsx`, `app/actions/auth.ts` |
| 예약 페이지 (**로그인 필수**) | `app/reservation/page.tsx` |
| **좌석 선택** (시각적 좌석 맵) | `components/seat-selector.tsx` |
| 예약 폼 + 좌석 연동 | `components/reservation-form.tsx` |
| 예약 생성 (트랜잭션, 동시성 안전, 세션 userId 사용) | `app/actions/reservation.ts` |
| 예약 취소 (좌석 반환, 본인 소유+CONFIRMED만) | `app/actions/reservation.ts`(`cancelReservation`), `components/cancel-reservation-button.tsx` |
| 내 예약 목록 (**로그인 필수**) | `app/mypage/page.tsx` |
| **프로필 편집** (이름·비밀번호 변경) | `app/mypage/edit/page.tsx`, `components/edit-profile-form.tsx`, `app/actions/profile.ts` |
| 공항 자동완성 API | `app/api/airports/route.ts` |
| **편도/왕복 예매** (One way / Round trip) | `components/flight-search-form.tsx`, `app/search/page.tsx`, `app/reservation/page.tsx`, `components/reservation-page-client.tsx`, `app/actions/reservation.ts` |
| **가격 알림** (Price Alert) | `prisma/schema.prisma`, `app/actions/price-alert.ts`, `components/price-alert-button.tsx`, `components/delete-alert-button.tsx`, `app/flights/[id]/page.tsx`, `app/mypage/page.tsx` |
| **날짜 유연 가격 비교** (Flexible Date Grid) | `components/flexible-date-grid.tsx`, `app/search/page.tsx` |
| **탄소 배출량 표시** (haversine 거리 기반 CO₂ 추정) | `lib/airports.ts`, `components/carbon-badge.tsx`, `app/search/page.tsx`, `app/flights/[id]/page.tsx` |
| **AI 여행 플래너** (Gemini 실시간 대화형 채팅 + function calling) | `components/ai-planner-fab.tsx`, `app/api/planner/route.ts` |
| **AI 대화 요약 저장** (마이페이지에 추천 기록 보관) | `prisma/schema.prisma`(`PlannerConversation`), `app/actions/planner.ts`, `components/ai-planner-fab.tsx`, `app/mypage/page.tsx` |

### 편도/왕복 예매 상세

- 홈 검색 폼 상단에 **One way / Round trip** 토글 (선택된 쪽에 아이콘 표시)
- **One way**: 기존 흐름 그대로 — 검색 → 항공편 상세 → 예약
- **Round trip**: 검색 → 출발편 선택("Select outbound") → 귀환편 목록 표시 → 귀환편 선택("Select return") → 예약
  - 선택된 출발편 요약 카드가 귀환편 목록 위에 고정 표시, "Change" 버튼으로 변경 가능
  - 귀환편 쿼리: `from`/`to` 파라미터를 뒤바꿔 조회 (B→A 노선)
  - 예약 페이지 사이드바에 출발편·귀환편 각각 요약 + 합산 가격 (`출발 × travelers + 귀환 × travelers + 좌석 추가 요금`)
  - `Reservation.tripType = "ROUND_TRIP"`, `returnFlightId`, `returnDate` 저장
- mypage 예약 카드에 왕복 시 귀환편 시간대 별도 표시 + "Round trip" 뱃지

### 좌석 선택 상세

- 초록 = 선택 가능, 빨강 = 예약됨(클릭 불가), 파랑 = 내가 선택한 좌석
- 탑승객 수만큼 좌석을 다 선택해야 여객 정보 입력 섹션 활성화
- 좌석 미선택 시 Confirm 버튼 비활성
- 예약 완료 시 `$transaction` 안에서 `Seat.status → RESERVED` 원자적 업데이트
- 동시 예약 race condition: 트랜잭션 내 가용 좌석 재확인 → `SEATS_TAKEN` 에러 처리
- 가격 실시간 반영: `flight.price × travelers + Σ seatPriceModifier`

### 예약 취소 상세

- 취소 가능 범위: 본인 소유(`userId` 일치) + `status === 'CONFIRMED'`만 (전체 취소만 지원, 부분 취소 없음)
- 출발일이 지났는지는 체크하지 않음 — `Flight`에 날짜 컬럼이 없어 자동으로 `COMPLETED`로 전환되는
  로직이 없는 기존 한계와 동일선상의 의도된 단순화
- 취소 시 `$transaction` 안에서: `Reservation.status → CANCELLED`, 연결된 `ReservationSeat` 삭제
  (seatId가 `@unique`라 남겨두면 재예약 시 충돌), `Seat.status → AVAILABLE`
- mypage에서 "Upcoming trips"의 각 카드에 버튼 노출, 클릭 시 `window.confirm()` 확인 후 실행
- "View details"는 페이지 이동이 아니라 `<details>/<summary>`로 카드 내부에서 인라인 펼치기
  (Flight no./Class/Baggage/Travelers, 선택 좌석, 포함사항, 운임 정책 표시) — Server Component
  유지를 위해 Cancel 버튼의 `stopPropagation`은 `CancelReservationButton`(client) 내부에서 처리

### 가격 알림 상세

- 항공편 상세 페이지 사이드바 "Book now" 아래에 **가격 알림 설정** 버튼
- 비로그인 시 `/login?from=...` 안내, 로그인 시 목표 가격 입력 폼 인라인 확장
- 저장 후 현재가·목표가 차이 표시, 수정/삭제 가능
- 페이지 로드 시 서버에서 자동 트리거 체크 (`flight.price <= targetPrice` 시 `triggered=true`)
- mypage 사이드바에 Price Alerts 카드 — 달성된 알림은 날짜와 함께 표시
- `@@unique([userId, flightId])` — 항공편당 알림 1개, upsert로 덮어쓰기
- 별도 cron 없음 — 항공편 상세 페이지 방문 시 서버 렌더에서 체크 (의도된 단순화)

### 날짜 유연 가격 비교 상세

- 검색 결과 페이지 하단, `from`·`to`·`departureDate` 세 가지 모두 있을 때만 표시
- 출발편 선택 단계에서만 노출 (왕복 귀환편 선택 단계에서는 숨김)
- 선택 날짜 ±7일 = 15개 슬롯, 10개씩 표시 + 좌우 ChevronLeft/Right 버튼으로 이동
- 초기 위치: 선택 날짜가 뷰의 가운데(5번째)에 오도록 offset 자동 계산
- 날짜 클릭 시 `departureDate` URL 파라미터 업데이트 → `key={departureDate}`로 offset 리셋
- 가격 색상: 테두리·가격 텍스트 모두 `hsl(120*(1-ratio))` 기반 — 초록(최저)→노랑→빨강(최고)
- 선택된 칸: 3D 효과 (`translateY(-4px)` + 해당 색상 기반 box-shadow)
- 데이터: `FlightPriceHistory.recordedAt`을 날짜 축으로 재해석 (의도된 단순화)

### 탄소 배출량 표시 상세

- `lib/airports.ts`: 시드 데이터에 등장하는 24개 공항 IATA 코드 → 위경도 하드코딩, `getDistanceKm`(haversine), `estimateCo2Kg`(거리 × 좌석클래스 계수, 기차 대비 배수 계산) 제공
- `components/carbon-badge.tsx`: Server Component. `variant="compact"`(검색 카드용, 아이콘+kg 한 줄), `variant="detailed"`(상세 페이지용, 거리·기차 비교 포함 카드)
- DB 변경 없이 순수 계산 — `Flight.fromCode`/`toCode` 그대로 사용
- 좌표 없는 공항 코드가 들어오면 `null` 반환 후 뱃지 자체를 렌더링하지 않음 (안전한 폴백)

### AI 여행 플래너 상세 (Gemini 기반)

- 기존 5단계 버튼 결정 트리를 **대화형 채팅 UI**로 전면 교체 (`components/ai-planner-fab.tsx`)
- 백엔드: `app/api/planner/route.ts` — POST로 대화 히스토리를 받아 `@google/genai` SDK로 Gemini에 NDJSON 스트리밍 요청
- **그라운딩**: 매 요청마다 Prisma로 실제 판매 중인 노선·최저가를 조회해 시스템 프롬프트에 주입 → DB에 없는 목적지를 지어내지 않도록 제한
- **Function calling**: `propose_flight_search(from, to, tripType, travelers, reason)` 함수를 모델이 호출하면 서버가 그대로 스트리밍 이벤트로 전달, 클라이언트가 `/search?...` 링크를 구성해 "이 조건으로 검색하기" 버튼으로 노출
- 무료 티어(Google AI Studio) 사용 — 결제 연동 없이 `GEMINI_API_KEY`만 있으면 동작, 키가 없으면 서버가 크래시 대신 안내 메시지 JSON을 반환
- 모델명은 `GEMINI_MODEL` 환경변수로 교체 가능 (기본값 `gemini-2.5-flash`)

### AI 대화 요약 저장 상세

- 추천 결과 카드(`propose_flight_search` 함수 호출 성공 시)에 "대화 요약 저장" 버튼 노출
- **요약 텍스트는 별도 API 호출 없이 재사용** — `propose_flight_search`의 `reason` 인자를 그대로 저장 (비용/지연 최소화 목적으로 의도된 단순화)
- `app/actions/planner.ts`의 `savePlannerSummary` Server Action → `PlannerConversation` 테이블에 `userId`, `destination`, `summary` 저장
- 비로그인 시 저장 버튼 대신 로그인 유도 링크 표시 (`price-alert-button.tsx`와 동일한 패턴)
- 마이페이지 사이드바에 "AI 여행 상담 기록" 카드로 최근 5건 표시

### 데모 계정

- `demo@example.com` / `demo4321` — 시드된 예약 3건(RV-DEMO001/002/003) 확인 가능
- `PlannerConversation`에 Playwright 테스트로 생성된 더미 레코드 1건 존재 (2026-07-02 04:30:55, 목적지 Fukuoka) — 삭제 불필요 (사용자 확인 완료)
- 사용자의 실제 가입 계정 이메일 `dem@example.com`은 오타가 아니라 의도적으로 그렇게 적은 것 (사용자 확인 완료)

## 미해결 이슈 / TODO

### 알려진 기술 부채

| 항목 | 상태 | 설명 |
|---|---|---|
| `lib/mock-flights.ts` | **삭제 완료** | 레거시 파일 삭제됨 |
| `Flight` 날짜 컬럼 없음 | **의도된 단순화** | 날짜 필터링 미지원, 날짜 기반 예약 완료(COMPLETED) 자동 전환 없음 |
| 예약 취소 — 출발일 체크 없음 | **의도된 단순화** | 날짜 컬럼 없어서 지난 항공편도 취소 가능. 날짜 컬럼 추가 시 수정 필요 |
| `Reservation.status` COMPLETED 전환 | **미구현** | 현재 CONFIRMED → COMPLETED 자동 전환 로직 없음. 모두 수동 또는 영구 CONFIRMED |
| Profile "Edit profile" | **구현 완료** | `/mypage/edit` 페이지, 이름·비밀번호 변경 지원 |
| AI 플래너 FAB | **구현 완료** | Gemini 기반 실시간 대화형 채팅 + function calling (→ "AI 여행 플래너 상세" 참고) |
| 이메일 발송 | **미구현** | 예약 확인 이메일, 가격 알림 이메일 등 실제 발송 로직 없음 |
| 비밀번호 재설정 | **미구현** | 로그인 페이지에 "Forgot password?" UI 없음 |
| 모바일 좌석 맵 UX | **개선 완료** | 버튼 크기 32px, `touch-manipulation`, `active:` 상태, 비상구 이모지→텍스트 |
| 왕복 — 귀환편 좌석 선택 | **미구현** | 예약 페이지에서 출발편 좌석만 선택 가능. 귀환편은 좌석 미배정 상태로 저장됨. 구현하려면 `ReservationSeat`을 편당 독립 관리하는 구조 변경 필요 |
| 왕복 — 항공편 상세 페이지 직접 진입 | **의도된 단순화** | `/flights/[id]`의 "Book now"는 항상 편도로 예약됨. 왕복 플로우는 `/search?tripType=ROUND_TRIP` 경유로만 진입 가능 |
| 왕복 — 부분 취소 | **미구현** | 왕복 예약 취소 시 출발편·귀환편 일괄 취소만 지원. 편도별 부분 취소 미지원 |

### 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite 파일 경로 (`file:./dev.db`), 배포 시 Turso 원격 URL로 교체 예정 |
| `SESSION_SECRET` | ✅ | JWT 서명 키 (32바이트 이상 랜덤값) |
| `GEMINI_API_KEY` | ⬜ AI 플래너 사용 시 | Google AI Studio(aistudio.google.com)에서 무료 발급. 비어있으면 AI 플래너가 안내 메시지만 표시 |
| `GEMINI_MODEL` | ⬜ | 기본값 `gemini-2.5-flash`, 코드 수정 없이 모델 교체 가능 |

## 다음 할 일 — 배포 (진행 중, 미완료)

다른 네트워크의 사용자가 접근할 수 있도록 배포하는 작업을 시작했으나, 계정 생성 단계에서 중단됨.

**결정된 스택**
- **호스팅**: Vercel (Next.js와 가장 자연스러운 조합)
- **DB**: Turso (호스팅형 libSQL) — 이미 `@libsql/client` + `@prisma/adapter-libsql`를 쓰고 있어서 코드 변경 없이 `DATABASE_URL`만 원격 URL로 교체하면 전환 가능
- 둘 다 이 프로젝트 규모에서는 무료 티어로 충분 (결제 불필요)

**진행 상황 / 차단 요소**
- [x] `.gitignore`에 `*.db`, `*.db-journal` 추가 완료 — 로컬 SQLite DB(비밀번호 해시 등 포함)가 실수로 커밋되지 않도록 사전 조치
- [ ] 이 프로젝트는 아직 **git 저장소가 아님** (`git init` 필요) — 사용자는 GitHub 계정 보유, GitHub 연동으로 진행 예정
- [ ] Vercel 계정 없음 — GitHub으로 가입 예정, 아직 가입 전 (재확인 완료)
- [ ] Turso 계정 없음 — 아직 가입 전 (재확인 완료)
- [ ] `gh`/`vercel`/`turso` CLI 설치 여부·인증 상태 미확인 — 확인 명령을 두 차례 시도했으나 모두 사용자가 중단함 (계정 가입이 먼저라고 판단한 것으로 보임, 강제 진행하지 말 것)


**다음 세션에서 이어갈 순서**
1. (필요 시) 프로젝트 폴더 이동 완료 확인 — 새 경로 `C:\Users\PC\Desktop\vcProject\bookingProject`에서 작업 중인지 확인
2. `git init` + `.gitignore` 확인(.env, node_modules, dev.db 제외 확인) + GitHub 저장소 생성/푸시
3. Vercel을 GitHub 저장소에 연결
4. Turso DB 생성 → `DATABASE_URL` 발급
5. Vercel에 환경변수 등록: `DATABASE_URL`(Turso), `SESSION_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`
6. `prisma migrate deploy`로 프로덕션(Turso) DB에 스키마 적용
7. 배포 후 실제 배포 URL에서 로그인/예약/AI 플래너 등 핵심 플로우 재검증

## 확인 필요 (다음 세션에서 사용자에게 재확인)

- `PlannerConversation` 테이블에 세션 중 Playwright 테스트로 생성된 더미 레코드 1건 존재 (`demo@example.com` 계정, 2026-07-02 04:30:55, 목적지 Fukuoka (FUK)). 삭제 여부를 물었으나 아직 답변받지 못함
- 사용자의 실제 가입 계정 이메일이 `dem@example.com`으로 되어 있음(`demo@example.com`과 한 글자 차이) — 오타로 가입한 것인지 확인 필요

## 개발 명령어

```bash
npm run dev          # 개발 서버 (Turbopack)
npx prisma migrate dev --name <name>   # 마이그레이션
npx prisma generate  # 클라이언트 재생성
npx prisma db seed   # 시드 실행
npx prisma studio    # DB GUI
```

> **주의**: `prisma generate` 후 `.next` 캐시 삭제 필요 (`Remove-Item -Recurse -Force .next`) — Turbopack이 구 클라이언트를 캐시할 수 있음
