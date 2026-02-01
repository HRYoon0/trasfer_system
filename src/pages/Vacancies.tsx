import { useEffect, useState, useMemo } from 'react';
import { vacancyApi, supplementApi, externalOutApi, schoolApi, settingsApi } from '../services/api';
import type { VacancyItem, ExternalOut, School } from '../types';

interface BulkRow {
  type_code: string;
  school_id: number | '';
  teacher_name: string;
  gender: string;
  birth_date: string;
  note: string;
}

interface ExternalOutBulkRow {
  transfer_type: string;
  school_id: number | '';
  teacher_name: string;
  gender: string;
  birth_date: string;
  destination: string;
  separate_quota: string;
  note: string;
}

const emptyRow = (): BulkRow => ({ type_code: '', school_id: '', teacher_name: '', gender: '', birth_date: '', note: '' });
const emptyExternalOutRow = (): ExternalOutBulkRow => ({
  transfer_type: '타시군',
  school_id: '',
  teacher_name: '',
  gender: '',
  birth_date: '',
  destination: '',
  separate_quota: '',
  note: '',
});

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [supplements, setSupplements] = useState<VacancyItem[]>([]);
  const [externalOuts, setExternalOuts] = useState<ExternalOut[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [vacancyTypes, setVacancyTypes] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vacancy' | 'supplement' | 'externalOut'>('vacancy');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VacancyItem | ExternalOut>>({});
  const [sortType, setSortType] = useState<'order' | 'name'>('order');

  // 대량 입력 폼
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [externalOutBulkRows, setExternalOutBulkRows] = useState<ExternalOutBulkRow[]>([emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow()]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vacancyRes, supplementRes, externalOutRes, schoolRes, typesRes] = await Promise.all([
        vacancyApi.getAll(),
        supplementApi.getAll(),
        externalOutApi.getAll(),
        schoolApi.getAll(),
        settingsApi.getVacancyTypes(),
      ]);
      setVacancies(vacancyRes.data);
      setSupplements(supplementRes.data);
      setExternalOuts(externalOutRes.data);
      setSchools(schoolRes.data);
      setVacancyTypes(typesRes.data);
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

  // 결원/충원 목록 정렬
  const sortedData = useMemo(() => {
    const list = activeTab === 'vacancy' ? [...vacancies] : [...supplements];
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
  }, [activeTab, vacancies, supplements, schools, sortType]);

  // 관외전출 목록 정렬
  const sortedExternalOuts = useMemo(() => {
    const list = [...externalOuts];
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
  }, [externalOuts, schools, sortType]);

  // 대량 입력 행 업데이트 (결원/충원)
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

  // 대량 입력 행 업데이트 (관외전출)
  const updateExternalOutBulkRow = (index: number, field: keyof ExternalOutBulkRow, value: string | number) => {
    const newRows = [...externalOutBulkRows];
    if (field === 'school_id') {
      newRows[index][field] = value === '' ? '' : Number(value);
    } else {
      newRows[index][field] = value as string;
    }
    setExternalOutBulkRows(newRows);
    if (index === externalOutBulkRows.length - 1 && value !== '') {
      setExternalOutBulkRows([...newRows, emptyExternalOutRow()]);
    }
  };

  // 대량 입력 저장 (결원/충원)
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
        const data: { type_code: string; school_id: number; teacher_name: string; gender?: string; birth_date?: string; note?: string } = {
          type_code: row.type_code || '결원',
          school_id: row.school_id as number,
          teacher_name: row.teacher_name,
          note: row.note || '',
        };
        if (row.gender) data.gender = row.gender;
        if (row.birth_date) data.birth_date = row.birth_date;
        if (activeTab === 'vacancy') {
          await vacancyApi.create(data);
        } else {
          await supplementApi.create(data);
        }
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

  // 대량 입력 저장 (관외전출)
  const handleExternalOutBulkSave = async () => {
    const validRows = externalOutBulkRows.filter(row => row.teacher_name.trim() && row.school_id);
    if (validRows.length === 0) {
      alert('입력할 데이터가 없습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        await externalOutApi.create({
          transfer_type: row.transfer_type || '타시군',
          school_id: row.school_id as number,
          teacher_name: row.teacher_name,
          gender: row.gender || undefined,
          destination: row.destination || undefined,
          separate_quota: row.separate_quota || undefined,
          note: row.note || undefined,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}건 추가 완료${failCount > 0 ? `, ${failCount}건 실패` : ''}`);
    setExternalOutBulkRows([emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow()]);
    setShowBulkForm(false);
    loadData();
  };

  const handleEdit = (item: VacancyItem | ExternalOut) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      if (activeTab === 'externalOut') {
        await externalOutApi.update(editingId, editForm as Partial<ExternalOut>);
      } else if (activeTab === 'vacancy') {
        await vacancyApi.update(editingId, editForm as Partial<VacancyItem>);
      } else {
        await supplementApi.update(editingId, editForm as Partial<VacancyItem>);
      }
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
      if (activeTab === 'externalOut') {
        await externalOutApi.delete(id);
      } else if (activeTab === 'vacancy') {
        await vacancyApi.delete(id);
      } else {
        await supplementApi.delete(id);
      }
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const getAddButtonText = () => {
    if (activeTab === 'vacancy') return '+ 결원 추가';
    if (activeTab === 'supplement') return '+ 충원 추가';
    return '+ 관외전출 추가';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">결원/충원/관외전출 관리</h2>
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className={`px-4 py-2 rounded-lg ${showBulkForm ? 'bg-gray-500 text-white' : activeTab === 'vacancy' ? 'bg-red-600 text-white hover:bg-red-700' : activeTab === 'supplement' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
        >
          {showBulkForm ? '입력 닫기' : getAddButtonText()}
        </button>
      </div>

      {/* 탭 및 정렬 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('vacancy'); setShowBulkForm(false); setEditingId(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vacancy'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            결원 ({vacancies.length})
          </button>
          <button
            onClick={() => { setActiveTab('supplement'); setShowBulkForm(false); setEditingId(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'supplement'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            충원 ({supplements.length})
          </button>
          <button
            onClick={() => { setActiveTab('externalOut'); setShowBulkForm(false); setEditingId(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'externalOut'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            관외전출 ({externalOuts.length})
          </button>
        </div>
        <div className="flex gap-2">
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

      {/* 결원/충원 대량 입력 폼 */}
      {showBulkForm && activeTab !== 'externalOut' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">{activeTab === 'vacancy' ? '결원' : '충원'} 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center w-12">순</th>
                  <th className="border px-2 py-1 text-center w-24">구분</th>
                  <th className="border px-2 py-1 text-center">현임교</th>
                  <th className="border px-2 py-1 text-center w-28">성명</th>
                  <th className="border px-2 py-1 text-center w-16">성별</th>
                  <th className="border px-2 py-1 text-center w-28">생년월일</th>
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
                        <option value="">선택</option>
                        {vacancyTypes.map((type) => (
                          <option key={type.code} value={type.code}>{type.name}</option>
                        ))}
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

      {/* 관외전출 대량 입력 폼 */}
      {showBulkForm && activeTab === 'externalOut' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">관외전출 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center w-12">순</th>
                  <th className="border px-2 py-1 text-center w-24">구분</th>
                  <th className="border px-2 py-1 text-center">현임교</th>
                  <th className="border px-2 py-1 text-center w-28">성명</th>
                  <th className="border px-2 py-1 text-center w-16">성별</th>
                  <th className="border px-2 py-1 text-center w-28">생년월일</th>
                  <th className="border px-2 py-1 text-center">배정지</th>
                  <th className="border px-2 py-1 text-center w-24">별도정원</th>
                  <th className="border px-2 py-1 text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {externalOutBulkRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.transfer_type} onChange={(e) => updateExternalOutBulkRow(idx, 'transfer_type', e.target.value)}>
                        <option value="타시군">타시군</option>
                        <option value="타시도">타시도</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.school_id} onChange={(e) => updateExternalOutBulkRow(idx, 'school_id', e.target.value)}>
                        <option value="">학교 선택</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="성명" value={row.teacher_name} onChange={(e) => updateExternalOutBulkRow(idx, 'teacher_name', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.gender} onChange={(e) => updateExternalOutBulkRow(idx, 'gender', e.target.value)}>
                        <option value="">-</option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="YYYY.MM.DD" value={row.birth_date} onChange={(e) => updateExternalOutBulkRow(idx, 'birth_date', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="배정지" value={row.destination} onChange={(e) => updateExternalOutBulkRow(idx, 'destination', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.separate_quota} onChange={(e) => updateExternalOutBulkRow(idx, 'separate_quota', e.target.value)}>
                        <option value="">-</option>
                        <option value="휴직">휴직</option>
                        <option value="파견">파견</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="비고" value={row.note} onChange={(e) => updateExternalOutBulkRow(idx, 'note', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleExternalOutBulkSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
            <button onClick={() => { setShowBulkForm(false); setExternalOutBulkRows([emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow(), emptyExternalOutRow()]); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">취소</button>
          </div>
        </div>
      )}

      {/* 결원/충원 목록 */}
      {activeTab !== 'externalOut' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 whitespace-nowrap text-center">순</th>
                  <th className="w-20 text-center">구분</th>
                  <th className="text-center">현임교</th>
                  <th className="w-24 text-center">성명</th>
                  <th className="w-14 text-center">성별</th>
                  <th className="w-24 text-center">생년월일</th>
                  <th className="text-center">비고</th>
                  <th className="text-center w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-500 py-8">
                      {activeTab === 'vacancy' ? '결원' : '충원'} 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item, index) => (
                    <tr key={item.id}>
                      {editingId === item.id ? (
                        <>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<VacancyItem>).type_code ?? ''} onChange={(e) => setEditForm({ ...editForm, type_code: e.target.value })}>
                              <option value="">선택</option>
                              {vacancyTypes.map((type) => (
                                <option key={type.code} value={type.code}>{type.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<VacancyItem>).school_id ?? ''} onChange={(e) => setEditForm({ ...editForm, school_id: parseInt(e.target.value) || null })}>
                              <option value="">학교 선택</option>
                              {sortedSchools.map((school) => (
                                <option key={school.id} value={school.id}>{school.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input w-full" value={(editForm as Partial<VacancyItem>).teacher_name ?? ''} onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })} />
                          </td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<VacancyItem>).gender ?? ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                              <option value="">-</option>
                              <option value="남">남</option>
                              <option value="여">여</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input w-full text-center" placeholder="YYYY.MM.DD" value={(editForm as Partial<VacancyItem>).birth_date ?? ''} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
                          </td>
                          <td>
                            <input type="text" className="input w-full" value={(editForm as Partial<VacancyItem>).note ?? ''} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
                          </td>
                          <td className="text-center">
                            <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                            <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-center">{index + 1}</td>
                          <td className="text-center">{item.type_name || item.type_code}</td>
                          <td className="text-center">{item.school_name}</td>
                          <td className="text-center font-medium">{item.teacher_name}</td>
                          <td className="text-center">{item.gender || '-'}</td>
                          <td className="text-center">{item.birth_date || '-'}</td>
                          <td className="text-center text-gray-500">{item.note}</td>
                          <td className="text-center">
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
      )}

      {/* 관외전출 목록 */}
      {activeTab === 'externalOut' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">순</th>
                  <th className="w-20 text-center">구분</th>
                  <th className="text-center">현임교</th>
                  <th className="w-24 text-center">성명</th>
                  <th className="w-14 text-center">성별</th>
                  <th className="w-24 text-center">생년월일</th>
                  <th className="text-center">배정지</th>
                  <th className="w-24 text-center">별도정원</th>
                  <th className="text-center">비고</th>
                  <th className="text-center w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedExternalOuts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-gray-500 py-8">
                      관외전출 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedExternalOuts.map((item, index) => (
                    <tr key={item.id}>
                      {editingId === item.id ? (
                        <>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<ExternalOut>).transfer_type ?? ''} onChange={(e) => setEditForm({ ...editForm, transfer_type: e.target.value })}>
                              <option value="타시군">타시군</option>
                              <option value="타시도">타시도</option>
                            </select>
                          </td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<ExternalOut>).school_id ?? ''} onChange={(e) => setEditForm({ ...editForm, school_id: parseInt(e.target.value) || undefined })}>
                              <option value="">학교 선택</option>
                              {sortedSchools.map((school) => (
                                <option key={school.id} value={school.id}>{school.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input w-full" value={(editForm as Partial<ExternalOut>).teacher_name ?? ''} onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })} />
                          </td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<ExternalOut>).gender ?? ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                              <option value="">-</option>
                              <option value="남">남</option>
                              <option value="여">여</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input w-full text-center" placeholder="YYYY.MM.DD" value={(editForm as any).birth_date ?? ''} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value } as any)} />
                          </td>
                          <td>
                            <input type="text" className="input w-full" value={(editForm as Partial<ExternalOut>).destination ?? ''} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} />
                          </td>
                          <td>
                            <select className="input w-full" value={(editForm as Partial<ExternalOut>).separate_quota ?? ''} onChange={(e) => setEditForm({ ...editForm, separate_quota: e.target.value })}>
                              <option value="">-</option>
                              <option value="휴직">휴직</option>
                              <option value="파견">파견</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input w-full" value={(editForm as Partial<ExternalOut>).note ?? ''} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
                          </td>
                          <td className="text-center">
                            <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                            <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-center">{index + 1}</td>
                          <td className="text-center">{item.transfer_type}</td>
                          <td className="text-center">{item.school_name}</td>
                          <td className="text-center font-medium">{item.teacher_name}</td>
                          <td className="text-center">{item.gender || '-'}</td>
                          <td className="text-center">{(item as any).birth_date || '-'}</td>
                          <td className="text-center">{item.destination}</td>
                          <td className="text-center">{item.separate_quota}</td>
                          <td className="text-center text-gray-500">{item.note}</td>
                          <td className="text-center">
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
      )}

      <div className="mt-4 text-sm text-gray-500">
        총 {activeTab === 'externalOut' ? sortedExternalOuts.length : sortedData.length}건
      </div>
    </div>
  );
}
