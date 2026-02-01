import { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { internalApi, schoolApi, assignmentApi, settingsApi } from '../services/api';
import type { InternalTransfer, School, AssignmentStats, SchoolShortage } from '../types';
import * as XLSX from 'xlsx';  // 엑셀 파일 읽기용
import ExcelJS from 'exceljs'; // 엑셀 파일 쓰기(스타일 포함)용

// 정렬 타입
type SortType = 'score' | 'school';

export default function Internal() {
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [_stats, setStats] = useState<AssignmentStats | null>(null);
  const [shortages, setShortages] = useState<SchoolShortage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 정렬 상태
  const [sortType, setSortType] = useState<SortType>('score');

  // 만기자 희망학교 수 설정
  const [expiredWishCount, setExpiredWishCount] = useState(3);

  // 파일 업로드 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InternalTransfer>>({});

  // 통합(벽지) 설정
  const [useRemoteSchools, setUseRemoteSchools] = useState(false);
  const [remoteSchools, setRemoteSchools] = useState<string[]>([]);

  // 배치 애니메이션 상태
  const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transferRes, schoolRes, statsRes, shortageRes, settingsRes] = await Promise.all([
        internalApi.getAll(),
        schoolApi.getAll(),
        assignmentApi.getStatistics(),
        assignmentApi.getSchoolShortage(),
        settingsApi.getAll(),
      ]);
      setTransfers(transferRes.data);
      setSchools(schoolRes.data);
      setStats(statsRes.data);
      setShortages(shortageRes.data);
      // 통합(벽지) 설정 로드
      setUseRemoteSchools(settingsRes.data.use_remote_schools === 'true');
      const remoteList = (settingsRes.data.remote_schools || '이천,원동,좌삼').split(',').map((s: string) => s.trim()).filter((s: string) => s);
      setRemoteSchools(remoteList);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 배치 애니메이션 효과로 데이터 로드
  const loadDataWithAnimation = async (beforeAssignedIds: Set<number>) => {
    const [transferRes, shortageRes] = await Promise.all([
      internalApi.getAll(),
      assignmentApi.getSchoolShortage(),
    ]);

    // 새로 배정된 교사 찾기
    const newlyAssignedTeachers = transferRes.data.filter(
      (t) => t.assigned_school_id && !beforeAssignedIds.has(t.id)
    );

    // 과부족 먼저 업데이트
    setShortages(shortageRes.data);

    if (newlyAssignedTeachers.length === 0) {
      setTransfers(transferRes.data);
      return;
    }

    // 애니메이션 효과: 배정된 교사를 하나씩 표시
    const newlyAssignedIds = new Set(newlyAssignedTeachers.map((t) => t.id));

    // 먼저 배정되지 않은 상태로 표시 (새로 배정된 것들은 아직 안 보이게)
    const tempTransfers = transferRes.data.map((t) =>
      newlyAssignedIds.has(t.id) ? { ...t, assigned_school_id: null, assigned_school_name: null } : t
    );
    setTransfers(tempTransfers);

    // 순차적으로 배정 표시
    const sortedNewlyAssigned = [...newlyAssignedTeachers].sort((a, b) => {
      // 학교 display_order 기준 정렬
      const schoolOrderMap = new Map(schools.map((s) => [s.id, s.display_order]));
      const aOrder = a.assigned_school_id ? (schoolOrderMap.get(a.assigned_school_id) ?? 9999) : 9999;
      const bOrder = b.assigned_school_id ? (schoolOrderMap.get(b.assigned_school_id) ?? 9999) : 9999;
      return aOrder - bOrder;
    });

    // 애니메이션 딜레이 (교사 수에 따라 조정)
    const delay = Math.max(50, Math.min(200, 3000 / sortedNewlyAssigned.length));

    for (let i = 0; i < sortedNewlyAssigned.length; i++) {
      const teacher = sortedNewlyAssigned[i];

      await new Promise((resolve) => setTimeout(resolve, delay));

      // 배정 표시 및 하이라이트
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === teacher.id
            ? { ...t, assigned_school_id: teacher.assigned_school_id, assigned_school_name: teacher.assigned_school_name }
            : t
        )
      );

      // 하이라이트 효과
      setHighlightedIds((prev) => new Set([...prev, teacher.id]));

      // 잠시 후 하이라이트 제거
      setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(teacher.id);
          return next;
        });
      }, 1000);
    }
  };

  // 학교 가나다순 정렬
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [schools]);

  // VBA: 현재 희망구분에 맞는 희망학교 ID 반환 (api.ts와 동일)
  const getWishSchoolId = (t: InternalTransfer): number | null => {
    switch (t.preference_round) {
      case '1희망': return t.wish_school_1_id;
      case '2희망': return t.wish_school_2_id;
      case '3희망': return t.wish_school_3_id;
      default: return t.wish_school_1_id;
    }
  };

  // VBA: 관내전출입시트_서열순정렬() / 관내전출입시트_소속순정렬()
  const sortedTransfers = useMemo(() => {
    const list = [...transfers];
    if (sortType === 'score') {
      // VBA 서열순: 희망학교 → 우선 → 희망구분 → 동점서열(총점→tiebreaker1~7)
      // 학교 display_order 맵 생성
      const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order]));
      const maxOrder = Math.max(...schools.map(s => s.display_order), 0) + 1;

      return list.sort((a, b) => {
        // 1. 희망학교 순 (display_order 기준) - VBA: d열(현재 preference_round에 해당하는 희망학교)
        const aWishId = getWishSchoolId(a);
        const bWishId = getWishSchoolId(b);
        const aIsRemote = !aWishId && a.remote_wish_1_id;
        const bIsRemote = !bWishId && b.remote_wish_1_id;
        // VBA: 학교목록 & ", 통합(벽지)" & ", 비정기" - 통합(벽지)는 마지막
        const aOrder = aIsRemote ? maxOrder : (aWishId ? (schoolOrderMap.get(aWishId) ?? maxOrder) : maxOrder);
        const bOrder = bIsRemote ? maxOrder : (bWishId ? (schoolOrderMap.get(bWishId) ?? maxOrder) : maxOrder);
        if (aOrder !== bOrder) return aOrder - bOrder;

        // 2. 우선 배치 대상자 먼저
        if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;

        // 3. 희망구분 순 (1희망 → 2희망 → 3희망)
        const roundOrder = { '1희망': 1, '2희망': 2, '3희망': 3 };
        const aRound = roundOrder[a.preference_round as keyof typeof roundOrder] || 4;
        const bRound = roundOrder[b.preference_round as keyof typeof roundOrder] || 4;
        if (aRound !== bRound) return aRound - bRound;

        // 4. 총점 내림차순
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;

        // 5. 동점서열 (tiebreaker_1 ~ tiebreaker_7)
        // VBA: 헤더 첫 글자로 정렬 순서 결정 - "1_"=오름차순, "2_"=내림차순
        // tiebreaker_1 (2_현임교 근무년수): 내림차순
        if ((b.tiebreaker_1 || 0) !== (a.tiebreaker_1 || 0)) return (b.tiebreaker_1 || 0) - (a.tiebreaker_1 || 0);
        // tiebreaker_2 (2_경력점): 내림차순
        if ((b.tiebreaker_2 || 0) !== (a.tiebreaker_2 || 0)) return (b.tiebreaker_2 || 0) - (a.tiebreaker_2 || 0);
        // tiebreaker_3 (1_생년월일): 오름차순 - 나이 많은(생년월일 숫자 작은) 사람 먼저
        if ((a.tiebreaker_3 || 0) !== (b.tiebreaker_3 || 0)) return (a.tiebreaker_3 || 0) - (b.tiebreaker_3 || 0);
        // tiebreaker_4~7: 기본 내림차순
        if ((b.tiebreaker_4 || 0) !== (a.tiebreaker_4 || 0)) return (b.tiebreaker_4 || 0) - (a.tiebreaker_4 || 0);
        if ((b.tiebreaker_5 || 0) !== (a.tiebreaker_5 || 0)) return (b.tiebreaker_5 || 0) - (a.tiebreaker_5 || 0);
        if ((b.tiebreaker_6 || 0) !== (a.tiebreaker_6 || 0)) return (b.tiebreaker_6 || 0) - (a.tiebreaker_6 || 0);
        if ((b.tiebreaker_7 || 0) !== (a.tiebreaker_7 || 0)) return (b.tiebreaker_7 || 0) - (a.tiebreaker_7 || 0);
        // 6. 안정 정렬 효과 - 같은 정렬 기준이면 id 순
        return a.id - b.id;
      });
    } else {
      // VBA 소속순: 성명 → 소속학교 (학교목록 순서)
      const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order]));
      return list.sort((a, b) => {
        // 소속학교 순 (display_order)
        const aOrder = a.current_school_id ? (schoolOrderMap.get(a.current_school_id) ?? 9999) : 9999;
        const bOrder = b.current_school_id ? (schoolOrderMap.get(b.current_school_id) ?? 9999) : 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // 성명 가나다순
        return (a.teacher_name || '').localeCompare(b.teacher_name || '', 'ko');
      });
    }
  }, [transfers, sortType, schools]);

  // 학교를 25개씩 그룹화 (엑셀 스타일)
  const schoolGroups = useMemo(() => {
    const groups: SchoolShortage[][] = [];
    for (let i = 0; i < shortages.length; i += 25) {
      groups.push(shortages.slice(i, i + 25));
    }
    return groups;
  }, [shortages]);

  // 만기 미배치자 수
  const expiredUnassignedCount = useMemo(() => {
    return transfers.filter(t => t.is_expired && !t.assigned_school_id && !t.exclusion_reason).length;
  }, [transfers]);

  // 학교명으로 학교 ID 찾기 (약칭도 매칭)
  const findSchoolId = (schoolName: string): number | null => {
    if (!schoolName) return null;
    const name = schoolName.trim();
    // 정확히 일치
    let found = schools.find(s => s.name === name);
    if (found) return found.id;
    // "초등학교" 붙여서 검색
    found = schools.find(s => s.name === name + '초등학교' || s.name === name + '초');
    if (found) return found.id;
    // 약칭 매칭 (학교명에서 "초등학교", "초" 제거 후 비교)
    found = schools.find(s =>
      s.name.replace('초등학교', '').replace('초', '') === name ||
      s.name.replace('초등학교', '') === name
    );
    return found ? found.id : null;
  };

  // VBA: 관내내신자료가져오기() - 엑셀 파일에서 자료 가져오기
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('기존 관내전출입 데이터를 모두 삭제하고 새로 가져오시겠습니까?')) {
      e.target.value = '';
      return;
    }

    setProcessing(true);

    try {
      // 엑셀 파일 읽기
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // "자료" 시트 찾기
      const sheetName = workbook.SheetNames.find(name => name === '자료') || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

      // 기존 데이터 삭제
      await internalApi.deleteAll();

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Row 3부터 데이터 (Row 1: 메타, Row 2: 헤더)
      // VBA 컬럼 매핑: B=현임교, C=1희망, D=2희망, E=3희망, F=성별, G=성명
      // H=총점, I=현임교년수, J=경력점, L=생년월일, M=전보구분
      // AA=벽지1, AB=벽지2, AC=벽지3, AE=특별가산점, AF=비고
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[1] || !row[6]) continue; // 현임교(B)와 성명(G) 필수

        const 현임교 = String(row[1] || '').trim();
        const 희망1원본 = String(row[2] || '').trim();
        const 희망2원본 = String(row[3] || '').trim();
        const 희망3원본 = String(row[4] || '').trim();
        const 성별 = String(row[5] || '').trim();
        const 성명 = String(row[6] || '').trim();
        let 총점 = Math.round((parseFloat(row[7]) || 0) * 100) / 100; // 소수점 2자리
        const 현임교년수 = Math.round((parseFloat(row[8]) || 0) * 100) / 100;
        const 경력점 = Math.round((parseFloat(row[9]) || 0) * 100) / 100;
        // 생년월일: YYYY-MM-DD → YYYY.MM.DD 변환
        let 생년월일 = row[11] ? String(row[11]).trim() : null;
        if (생년월일) {
          생년월일 = 생년월일.replace(/-/g, '.');
        }
        const 전보구분 = String(row[12] || '').trim();
        const 우선사유 = String(row[18] || '').trim();
        // 벽지 희망학교 (AA=26, AB=27, AC=28열)
        const 벽지1 = String(row[26] || '').trim();
        const 벽지2 = String(row[27] || '').trim();
        const 벽지3 = String(row[28] || '').trim();
        // 특별가산점 (AE=30열)
        const 특별가산점 = Math.round((parseFloat(row[30]) || 0) * 100) / 100;
        const 비고 = String(row[31] || '').trim();

        // 학교 ID 찾기
        const currentSchoolId = findSchoolId(현임교);
        if (!currentSchoolId) {
          errors.push(`${성명}: 현임교 '${현임교}' 찾을 수 없음`);
          failCount++;
          continue;
        }

        // VBA 로직: 통합/벽지 희망이면 희망학교를 "통합(벽지)"로 표시, 비정기면 "비정기"
        let wish1Id: number | null = null;
        let wish2Id: number | null = null;
        let wish3Id: number | null = null;

        if (희망1원본.includes('통합') || 희망1원본.includes('벽지')) {
          wish1Id = null; // 통합(벽지)는 wish_school을 null로, remote_wish로 판단
        } else if (전보구분 === '비정기') {
          wish1Id = null; // 비정기는 희망학교 없음
        } else {
          wish1Id = findSchoolId(희망1원본);
        }

        if (전보구분 === '비정기') {
          wish2Id = null;
          wish3Id = null;
        } else {
          wish2Id = findSchoolId(희망2원본);
          wish3Id = findSchoolId(희망3원본);
        }

        // VBA 로직: 만기여부 = 전보구분에 "만기" 포함 or 2희망/3희망 있음 or 비정기
        const isExpired = 전보구분.includes('만기') || (희망2원본 !== '' && 희망2원본 !== '비정기') || 전보구분 === '비정기';
        // VBA 로직: 우선여부 = 전보구분에 "우선" 또는 "초빙" 포함
        const isPriority = 전보구분.includes('우선') || 전보구분.includes('초빙') || 우선사유 !== '';

        // VBA 로직: 초빙인 경우 총점 100점
        if (전보구분.includes('초빙')) {
          총점 = 100;
        }

        // 벽지 희망학교 ID 찾기
        const remote1Id = findSchoolId(벽지1);
        const remote2Id = findSchoolId(벽지2);
        const remote3Id = findSchoolId(벽지3);

        // VBA: 동점서열3 = 생년월일 (숫자로 변환하여 정렬에 사용)
        // 예: "1980.01.01" → 19800101, "19800101" → 19800101
        let tiebreaker3 = 0;
        if (생년월일) {
          const numStr = 생년월일.replace(/[^0-9]/g, '');
          tiebreaker3 = parseInt(numStr, 10) || 0;
        }

        try {
          await internalApi.create({
            preference_round: '1희망',
            current_school_id: currentSchoolId,
            teacher_name: 성명,
            gender: 성별 || null,
            birth_date: 생년월일,
            is_expired: isExpired,
            wish_school_1_id: wish1Id,
            wish_school_2_id: wish2Id,
            wish_school_3_id: wish3Id,
            is_priority: isPriority,
            total_score: 총점,
            tiebreaker_1: 현임교년수,
            tiebreaker_2: 경력점,
            tiebreaker_3: tiebreaker3, // VBA: 생년월일을 숫자로 변환
            note: 비고 || null,
            // 벽지(통합) 희망
            remote_wish_1_id: remote1Id,
            remote_wish_2_id: remote2Id,
            remote_wish_3_id: remote3Id,
            // 특별가산점
            special_bonus: 특별가산점,
          });
          successCount++;
        } catch (err: any) {
          const errMsg = err?.message || err?.toString() || '알 수 없는 오류';
          console.error(`저장 실패 [${성명}]:`, err);
          errors.push(`${성명}: ${errMsg}`);
          failCount++;
        }
      }

      let message = `자료 가져오기 완료!\n성공: ${successCount}건`;
      if (failCount > 0) {
        message += `\n실패: ${failCount}건`;
        if (errors.length > 0) {
          message += `\n\n오류 목록 (최대 10개):\n${errors.slice(0, 10).join('\n')}`;
        }
      }
      alert(message);
      loadData();
    } catch (error) {
      console.error('파일 읽기 실패:', error);
      alert('파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  // VBA: 관내전출입시트_1희망배치() - 배치 초기화 후 1희망 배치
  const handle1stRoundAssign = async () => {
    if (!confirm('1희망 배치를 실행하시겠습니까?\n(기존 배치가 모두 초기화됩니다)')) return;
    setProcessing(true);
    try {
      // 배치 초기화
      await assignmentApi.reset();
      // 희망구분 1희망으로 리셋
      await assignmentApi.resetPreferenceRound();

      // 배치 전 상태 저장 (초기화 후이므로 비어 있음)
      const beforeAssignedIds = new Set<number>();

      // 1희망 배치
      const res = await assignmentApi.round(1);

      // 애니메이션으로 결과 표시
      await loadDataWithAnimation(beforeAssignedIds);
      alert(`1희망 배치 완료: ${res.data.assigned}명 배치`);
    } catch (error) {
      console.error('1희망 배치 실패:', error);
      alert('1희망 배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // VBA: 관내전출입시트_2희망배치() - 만기 미배치자 2희망 배치
  const handle2ndRoundAssign = async () => {
    if (!confirm('2희망 배치를 실행하시겠습니까?\n(만기 미배치자의 희망구분이 2희망으로 변경됩니다)')) return;
    setProcessing(true);
    try {
      const expiredCount = await assignmentApi.getExpiredUnassignedCount();
      if (expiredCount === 0) {
        alert('만기 미배치자가 없습니다.');
        setProcessing(false);
        return;
      }

      // 배치 전 상태 저장
      const beforeAssignedIds = new Set(transfers.filter((t) => t.assigned_school_id).map((t) => t.id));

      // 만기 미배치자 희망구분을 2희망으로 변경
      await assignmentApi.updateExpiredPreferenceRound('2희망');
      // 2희망 배치
      const res = await assignmentApi.round(2);

      // 애니메이션으로 결과 표시
      await loadDataWithAnimation(beforeAssignedIds);
      alert(`2희망 배치 완료: ${res.data.assigned}명 배치`);
    } catch (error) {
      console.error('2희망 배치 실패:', error);
      alert('2희망 배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // VBA: 관내전출입시트_3희망배치() - 만기 미배치자 3희망 배치
  const handle3rdRoundAssign = async () => {
    if (!confirm('3희망 배치를 실행하시겠습니까?\n(만기 미배치자의 희망구분이 3희망으로 변경됩니다)')) return;
    setProcessing(true);
    try {
      const expiredCount = await assignmentApi.getExpiredUnassignedCount();
      if (expiredCount === 0) {
        alert('만기 미배치자가 없습니다.');
        setProcessing(false);
        return;
      }

      // 배치 전 상태 저장
      const beforeAssignedIds = new Set(transfers.filter((t) => t.assigned_school_id).map((t) => t.id));

      // 만기 미배치자 희망구분을 3희망으로 변경
      await assignmentApi.updateExpiredPreferenceRound('3희망');
      // 3희망 배치
      const res = await assignmentApi.round(3);

      // 애니메이션으로 결과 표시
      await loadDataWithAnimation(beforeAssignedIds);
      alert(`3희망 배치 완료: ${res.data.assigned}명 배치`);
    } catch (error) {
      console.error('3희망 배치 실패:', error);
      alert('3희망 배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // VBA: 관내전출입시트_제외별도점검() - 제외사유/별도정원 점검
  const handleCheckExclusion = async () => {
    if (!confirm('제외사유 및 별도정원을 점검하시겠습니까?\n(결원/관외전출 데이터를 기반으로 자동 입력됩니다)')) return;
    setProcessing(true);
    try {
      const res = await assignmentApi.checkExclusion();
      alert(`점검 완료: ${(res.data as any).checked}건 처리\n\n※ 동명이인 여부를 확인해주세요.`);
      loadData();
    } catch (error) {
      console.error('점검 실패:', error);
      alert('점검 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // 우선전보/전보유예 점검
  const handleCheckPriority = async () => {
    if (!confirm('우선전보/전보유예를 점검하시겠습니까?\n(우선/유예 데이터를 기반으로 자동 적용됩니다)\n\n- 우선전보: 총점 적용 + 우선 여부 설정\n- 전보유예: 제외사유에 "전보유예" 입력')) return;
    setProcessing(true);
    try {
      const res = await assignmentApi.checkPriority();
      alert(`점검 완료: ${(res.data as any).checked}건 처리\n\n※ 동명이인 여부를 확인해주세요.`);
      loadData();
    } catch (error) {
      console.error('점검 실패:', error);
      alert('점검 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // 과원해소 점검
  const handleCheckSurplus = async () => {
    if (!confirm('과원해소를 점검하시겠습니까?\n\n- 과원 탭에서 "현학교 남기"가 체크된 교사 대상\n- 1~3희망 시뮬레이션으로 자리 생기면 과원해소 처리\n- 과원순번이 높은(숫자가 큰) 사람부터 해소')) return;
    setProcessing(true);
    try {
      const res = await assignmentApi.checkSurplus();
      const result = res.data as { checked: number; message: string };
      alert(`과원해소 점검 완료!\n\n${result.message}`);
      loadData();
    } catch (error) {
      console.error('과원해소 점검 실패:', error);
      alert('과원해소 점검 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // 배치 실행 (자동 전체 배치)
  const handleAutoAssign = async () => {
    if (!confirm('자동 배치를 실행하시겠습니까?\n1희망 → 2희망 → 3희망 순서로 배치됩니다.')) return;
    setProcessing(true);
    try {
      // 배치 전 상태 저장 (자동 배치는 초기화 후 시작하므로 비어 있음)
      const beforeAssignedIds = new Set<number>();

      const res = await assignmentApi.auto();

      // 애니메이션으로 결과 표시
      await loadDataWithAnimation(beforeAssignedIds);
      alert(`배치 완료!\n1희망: ${res.data.results['1희망']}명\n2희망: ${res.data.results['2희망']}명\n3희망: ${res.data.results['3희망']}명\n총 ${res.data.total_assigned}명 배치`);
    } catch (error) {
      console.error('자동 배치 실패:', error);
      alert('자동 배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // 배치 결과 엑셀 다운로드
  const handleDownloadExcel = async () => {
    if (transfers.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('관내전출입');

    // 스타일 정의
    const yellowFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    const greenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    const grayFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // === 1. 학교별 과부족 현황 표 ===
    // 25개씩 2행으로 나누기
    const schoolsPerRow = 25;
    const schoolRows = [];
    for (let i = 0; i < shortages.length; i += schoolsPerRow) {
      schoolRows.push(shortages.slice(i, i + schoolsPerRow));
    }

    let currentRow = 1;
    schoolRows.forEach((rowSchools) => {
      // 학교코드 행
      const codeRow = ws.getRow(currentRow);
      codeRow.getCell(1).value = '학교코드';
      codeRow.getCell(1).fill = yellowFill;
      codeRow.getCell(1).border = thinBorder;
      rowSchools.forEach((s, idx) => {
        const cell = codeRow.getCell(idx + 2);
        cell.value = s.id;
        cell.fill = yellowFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // 학교명 행
      const nameRow = ws.getRow(currentRow);
      nameRow.getCell(1).value = '학교명';
      nameRow.getCell(1).fill = yellowFill;
      nameRow.getCell(1).border = thinBorder;
      rowSchools.forEach((s, idx) => {
        const cell = nameRow.getCell(idx + 2);
        cell.value = s.name.replace('초등학교', '');
        cell.fill = yellowFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // 현 과부족 행
      const shortageRow = ws.getRow(currentRow);
      shortageRow.getCell(1).value = '현 과부족';
      shortageRow.getCell(1).fill = yellowFill;
      shortageRow.getCell(1).border = thinBorder;
      rowSchools.forEach((s, idx) => {
        const cell = shortageRow.getCell(idx + 2);
        cell.value = s.shortage;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center' };
        if (s.shortage < 0) {
          cell.font = { color: { argb: 'FFFF0000' }, bold: true };
        }
      });
      currentRow += 2; // 빈 행 추가
    });

    // === 2. 관내전출입 데이터 테이블 ===
    const headers = ['순', '제외사유', '희망구분', '희망학교', '배정학교', '현임교', '성명', '성별', '생년월일', '만기여부', '1희망', '2희망', '3희망', '비고', '별도정원', '우선여부', '총점', '현임교근무', '경력점', '생년월일순'];

    // 헤더 행
    const headerRow = ws.getRow(currentRow);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.fill = yellowFill;
      cell.border = thinBorder;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });
    currentRow++;

    // 데이터 행
    sortedTransfers.forEach((t, index) => {
      const row = ws.getRow(currentRow);
      const values = [
        index + 1,
        t.exclusion_reason || '',
        t.preference_round || '',
        getWishSchool(t)?.replace('초등학교', '') || '',
        t.assigned_school_name?.replace('초등학교', '') || '',
        t.current_school_name?.replace('초등학교', '') || '',
        t.teacher_name || '',
        t.gender || '',
        t.birth_date || '',
        t.is_expired ? 'O' : '',
        t.wish_school_1_name?.replace('초등학교', '') || '',
        t.wish_school_2_name?.replace('초등학교', '') || '',
        t.wish_school_3_name?.replace('초등학교', '') || '',
        t.note || '',
        t.separate_quota || '',
        t.is_priority ? 'O' : '',
        t.total_score || 0,
        t.tiebreaker_1 || 0,
        t.tiebreaker_2 || 0,
        t.tiebreaker_3 || 0,
      ];

      values.forEach((v, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = v;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center' };
      });

      // 조건부 스타일
      if (t.exclusion_reason) {
        // 제외사유 있으면 회색
        values.forEach((_, idx) => {
          row.getCell(idx + 1).fill = grayFill;
          row.getCell(idx + 1).font = { color: { argb: 'FF888888' } };
        });
      } else if (t.assigned_school_id) {
        // 배정학교 있으면 연녹색
        values.forEach((_, idx) => {
          row.getCell(idx + 1).fill = greenFill;
        });
      }

      // 배정학교 셀 강조
      if (t.assigned_school_id && !t.exclusion_reason) {
        row.getCell(5).font = { bold: true, color: { argb: 'FF2E7D32' } };
      }

      currentRow++;
    });

    // 열 너비 자동 조정
    ws.columns.forEach((col, idx) => {
      col.width = idx === 0 ? 5 : idx === 6 ? 10 : 8;
    });

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `관내전출입_배치결과_${today}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const _handleReset = async () => {
    if (!confirm('모든 배치를 초기화하시겠습니까?')) return;
    setProcessing(true);
    try {
      await assignmentApi.reset();
      loadData();
    } catch (error) {
      console.error('초기화 실패:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 관내전출입 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await internalApi.deleteAll();
      loadData();
    } catch (error) {
      console.error('전체 삭제 실패:', error);
    }
  };

  const handleEdit = (transfer: InternalTransfer) => {
    setEditingId(transfer.id);
    setEditForm({ ...transfer });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      // 가상 필드(조인된 객체 및 _name 필드) 제외하고 실제 DB 열만 전송
      const {
        // 조인된 객체들 제외
        current_school,
        assigned_school,
        wish_school_1,
        wish_school_2,
        wish_school_3,
        remote_wish_1,
        remote_wish_2,
        remote_wish_3,
        remote_wish_4,
        remote_wish_5,
        remote_wish_6,
        remote_wish_7,
        remote_wish_8,
        // 변환된 _name 필드들 제외
        current_school_name,
        assigned_school_name,
        wish_school_1_name,
        wish_school_2_name,
        wish_school_3_name,
        remote_wish_1_name,
        remote_wish_2_name,
        remote_wish_3_name,
        remote_wish_4_name,
        remote_wish_5_name,
        remote_wish_6_name,
        remote_wish_7_name,
        remote_wish_8_name,
        ...dbFields
      } = editForm as any;

      const saveData = {
        ...dbFields,
        total_score: dbFields.total_score ?? 0,
      };
      await internalApi.update(editingId, saveData);
      setEditingId(null);
      setEditForm({});
      await loadData();
      alert('저장되었습니다.');
    } catch (error) {
      console.error('수정 실패:', error);
      alert(`수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const _handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await internalApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 희망학교 가져오기 (희망구분에 따라)
  const getWishSchool = (t: InternalTransfer) => {
    if (t.preference_round === '1희망') return t.wish_school_1_name;
    if (t.preference_round === '2희망') return t.wish_school_2_name;
    if (t.preference_round === '3희망') return t.wish_school_3_name;
    return t.wish_school_1_name;
  };

  // 결원 학교 목록
  const _schoolsWithVacancy = shortages.filter(s => s.shortage < 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 숨겨진 파일 입력 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportData}
        accept=".xlsx,.xlsm,.xls"
        className="hidden"
      />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">관내전출입</h2>
        <div className="flex gap-2">
          <button onClick={handleDeleteAll} className="btn btn-danger">
            전체 삭제
          </button>
        </div>
      </div>

      {/* 학교별 과부족 현황 (원본 엑셀 스타일 - 여러 행) */}
      <div className="card mb-4 p-2">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {schoolGroups.map((group, groupIdx) => (
                <Fragment key={`group-${groupIdx}`}>
                  {/* 학교코드 행 */}
                  <tr className="bg-yellow-100">
                    <td className="border border-yellow-300 px-1 py-0.5 font-medium text-center whitespace-nowrap bg-yellow-200 w-16">학교코드</td>
                    {group.map((s, idx) => (
                      <td key={s.id} className="border border-yellow-300 px-1 py-0.5 text-center whitespace-nowrap min-w-[32px] text-gray-500">
                        {groupIdx * 25 + idx + 1}
                      </td>
                    ))}
                  </tr>
                  {/* 학교명 행 */}
                  <tr className="bg-yellow-50">
                    <td className="border border-yellow-300 px-1 py-0.5 font-medium text-center whitespace-nowrap bg-yellow-200">학교명</td>
                    {group.map(s => (
                      <td key={s.id} className="border border-yellow-300 px-1 py-0.5 text-center whitespace-nowrap text-xs">
                        {s.name.replace('초등학교', '').replace('초', '')}
                      </td>
                    ))}
                  </tr>
                  {/* 현 과부족 행 */}
                  <tr className="bg-yellow-100">
                    <td className="border border-yellow-300 px-1 py-0.5 font-medium text-center whitespace-nowrap bg-yellow-200">현 과부족</td>
                    {group.map(s => (
                      <td
                        key={s.id}
                        className={`border border-yellow-300 px-1 py-0.5 text-center font-bold ${
                          s.shortage < 0 ? 'text-red-600 bg-red-50' : s.shortage > 0 ? 'text-blue-600 bg-blue-50' : ''
                        }`}
                      >
                        {s.shortage}
                      </td>
                    ))}
                  </tr>
                  {/* 그룹 사이 간격 */}
                  {groupIdx < schoolGroups.length - 1 && (
                    <tr>
                      <td colSpan={26} className="h-1 bg-gray-200"></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 원본 엑셀과 동일한 메뉴 바 (노란색 배경) */}
      <div className="bg-yellow-100 border border-yellow-300 mb-4 p-2">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 설정 및 버튼들 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 만기 시 희망 학교 수 설정 + 만기 미발령자 수 */}
            <div className="flex flex-col gap-0.5 bg-white border px-2 py-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">만기 시 희망 학교 수 설정</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={expiredWishCount}
                  onChange={(e) => setExpiredWishCount(Number(e.target.value))}
                  className="w-10 px-1 py-0.5 border text-center text-sm"
                />
              </div>
              <div className="text-xs text-red-600 font-medium">
                만기 미발령: {expiredUnassignedCount}명
              </div>
            </div>

            {/* 정렬 버튼 */}
            <button
              onClick={() => setSortType('score')}
              className={`px-2 py-1 text-xs border ${sortType === 'score' ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-100'}`}
            >
              서열순 정렬
            </button>
            <button
              onClick={() => setSortType('school')}
              className={`px-2 py-1 text-xs border ${sortType === 'school' ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-100'}`}
            >
              소속순 정렬
            </button>

            {/* 자료 가져오기 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              0. 자료 가져오기
            </button>

            {/* 점검 버튼 */}
            <button
              onClick={handleCheckExclusion}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              1. 제외사유, 별도정원 점검
            </button>

            {/* 우선전보/전보유예 점검 버튼 */}
            <button
              onClick={handleCheckPriority}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              2. 우선전보, 전보유예 점검
            </button>

            {/* 과원해소 점검 버튼 */}
            <button
              onClick={handleCheckSurplus}
              disabled={processing}
              className="px-2 py-1 text-xs bg-yellow-100 border border-yellow-400 hover:bg-yellow-200 disabled:opacity-50"
            >
              3. 과원해소 점검
            </button>

            {/* 희망별 배치 버튼 */}
            <button
              onClick={handle1stRoundAssign}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              4. 1희망 배치
            </button>
            <button
              onClick={handle2ndRoundAssign}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              5. 2희망 배치
            </button>
            <button
              onClick={handle3rdRoundAssign}
              disabled={processing}
              className="px-2 py-1 text-xs bg-white border hover:bg-gray-100 disabled:opacity-50"
            >
              6. 3희망 배치
            </button>
            <button
              onClick={handleAutoAssign}
              disabled={processing}
              className="px-2 py-1 text-xs bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              자동 배치 (1→2→3)
            </button>

            {/* 구분선 */}
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* 엑셀 다운로드 버튼 */}
            <button
              onClick={handleDownloadExcel}
              disabled={processing || transfers.length === 0}
              className="px-2 py-1 text-xs bg-green-600 text-white border border-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              📥 엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 원본 엑셀과 동일한 테이블 */}
      <div className="overflow-x-auto border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-yellow-50 sticky top-0">
            {/* 첫 번째 헤더 행 */}
            <tr>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-8">순</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-16 bg-yellow-100">제외사유</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">희망<br/>구분</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-16">희망학교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-16 bg-green-100">배정학교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">현임교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">성명</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-8">성별</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-20">생년월일</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-10">만기<br/>여부<br/>(O)</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">1희망<br/>학교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">2희망<br/>학교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">3희망<br/>학교</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-12">비고</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-12">별도<br/>정원</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-10">우선<br/>여부<br/>(O)</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-10">총점</th>
              <th colSpan={3} className="border border-gray-300 px-1 py-1 text-center bg-blue-50">동점자 서열<br/><span className="text-[10px] font-normal">(※문두 1_:오름차순, 2_:내림차순 정렬)</span></th>
              {useRemoteSchools && (
                <>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>1희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>2희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>3희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>4희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>5희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>6희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>7희망</th>
                  <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14 bg-purple-50">통합(벽지)<br/>8희망</th>
                </>
              )}
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-16">특별<br/>가산점<br/>반영 총점</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-14">특별<br/>가산점</th>
              <th rowSpan={2} className="border border-gray-300 px-1 py-1 text-center w-10">관리</th>
            </tr>
            {/* 두 번째 헤더 행 - 동점자 서열 세부 */}
            <tr>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-blue-50 text-[10px]">2_현임교<br/>근무년수</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-blue-50 text-[10px]">2_경력점</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-blue-50 text-[10px]">1_생년월일</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransfers.length === 0 ? (
              <tr>
                <td colSpan={useRemoteSchools ? 31 : 23} className="border border-gray-300 text-center text-gray-500 py-4">
                  데이터가 없습니다. "0. 자료 가져오기" 버튼을 클릭하여 데이터를 불러오세요.
                </td>
              </tr>
            ) : (
              sortedTransfers.map((t, index) => (
                <tr
                  key={t.id}
                  className={`hover:bg-blue-50 ${t.exclusion_reason ? 'bg-gray-200 text-gray-400' : ''} ${t.assigned_school_id ? 'bg-green-50' : ''}`}
                >
                  {/* 순 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{index + 1}</td>
                  {/* 제외사유 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center text-xs">{t.exclusion_reason || ''}</td>
                  {/* 희망구분 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.preference_round}</td>
                  {/* 희망학교 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{getWishSchool(t)?.replace('초등학교', '')}</td>
                  {/* 배정학교 - 만기자는 노란 배경, 새 배치는 하이라이트 */}
                  <td className={`border border-gray-300 px-1 py-0.5 text-center font-medium transition-all duration-500 ${
                    highlightedIds.has(t.id)
                      ? 'bg-blue-500 text-white scale-105 shadow-lg'
                      : t.is_expired && !t.exclusion_reason && !t.assigned_school_id
                        ? 'bg-yellow-300'
                        : t.assigned_school_id
                          ? 'bg-green-50 text-green-700'
                          : ''
                  }`}>
                    {t.assigned_school_name?.replace('초등학교', '') || ''}
                  </td>
                  {/* 현임교 - 만기자는 노란 배경 */}
                  <td className={`border border-gray-300 px-1 py-0.5 text-center ${t.is_expired && !t.exclusion_reason && !t.assigned_school_id ? 'bg-yellow-300' : ''}`}>{t.current_school_name?.replace('초등학교', '')}</td>
                  {/* 성명 - 만기자는 노란 배경 */}
                  <td className={`border border-gray-300 px-1 py-0.5 text-center font-medium ${t.is_expired && !t.exclusion_reason && !t.assigned_school_id ? 'bg-yellow-300' : ''}`}>{t.teacher_name}</td>
                  {/* 성별 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.gender}</td>
                  {/* 생년월일 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.birth_date?.replace(/-/g, '.')}</td>
                  {/* 만기여부(O) */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.is_expired ? 'O' : ''}</td>
                  {/* 1희망학교 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    {t.remote_wish_1_id && !t.wish_school_1_id ? <span className="text-purple-600 font-medium">통합(벽지)</span> : t.wish_school_1_name?.replace('초등학교', '')}
                  </td>
                  {/* 2희망학교 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.wish_school_2_name?.replace('초등학교', '')}</td>
                  {/* 3희망학교 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.wish_school_3_name?.replace('초등학교', '')}</td>
                  {/* 비고 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center text-xs">{t.note}</td>
                  {/* 별도정원 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.separate_quota || ''}</td>
                  {/* 우선여부(O) */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{t.is_priority ? 'O' : ''}</td>
                  {/* 총점 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{Number.isInteger(t.total_score) ? t.total_score : t.total_score?.toFixed(2)}</td>
                  {/* 동점자 서열: 2_현임교근무년수, 2_경력점, 1_생년월일 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center bg-blue-50">{t.tiebreaker_1 ? (Number.isInteger(t.tiebreaker_1) ? t.tiebreaker_1 : t.tiebreaker_1.toFixed(2)) : ''}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center bg-blue-50">{t.tiebreaker_2 ? (Number.isInteger(t.tiebreaker_2) ? t.tiebreaker_2 : t.tiebreaker_2.toFixed(2)) : ''}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center bg-blue-50">{t.birth_date?.replace(/-/g, '.') || ''}</td>
                  {/* 통합(벽지) 1희망~8희망 */}
                  {useRemoteSchools && (
                    <>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_1_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_2_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_3_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_4_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_5_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_6_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_7_name || ''}</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center bg-purple-50">{t.remote_wish_8_name || ''}</td>
                    </>
                  )}
                  {/* 특별 가산점 반영 총점 - 원본 총점에 이미 반영되어 있으므로 총점 그대로 표시 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center bg-yellow-50">
                    {Number.isInteger(t.total_score) ? t.total_score : t.total_score?.toFixed(2)}
                  </td>
                  {/* 특별 가산점 - 1희망이 중부인 경우만 표시 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center bg-yellow-50">
                    {t.wish_school_1_name?.includes('중부') ? (t.special_bonus || '') : ''}
                  </td>
                  {/* 관리 */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 수정 모달 */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">전출입 정보 수정</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-500">배정학교</label>
                <select
                  className="select w-full"
                  value={editForm.assigned_school_id ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, assigned_school_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">선택</option>
                  {sortedSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">제외사유</label>
                <input
                  type="text"
                  className="input w-full"
                  value={editForm.exclusion_reason ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, exclusion_reason: e.target.value || null })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">희망구분</label>
                <select
                  className="select w-full"
                  value={editForm.preference_round ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, preference_round: e.target.value })}
                >
                  <option value="1희망">1희망</option>
                  <option value="2희망">2희망</option>
                  <option value="3희망">3희망</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">총점</label>
                <input
                  type="number"
                  step="0.01"
                  className="input w-full"
                  value={editForm.total_score === undefined || editForm.total_score === null ? '' : editForm.total_score}
                  onChange={(e) => setEditForm({ ...editForm, total_score: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">1희망 학교</label>
                <select
                  className="select w-full"
                  value={editForm.wish_school_1_id ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, wish_school_1_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">선택</option>
                  {useRemoteSchools && <option value="-1">통합(벽지)</option>}
                  {sortedSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">2희망 학교</label>
                <select
                  className="select w-full"
                  value={editForm.wish_school_2_id ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, wish_school_2_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">선택</option>
                  {sortedSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">3희망 학교</label>
                <select
                  className="select w-full"
                  value={editForm.wish_school_3_id ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, wish_school_3_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">선택</option>
                  {sortedSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">비고</label>
                <input
                  type="text"
                  className="input w-full"
                  value={editForm.note ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">별도정원</label>
                <select
                  className="select w-full"
                  value={editForm.separate_quota ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, separate_quota: e.target.value || null })}
                >
                  <option value="">-</option>
                  <option value="휴직">휴직</option>
                  <option value="파견">파견</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.is_expired ?? false}
                  onChange={(e) => setEditForm({ ...editForm, is_expired: e.target.checked })}
                />
                <span>만기</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.is_priority ?? false}
                  onChange={(e) => setEditForm({ ...editForm, is_priority: e.target.checked })}
                />
                <span>우선</span>
              </label>
            </div>
            {/* 통합(벽지) 희망 필드 */}
            {useRemoteSchools && (
              <div className="mb-4">
                <label className="text-sm text-gray-500 block mb-2">통합(벽지) 희망</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4,5,6,7,8].map((n) => {
                    // 통합학교 목록에서 학교 찾기
                    const remoteSchoolOptions = schools.filter(s =>
                      remoteSchools.some(rs => s.name.includes(rs) || rs.includes(s.name.replace('초등학교', '').replace('초', '')))
                    );
                    return (
                      <select
                        key={n}
                        className="select text-sm"
                        value={(editForm as any)[`remote_wish_${n}_id`] ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, [`remote_wish_${n}_id`]: e.target.value ? parseInt(e.target.value) : null })}
                      >
                        <option value="">{n}희망</option>
                        {remoteSchoolOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={handleSave} className="btn btn-success">저장</button>
              <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary">취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        총 {sortedTransfers.length}건 | 정렬: {sortType === 'score' ? '서열순' : '소속순'}
      </div>
    </div>
  );
}
