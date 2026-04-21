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

<p>Blocks use a <code>[name]</code> opener and <code>[/name]</code> closer. Nesting is safe because the closer names the block explicitly — a <code>[jsx]</code> inside an <code>[explain]</code> inside a <code>[question]</code> closes correctly without ambiguity.</p>

<p>Escape a block opener with a backslash: <code>\\[jsx]</code> renders as literal <code>[jsx]</code>. Block syntax inside backtick code fences or inline code is never parsed.</p>

<h3>Executable Python</h3>
<p>Renders a runnable code block with a Run button. Output appears below the block after execution.</p>
<pre><code>[python]
import pandas as pd
df = pd.read_csv("data.csv")
print(df.head())
[/python]</code></pre>

<p>Add <code>hidden</code> to collapse the block by default — the reader clicks Show to reveal the code before running:</p>
<pre><code>[python hidden]
# collapsed by default
print("click Show to reveal")
[/python]</code></pre>

<p>Reference an external file from <code>.readrun/scripts/</code> instead of inlining the code:</p>
<pre><code>[python=scripts/plot.py]
[python=scripts/setup.py hidden]</code></pre>

<h3>JSX Visualisations</h3>
<p>Renders a React component. Auto-renders on page load — there is no Run button, and output shows immediately. Call <code>render()</code> with your root element.</p>
<pre><code>[jsx]
function Counter() {
  const [n, setN] = React.useState(0);
  return &lt;button onClick={() =&gt; setN(n+1)}&gt;Clicked {n} times&lt;/button&gt;;
}
render(&lt;Counter /&gt;);
[/jsx]</code></pre>

<p>Reference an external file from <code>.readrun/scripts/</code>:</p>
<pre><code>[jsx=scripts/chart.jsx]</code></pre>

<h3>File Upload</h3>
<p>Renders a file upload button. Self-closing — no <code>[/upload]</code> closer.</p>
<pre><code>[upload label="Upload CSV" accept=.csv rename=data.csv]
[upload label="Submit files" accept=.pdf multiple]</code></pre>

<p><code>label</code> sets the button text. <code>accept</code> filters the file picker by extension. <code>rename</code> saves the file under a fixed name. <code>multiple</code> allows selecting more than one file.</p>

<h3>Transclusion</h3>
<p>Embeds another markdown file inline at build time. Self-closing.</p>
<pre><code>[include=partials/intro.md]</code></pre>

<h3>Raw / Verbatim</h3>
<p>Displays block syntax literally without executing or interpreting it. Useful for documenting block syntax itself.</p>
<pre><code>[raw]
[jsx]
&lt;Chart /&gt;
[/jsx]
[/raw]</code></pre>

<h3>Quizzes</h3>
<p>A <code>[quiz]</code> block contains one or more <code>[question]</code> blocks, optional <code>[group]</code> blocks, and optional <code>[info]</code> blocks.</p>

<pre><code>[quiz]

[question type=single]
What is the capital of France?

- London
- Paris *
- Berlin

[hint]Think about where the Eiffel Tower is.[/hint]
[explain]Paris is the capital of France.[/explain]
[/question]

[question type=multi]
Which of these are prime numbers?

- 2 *
- 3 *
- 4
- 5 *
[/question]

[question type=truefalse]
The earth orbits the sun.
true *
[/question]

[question type=freetext]
What is 2 + 2?
= 4
[/question]

[group]
Consider the equation x + y = 5, 2x + y = 7.

[question type=freetext]
Solve for x.
= 2
[/question]

[question type=freetext]
Solve for y.
= 3
[/question]
[/group]

[info]
This is a reading page. Use **markdown** freely here.
[/info]

[/quiz]</code></pre>

<p>Question types:</p>
<table>
  <tr><th>Type</th><th>Correct answer syntax</th><th>Description</th></tr>
  <tr><td>single</td><td><code>- Answer *</code></td><td>Exactly one correct option</td></tr>
  <tr><td>multi</td><td><code>- Answer *</code></td><td>One or more correct options, each marked with <code>*</code></td></tr>
  <tr><td>truefalse</td><td><code>true *</code> or <code>false *</code></td><td>Boolean question</td></tr>
  <tr><td>freetext</td><td><code>= answer</code></td><td>Text input matched against the given answer</td></tr>
</table>

<p><code>[hint]...[/hint]</code> shows a hint the reader can reveal. <code>[explain]...[/explain]</code> shows an explanation after the question is answered. <code>[group]</code> wraps related questions under shared context text. <code>[info]</code> renders a non-question reading block — full markdown is supported inside.</p>

<h2>Commands</h2>
<table>
  <tr><th>Command</th><th>What it does</th></tr>
  <tr><td>rr</td><td>Open browser dashboard</td></tr>
  <tr><td>rr &lt;folder|file.md&gt;</td><td>Serve a folder or file</td></tr>
  <tr><td>rr build &lt;folder&gt;</td><td>Build static site for deployment</td></tr>
  <tr><td>rr init [folder]</td><td>Scaffold .readrun/ structure</td></tr>
  <tr><td>rr validate [folder]</td><td>Validate content and structure</td></tr>
  <tr><td>rr migrate [folder]</td><td>Convert ::: block syntax to [block] syntax</td></tr>
  <tr><td>rr update</td><td>Update dependencies</td></tr>
  <tr><td>rr guide</td><td>Show this guide</td></tr>
  <tr><td>rr help</td><td>Print command reference</td></tr>
</table>

<h3>Migration</h3>
<p>Convert old <code>:::</code> block syntax to the new <code>[block]</code> syntax across an entire folder of markdown files:</p>
<pre><code>rr migrate [folder]       # rewrite ::: syntax to [block] syntax in all .md files
rr migrate --dry-run      # preview changes without writing</code></pre>

<h2>.ignore Patterns</h2>
<p>Create <code>.readrun/.ignore</code> to exclude files and folders from navigation. One glob pattern per line:</p>
<pre><code>drafts/
*.tmp
private-notes.md</code></pre>
</body>
</html>`;
}
