import { executionCode } from "./execution";
import { codeUiCode } from "./code-ui";
import { settingsCode } from "./settings";
import { navigationCode } from "./navigation";
import { searchCode } from "./search";

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
  </script>`;
