import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // supabase/functions 는 Deno 런타임이라 브라우저 globals·번들러 해석이 맞지 않는다.
  // 별도 도구(deno check)로 검사하므로 여기서는 제외한다.
  // android/ios 는 네이티브 프로젝트 — 빌드 산출물과 Capacitor 브릿지 생성 JS 가 들어 있다.
  { ignores: ['dist', 'supabase/functions', 'generated', 'android', 'ios'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `_` 접두사는 '의도적으로 안 쓰는 값'이라는 관례 — 구조분해로 필드를 걸러낼 때 쓴다.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // any 는 305건이 남아 있어 error 로 두면 lint 전체가 실패해 게이트로 못 쓴다.
      // warn 으로 두어 '에러 0건'을 유지 가능한 기준선으로 만들고, 점진적으로 줄인다.
      '@typescript-eslint/no-explicit-any': 'warn',
      // 의도적으로 비운 catch 는 허용하되, 그 외 빈 블록은 계속 막는다.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // 테스트에서는 목(mock) 형태를 맞추느라 any 가 불가피한 경우가 있다.
    files: ['**/*.test.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // shadcn/ui 는 생성 코드다. 빈 인터페이스로 props 를 재노출하는 것이 그 도구의 관례라
    // 우리가 고칠 대상이 아니고, 컴포넌트를 재생성하면 되돌아온다.
    files: ['src/components/ui/**'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  },
);
