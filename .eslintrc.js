module.exports = {
  // parser: 'babel-eslint',
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  env: { node: true, es6: true },
  plugins: [
    'prettier',
  ],
  rules: {
    'prettier/prettier': ['error', {
      trailingComma: 'es5',
      'singleQuote': true,
    }],
    'no-console': 'off' // It's seed script! We use no-console a hell lot.
  },
}
