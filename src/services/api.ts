import { supabase } from '../lib/supabase';
import type {
  School,
  VacancyItem,
  ExternalOut,
  ExternalIn,
  InternalTransfer,
  SchoolShortage,
  AssignmentStats,
  AssignmentResult,
  PriorityTransfer,
} from '../types';

// 학교 API
export const schoolApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('display_order');
    if (error) throw error;
    return { data: data as School[] };
  },
  get: async (id: number) => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  create: async (school: Partial<School>) => {
    const { data, error } = await supabase
      .from('schools')
      .insert(school)
      .select()
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  update: async (id: number, school: Partial<School>) => {
    const { data, error } = await supabase
      .from('schools')
      .update(school)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('schools').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
  createBulk: async (schools: Partial<School>[]) => {
    const { data, error } = await supabase.from('schools').insert(schools).select();
    if (error) throw error;
    return { data };
  },
};

// 결원 API
export const vacancyApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('vacancies')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as VacancyItem[] };
  },
  create: async (vacancy: { type_code: string; school_id: number; teacher_name: string; gender?: string; birth_date?: string; note?: string }) => {
    const { data, error } = await supabase.from('vacancies').insert(vacancy).select().single();
    if (error) throw error;
    return { data };
  },
  update: async (id: number, vacancy: Partial<VacancyItem>) => {
    const { data, error } = await supabase.from('vacancies').update(vacancy).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('vacancies').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 충원 API
export const supplementApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('supplements')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as VacancyItem[] };
  },
  create: async (supplement: { type_code: string; school_id: number; teacher_name: string; gender?: string; birth_date?: string; note?: string }) => {
    const { data, error } = await supabase.from('supplements').insert(supplement).select().single();
    if (error) throw error;
    return { data };
  },
  update: async (id: number, data: Partial<VacancyItem>) => {
    const { data: result, error } = await supabase.from('supplements').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('supplements').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관외전출 API
export const externalOutApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('external_transfers_out')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as ExternalOut[] };
  },
  create: async (data: Partial<ExternalOut>) => {
    const { data: result, error } = await supabase.from('external_transfers_out').insert(data).select().single();
    if (error) throw error;
    return { data: result };
  },
  update: async (id: number, data: Partial<ExternalOut>) => {
    const { data: result, error } = await supabase.from('external_transfers_out').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('external_transfers_out').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관외전입 API
export const externalInApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('external_transfers_in')
      .select(`
        *,
        assigned_school:assigned_school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      assigned_school_name: item.assigned_school?.name || null,
    }));
    return { data: transformed as ExternalIn[] };
  },
  create: async (data: Partial<ExternalIn>) => {
    const { data: result, error } = await supabase.from('external_transfers_in').insert(data).select().single();
    if (error) throw error;
    return { data: result };
  },
  update: async (id: number, data: Partial<ExternalIn>) => {
    const { data: result, error } = await supabase.from('external_transfers_in').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('external_transfers_in').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 우선전보/전보유예 API
export const priorityApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('priority_transfers')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as PriorityTransfer[] };
  },
  create: async (priority: { type_code: string; school_id: number; teacher_name: string; total_score?: number; gender?: string; birth_date?: string; note?: string }) => {
    const { data, error } = await supabase.from('priority_transfers').insert(priority).select().single();
    if (error) throw error;
    return { data };
  },
  update: async (id: number, priority: Partial<PriorityTransfer>) => {
    const { data, error } = await supabase.from('priority_transfers').update(priority).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('priority_transfers').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관내전출입 API
export const internalApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('internal_transfers')
      .select(`
        *,
        current_school:current_school_id (name),
        assigned_school:assigned_school_id (name),
        wish_school_1:wish_school_1_id (name),
        wish_school_2:wish_school_2_id (name),
        wish_school_3:wish_school_3_id (name),
        remote_wish_1:remote_wish_1_id (name),
        remote_wish_2:remote_wish_2_id (name),
        remote_wish_3:remote_wish_3_id (name),
        remote_wish_4:remote_wish_4_id (name),
        remote_wish_5:remote_wish_5_id (name),
        remote_wish_6:remote_wish_6_id (name),
        remote_wish_7:remote_wish_7_id (name),
        remote_wish_8:remote_wish_8_id (name)
      `)
      .order('id', { ascending: true });  // VBA: 엑셀 입력 순서와 동일하게 id 순
    if (error) {
      console.error('internal_transfers getAll error:', error);
      throw error;
    }
    const transformed = (data || []).map((item: any) => ({
      ...item,
      current_school_name: item.current_school?.name || null,
      assigned_school_name: item.assigned_school?.name || null,
      wish_school_1_name: item.wish_school_1?.name || null,
      wish_school_2_name: item.wish_school_2?.name || null,
      wish_school_3_name: item.wish_school_3?.name || null,
      remote_wish_1_name: item.remote_wish_1?.name || null,
      remote_wish_2_name: item.remote_wish_2?.name || null,
      remote_wish_3_name: item.remote_wish_3?.name || null,
      remote_wish_4_name: item.remote_wish_4?.name || null,
      remote_wish_5_name: item.remote_wish_5?.name || null,
      remote_wish_6_name: item.remote_wish_6?.name || null,
      remote_wish_7_name: item.remote_wish_7?.name || null,
      remote_wish_8_name: item.remote_wish_8?.name || null,
    }));
    return { data: transformed as InternalTransfer[] };
  },
  create: async (transfer: Partial<InternalTransfer>) => {
    const { data, error } = await supabase.from('internal_transfers').insert(transfer).select().single();
    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`${error.message} (${error.code}): ${error.details || ''}`);
    }
    return { data };
  },
  update: async (id: number, transfer: Partial<InternalTransfer>) => {
    const { data, error } = await supabase.from('internal_transfers').update(transfer).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('internal_transfers').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
  deleteAll: async () => {
    const { error } = await supabase.from('internal_transfers').delete().neq('id', 0);
    if (error) throw error;
    return { data: null };
  },
};

// 학교별 과부족 계산 함수
async function calculateSchoolShortage(): Promise<SchoolShortage[]> {
  const { data: schools } = await schoolApi.getAll();
  const { data: vacancies } = await vacancyApi.getAll();
  const { data: supplements } = await supplementApi.getAll();
  const { data: externalOut } = await externalOutApi.getAll();
  const { data: externalIn } = await externalInApi.getAll();
  const { data: internal } = await internalApi.getAll();

  return schools.map((school) => {
    const vacancyCount = vacancies.filter((v) => v.school_id === school.id).length;
    const supplementCount = supplements.filter((s) => s.school_id === school.id).length;
    const extOutCount = externalOut.filter((e) => e.school_id === school.id && e.transfer_type !== '정원외').length;
    const extInCount = externalIn.filter((e) => e.assigned_school_id === school.id && e.transfer_type !== '정원외').length;
    // VBA: 관내전출 = 배정된 경우 + 만기자인데 미배정 (전출 예정)
    // BA/BB 수식: 배정학교가 있거나(비만기자), 만기자는 배정학교 없어도 카운트
    // BG = BC - BF: 별도정원(O열)은 관외전출에서 제외 → 관내전출에서도 제외
    const intOutCount = internal.filter((t) =>
      t.current_school_id === school.id &&
      !t.exclusion_reason &&
      !t.separate_quota &&  // VBA: 별도정원은 제외 (BF에서 빠짐)
      (
        (t.assigned_school_id && t.assigned_school_id !== school.id) ||  // 배정된 경우
        (!t.assigned_school_id && t.is_expired)  // 만기자인데 미배정 (전출 예정)
      )
    ).length;
    // VBA: 관내전입 BW = BJ - BV, 별도정원(BV)은 제외
    const intInCount = internal.filter((t) =>
      t.assigned_school_id === school.id &&
      t.current_school_id !== school.id &&
      !t.separate_quota  // VBA: 별도정원은 제외 (BV에서 빠짐)
    ).length;

    const currentCount = school.current_count - vacancyCount + supplementCount - extOutCount + extInCount - intOutCount + intInCount;
    const shortage = currentCount - school.quota;

    return {
      id: school.id,
      name: school.name,
      quota: school.quota,
      current_count: currentCount,
      shortage,
    };
  });
}

// 배치 통계 계산
async function calculateStats(): Promise<AssignmentStats> {
  const { data: internal } = await internalApi.getAll();
  const total = internal.length;
  const assigned = internal.filter((t) => t.assigned_school_id !== null).length;
  const excluded = internal.filter((t) => t.exclusion_reason !== null).length;
  const unassigned = total - assigned - excluded;
  const assignment_rate = total > 0 ? Math.round((assigned / (total - excluded)) * 100) : 0;

  return { total, assigned, excluded, unassigned, assignment_rate };
}

// 배치 API
export const assignmentApi = {
  // VBA: 관내전출입시트_자동배치()와 동일
  auto: async (): Promise<{ data: AssignmentResult }> => {
    const results = { '1희망': 0, '2희망': 0, '3희망': 0 };

    // 1. 배치 초기화 (배정학교 클리어) - VBA: Range("e5:e2004").ClearContents
    await assignmentApi.reset();

    // 2. 모든 희망구분을 1희망으로 리셋 - VBA: 희망구분1희망수정
    await assignmentApi.resetPreferenceRound();

    // 3. 1희망 배치 - VBA: 관내전출입시트_서열순정렬 + 배치
    const res1 = await assignmentApi.round(1);
    results['1희망'] = res1.data.assigned;

    // 3. 만기 미배치자가 있으면 2희망 배치
    const expiredCount2 = await assignmentApi.getExpiredUnassignedCount();
    if (expiredCount2 > 0) {
      await assignmentApi.updateExpiredPreferenceRound('2희망');
      const res2 = await assignmentApi.round(2);
      results['2희망'] = res2.data.assigned;
    }

    // 4. 만기 미배치자가 있으면 3희망 배치
    const expiredCount3 = await assignmentApi.getExpiredUnassignedCount();
    if (expiredCount3 > 0) {
      await assignmentApi.updateExpiredPreferenceRound('3희망');
      const res3 = await assignmentApi.round(3);
      results['3희망'] = res3.data.assigned;
    }

    const total_assigned = results['1희망'] + results['2희망'] + results['3희망'];
    const { data: internal } = await internalApi.getAll();
    const unassigned = internal.filter((t) => !t.assigned_school_id && !t.exclusion_reason).length;

    return {
      data: {
        message: '자동 배치가 완료되었습니다.',
        results,
        total_assigned,
        unassigned,
      },
    };
  },

  // VBA: 희망구분1희망수정() - 모든 교사의 희망구분을 1희망으로 리셋
  resetPreferenceRound: async () => {
    const { data: internal } = await internalApi.getAll();
    for (const teacher of internal) {
      if (teacher.preference_round !== '1희망') {
        await internalApi.update(teacher.id, { preference_round: '1희망' });
      }
    }
  },

  // VBA: 만기미발령자_수() - 만기이면서 미배치인 교사 수
  getExpiredUnassignedCount: async (): Promise<number> => {
    const { data: internal } = await internalApi.getAll();
    return internal.filter((t) => t.is_expired && !t.assigned_school_id && !t.exclusion_reason).length;
  },

  // VBA: 만기미발령자_희망구분수정(수정희망) - 만기 미배치자의 희망구분 변경
  updateExpiredPreferenceRound: async (newRound: string) => {
    const { data: internal } = await internalApi.getAll();
    const expiredUnassigned = internal.filter(
      (t) => t.is_expired && !t.assigned_school_id && !t.exclusion_reason
    );
    for (const teacher of expiredUnassigned) {
      await internalApi.update(teacher.id, { preference_round: newRound });
    }
  },

  // VBA: 배치() 함수와 동일 - 반복 10회, 변동 없으면 중단
  round: async (_round: number): Promise<{ data: { assigned: number } }> => {
    // VBA: 희망학교(D열)는 희망구분(C열)에 따라 K/L/M열(1/2/3희망) 선택
    const getWishSchoolId = (t: InternalTransfer): number | null => {
      if (t.preference_round === '1희망') return t.wish_school_1_id;
      if (t.preference_round === '2희망') return t.wish_school_2_id;
      if (t.preference_round === '3희망') return t.wish_school_3_id;
      return t.wish_school_1_id;
    };

    let totalAssigned = 0;
    const shortages = await calculateSchoolShortage();
    const shortageMap = new Map(shortages.map((s) => [s.id, s.shortage]));

    // VBA: 학교 display_order 맵 생성 (사용자정의목록 정렬용)
    const { data: schools } = await schoolApi.getAll();
    const schoolOrderMap = new Map(schools.map((s) => [s.id, s.display_order]));
    const maxOrder = Math.max(...schools.map((s) => s.display_order)) + 1;

    // VBA: 데이터 조회 및 정렬은 배치 전에 한 번만 수행
    const { data: internal } = await internalApi.getAll();

    // VBA: 관내전출입시트_서열순정렬() 와 동일한 정렬 로직
    // 정렬 순서: 희망학교(display_order) → 우선 → 희망구분 → 동점서열(총점→tiebreaker1~7)
    const sortedTeachers = internal
      .filter((t) =>
        !t.assigned_school_id &&
        !t.exclusion_reason &&
        t.preference_round !== '비정기' &&
        (getWishSchoolId(t) || t.remote_wish_1_id) // 일반 희망 또는 통합(벽지) 희망
      )
      .sort((a, b) => {
        // 1. 희망학교 순 (display_order 기준, VBA 사용자정의목록과 동일)
        const aWishId = getWishSchoolId(a);
        const bWishId = getWishSchoolId(b);
        const aIsRemote = !aWishId && a.remote_wish_1_id;
        const bIsRemote = !bWishId && b.remote_wish_1_id;
        // VBA: 학교목록 & ", 통합(벽지)" & ", 비정기" - 통합(벽지)는 마지막
        const aOrder = aIsRemote ? maxOrder : (aWishId ? schoolOrderMap.get(aWishId) ?? maxOrder : maxOrder);
        const bOrder = bIsRemote ? maxOrder : (bWishId ? schoolOrderMap.get(bWishId) ?? maxOrder : maxOrder);
        if (aOrder !== bOrder) return aOrder - bOrder;

        // 2. 우선 배치 대상자 먼저
        if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;

        // 3. 희망구분 순 (1희망 → 2희망 → 3희망) - VBA 서열순정렬과 동일
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
        // tiebreaker_4~7: 기본 내림차순 (필요시 헤더에 따라 조정)
        if ((b.tiebreaker_4 || 0) !== (a.tiebreaker_4 || 0)) return (b.tiebreaker_4 || 0) - (a.tiebreaker_4 || 0);
        if ((b.tiebreaker_5 || 0) !== (a.tiebreaker_5 || 0)) return (b.tiebreaker_5 || 0) - (a.tiebreaker_5 || 0);
        if ((b.tiebreaker_6 || 0) !== (a.tiebreaker_6 || 0)) return (b.tiebreaker_6 || 0) - (a.tiebreaker_6 || 0);
        if ((b.tiebreaker_7 || 0) !== (a.tiebreaker_7 || 0)) return (b.tiebreaker_7 || 0) - (a.tiebreaker_7 || 0);
        // 6. VBA: 안정 정렬 효과 - 같은 정렬 기준이면 id(입력 순서) 순
        return a.id - b.id;
      });

    // VBA: 배정된 교사 ID 추적
    const assignedTeacherIds = new Set<number>();

    // VBA: 반복횟수 = 10, 변동 없으면 Exit For
    const maxIterations = 10;
    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      let changeCount = 0;

      // VBA: 정렬된 순서대로 순회 (배치된 교사는 건너뜀)
      for (const teacher of sortedTeachers) {
        // 이미 배정된 교사 건너뛰기
        if (assignedTeacherIds.has(teacher.id)) continue;
        // VBA: 희망학교는 해당 교사의 preference_round에 따라 결정
        const wishSchoolId = getWishSchoolId(teacher);

        // VBA: 통합(벽지) 희망인 경우 벽지배치 로직
        if (!wishSchoolId && teacher.remote_wish_1_id) {
          const remoteWishFields = [
            'remote_wish_1_id', 'remote_wish_2_id', 'remote_wish_3_id', 'remote_wish_4_id',
            'remote_wish_5_id', 'remote_wish_6_id', 'remote_wish_7_id', 'remote_wish_8_id'
          ] as const;

          for (const remoteField of remoteWishFields) {
            const remoteSchoolId = teacher[remoteField] as number | null;
            if (!remoteSchoolId) break;

            const remoteShortage = shortageMap.get(remoteSchoolId) ?? 0;
            // VBA: If 과부족(희망학교) < 0 Then 배정학교 = 희망학교
            if (remoteShortage < 0) {
              await internalApi.update(teacher.id, { assigned_school_id: remoteSchoolId });
              assignedTeacherIds.add(teacher.id);

              if (!teacher.separate_quota) {
                shortageMap.set(remoteSchoolId, remoteShortage + 1);
                // 비만기자만 현임교 과부족 감소 (만기자는 이미 전출로 카운트됨)
                const currentSchoolId = teacher.current_school_id;
                if (!teacher.is_expired && currentSchoolId && currentSchoolId !== remoteSchoolId) {
                  const currentSchoolShortage = shortageMap.get(currentSchoolId) ?? 0;
                  shortageMap.set(currentSchoolId, currentSchoolShortage - 1);
                }
              }
              totalAssigned++;
              changeCount++;
              break;
            }
          }
        } else if (wishSchoolId) {
          const currentShortage = shortageMap.get(wishSchoolId) ?? 0;

          // VBA: If 과부족(희망학교) < 0 Then 배정학교 = 희망학교
          if (currentShortage < 0) {
            await internalApi.update(teacher.id, { assigned_school_id: wishSchoolId });
            assignedTeacherIds.add(teacher.id);

            if (!teacher.separate_quota) {
              shortageMap.set(wishSchoolId, currentShortage + 1);
              // 비만기자만 현임교 과부족 감소 (만기자는 이미 전출로 카운트됨)
              const currentSchoolId = teacher.current_school_id;
              if (!teacher.is_expired && currentSchoolId && currentSchoolId !== wishSchoolId) {
                const currentSchoolShortage = shortageMap.get(currentSchoolId) ?? 0;
                shortageMap.set(currentSchoolId, currentSchoolShortage - 1);
              }
            }
            totalAssigned++;
            changeCount++;
          }
        }
      }

      // VBA: If 변동횟수 = 0 Then Exit For
      if (changeCount === 0) {
        break;
      }
    }

    return { data: { assigned: totalAssigned } };
  },

  reset: async () => {
    const { data: internal } = await internalApi.getAll();
    for (const teacher of internal) {
      if (teacher.assigned_school_id) {
        await internalApi.update(teacher.id, { assigned_school_id: null });
      }
    }
    return { data: null };
  },

  // VBA: 관내전출입시트_제외별도점검() - 결원/관외전출 시트 연동 점검
  checkExclusion: async () => {
    const { data: internal } = await internalApi.getAll();
    const { data: vacancies } = await vacancyApi.getAll();
    const { data: externalOut } = await externalOutApi.getAll();

    let checkedCount = 0;

    for (const teacher of internal) {
      let exclusionReason = '';
      let separateQuota = '';

      // 1. 결원 시트 점검 (휴직/파견 → 별도정원, 그 외 → 제외사유)
      const matchedVacancy = vacancies.find(
        (v) => v.school_id === teacher.current_school_id && v.teacher_name === teacher.teacher_name
      );
      if (matchedVacancy && matchedVacancy.type_code) {
        if (matchedVacancy.type_code === '휴직' || matchedVacancy.type_code === '파견') {
          separateQuota = matchedVacancy.type_code;
        } else {
          exclusionReason = matchedVacancy.type_code;
        }
      }

      // 2. 관외전출 시트 점검 (전출 예정자 → 제외)
      const matchedExtOut = externalOut.find(
        (e) => e.school_id === teacher.current_school_id && e.teacher_name === teacher.teacher_name
      );
      if (matchedExtOut) {
        exclusionReason = `${matchedExtOut.destination || '타지역'} 전출`;
      }

      // 3. 현소속과 1희망학교가 같은 경우
      if (teacher.current_school_id === teacher.wish_school_1_id) {
        exclusionReason = '현소속 지원';
      }

      // 변경사항이 있으면 업데이트
      if (exclusionReason || separateQuota) {
        await internalApi.update(teacher.id, {
          exclusion_reason: exclusionReason || null,
          separate_quota: separateQuota || null,
        });
        checkedCount++;
      }
    }

    return { data: { checked: checkedCount } };
  },

  // 우선전보/전보유예 점검
  checkPriority: async () => {
    const { data: internal } = await internalApi.getAll();
    const { data: priorities } = await priorityApi.getAll();

    let checkedCount = 0;

    for (const teacher of internal) {
      const matched = priorities.find(
        (p) => p.school_id === teacher.current_school_id &&
               p.teacher_name === teacher.teacher_name
      );

      if (matched) {
        if (matched.type_code === '우선') {
          // 우선전보: 총점 적용 + is_priority = true
          await internalApi.update(teacher.id, {
            total_score: matched.total_score ?? teacher.total_score,
            is_priority: true,
          });
        } else if (matched.type_code === '전보유예') {
          // 전보유예: 제외사유 적용
          await internalApi.update(teacher.id, {
            exclusion_reason: '전보유예',
          });
        }
        checkedCount++;
      }
    }

    return { data: { checked: checkedCount } };
  },

  getUnassigned: async () => {
    const { data: internal } = await internalApi.getAll();
    const unassigned = internal.filter((t) => !t.assigned_school_id && !t.exclusion_reason);
    return { data: unassigned };
  },

  getStatistics: async () => {
    const stats = await calculateStats();
    return { data: stats };
  },

  getSchoolShortage: async () => {
    const shortages = await calculateSchoolShortage();
    return { data: shortages };
  },
};

// 설정 API
export const settingsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    const settings: Record<string, string> = {};
    (data || []).forEach((item: any) => {
      settings[item.key] = item.value || '';
    });
    return { data: settings };
  },
  update: async (settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    return { data: null };
  },
  init: async () => {
    const defaults = {
      office_name: '양산교육지원청',
      transfer_year: '2025',
      school_level: '초등학교',
      appointment_date: '2025-03-01',
      remote_schools: '',
    };
    await settingsApi.update(defaults);
    return { data: null };
  },
  resetAll: async () => {
    await supabase.from('internal_transfers').delete().neq('id', 0);
    await supabase.from('external_transfers_in').delete().neq('id', 0);
    await supabase.from('external_transfers_out').delete().neq('id', 0);
    await supabase.from('supplements').delete().neq('id', 0);
    await supabase.from('vacancies').delete().neq('id', 0);
    await supabase.from('schools').delete().neq('id', 0);
    return { data: null };
  },
  getVacancyTypes: async () => {
    const { data, error } = await supabase.from('vacancy_types').select('code, name');
    if (error) throw error;
    return { data: data || [] };
  },
};

export default supabase;
