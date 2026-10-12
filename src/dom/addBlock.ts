// 반복 항목 '추가' 버튼 클릭: docs/design/architecture.md 7.1
// 클릭마다 새 입력란이 생길 때까지 대기, 생기지 않으면 중단 (버튼 오인식·추가 한도 도달)

const FIELDS = 'input, textarea, select';
const WAIT_MS = 2000;

const fieldCount = () => document.querySelectorAll(FIELDS).length;

/** 입력란 수가 before보다 늘면 true, 시간 초과면 false */
function waitForMoreFields(before: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (fieldCount() > before) return resolve(true);
    const done = (added: boolean) => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(added);
    };
    const observer = new MutationObserver(() => {
      if (fieldCount() > before) done(true);
    });
    const timer = setTimeout(() => done(false), WAIT_MS);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

/** 타입 미지정 <button>(기본 submit) 클릭으로 폼이 제출되지 않도록 차단 (사이트 submit 처리기도 실행 안 함) */
function blockSubmit(e: Event): void {
  e.preventDefault();
  e.stopImmediatePropagation();
}

/** 버튼을 count번 클릭 → 실제로 입력란이 늘어난 횟수 */
export async function clickAdd(el: HTMLElement, count: number): Promise<number> {
  let added = 0;
  for (let i = 0; i < count && el.isConnected; i++) {
    const before = fieldCount();
    window.addEventListener('submit', blockSubmit, true);
    try {
      el.click();
    } finally {
      window.removeEventListener('submit', blockSubmit, true);
    }
    if (!(await waitForMoreFields(before))) break;
    added++;
  }
  return added;
}
