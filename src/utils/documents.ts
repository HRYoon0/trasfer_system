import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { InternalTransfer, SchoolShortage, ExternalOut, ExternalIn } from '../types';

// jsPDF 타입 확장
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// 한글 폰트 지원을 위한 설정 (기본 폰트 사용)
const PDF_OPTIONS = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
};

// 헤더와 데이터로 시트 생성 (데이터가 없어도 헤더 표시)
function createSheetWithHeaders(headers: string[], data: any[][], colWidths?: number[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  if (colWidths) {
    ws['!cols'] = colWidths.map(wch => ({ wch }));
  }
  return ws;
}

// 발령대장 (Excel) - exceljs로 템플릿 스타일 유지
export async function exportAssignmentList(
  transfers: InternalTransfer[],
  settings: Record<string, string>
) {
  const assignedTransfers = transfers.filter(t => t.assigned_school_id);
  const appointmentDate = settings.appointment_date || '2025-03-01';
  const officeName = settings.office_name || '양산교육지원청';

  try {
    // 템플릿 파일 불러오기
    const response = await fetch('/templates/발령대장_템플릿.xlsx');
    const arrayBuffer = await response.arrayBuffer();

    // ExcelJS로 읽기 (스타일 보존)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet('발령대장');

    if (!worksheet) {
      alert('발령대장 시트를 찾을 수 없습니다.');
      return;
    }

    // 4행부터 데이터 입력 (C4부터 시작)
    assignedTransfers.forEach((t, index) => {
      const row = 4 + index;
      const excelRow = worksheet.getRow(row);

      // 값 입력 (기존 스타일 유지)
      excelRow.getCell('C').value = appointmentDate;
      excelRow.getCell('D').value = t.current_school_name || '';
      excelRow.getCell('E').value = '교사';
      excelRow.getCell('F').value = t.teacher_name;
      excelRow.getCell('G').value = `${t.assigned_school_name || ''} 발령`;
      excelRow.getCell('H').value = `${officeName} 교육장`;
      excelRow.getCell('I').value = '';
      excelRow.getCell('J').value = '';
      excelRow.getCell('K').value = '';
      excelRow.getCell('L').value = t.note || '';

      excelRow.commit();
    });

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `발령대장_${settings.transfer_year || '2025'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('템플릿 로드 실패:', error);
    alert('발령대장 템플릿을 불러올 수 없습니다.');
  }
}

// 학교별 과부족 현황 (Excel)
export function exportSchoolShortage(
  shortages: SchoolShortage[],
  settings: Record<string, string>
) {
  const headers = ['순번', '학교명', '정원', '현원', '과부족', '상태'];
  const data = shortages.map((s, index) => [
    index + 1,
    s.name,
    s.quota,
    s.current_count,
    s.shortage,
    s.shortage < 0 ? '결원' : s.shortage > 0 ? '과원' : '정원',
  ]);

  const ws = createSheetWithHeaders(headers, data, [5, 15, 8, 8, 8, 8]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '과부족현황');

  const fileName = `학교별_과부족현황_${settings.transfer_year || '2025'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 관내전출입 명부 (Excel)
export function exportInternalTransferList(
  transfers: InternalTransfer[],
  settings: Record<string, string>
) {
  const headers = ['순번', '성명', '성별', '생년월일', '현소속', '1지망', '2지망', '3지망',
                   '총점', '동점1', '동점2', '동점3', '희망순위', '배치학교', '제외사유', '만기자', '우선배치', '비고'];
  const data = transfers.map((t, index) => [
    index + 1,
    t.teacher_name,
    t.gender || '',
    t.birth_date || '',
    t.current_school_name || '',
    t.wish_school_1_name || '',
    t.wish_school_2_name || '',
    t.wish_school_3_name || '',
    t.total_score,
    t.tiebreaker_1,
    t.tiebreaker_2,
    t.tiebreaker_3,
    t.preference_round,
    t.assigned_school_name || '',
    t.exclusion_reason || '',
    t.is_expired ? 'O' : '',
    t.is_priority ? 'O' : '',
    t.note || '',
  ]);

  const ws = createSheetWithHeaders(headers, data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '관내전출입명부');

  const fileName = `관내전출입명부_${settings.transfer_year || '2025'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 관외전출 명부 (Excel)
export function exportExternalOutList(
  transfers: ExternalOut[],
  settings: Record<string, string>
) {
  const headers = ['순번', '유형', '성명', '성별', '현소속', '전출지', '별도정원', '비고'];
  const data = transfers.map((t, index) => [
    index + 1,
    t.transfer_type,
    t.teacher_name,
    t.gender || '',
    t.school_name || '',
    t.destination || '',
    t.separate_quota || '',
    t.note || '',
  ]);

  const ws = createSheetWithHeaders(headers, data, [5, 8, 10, 5, 15, 15, 10, 20]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '관외전출명부');

  const fileName = `관외전출명부_${settings.transfer_year || '2025'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 관외전입 명부 (Excel)
export function exportExternalInList(
  transfers: ExternalIn[],
  settings: Record<string, string>
) {
  const headers = ['순번', '유형', '성명', '성별', '원소속', '배치학교', '별도정원', '비고'];
  const data = transfers.map((t, index) => [
    index + 1,
    t.transfer_type,
    t.teacher_name,
    t.gender || '',
    t.origin_school || '',
    t.assigned_school_name || '',
    t.separate_quota || '',
    t.note || '',
  ]);

  const ws = createSheetWithHeaders(headers, data, [5, 8, 10, 5, 15, 15, 10, 20]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '관외전입명부');

  const fileName = `관외전입명부_${settings.transfer_year || '2025'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 전보 통지서 (PDF) - 개별 출력
export function exportTransferNotice(
  transfer: InternalTransfer,
  settings: Record<string, string>
) {
  const doc = new jsPDF(PDF_OPTIONS);

  const officeName = settings.office_name || '양산교육지원청';
  const appointmentDate = settings.appointment_date || '2025-03-01';

  // 제목
  doc.setFontSize(20);
  doc.text('전 보 통 지 서', 105, 30, { align: 'center' });

  // 내용
  doc.setFontSize(12);
  const content = [
    '',
    `성    명: ${transfer.teacher_name}`,
    '',
    `현 소 속: ${transfer.current_school_name || ''}`,
    '',
    `발령학교: ${transfer.assigned_school_name || ''}`,
    '',
    `발령일자: ${appointmentDate}`,
    '',
    '',
    `위와 같이 전보 발령되었음을 통지합니다.`,
    '',
    '',
    '',
    `${appointmentDate}`,
    '',
    '',
    `${officeName} 교육장`,
  ];

  let y = 60;
  content.forEach(line => {
    doc.text(line, 30, y);
    y += 10;
  });

  const fileName = `전보통지서_${transfer.teacher_name}.pdf`;
  doc.save(fileName);
}

// 전보 통지서 일괄 출력 (PDF)
export function exportAllTransferNotices(
  transfers: InternalTransfer[],
  settings: Record<string, string>
) {
  const assignedTransfers = transfers.filter(t => t.assigned_school_id);
  if (assignedTransfers.length === 0) {
    alert('배치된 교사가 없습니다.');
    return;
  }

  const doc = new jsPDF(PDF_OPTIONS);
  const officeName = settings.office_name || '양산교육지원청';
  const appointmentDate = settings.appointment_date || '2025-03-01';

  assignedTransfers.forEach((transfer, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // 제목
    doc.setFontSize(20);
    doc.text('전 보 통 지 서', 105, 30, { align: 'center' });

    // 내용
    doc.setFontSize(12);
    const content = [
      '',
      `성    명: ${transfer.teacher_name}`,
      '',
      `현 소 속: ${transfer.current_school_name || ''}`,
      '',
      `발령학교: ${transfer.assigned_school_name || ''}`,
      '',
      `발령일자: ${appointmentDate}`,
      '',
      '',
      `위와 같이 전보 발령되었음을 통지합니다.`,
      '',
      '',
      '',
      `${appointmentDate}`,
      '',
      '',
      `${officeName} 교육장`,
    ];

    let y = 60;
    content.forEach(line => {
      doc.text(line, 30, y);
      y += 10;
    });
  });

  const fileName = `전보통지서_전체_${settings.transfer_year || '2025'}.pdf`;
  doc.save(fileName);
}

// 발령대장 (PDF) - 원본 양식에 맞춤
export function exportAssignmentListPDF(
  transfers: InternalTransfer[],
  settings: Record<string, string>
) {
  const assignedTransfers = transfers.filter(t => t.assigned_school_id);

  const doc = new jsPDF({
    ...PDF_OPTIONS,
    orientation: 'landscape',
  });

  const officeName = settings.office_name || '양산교육지원청';
  const transferYear = settings.transfer_year || '2025';
  const appointmentDate = settings.appointment_date || '2025-03-01';

  // 제목
  doc.setFontSize(16);
  doc.text('발  령  대  장', 148.5, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${transferYear}년도 교원 전보 - ${officeName}`, 148.5, 22, { align: 'center' });

  // 테이블 데이터 - 원본 양식에 맞춤
  const tableData = assignedTransfers.map((t) => [
    appointmentDate,
    t.current_school_name || '',
    '교사',
    t.teacher_name,
    `${t.assigned_school_name || ''} 발령`,
    `${officeName} 교육장`,
    '',
    '',
    '',
    t.note || '',
  ]);

  doc.autoTable({
    startY: 30,
    head: [['발령일자', '소속', '직급', '성명', '발령사항', '발령권자', '발령근거', '기재자', '확인자', '비고']],
    body: tableData.length > 0 ? tableData : [['', '', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 139, 202] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 15 },
      3: { cellWidth: 20 },
      4: { cellWidth: 40 },
      5: { cellWidth: 35 },
      6: { cellWidth: 25 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
      9: { cellWidth: 30 },
    },
  });

  const fileName = `발령대장_${transferYear}.pdf`;
  doc.save(fileName);
}

// 종합 현황표 (Excel) - 모든 데이터 포함
export function exportComprehensiveReport(
  data: {
    schools: SchoolShortage[];
    internalTransfers: InternalTransfer[];
    externalOut: ExternalOut[];
    externalIn: ExternalIn[];
  },
  settings: Record<string, string>
) {
  const wb = XLSX.utils.book_new();

  // 학교별 현황
  const schoolHeaders = ['순번', '학교명', '정원', '현원', '과부족'];
  const schoolData = data.schools.map((s, i) => [
    i + 1,
    s.name,
    s.quota,
    s.current_count,
    s.shortage,
  ]);
  const ws1 = createSheetWithHeaders(schoolHeaders, schoolData, [5, 15, 8, 8, 8]);
  XLSX.utils.book_append_sheet(wb, ws1, '학교별현황');

  // 관내전출입
  const internalHeaders = ['순번', '성명', '현소속', '배치학교', '희망순위', '총점', '상태'];
  const internalData = data.internalTransfers.map((t, i) => [
    i + 1,
    t.teacher_name,
    t.current_school_name || '',
    t.assigned_school_name || '',
    t.preference_round,
    t.total_score,
    t.assigned_school_id ? '배치완료' : t.exclusion_reason ? '제외' : '미배치',
  ]);
  const ws2 = createSheetWithHeaders(internalHeaders, internalData);
  XLSX.utils.book_append_sheet(wb, ws2, '관내전출입');

  // 관외전출
  const extOutHeaders = ['순번', '성명', '현소속', '전출지'];
  const extOutData = data.externalOut.map((t, i) => [
    i + 1,
    t.teacher_name,
    t.school_name || '',
    t.destination || '',
  ]);
  const ws3 = createSheetWithHeaders(extOutHeaders, extOutData, [5, 10, 15, 15]);
  XLSX.utils.book_append_sheet(wb, ws3, '관외전출');

  // 관외전입
  const extInHeaders = ['순번', '성명', '원소속', '배치학교'];
  const extInData = data.externalIn.map((t, i) => [
    i + 1,
    t.teacher_name,
    t.origin_school || '',
    t.assigned_school_name || '',
  ]);
  const ws4 = createSheetWithHeaders(extInHeaders, extInData, [5, 10, 15, 15]);
  XLSX.utils.book_append_sheet(wb, ws4, '관외전입');

  const fileName = `전보종합현황_${settings.transfer_year || '2025'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
