module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'security/detect-non-literal-fs-filename': 'off',
  },
  overrides: [
    {
      files: ['scripts/*'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
