#!/usr/bin/env python3
"""원본 파일에서 VBA 코드 추출하여 발령대장 관련 코드 확인"""

import zipfile
import os

source_path = '/Users/hr/Desktop/cc project/Transfer_master/초등경남관내전보_작업상황부ver3.2(양산).xlsm'

# xlsm 파일에서 vbaProject.bin 추출
with zipfile.ZipFile(source_path, 'r') as z:
    # VBA 관련 파일 목록
    vba_files = [f for f in z.namelist() if 'vba' in f.lower() or 'macro' in f.lower()]
    print("VBA 관련 파일:", vba_files)

    # xl/vbaProject.bin 추출
    if 'xl/vbaProject.bin' in z.namelist():
        with z.open('xl/vbaProject.bin') as f:
            content = f.read()
            # 바이너리에서 텍스트 추출 시도
            try:
                # '발령대장' 관련 텍스트 찾기
                text = content.decode('utf-8', errors='ignore')

                # 발령대장 키워드 주변 텍스트 찾기
                keywords = ['발령대장', '전입', '전출', 'Assignment', 'TransferIn', 'TransferOut']
                for kw in keywords:
                    if kw in text:
                        idx = text.find(kw)
                        print(f"\n=== '{kw}' 발견 (위치: {idx}) ===")
                        # 주변 300자 출력
                        start = max(0, idx - 100)
                        end = min(len(text), idx + 200)
                        snippet = text[start:end]
                        # 출력 가능한 문자만
                        printable = ''.join(c if c.isprintable() or c in '\n\r\t' else ' ' for c in snippet)
                        print(printable)
            except Exception as e:
                print(f"텍스트 추출 오류: {e}")
