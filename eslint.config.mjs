import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      curly: ["error", "all"],
      "no-nested-ternary": "error",
      "one-var": ["error", "never"],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "**/.env*",
    "**/*.pem",
    "**/*.key",
    ".agents/milestones/active.md",
  ]),
]);

export default eslintConfig;
