import { useEffect, useState, useMemo, useRef } from 'react';
import { priorityApi, schoolApi, surplusApi } from '../services/api';
import type { PriorityTransfer, SurplusTransfer, School } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// 탭 타입
type TabType = 'priority' | 'surplus';

interface BulkRow {
  type_code: string;
  school_id: number | '';
  teacher_name: string;
  total_score: string;
  gender: string;
  birth_date: string;
  note: string;
}

const emptyRow = (): BulkRow => ({
  type_code: '우선',
  school_id: '',
  teacher_name: '',
  total_score: '',
  gender: '',
  birth_date: '',
  note: '',
});

// 과원 입력 행
interface SurplusBulkRow {
  school_id: number | '';
  teacher_name: string;
  surplus_number: string;
  stay_current: boolean;
  gender: string;
  birth_date: string;
  note: string;
}

const emptySurplusRow = (): SurplusBulkRow => ({
  school_id: '',
  teacher_name: '',
  surplus_number: '',
  stay_current: false,
  gender: '',
  birth_date: '',
  note: '',
});

export default function Priority() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('priority');

  // 우선/유예 관련 상태
  const [priorities, setPriorities] = useState<PriorityTransfer[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PriorityTransfer>>({});
  const [sortType, setSortType] = useState<'order' | 'name'>('order');

  // 대량 입력 폼
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);

  // 과원 관련 상태
  const [surpluses, setSurpluses] = useState<SurplusTransfer[]>([]);
  const [surplusEditingId, setSurplusEditingId] = useState<number | null>(null);
  const [surplusEditForm, setSurplusEditForm] = useState<Partial<SurplusTransfer>>({});
  const [showSurplusBulkForm, setShowSurplusBulkForm] = useState(false);
  const [surplusBulkRows, setSurplusBulkRows] = useState<SurplusBulkRow[]>([emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow()]);

  // 파일 업로드 ref
  const combinedFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [priorityRes, schoolRes, surplusRes] = await Promise.all([
        priorityApi.getAll(),
        schoolApi.getAll(),
        surplusApi.getAll(),
      ]);
      setPriorities(priorityRes.data);
      setSchools(schoolRes.data);
      setSurpluses(surplusRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 학교 가나다순 정렬
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [schools]);

  // 목록 정렬
  const sortedData = useMemo(() => {
    const list = [...priorities];
    if (sortType === 'order') {
      const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order ?? 999]));
      return list.sort((a, b) => {
        const orderA = schoolOrderMap.get(a.school_id ?? 0) ?? 999;
        const orderB = schoolOrderMap.get(b.school_id ?? 0) ?? 999;
        return orderA - orderB;
      });
    } else {
      return list.sort((a, b) => (a.school_name || '').localeCompare(b.school_name || '', 'ko'));
    }
  }, [priorities, schools, sortType]);

  // 대량 입력 행 업데이트
  const updateBulkRow = (index: number, field: keyof BulkRow, value: string | number) => {
    const newRows = [...bulkRows];
    if (field === 'school_id') {
      newRows[index][field] = value === '' ? '' : Number(value);
    } else {
      newRows[index][field] = value as string;
    }
    setBulkRows(newRows);
    if (index === bulkRows.length - 1 && value !== '') {
      setBulkRows([...newRows, emptyRow()]);
    }
  };

  // 대량 입력 저장
  const handleBulkSave = async () => {
    const validRows = bulkRows.filter(row => row.teacher_name.trim() && row.school_id);
    if (validRows.length === 0) {
      alert('입력할 데이터가 없습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        const data: { type_code: string; school_id: number; teacher_name: string; total_score?: number; gender?: string; birth_date?: string; note?: string } = {
          type_code: row.type_code || '우선',
          school_id: row.school_id as number,
          teacher_name: row.teacher_name,
          note: row.note || '',
        };
        if (row.total_score) data.total_score = parseFloat(row.total_score);
        if (row.gender) data.gender = row.gender;
        if (row.birth_date) data.birth_date = row.birth_date;
        await priorityApi.create(data);
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}건 추가 완료${failCount > 0 ? `, ${failCount}건 실패` : ''}`);
    setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    setShowBulkForm(false);
    loadData();
  };

  // 과원 대량 입력 행 업데이트
  const updateSurplusBulkRow = (index: number, field: keyof SurplusBulkRow, value: string | number | boolean) => {
    const newRows = [...surplusBulkRows];
    if (field === 'school_id') {
      newRows[index][field] = value === '' ? '' : Number(value);
    } else if (field === 'stay_current') {
      newRows[index][field] = value as boolean;
    } else {
      newRows[index][field] = value as string;
    }
    setSurplusBulkRows(newRows);
    if (index === surplusBulkRows.length - 1 && value !== '' && value !== false) {
      setSurplusBulkRows([...newRows, emptySurplusRow()]);
    }
  };

  // 과원 대량 입력 저장
  const handleSurplusBulkSave = async () => {
    const validRows = surplusBulkRows.filter(row => row.teacher_name.trim() && row.school_id && row.surplus_number);
    if (validRows.length === 0) {
      alert('입력할 데이터가 없습니다.\n학교, 성명, 과원순번은 필수입니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        await surplusApi.create({
          school_id: row.school_id as number,
          teacher_name: row.teacher_name,
          surplus_number: parseInt(row.surplus_number),
          stay_current: row.stay_current,
          gender: row.gender || undefined,
          birth_date: row.birth_date || undefined,
          note: row.note || undefined,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}건 추가 완료${failCount > 0 ? `, ${failCount}건 실패` : ''}`);
    setSurplusBulkRows([emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow()]);
    setShowSurplusBulkForm(false);
    loadData();
  };

  // 과원 수정
  const handleSurplusEdit = (item: SurplusTransfer) => {
    setSurplusEditingId(item.id);
    setSurplusEditForm({ ...item });
  };

  const handleSurplusSave = async () => {
    if (!surplusEditingId) return;
    try {
      await surplusApi.update(surplusEditingId, surplusEditForm);
      setSurplusEditingId(null);
      setSurplusEditForm({});
      loadData();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleSurplusCancel = () => {
    setSurplusEditingId(null);
    setSurplusEditForm({});
  };

  const handleSurplusDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await surplusApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 과원 정렬된 데이터
  const sortedSurpluses = useMemo(() => {
    const list = [...surpluses];
    const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order ?? 999]));
    return list.sort((a, b) => {
      // 학교순 → 과원순번 내림차순
      const orderA = schoolOrderMap.get(a.school_id ?? 0) ?? 999;
      const orderB = schoolOrderMap.get(b.school_id ?? 0) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.surplus_number ?? 0) - (a.surplus_number ?? 0);
    });
  }, [surpluses, schools]);

  const handleEdit = (item: PriorityTransfer) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await priorityApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      loadData();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await priorityApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 통합 엑셀 다운로드 (우선유예 + 과원)
  const handleCombinedDownload = async () => {
    const workbook = new ExcelJS.Workbook();
    const yellowFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // 시트1: 우선유예
    const ws1 = workbook.addWorksheet('우선유예');
    const headers1 = ['순', '구분', '현임교', '성명', '성별', '생년월일', '총점', '비고'];
    const headerRow1 = ws1.getRow(1);
    headers1.forEach((h, idx) => {
      const cell = headerRow1.getCell(idx + 1);
      cell.value = h;
      cell.fill = yellowFill;
      cell.border = thinBorder;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    // 빈 템플릿 (순번 1~100)
    for (let i = 1; i <= 100; i++) {
      const row = ws1.getRow(i + 1);
      row.getCell(1).value = i; // 순번
      row.getCell(1).border = thinBorder;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      // 나머지 셀 테두리
      for (let j = 2; j <= 8; j++) {
        row.getCell(j).border = thinBorder;
        row.getCell(j).alignment = { horizontal: 'center', vertical: 'middle' };
      }
      // 구분 열(B) 드롭다운
      ws1.getCell(`B${i + 1}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"우선,전보유예"']
      };
      // 성별 열(E) 드롭다운
      ws1.getCell(`E${i + 1}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"남,여"']
      };
    }
    ws1.columns.forEach((col) => { col.width = 12; });

    // 시트2: 과원
    const ws2 = workbook.addWorksheet('과원');
    const headers2 = ['순', '현임교', '성명', '과원순번', '현학교남기', '성별', '생년월일', '비고'];
    const headerRow2 = ws2.getRow(1);
    headers2.forEach((h, idx) => {
      const cell = headerRow2.getCell(idx + 1);
      cell.value = h;
      cell.fill = yellowFill;
      cell.border = thinBorder;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    // 빈 템플릿 (순번 1~100)
    for (let i = 1; i <= 100; i++) {
      const row = ws2.getRow(i + 1);
      row.getCell(1).value = i; // 순번
      row.getCell(1).border = thinBorder;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      // 나머지 셀 테두리
      for (let j = 2; j <= 8; j++) {
        row.getCell(j).border = thinBorder;
        row.getCell(j).alignment = { horizontal: 'center', vertical: 'middle' };
      }
      // 현학교남기 열(E) 드롭다운
      ws2.getCell(`E${i + 1}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"O"']
      };
      // 성별 열(F) 드롭다운
      ws2.getCell(`F${i + 1}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"남,여"']
      };
    }
    ws2.columns.forEach((col) => { col.width = 12; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `우선유예과원_템플릿.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 통합 엑셀 업로드 (우선유예 + 과원)
  const handleCombinedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // 기존 데이터 삭제 확인
      if (!confirm(`기존 데이터를 삭제하고 새로 업로드하시겠습니까?\n\n- 우선/유예: ${priorities.length}건\n- 과원: ${surpluses.length}건`)) {
        e.target.value = '';
        return;
      }

      let prioritySuccess = 0, priorityFail = 0;
      let surplusSuccess = 0, surplusFail = 0;

      // 우선유예 시트 처리
      const prioritySheet = workbook.Sheets['우선유예'];
      if (prioritySheet) {
        for (const p of priorities) await priorityApi.delete(p.id);
        const rows = XLSX.utils.sheet_to_json<string[]>(prioritySheet, { header: 1 });
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[2] || !row[3]) continue;
          const school = schools.find(s => s.name === String(row[2]).trim() || s.name.replace('초등학교', '') === String(row[2]).trim());
          if (!school) { priorityFail++; continue; }
          try {
            await priorityApi.create({
              type_code: String(row[1] || '우선').trim() === '전보유예' ? '전보유예' : '우선',
              school_id: school.id,
              teacher_name: String(row[3]).trim(),
              gender: String(row[4] || '').trim() || undefined,
              birth_date: String(row[5] || '').trim() || undefined,
              total_score: row[6] ? parseFloat(String(row[6])) : undefined,
              note: String(row[7] || '').trim() || undefined,
            });
            prioritySuccess++;
          } catch { priorityFail++; }
        }
      }

      // 과원 시트 처리
      const surplusSheet = workbook.Sheets['과원'];
      if (surplusSheet) {
        for (const s of surpluses) await surplusApi.delete(s.id);
        const rows = XLSX.utils.sheet_to_json<string[]>(surplusSheet, { header: 1 });
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1] || !row[2] || !row[3]) continue;
          const school = schools.find(s => s.name === String(row[1]).trim() || s.name.replace('초등학교', '') === String(row[1]).trim());
          const surplusNum = parseInt(String(row[3] || '0'));
          if (!school || !surplusNum) { surplusFail++; continue; }
          try {
            await surplusApi.create({
              school_id: school.id,
              teacher_name: String(row[2]).trim(),
              surplus_number: surplusNum,
              stay_current: String(row[4] || '').trim().toUpperCase() === 'O',
              gender: String(row[5] || '').trim() || undefined,
              birth_date: String(row[6] || '').trim() || undefined,
              note: String(row[7] || '').trim() || undefined,
            });
            surplusSuccess++;
          } catch { surplusFail++; }
        }
      }

      alert(`업로드 완료!\n\n우선/유예: ${prioritySuccess}건 성공, ${priorityFail}건 실패\n과원: ${surplusSuccess}건 성공, ${surplusFail}건 실패`);
      loadData();
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('엑셀 파일 처리 중 오류가 발생했습니다.');
    }

    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 우선전보/전보유예 건수
  const priorityCount = priorities.filter(p => p.type_code === '우선').length;
  const deferCount = priorities.filter(p => p.type_code === '전보유예').length;
  const surplusCount = surpluses.length;
  const stayCount = surpluses.filter(s => s.stay_current).length;

  return (
    <div className="p-8">
      {/* 파일 업로드 input */}
      <input
        type="file"
        ref={combinedFileRef}
        onChange={handleCombinedUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">우선/유예/과원 관리</h2>
          <button
            onClick={handleCombinedDownload}
            className="px-3 py-1.5 rounded text-sm bg-green-600 text-white hover:bg-green-700"
          >
            📥 템플릿 다운로드
          </button>
          <button
            onClick={() => combinedFileRef.current?.click()}
            className="px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            📤 업로드
          </button>
        </div>
        {activeTab === 'priority' ? (
          <button
            onClick={() => setShowBulkForm(!showBulkForm)}
            className={`px-4 py-2 rounded-lg ${showBulkForm ? 'bg-gray-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
          >
            {showBulkForm ? '입력 닫기' : '+ 우선/유예 추가'}
          </button>
        ) : (
          <button
            onClick={() => setShowSurplusBulkForm(!showSurplusBulkForm)}
            className={`px-4 py-2 rounded-lg ${showSurplusBulkForm ? 'bg-gray-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
          >
            {showSurplusBulkForm ? '입력 닫기' : '+ 과원 추가'}
          </button>
        )}
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => { setActiveTab('priority'); setShowSurplusBulkForm(false); }}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'priority'
              ? 'border-purple-600 text-purple-600 bg-purple-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          우선/유예 ({priorityCount + deferCount})
        </button>
        <button
          onClick={() => { setActiveTab('surplus'); setShowBulkForm(false); }}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'surplus'
              ? 'border-teal-600 text-teal-600 bg-teal-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          과원 ({surplusCount})
        </button>
      </div>

      {/* 우선/유예 탭 */}
      {activeTab === 'priority' && (
        <>
      {/* 서브 탭 및 정렬 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
            우선전보 ({priorityCount})
          </span>
          <span className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium">
            전보유예 ({deferCount})
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setSortType('order')}
            className={`px-3 py-1.5 rounded text-sm ${sortType === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            학교순
          </button>
          <button
            onClick={() => setSortType('name')}
            className={`px-3 py-1.5 rounded text-sm ${sortType === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            가나다순
          </button>
        </div>
      </div>

      {/* 대량 입력 폼 */}
      {showBulkForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">우선/유예 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center w-12">순</th>
                  <th className="border px-2 py-1 text-center w-16">구분</th>
                  <th className="border px-2 py-1 text-center w-32">현임교</th>
                  <th className="border px-2 py-1 text-center w-20">성명</th>
                  <th className="border px-2 py-1 text-center w-14">성별</th>
                  <th className="border px-2 py-1 text-center w-28">생년월일</th>
                  <th className="border px-2 py-1 text-center w-16">총점</th>
                  <th className="border px-2 py-1 text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.type_code}
                        onChange={(e) => updateBulkRow(idx, 'type_code', e.target.value)}
                      >
                        <option value="우선">우선</option>
                        <option value="전보유예">전보유예</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.school_id}
                        onChange={(e) => updateBulkRow(idx, 'school_id', e.target.value)}
                      >
                        <option value="">학교 선택</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="성명" value={row.teacher_name} onChange={(e) => updateBulkRow(idx, 'teacher_name', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.gender} onChange={(e) => updateBulkRow(idx, 'gender', e.target.value)}>
                        <option value="">-</option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="YYYY.MM.DD" value={row.birth_date} onChange={(e) => updateBulkRow(idx, 'birth_date', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="총점"
                        value={row.total_score}
                        onChange={(e) => updateBulkRow(idx, 'total_score', e.target.value)}
                        disabled={row.type_code === '전보유예'}
                      />
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="비고" value={row.note} onChange={(e) => updateBulkRow(idx, 'note', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleBulkSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
            <button onClick={() => { setShowBulkForm(false); setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">취소</button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 whitespace-nowrap text-center">순</th>
                <th className="w-20 text-center">구분</th>
                <th className="w-24 text-center">현임교</th>
                <th className="w-20 text-center">성명</th>
                <th className="w-14 text-center">성별</th>
                <th className="w-28 text-center">생년월일</th>
                <th className="w-16 text-center">총점</th>
                <th className="w-40 text-center">비고</th>
                <th className="w-24 text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-8">
                    우선/유예 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).type_code ?? ''} onChange={(e) => setEditForm({ ...editForm, type_code: e.target.value })}>
                            <option value="우선">우선</option>
                            <option value="전보유예">전보유예</option>
                          </select>
                        </td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).school_id ?? ''} onChange={(e) => setEditForm({ ...editForm, school_id: parseInt(e.target.value) || null })}>
                            <option value="">학교 선택</option>
                            {sortedSchools.map((school) => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="text" className="input w-full" value={(editForm as Partial<PriorityTransfer>).teacher_name ?? ''} onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })} />
                        </td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).gender ?? ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td>
                          <input type="text" className="input w-full text-center" placeholder="YYYY.MM.DD" value={(editForm as Partial<PriorityTransfer>).birth_date ?? ''} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="input w-full text-center"
                            value={(editForm as Partial<PriorityTransfer>).total_score ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, total_score: e.target.value ? parseFloat(e.target.value) : null })}
                            disabled={editForm.type_code === '전보유예'}
                          />
                        </td>
                        <td>
                          <input type="text" className="input w-full" value={(editForm as Partial<PriorityTransfer>).note ?? ''} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
                        </td>
                        <td className="text-center">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                          <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type_code === '우선' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.type_code}
                          </span>
                        </td>
                        <td className="text-center">{item.school_name}</td>
                        <td className="text-center font-medium">{item.teacher_name}</td>
                        <td className="text-center">{item.gender || '-'}</td>
                        <td className="text-center">{item.birth_date || '-'}</td>
                        <td className="text-center">{item.type_code === '우선' ? (item.total_score ?? '-') : '-'}</td>
                        <td className="text-center text-gray-500">{item.note}</td>
                        <td className="text-center whitespace-nowrap">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">수정</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {sortedData.length}건 (우선전보: {priorityCount}건, 전보유예: {deferCount}건)
      </div>
        </>
      )}

      {/* 과원 탭 */}
      {activeTab === 'surplus' && (
        <>
          {/* 과원 현황 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <span className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium">
                과원 ({surplusCount})
              </span>
              <span className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">
                현학교 남기 ({stayCount})
              </span>
            </div>
          </div>

          {/* 과원 대량 입력 폼 */}
          {showSurplusBulkForm && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold mb-3">과원 추가</h3>
              <p className="text-sm text-gray-500 mb-3">
                과원순번이 높을수록(숫자가 클수록) 먼저 과원해소 대상이 됩니다.<br/>
                "현학교 남기"를 체크한 사람만 과원해소 점검 대상입니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1 text-center w-12">순</th>
                      <th className="border px-2 py-1 text-center w-32">현임교</th>
                      <th className="border px-2 py-1 text-center w-20">성명</th>
                      <th className="border px-2 py-1 text-center w-20">과원순번</th>
                      <th className="border px-2 py-1 text-center w-24">현학교 남기</th>
                      <th className="border px-2 py-1 text-center w-14">성별</th>
                      <th className="border px-2 py-1 text-center w-28">생년월일</th>
                      <th className="border px-2 py-1 text-center">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surplusBulkRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                        <td className="border p-0">
                          <select
                            className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                            value={row.school_id}
                            onChange={(e) => updateSurplusBulkRow(idx, 'school_id', e.target.value)}
                          >
                            <option value="">학교 선택</option>
                            {sortedSchools.map((school) => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-0">
                          <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="성명" value={row.teacher_name} onChange={(e) => updateSurplusBulkRow(idx, 'teacher_name', e.target.value)} />
                        </td>
                        <td className="border p-0">
                          <input type="number" min="1" className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="1, 2, 3..." value={row.surplus_number} onChange={(e) => updateSurplusBulkRow(idx, 'surplus_number', e.target.value)} />
                        </td>
                        <td className="border p-0 text-center">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                            checked={row.stay_current}
                            onChange={(e) => updateSurplusBulkRow(idx, 'stay_current', e.target.checked)}
                          />
                        </td>
                        <td className="border p-0">
                          <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.gender} onChange={(e) => updateSurplusBulkRow(idx, 'gender', e.target.value)}>
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td className="border p-0">
                          <input type="text" className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="YYYY.MM.DD" value={row.birth_date} onChange={(e) => updateSurplusBulkRow(idx, 'birth_date', e.target.value)} />
                        </td>
                        <td className="border p-0">
                          <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="비고" value={row.note} onChange={(e) => updateSurplusBulkRow(idx, 'note', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSurplusBulkSave} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">저장</button>
                <button onClick={() => { setShowSurplusBulkForm(false); setSurplusBulkRows([emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow(), emptySurplusRow()]); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">취소</button>
              </div>
            </div>
          )}

          {/* 과원 목록 */}
          <div className="card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12 whitespace-nowrap text-center">순</th>
                    <th className="w-24 text-center">현임교</th>
                    <th className="w-20 text-center">성명</th>
                    <th className="w-20 text-center">과원순번</th>
                    <th className="w-24 text-center">현학교 남기</th>
                    <th className="w-14 text-center">성별</th>
                    <th className="w-28 text-center">생년월일</th>
                    <th className="w-40 text-center">비고</th>
                    <th className="w-24 text-center whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSurpluses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-gray-500 py-8">
                        과원 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedSurpluses.map((item, index) => (
                      <tr key={item.id} className={item.stay_current ? 'bg-yellow-50' : ''}>
                        {surplusEditingId === item.id ? (
                          <>
                            <td className="text-center">{index + 1}</td>
                            <td>
                              <select className="input w-full" value={(surplusEditForm as Partial<SurplusTransfer>).school_id ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, school_id: parseInt(e.target.value) || null })}>
                                <option value="">학교 선택</option>
                                {sortedSchools.map((school) => (
                                  <option key={school.id} value={school.id}>{school.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input type="text" className="input w-full" value={(surplusEditForm as Partial<SurplusTransfer>).teacher_name ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, teacher_name: e.target.value })} />
                            </td>
                            <td>
                              <input type="number" min="1" className="input w-full text-center" value={(surplusEditForm as Partial<SurplusTransfer>).surplus_number ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, surplus_number: parseInt(e.target.value) || null })} />
                            </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                                checked={(surplusEditForm as Partial<SurplusTransfer>).stay_current ?? false}
                                onChange={(e) => setSurplusEditForm({ ...surplusEditForm, stay_current: e.target.checked })}
                              />
                            </td>
                            <td>
                              <select className="input w-full" value={(surplusEditForm as Partial<SurplusTransfer>).gender ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, gender: e.target.value })}>
                                <option value="">-</option>
                                <option value="남">남</option>
                                <option value="여">여</option>
                              </select>
                            </td>
                            <td>
                              <input type="text" className="input w-full text-center" placeholder="YYYY.MM.DD" value={(surplusEditForm as Partial<SurplusTransfer>).birth_date ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, birth_date: e.target.value })} />
                            </td>
                            <td>
                              <input type="text" className="input w-full" value={(surplusEditForm as Partial<SurplusTransfer>).note ?? ''} onChange={(e) => setSurplusEditForm({ ...surplusEditForm, note: e.target.value })} />
                            </td>
                            <td className="text-center">
                              <button onClick={handleSurplusSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                              <button onClick={handleSurplusCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="text-center">{index + 1}</td>
                            <td className="text-center">{item.school_name}</td>
                            <td className="text-center font-medium">{item.teacher_name}</td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700">
                                과원{item.surplus_number}
                              </span>
                            </td>
                            <td className="text-center">
                              {item.stay_current ? (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
                                  남기
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="text-center">{item.gender || '-'}</td>
                            <td className="text-center">{item.birth_date || '-'}</td>
                            <td className="text-center text-gray-500">{item.note}</td>
                            <td className="text-center whitespace-nowrap">
                              <button onClick={() => handleSurplusEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">수정</button>
                              <button onClick={() => handleSurplusDelete(item.id)} className="text-red-600 hover:text-red-800">삭제</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            총 {surplusCount}건 (현학교 남기: {stayCount}건)
          </div>
        </>
      )}
    </div>
  );
}
