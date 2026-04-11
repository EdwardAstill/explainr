export function guideHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>readrun guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #e6edf3; max-width: 740px; margin: 0 auto; padding: 48px 24px; line-height: 1.7; }
  h1 { font-size: 1.75rem; font-weight: 700; color: #58a6ff; margin-bottom: 8px; }
  h2 { font-size: 1.1rem; font-weight: 600; color: #e6edf3; margin: 36px 0 12px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  h3 { font-size: 0.95rem; font-weight: 600; color: #8b949e; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  p { margin-bottom: 12px; color: #c9d1d9; }
  code { font-family: "SF Mono", Consolas, monospace; font-size: 0.85em; background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 2px 6px; color: #79c0ff; }
  pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 12px 0 20px; }
  pre code { background: none; border: none; padding: 0; color: #e6edf3; font-size: 0.875rem; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 0.875rem; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #30363d; color: #8b949e; font-weight: 600; }
  td { padding: 8px 12px; border-bottom: 1px solid #21262d; color: #c9d1d9; }
  td:first-child { color: #79c0ff; font-family: monospace; }
  .subtitle { color: #8b949e; margin-bottom: 36px; }
</style>
</head>
<body>
<h1>readrun</h1>
<p class="subtitle">Architecture guide — how a readrun project is structured</p>

<h2>Project Structure</h2>
<pre><code>my-notes/
  index.md                    ← your content
  guides/
    setup.md
    advanced.md
  .readrun/
    scripts/                  ← code files referenced from markdown
      demo.py
      widget.jsx
    images/                   ← images referenced from markdown
      diagram.svg
    files/                    ← data files embedded in static builds
      dataset.csv
    .ignore                   ← patterns to exclude from navigation</code></pre>

<p>The <code>.readrun/</code> folder lives inside your content directory. All subdirs are optional — only create what you need.</p>

<h2>Block Syntax</h2>
<h3>Executable Python</h3>
<pre><code>:::python
import pandas as pd
df = pd.read_csv("data.csv")
print(df.head())
:::</code></pre>

<h3>JSX Components</h3>
<pre><code>:::jsx
function Counter() {
  const [n, setN] = React.useState(0);
  return &lt;button onClick={() => setN(n+1)}&gt;Clicked {n} times&lt;/button&gt;;
}
render(&lt;Counter /&gt;);
:::</code></pre>

<h3>File References</h3>
<pre><code>:::plot.py</code></pre>
<p>Loads <code>.readrun/scripts/plot.py</code> and makes it runnable. Images work the same way:</p>
<pre><code>:::diagram.svg</code></pre>
<p>Loads <code>.readrun/images/diagram.svg</code> and renders it inline.</p>

<h3>Upload Buttons</h3>
<pre><code>:::upload "Upload CSV" accept=.csv rename=data.csv</code></pre>

<h3>Hidden Blocks</h3>
<pre><code>:::python hidden
# This code is collapsed by default
print("click Show to reveal")
:::</code></pre>

<h2>Commands</h2>
<table>
  <tr><th>Command</th><th>What it does</th></tr>
  <tr><td>rr</td><td>Open browser dashboard</td></tr>
  <tr><td>rr &lt;folder|file.md&gt;</td><td>Serve a folder or file</td></tr>
  <tr><td>rr build &lt;folder&gt;</td><td>Build static site for deployment</td></tr>
  <tr><td>rr init [folder]</td><td>Scaffold .readrun/ structure</td></tr>
  <tr><td>rr validate [folder]</td><td>Validate content and structure</td></tr>
  <tr><td>rr update</td><td>Update dependencies</td></tr>
  <tr><td>rr guide</td><td>Show this guide</td></tr>
  <tr><td>rr help</td><td>Print command reference</td></tr>
</table>

<h2>.ignore Patterns</h2>
<p>Create <code>.readrun/.ignore</code> to exclude files and folders from navigation. One glob pattern per line:</p>
<pre><code>drafts/
*.tmp
private-notes.md</code></pre>
</body>
</html>`;
}
