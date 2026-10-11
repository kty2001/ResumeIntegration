import type { AttachmentKind, AttachmentMeta, Resume } from './schema/resume';

// 첨부 파일 매핑: 파일 입력란(input[type=file]) ↔ 'attachments.<kind>' 키 → 해당 구분의 첫 첨부 파일
// 파일 본문은 storage/files.ts (IndexedDB), 업로드는 dom/widgets/file.ts

export const ATTACHMENT_KEY_PREFIX = 'attachments.';

export const attachmentKey = (kind: AttachmentKind) => `${ATTACHMENT_KEY_PREFIX}${kind}`;

/** accept 속성(.pdf, image/*, application/pdf …)이 파일을 허용하는지. accept 없으면 허용 */
export function acceptsFile(accept: string | undefined, fileName: string, mimeType: string): boolean {
  const tokens = accept?.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];
  if (!tokens.length) return true;
  const name = fileName.toLowerCase();
  const type = mimeType.toLowerCase();
  return tokens.some((t) =>
    t.startsWith('.') ? name.endsWith(t) : t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : type === t,
  );
}

/** 키에 해당하는 구분의 첨부 파일 중 accept에 맞는 첫 파일 */
export function attachmentFor(resume: Resume, schemaKey: string, accept?: string): AttachmentMeta | undefined {
  if (!schemaKey.startsWith(ATTACHMENT_KEY_PREFIX)) return undefined;
  const kind = schemaKey.slice(ATTACHMENT_KEY_PREFIX.length);
  return resume.attachments.find((a) => a.kind === kind && acceptsFile(accept, a.fileName, a.mimeType));
}

/** filler로 보내는 파일 입력 값 */
export interface FilePayload {
  fileName: string;
  mimeType: string;
  data: string;             // base64
}
