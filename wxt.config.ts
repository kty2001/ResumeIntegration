import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '이력서 자동 입력',
    description: '저장해 둔 이력서로 채용 사이트 지원서를 채워 주는 확장 프로그램',
    // 최소 권한: docs/design/architecture.md 3장
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    optional_host_permissions: ['https://*/*'],
  },
});
