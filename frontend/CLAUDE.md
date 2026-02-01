# 프로젝트 지침

## 원본 참고 파일

**중요: 페이지 구현 시 반드시 원본 엑셀 파일을 참고할 것**

원본 파일 경로: `/Users/hr/Desktop/cc project/Transfer_master/초등경남관내전보_작업상황부ver3.2(양산).xlsm`

각 페이지별 참고 시트:
- 통계표 → `통계표` 시트
- 결원/충원 → `2결원`, `3충원` 시트
- 관외전출 → `4관외전출` 시트
- 관외전입 → `6관외전입` 시트
- 관내전출입 → `5관내전출입` 시트
- 학교관리 → `1정현원` 시트

## 빌드 및 배포

**중요: 빌드 후 반드시 Vercel 배포까지 수행할 것**

```bash
# 1. 빌드
npm run build

# 2. Vercel 배포 (프로덕션)
vercel --prod
```

빌드가 성공하면 자동으로 `vercel --prod` 명령으로 프로덕션 배포를 진행합니다.

## 개발 서버

```bash
npm run dev
```

## 프로젝트 구조

- `/src/pages/` - 페이지 컴포넌트
- `/src/components/` - 공통 컴포넌트
- `/src/services/` - API 서비스
- `/src/utils/` - 유틸리티 (문서 출력 등)
- `/src/types/` - TypeScript 타입 정의
- `/public/templates/` - 엑셀 템플릿 파일

## 문서 출력

모든 엑셀 문서는 `/public/templates/`의 원본 템플릿을 기반으로 생성됩니다.
템플릿 추출은 `/scripts/` 폴더의 Python 스크립트를 사용합니다.

## 엑셀 파일 분석 지침

**중요: 엑셀 원본 분석 시 반드시 아래 순서를 따를 것**

1. **스크린샷 우선 확인**: 원시 데이터 분석 전에 실제 화면 표시를 먼저 파악
2. **숨김 열/행 확인**: openpyxl 분석 시 `column_dimensions[col].hidden` 속성으로 숨김 상태 체크
3. **표시되는 열만 분석**: 숨겨진 열, 사용되지 않는 열은 제외

```python
# 올바른 분석 방법
from openpyxl.utils import get_column_letter

for col in range(1, sheet.max_column + 1):
    col_letter = get_column_letter(col)
    if not sheet.column_dimensions[col_letter].hidden:
        # 실제 표시되는 열만 분석
        pass
```

**주의**: 엑셀 파일의 원시 셀 구조와 실제 표시 화면은 다를 수 있음. 복잡하게 분석하기 전에 사용자에게 스크린샷을 요청하는 것이 가장 정확함.
