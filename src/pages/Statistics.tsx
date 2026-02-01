import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  schoolApi,
  vacancyApi,
  supplementApi,
  externalOutApi,
  externalInApi,
  internalApi,
  settingsApi,
} from '../services/api';
import type { School, VacancyItem, ExternalOut, ExternalIn, InternalTransfer } from '../types';
import { exportStatistics } from '../utils/documents';

// 툴팁이 있는 셀 컴포넌트
function TooltipCell({ value, items, className = '', noTooltip = false }: { value: number; items: string[]; className?: string; noTooltip?: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const cellRef = useRef<HTMLTableCellElement>(null);

  if (!value) return <td className={`border px-1 py-1 text-center ${className}`}></td>;

  // 툴팁 비활성화 시 숫자만 표시
  if (noTooltip) {
    return <td className={`border px-1 py-1 text-center ${className}`}>{value}</td>;
  }

  const handleMouseEnter = () => {
    if (cellRef.current && items.length > 0) {
      const rect = cellRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      setShowTooltip(true);
    }
  };

  return (
    <td
      ref={cellRef}
      className={`border px-1 py-1 text-center ${className} ${items.length > 0 ? 'cursor-help' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {value}
      {showTooltip && items.length > 0 && createPortal(
        <div
          className="fixed z-[9999] bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%) translateY(-4px)' }}
        >
          {items.map((item, idx) => (
            <div key={idx}>{item}</div>
          ))}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </td>
  );
}

export default function Statistics() {
  const [schools, setSchools] = useState<School[]>([]);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [supplements, setSupplements] = useState<VacancyItem[]>([]);
  const [externalOut, setExternalOut] = useState<ExternalOut[]>([]);
  const [externalIn, setExternalIn] = useState<ExternalIn[]>([]);
  const [internal, setInternal] = useState<InternalTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // 설정 메뉴 상태
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [useRemoteSchools, setUseRemoteSchools] = useState(false);
  const [remoteSchools, setRemoteSchools] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schoolsRes, vacanciesRes, supplementsRes, externalOutRes, externalInRes, internalRes, settingsRes] = await Promise.all([
          schoolApi.getAll(), vacancyApi.getAll(), supplementApi.getAll(),
          externalOutApi.getAll(), externalInApi.getAll(), internalApi.getAll(),
          settingsApi.getAll(),
        ]);
        setSchools(schoolsRes.data);
        setVacancies(vacanciesRes.data);
        // 설정 로드
        setUseRemoteSchools(settingsRes.data.use_remote_schools === 'true');
        setRemoteSchools(settingsRes.data.remote_schools || '이천,원동,좌삼');
        setSupplements(supplementsRes.data);
        setExternalOut(externalOutRes.data);
        setExternalIn(externalInRes.data);
        setInternal(internalRes.data);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 학교별 통계 계산 (원본 엑셀 구조대로 단순하게)
  const statistics = useMemo(() => {
    return schools.map((school, idx) => {
      const schoolVac = vacancies.filter(v => v.school_id === school.id);
      const schoolSup = supplements.filter(s => s.school_id === school.id);
      const schoolExtOut = externalOut.filter(e => e.school_id === school.id);
      const schoolIntOut = internal.filter(t => t.current_school_id === school.id && t.assigned_school_id && t.assigned_school_id !== school.id);
      const schoolIntIn = internal.filter(t => t.assigned_school_id === school.id && t.current_school_id !== school.id);
      const schoolExtIn = externalIn.filter(e => e.assigned_school_id === school.id);

      // 결원 세부 (숫자와 명단) - 현임교 구분 이름 형식
      const getVacData = (type: string) => {
        const items = schoolVac.filter(v => v.type_code === type);
        return {
          count: items.length,
          names: items.map(v => `${v.school_name || ''} ${v.type_name || v.type_code} ${v.teacher_name}`)
        };
      };
      // 충원 세부
      const getSupData = (type: string) => {
        const items = schoolSup.filter(s => s.type_code === type);
        return {
          count: items.length,
          names: items.map(s => `${s.school_name || ''} ${s.type_name || s.type_code} ${s.teacher_name}`)
        };
      };

      // 전출
      const outCityData = schoolExtOut.filter(e => e.transfer_type === '타시도');
      const outDistrictData = schoolExtOut.filter(e => e.transfer_type === '타시군');
      const outInternalData = schoolIntOut;

      // 전입
      const inInternalData = schoolIntIn;
      const inDistrictData = schoolExtIn.filter(e => e.transfer_type === '타시군');
      const inCityData = schoolExtIn.filter(e => e.transfer_type === '타시도');
      const inNewData = schoolExtIn.filter(e => e.transfer_type === '신규');

      // 결원 데이터
      const vacRetireData = getVacData('정퇴');
      const vacEarlyData = getVacData('명퇴');
      const vacDismissData = getVacData('면직');
      const vacPromoteData = getVacData('승진');
      const vacTransferData = getVacData('전직');
      const vacReturnData = getVacData('타시도복귀');
      const vacOtherData = getVacData('기타');
      const vacSepItems = [...schoolVac.filter(v => v.type_code === '휴직'), ...schoolVac.filter(v => v.type_code === '파견')];
      const vacSepData = { count: vacSepItems.length, names: vacSepItems.map(v => `${v.school_name || ''} ${v.type_name || v.type_code} ${v.teacher_name}`) };

      // 충원 데이터
      const supReleaseItems = [...schoolSup.filter(s => s.type_code === '복직'), ...schoolSup.filter(s => s.type_code === '복귀')];
      const supReleaseData = { count: supReleaseItems.length, names: supReleaseItems.map(s => `${s.school_name || ''} ${s.type_name || s.type_code} ${s.teacher_name}`) };
      const supOtherData = getSupData('기타');

      // 계산
      const vacTotal = schoolVac.length;
      const supTotal = schoolSup.length;
      const outTotal = outCityData.length + outDistrictData.length + outInternalData.length;
      const inTotal = inInternalData.length + inDistrictData.length + inCityData.length + inNewData.length;
      const currentShortage = school.current_count - vacTotal + supTotal - outTotal + inTotal - school.quota;

      // 현원 남/여
      const currentMale = school.male_count || 0;
      const currentFemale = school.female_count || 0;
      const total = currentMale + currentFemale;

      return {
        code: idx + 1,
        name: school.name,
        currentCount: school.current_count,
        quota: school.quota,
        shortage: school.current_count - school.quota,
        // 결원 (숫자 + 명단)
        vacRetire: vacRetireData.count, vacRetireNames: vacRetireData.names,
        vacEarly: vacEarlyData.count, vacEarlyNames: vacEarlyData.names,
        vacDismiss: vacDismissData.count, vacDismissNames: vacDismissData.names,
        vacPromote: vacPromoteData.count, vacPromoteNames: vacPromoteData.names,
        vacTransfer: vacTransferData.count, vacTransferNames: vacTransferData.names,
        vacReturn: vacReturnData.count, vacReturnNames: vacReturnData.names,
        vacOther: vacOtherData.count, vacOtherNames: vacOtherData.names,
        vacSep: vacSepData.count, vacSepNames: vacSepData.names,
        vacTotal, vacTotalNames: schoolVac.map(v => `${v.school_name || ''} ${v.type_name || v.type_code} ${v.teacher_name}`),
        // 충원
        supRelease: supReleaseData.count, supReleaseNames: supReleaseData.names,
        supOther: supOtherData.count, supOtherNames: supOtherData.names,
        supTotal, supTotalNames: schoolSup.map(s => `${s.school_name || ''} ${s.type_name || s.type_code} ${s.teacher_name}`),
        // 전출
        outCity: outCityData.length, outCityNames: outCityData.map(e => `타시도 ${e.teacher_name}`),
        outDistrict: outDistrictData.length, outDistrictNames: outDistrictData.map(e => `타시군 ${e.teacher_name}`),
        outInternal: outInternalData.length, outInternalNames: outInternalData.map(t => `관내 ${t.teacher_name}`),
        outTotal, outTotalNames: [...outCityData.map(e => `타시도 ${e.teacher_name}`), ...outDistrictData.map(e => `타시군 ${e.teacher_name}`), ...outInternalData.map(t => `관내 ${t.teacher_name}`)],
        // 전입
        inInternal: inInternalData.length, inInternalNames: inInternalData.map(t => t.teacher_name),
        inDistrict: inDistrictData.length, inDistrictNames: inDistrictData.map(e => e.teacher_name),
        inCity: inCityData.length, inCityNames: inCityData.map(e => e.teacher_name),
        inNew: inNewData.length, inNewNames: inNewData.map(e => e.teacher_name),
        inTotal, inTotalNames: [...inInternalData.map(t => t.teacher_name), ...inDistrictData.map(e => e.teacher_name), ...inCityData.map(e => e.teacher_name), ...inNewData.map(e => e.teacher_name)],
        // 현재 과부족
        currentShortage,
        // 남여성비
        male: currentMale,
        female: currentFemale,
        maleRatio: total > 0 ? Math.round(currentMale / total * 100) : 0,
        femaleRatio: total > 0 ? Math.round(currentFemale / total * 100) : 0,
      };
    });
  }, [schools, vacancies, supplements, externalOut, externalIn, internal]);

  // 합계
  const totals = useMemo(() => {
    const sum = (key: string) => statistics.reduce((acc, s: any) => acc + (s[key] || 0), 0);
    const collectNames = (key: string) => statistics.flatMap((s: any) => s[key] || []);
    const totalM = sum('male'), totalF = sum('female'), total = totalM + totalF;
    return {
      currentCount: sum('currentCount'),
      quota: sum('quota'),
      shortage: sum('shortage'),
      vacRetire: sum('vacRetire'), vacRetireNames: collectNames('vacRetireNames'),
      vacEarly: sum('vacEarly'), vacEarlyNames: collectNames('vacEarlyNames'),
      vacDismiss: sum('vacDismiss'), vacDismissNames: collectNames('vacDismissNames'),
      vacPromote: sum('vacPromote'), vacPromoteNames: collectNames('vacPromoteNames'),
      vacTransfer: sum('vacTransfer'), vacTransferNames: collectNames('vacTransferNames'),
      vacReturn: sum('vacReturn'), vacReturnNames: collectNames('vacReturnNames'),
      vacOther: sum('vacOther'), vacOtherNames: collectNames('vacOtherNames'),
      vacSep: sum('vacSep'), vacSepNames: collectNames('vacSepNames'),
      vacTotal: sum('vacTotal'), vacTotalNames: collectNames('vacTotalNames'),
      supRelease: sum('supRelease'), supReleaseNames: collectNames('supReleaseNames'),
      supOther: sum('supOther'), supOtherNames: collectNames('supOtherNames'),
      supTotal: sum('supTotal'), supTotalNames: collectNames('supTotalNames'),
      outCity: sum('outCity'), outCityNames: collectNames('outCityNames'),
      outDistrict: sum('outDistrict'), outDistrictNames: collectNames('outDistrictNames'),
      outInternal: sum('outInternal'), outInternalNames: collectNames('outInternalNames'),
      outTotal: sum('outTotal'), outTotalNames: collectNames('outTotalNames'),
      inInternal: sum('inInternal'), inInternalNames: collectNames('inInternalNames'),
      inDistrict: sum('inDistrict'), inDistrictNames: collectNames('inDistrictNames'),
      inCity: sum('inCity'), inCityNames: collectNames('inCityNames'),
      inNew: sum('inNew'), inNewNames: collectNames('inNewNames'),
      inTotal: sum('inTotal'), inTotalNames: collectNames('inTotalNames'),
      currentShortage: sum('currentShortage'),
      male: totalM, female: totalF,
      maleRatio: total > 0 ? Math.round(totalM / total * 100) : 0,
      femaleRatio: total > 0 ? Math.round(totalF / total * 100) : 0,
    };
  }, [statistics]);

  const handleExport = async () => {
    try { await exportStatistics(statistics, totals); }
    catch (error) { console.error('내보내기 실패:', error); alert('통계표 내보내기에 실패했습니다.'); }
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await settingsApi.update({
        use_remote_schools: useRemoteSchools ? 'true' : 'false',
        remote_schools: remoteSchools,
      });
      alert('설정이 저장되었습니다.');
      setShowSettingsMenu(false);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSettingsSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><div className="text-gray-500">데이터 로딩 중...</div></div>;

  const v = (val: number) => val || '';

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">관내 전보 현황 통계표</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettingsMenu(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <span>⚙️</span><span>설정 메뉴</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <span>⬇️</span><span>엑셀 다운로드</span>
          </button>
        </div>
      </div>

      {/* 설정 메뉴 모달 */}
      {showSettingsMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">설정 메뉴</h2>

            {/* 통합(벽지) 사용 토글 */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRemoteSchools}
                  onChange={(e) => setUseRemoteSchools(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="font-medium">통합(벽지) 사용함</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-8">
                관내전출입에서 통합(벽지) 희망 열을 활성화합니다.
              </p>
            </div>

            {/* 통합(벽지) 학교 목록 */}
            {useRemoteSchools && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  통합(벽지) 학교 목록
                </label>
                <input
                  type="text"
                  value={remoteSchools}
                  onChange={(e) => setRemoteSchools(e.target.value)}
                  placeholder="이천,원동,좌삼"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  쉼표(,)로 구분하여 입력하세요.
                </p>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {settingsSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="text-xs border-collapse w-full">
            <thead>
              {/* 1행 - 대분류 */}
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border px-2 py-1 w-12">학교<br/>코드</th>
                <th rowSpan={2} className="border px-2 py-1 w-16">학교명</th>
                <th rowSpan={2} className="border px-2 py-1">현원</th>
                <th rowSpan={2} className="border px-2 py-1">정원</th>
                <th rowSpan={2} className="border px-2 py-1">과부족</th>
                <th colSpan={9} className="border px-1 py-1 bg-yellow-200">결원</th>
                <th colSpan={3} className="border px-1 py-1 bg-green-200">충원</th>
                <th colSpan={4} className="border px-1 py-1 bg-red-200">전출</th>
                <th colSpan={5} className="border px-1 py-1 bg-blue-200">전입</th>
                <th rowSpan={2} className="border px-1 py-1 bg-purple-200">현재<br/>과부족</th>
                <th colSpan={4} className="border px-1 py-1 bg-orange-200">남여성비</th>
              </tr>
              {/* 2행 - 세부 항목 */}
              <tr className="bg-gray-50">
                {/* 결원 */}
                <th className="border px-1 bg-yellow-100">정퇴</th>
                <th className="border px-1 bg-yellow-100">명퇴</th>
                <th className="border px-1 bg-yellow-100">면직</th>
                <th className="border px-1 bg-yellow-100">승진</th>
                <th className="border px-1 bg-yellow-100">전직</th>
                <th className="border px-1 bg-yellow-100 text-[10px]">타시도<br/>복귀</th>
                <th className="border px-1 bg-yellow-100">기타</th>
                <th className="border px-1 bg-yellow-100 text-[10px]">별도<br/>정원</th>
                <th className="border px-1 bg-yellow-300">계</th>
                {/* 충원 */}
                <th className="border px-1 bg-green-100 text-[10px]">별도정원<br/>해제</th>
                <th className="border px-1 bg-green-100">기타</th>
                <th className="border px-1 bg-green-300">계</th>
                {/* 전출 */}
                <th className="border px-1 bg-red-100">타시도</th>
                <th className="border px-1 bg-red-100">타시군</th>
                <th className="border px-1 bg-red-100">관내</th>
                <th className="border px-1 bg-red-300">계</th>
                {/* 전입 */}
                <th className="border px-1 bg-blue-100">관내</th>
                <th className="border px-1 bg-blue-100">타시군</th>
                <th className="border px-1 bg-blue-100">타시도</th>
                <th className="border px-1 bg-blue-100">신규</th>
                <th className="border px-1 bg-blue-300">계</th>
                {/* 남여성비 */}
                <th className="border px-1 bg-orange-100">남</th>
                <th className="border px-1 bg-orange-100">여</th>
                <th className="border px-1 bg-orange-100">남%</th>
                <th className="border px-1 bg-orange-100">여%</th>
              </tr>
            </thead>
            <tbody>
              {/* 합계 행 */}
              <tr className="bg-gray-200 font-semibold">
                <td className="border px-2 py-1 text-center">계</td>
                <td className="border px-2 py-1 text-center">{schools.length}</td>
                <td className="border px-2 py-1 text-center">{v(totals.currentCount)}</td>
                <td className="border px-2 py-1 text-center">{v(totals.quota)}</td>
                <td className={`border px-2 py-1 text-center font-bold ${totals.shortage < 0 ? 'text-red-600 bg-red-50' : totals.shortage > 0 ? 'text-blue-600 bg-blue-50' : ''}`}>{v(totals.shortage)}</td>
                {/* 결원 */}
                <TooltipCell value={totals.vacRetire} items={totals.vacRetireNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacEarly} items={totals.vacEarlyNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacDismiss} items={totals.vacDismissNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacPromote} items={totals.vacPromoteNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacTransfer} items={totals.vacTransferNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacReturn} items={totals.vacReturnNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacOther} items={totals.vacOtherNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacSep} items={totals.vacSepNames} className="bg-yellow-50" noTooltip />
                <TooltipCell value={totals.vacTotal} items={totals.vacTotalNames} className="bg-yellow-200" noTooltip />
                {/* 충원 */}
                <TooltipCell value={totals.supRelease} items={totals.supReleaseNames} className="bg-green-50" noTooltip />
                <TooltipCell value={totals.supOther} items={totals.supOtherNames} className="bg-green-50" noTooltip />
                <TooltipCell value={totals.supTotal} items={totals.supTotalNames} className="bg-green-200" noTooltip />
                {/* 전출 */}
                <TooltipCell value={totals.outCity} items={totals.outCityNames} className="bg-red-50" noTooltip />
                <TooltipCell value={totals.outDistrict} items={totals.outDistrictNames} className="bg-red-50" noTooltip />
                <TooltipCell value={totals.outInternal} items={totals.outInternalNames} className="bg-red-50" noTooltip />
                <TooltipCell value={totals.outTotal} items={totals.outTotalNames} className="bg-red-200" noTooltip />
                {/* 전입 */}
                <TooltipCell value={totals.inInternal} items={totals.inInternalNames} className="bg-blue-50" noTooltip />
                <TooltipCell value={totals.inDistrict} items={totals.inDistrictNames} className="bg-blue-50" noTooltip />
                <TooltipCell value={totals.inCity} items={totals.inCityNames} className="bg-blue-50" noTooltip />
                <TooltipCell value={totals.inNew} items={totals.inNewNames} className="bg-blue-50" noTooltip />
                <TooltipCell value={totals.inTotal} items={totals.inTotalNames} className="bg-blue-200" noTooltip />
                {/* 현재 과부족 */}
                <td className={`border px-1 py-1 text-center font-bold ${totals.currentShortage < 0 ? 'text-red-600 bg-red-50' : totals.currentShortage > 0 ? 'text-blue-600 bg-blue-50' : 'bg-purple-100'}`}>{v(totals.currentShortage)}</td>
                {/* 남여성비 */}
                <td className="border px-1 py-1 text-center bg-orange-50">{v(totals.male)}</td>
                <td className="border px-1 py-1 text-center bg-orange-50">{v(totals.female)}</td>
                <td className="border px-1 py-1 text-center bg-orange-50">{v(totals.maleRatio)}</td>
                <td className="border px-1 py-1 text-center bg-orange-50">{v(totals.femaleRatio)}</td>
              </tr>
              {/* 학교별 데이터 */}
              {statistics.map((s: any) => (
                <tr key={s.code} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-center">{s.code}</td>
                  <td className="border px-2 py-1 text-center">{s.name}</td>
                  <td className="border px-2 py-1 text-center">{v(s.currentCount)}</td>
                  <td className="border px-2 py-1 text-center">{v(s.quota)}</td>
                  <td className={`border px-2 py-1 text-center font-bold ${s.shortage < 0 ? 'text-red-600 bg-red-50' : s.shortage > 0 ? 'text-blue-600 bg-blue-50' : ''}`}>{v(s.shortage)}</td>
                  {/* 결원 */}
                  <TooltipCell value={s.vacRetire} items={s.vacRetireNames} />
                  <TooltipCell value={s.vacEarly} items={s.vacEarlyNames} />
                  <TooltipCell value={s.vacDismiss} items={s.vacDismissNames} />
                  <TooltipCell value={s.vacPromote} items={s.vacPromoteNames} />
                  <TooltipCell value={s.vacTransfer} items={s.vacTransferNames} />
                  <TooltipCell value={s.vacReturn} items={s.vacReturnNames} />
                  <TooltipCell value={s.vacOther} items={s.vacOtherNames} />
                  <TooltipCell value={s.vacSep} items={s.vacSepNames} />
                  <TooltipCell value={s.vacTotal} items={s.vacTotalNames} className="bg-yellow-50" />
                  {/* 충원 */}
                  <TooltipCell value={s.supRelease} items={s.supReleaseNames} />
                  <TooltipCell value={s.supOther} items={s.supOtherNames} />
                  <TooltipCell value={s.supTotal} items={s.supTotalNames} className="bg-green-50" />
                  {/* 전출 */}
                  <TooltipCell value={s.outCity} items={s.outCityNames} />
                  <TooltipCell value={s.outDistrict} items={s.outDistrictNames} />
                  <TooltipCell value={s.outInternal} items={s.outInternalNames} />
                  <TooltipCell value={s.outTotal} items={s.outTotalNames} className="bg-red-50" />
                  {/* 전입 */}
                  <TooltipCell value={s.inInternal} items={s.inInternalNames} />
                  <TooltipCell value={s.inDistrict} items={s.inDistrictNames} />
                  <TooltipCell value={s.inCity} items={s.inCityNames} />
                  <TooltipCell value={s.inNew} items={s.inNewNames} />
                  <TooltipCell value={s.inTotal} items={s.inTotalNames} className="bg-blue-50" />
                  {/* 현재 과부족 */}
                  <td className={`border px-1 py-1 text-center font-bold ${s.currentShortage < 0 ? 'text-red-600 bg-red-50' : s.currentShortage > 0 ? 'text-blue-600 bg-blue-50' : 'bg-purple-50'}`}>{v(s.currentShortage)}</td>
                  {/* 남여성비 */}
                  <td className="border px-1 py-1 text-center">{v(s.male)}</td>
                  <td className="border px-1 py-1 text-center">{v(s.female)}</td>
                  <td className="border px-1 py-1 text-center">{v(s.maleRatio)}</td>
                  <td className="border px-1 py-1 text-center">{v(s.femaleRatio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
