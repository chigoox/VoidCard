import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;