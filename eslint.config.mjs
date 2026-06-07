import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested React Native app — separate project/toolchain. The Next web config
    // (jsx-a11y, no-img-element, web react-hooks rules) does not apply to RN and
    // produces false positives on expo-image/Animated code.
    "donow-mobile/**",
    // Node admin/migration scripts run via `node` — CommonJS require() is correct.
    "scripts/**",
  ]),
]);

export default eslintConfig;
