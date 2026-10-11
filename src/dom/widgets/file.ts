import type { FilePayload } from '@/core/attachments';

// 파일 입력란: background가 보낸 파일(base64)로 File을 만들어 DataTransfer로 files 설정 후 input·change 발생
// 값 '' 은 선택 해제 (되돌리기용 — 입력 전 선택 파일은 보관할 수 없어 비움)

function toFile({ fileName, mimeType, data }: FilePayload): File {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new File([bytes], fileName, { type: mimeType });
}

export function fillFile(el: HTMLInputElement, value: string): boolean {
  let file: File | undefined;
  if (value) {
    try {
      file = toFile(JSON.parse(value) as FilePayload);
    } catch {
      return false;
    }
  }
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  el.files = transfer.files;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return file ? el.files?.[0]?.name === file.name : !el.files?.length;
}
