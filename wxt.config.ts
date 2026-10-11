import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: ({ mode }) => ({
    name: '이력서 자동 입력',
    description: '저장해 둔 이력서로 채용 사이트 지원서를 채워 주는 확장 프로그램',
    // 최소 권한: docs/design/architecture.md 3장
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    // E2E 빌드 전용: 툴바 클릭(activeTab)을 재현할 수 없어 fixture 출처에 호스트 권한 부여,
    // 교차 출처 iframe 권한 요청 확인용 출처(http://127.0.0.1)를 선택 권한에 추가
    optional_host_permissions: ['https://*/*', ...(mode === 'e2e' ? ['http://127.0.0.1/*'] : [])],
    ...(mode === 'e2e' && { host_permissions: ['http://localhost/*'] }),
  }),
});
