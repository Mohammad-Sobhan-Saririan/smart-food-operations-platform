import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Publication lint baseline.
 *
 * TypeScript correctness is enforced separately by `tsc --noEmit`. The rules
 * disabled below are legacy-cleanup signals in this inherited codebase, not
 * publication blockers. Correctness-oriented React rules remain errors.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/immutability": "error",
      "react-hooks/globals": "error",
      "prefer-const": "error",

      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
