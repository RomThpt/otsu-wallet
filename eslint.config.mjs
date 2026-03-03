import config from '@otsu/eslint-config'

export default [
  ...config,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/*.js'],
  },
]
