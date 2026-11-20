# 김해공항(PUS) 항공권 · 최적기 대시보드

김해국제공항(PUS) 출발 항공권을 날짜 기준으로 바로 조회하고, 목적지별 최적기와
4박5일 연휴 추천 일정을 한 화면에서 보는 정적 웹 대시보드입니다.

- **순수 HTML + CSS + Vanilla JS** (빌드 도구·프레임워크·외부 요청 없음)
- GitHub Pages `main` 브랜치 루트 배포 (`.nojekyll` 포함)
- 검색엔진 비노출: `robots.txt` 전체 차단 + `noindex, nofollow` 메타
- 개인정보 없음: 노선·기후·공휴일 등 공개 여행 정보만 수록

## 기능

1. **날짜 지정 조회**
   - 출발일 선택 시 도착일이 4박5일로 자동 설정(‘4박5일 고정’ 스위치)
   - 인원(성인 1~4명)·출발 시간 이후·귀국 시간 이전 조건
   - 2026년 12월~2027년 12월 황금연휴 4박5일 프리셋 12개
   - 노선 카드마다 **네이버 항공권 · 구글 플라이트 · 스카이스캐너** 왕복 검색 딥링크 자동 생성
2. **목적지별 최적기 · 연휴 가이드**
   - 33개 노선의 12개월 기후 적합도 표
   - 실제 공휴일·대체공휴일·주말을 계산해 연차 2일 이내 4박5일 일정 12개 제시
   - 연휴별로 그 시기 날씨가 가장 좋은 도시 3곳을 매칭(권역별 최대 2곳)

## 파일

| 파일 | 설명 |
| --- | --- |
| `index.html` | 화면 구조 |
| `styles.css` | 반응형 스타일(모바일 우선) |
| `app.js` | 날짜·필터·딥링크 생성 로직 |
| `data.js` | 생성된 데이터(33개 노선, 공휴일, 연휴 추천) |
| `robots.txt` | 검색엔진 차단 |

## 딥링크 형식

| 서비스 | 형식 |
| --- | --- |
| 네이버 항공권 | `https://flight.naver.com/flights/international/PUS-{도착}-{YYYYMMDD}/{도착}-PUS-{YYYYMMDD}?adult={n}&child=0&infant=0&fareType=Y` |
| 구글 플라이트 | `https://www.google.com/travel/flights?hl=ko&gl=KR&curr=KRW&q=Flights from PUS to {도착} from {YYYY-MM-DD} to {YYYY-MM-DD} for {n} adults` |
| 스카이스캐너 | `https://www.skyscanner.co.kr/transport/flights/pus/{도착소문자}/{YYMMDD}/{YYMMDD}/?adultsv2={n}&cabinclass=economy&rtn=1&preferdirects={true\|false}` |

세 형식 모두 실제 검색 결과 화면에서 노선·날짜·인원이 반영되는 것을 확인했습니다.

## 데이터

- 노선 33개·월별 기후 태그: 기존 관리 시트(`시트1`, `Config`)를 바탕으로 목적지별 실제 건기·우기로 보정
  (시트는 일본·대양주를 한 템플릿으로 묶어 삿포로 7월 ‘폭염’, 시드니 1월 ‘환절기’ 같은 오차가 있었음)
- 직항/경유 구분: 2026년 11월 기준 김해공항 취항 항공사 스케줄(에어부산·이스타·제주·진에어·트리니티·대한항공·싱가포르항공 등)
- 공휴일: 「관공서의 공휴일에 관한 규정」 및 2027년 월력요항(우주항공청) — 대체공휴일 7일 포함
- 참고 시세: 시트에 기록된 최근 조회값(실시간 가격이 아니므로 링크에서 확인)

## 로컬 확인

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 배포

GitHub Pages — Settings → Pages → Source: *Deploy from a branch*, Branch: `main` / `/(root)`.
