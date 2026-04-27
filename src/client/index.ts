import { executionCode } from "./execution";
import { codeUiCode } from "./code-ui";
import { settingsCode } from "./settings";
import { navigationCode } from "./navigation";
import { searchCode } from "./search";
import { quizCode } from "./quiz";
import { mobileCode } from "./mobile";
import { siteSearchCode } from "./site-search";

export const executionScript = `
  <script type="module">
${executionCode}
${codeUiCode}
  </script>`;

export const settingsScript = `
  <script type="module">
${settingsCode}
${navigationCode}
${searchCode}
${mobileCode}
${quizCode}
${siteSearchCode}
  </script>`;
