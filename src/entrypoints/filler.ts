// '작성' 클릭 시 scripting.executeScript({ files: ['/filler.js'] })로 주입되는 스크립트.
// 필드 수집·입력 로직은 이후 구현 (docs/design/architecture.md 2장).
export default defineUnlistedScript(() => {
  console.log('[resume-integration] filler injected');
});
