/* ═══════════════════════════════════════════════════════════
 * R2 Helpers (Phase E)
 *  - 멀티테넌트 키 컨벤션: hospitals/{hospital_id}/attachments/{att_id}/{filename}
 *  - presigned URL 대신 proxy 다운로드 (Workers 가 권한 검증 후 R2 스트림)
 *  - 업로드 사이즈/MIME 검증
 * ═══════════════════════════════════════════════════════════ */

/** 허용 MIME 타입 (의료 컨텍스트 우선 — 이미지/PDF/문서) */
export const ALLOWED_MIME_TYPES = new Set<string>([
  // 이미지
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  // 문서
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  // 압축 (가끔 진료기록 묶음)
  'application/zip',
  // 의료 영상 (DICOM은 application/dicom 인데 일부 브라우저는 application/octet-stream 으로 옴)
  'application/dicom',
])

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  // 25MB (Cloudflare Workers free CPU 한계 고려)

export interface R2UploadOpts {
  hospitalId: string
  attId: string                  // 'att_xxxxx' (미리 generateMessengerId('att') 로 생성)
  fileName: string               // 원본 파일명
  contentType: string
  body: ArrayBuffer | ReadableStream | Blob
  size: number                   // 바이트
}

export interface R2UploadResult {
  r2Key: string
  size: number
  contentType: string
  etag?: string
}

/** R2 키 컨벤션 생성 — hospital_id 가 path prefix 라 cross-tenant 접근 자체가 불가능 */
export function buildR2Key(hospitalId: string, attId: string, fileName: string): string {
  // 파일명 sanitize: 경로 분리자/제어문자/긴 이름 차단
  const safeName = fileName
    .replace(/[\/\\\x00-\x1f]/g, '_')
    .replace(/\.\.+/g, '_')
    .slice(0, 100) || 'file'
  return `hospitals/${hospitalId}/attachments/${attId}/${safeName}`
}

/** MIME 검증 */
export function isAllowedMime(contentType: string): boolean {
  if (!contentType) return false
  const ct = contentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_MIME_TYPES.has(ct)
}

/** R2 업로드 */
export async function uploadToR2(
  r2: R2Bucket,
  opts: R2UploadOpts
): Promise<R2UploadResult> {
  if (opts.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`파일 크기 초과: 최대 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`)
  }
  if (!isAllowedMime(opts.contentType)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${opts.contentType}`)
  }

  const r2Key = buildR2Key(opts.hospitalId, opts.attId, opts.fileName)

  const obj = await r2.put(r2Key, opts.body as any, {
    httpMetadata: {
      contentType: opts.contentType,
      contentDisposition: `attachment; filename="${encodeURIComponent(opts.fileName)}"`,
    },
    customMetadata: {
      hospitalId: opts.hospitalId,
      attId: opts.attId,
      originalName: opts.fileName,
    },
  })

  return {
    r2Key,
    size: opts.size,
    contentType: opts.contentType,
    etag: obj?.etag,
  }
}

/** R2 다운로드 (Workers proxy 패턴 — 권한 검증 후 호출) */
export async function downloadFromR2(
  r2: R2Bucket,
  r2Key: string
): Promise<R2ObjectBody | null> {
  const obj = await r2.get(r2Key)
  return obj
}

/** R2 삭제 (soft-delete 와 별개로 R2 실제 객체 제거) */
export async function deleteFromR2(r2: R2Bucket, r2Key: string): Promise<void> {
  await r2.delete(r2Key).catch(() => {})
}

/** 이미지 여부 (썸네일 표시용) */
export function isImageMime(contentType: string): boolean {
  return contentType.startsWith('image/')
}

/** 파일 사이즈 humanize */
export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
