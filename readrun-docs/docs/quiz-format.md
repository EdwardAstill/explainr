# Quiz Format

ReadRun supports two file formats: **Markdown** (`.quiz.md`) and **JSON** (`.quiz`). Markdown is recommended for hand-authored and AI-generated quizzes — no escaping, no index arithmetic, and LaTeX works naturally.

Quiz files go in `.readrun/quizzes/` inside your content directory. Run `rr <dir>` and open the **Quizzes** tab.

All text fields support **Markdown** with **LaTeX math** (`$...$` inline, `$$...$$` display).

---

## Markdown Format (`.quiz.md`)

### Structure

```
---                              ← YAML frontmatter (required)
title: Quiz Title
description: Optional subtitle
---

## [info] Heading                ← info page
:::                              ← extended body block (optional)
Markdown content...
:::

# Section Title                  ← section (groups items in sidebar)

## [single] Question text        ← single-choice question
- Wrong option
- Correct option *               ← trailing * marks the correct answer
- Another wrong option
?> Hint text                     ← hint (shown before answering)
> Explanation text               ← explanation (shown after answering)

## [multi] Question text         ← multiple-choice question
- Wrong
- Correct *                      ← multiple * for multiple correct
- Also correct *

## [truefalse] Statement text    ← true/false question
true *                           ← * marks which value is correct

## [freetext] Question text      ← free-text question
= Expected answer                ← exact-match answer (see "Free-text Answer Spec" below)

## [group] Shared prompt         ← question group
### [truefalse] Sub-question 1   ← sub-questions use ###
true *
### [freetext] Sub-question 2
= Answer
```

### Element Reference

| Element | Syntax |
|---------|--------|
| Frontmatter | `---` / `title:` / `description:` / `---` |
| Section | `# Section Title` |
| Item | `## [type] Text` — type is `single`, `multi`, `truefalse`, `freetext`, `info`, or `group` |
| Group sub-question | `### [type] Text` |
| Extended body | `:::` block after heading (supports code fences inside) |
| Options | `- Option text` (append ` *` for correct) |
| True/false answer | `true *` or `false *` on its own line |
| Free text answer | `= <spec>` — string, number, range, or list (see [Free-text Answer Spec](#free-text-answer-spec)) |
| Hint | `?> hint text` |
| Explanation | `> text` (multiline: each line starts with `> `) |
| Local image | `:::filename.png` on its own line inside a `:::` body block — loads from `.readrun/quizzes/.images/` |

### Free-text Answer Spec

The line following a `[freetext]` heading starts with `=` and then describes what counts as a correct answer. The parser supports four forms plus a bareword fallback for backwards compatibility.

| Form | Syntax | Example | Matches |
|------|--------|---------|---------|
| Bareword string | `= word1 word2 ...` | `= Simple Storage Service` | `"Simple Storage Service"` (case-insensitive by default) |
| Quoted string | `= "text"` | `= "hello world"` | Exact string (use when bareword would be ambiguous) |
| Number | `= N` | `= 3.14` | Exact numeric value (input parsed as number) |
| Range | `= range:<open><min>,<max><close>` | `= range:[0, 1)` | Number in the interval. `[`/`]` = inclusive, `(`/`)` = exclusive. Any combination allowed. |
| List (any-of) | `= [item1, item2, ...]` | `= ["yen", "JPY"]` | Any item matches. Items can be any of the forms above, including nested ranges or quoted strings. |

**Examples:**

```markdown
## [freetext] What does S3 stand for?
= Simple Storage Service

## [freetext] Value of π to 2dp?
= range:[3.13, 3.15]

## [freetext] Currency of Japan (accept code or name)?
= ["yen", "JPY"]

## [freetext] Pi, by numeric tolerance or exact decimal?
= [range:[3.13, 3.15], 3.14159]

## [freetext] Dimensionless ratio strictly between 0 and 1?
= range:(0, 1)
```

**Semantics:**

- **Strings** are compared case-insensitively by default; whitespace is trimmed on both sides.
- **Numbers** are matched by numeric equality after `Number()` parse (`3.14 == 3.140`).
- **Ranges** parse the user's input as a number; non-numeric input is rejected. `[a, b]` accepts both endpoints; `(a, b)` rejects both.
- **Lists** short-circuit: the first matching item wins. Useful for numeric tolerance + alternative phrasings in the same question.
- Bare strings outside `[...]` remain supported so existing `= some answer` lines keep working.

### Extended Body Blocks (`:::`)

For question text that's longer than a heading allows — code snippets, multi-paragraph prompts, etc.:

```markdown
## [single] Consider the following code:
:::
```python
def foo(x):
    return x * 2
```

What does `foo(3)` return?
:::
- 3
- 6 *
- 9
```

The `:::` content is appended to the heading text. Code fences inside are handled correctly.

### Images

**Local image** (file in `.readrun/quizzes/.images/`):

```markdown
:::diagram.png
```

**Web image** (standard Markdown, fetched by the browser):

```markdown
![alt text](https://example.com/image.png)
```

### Markdown and Math

All text fields support Markdown and LaTeX:

- **Inline math:** `$E = mc^2$`
- **Display math:** `$$\int_0^\infty e^{-x}\,dx = 1$$`

**Warning: `$` as currency.** The parser treats `$` as a math delimiter. Write `500 USD` or `US$500` — never bare `$500`. Inside math blocks, use `\text{\textdollar}` not `\$`.

---

## Complete Example

```markdown
---
title: AWS Solutions Architect
description: Practice exam for SAA-C03
---

## [info] AWS Solutions Architect
:::
This quiz covers key topics for the **SAA-C03** exam.

$$C = \sum_{i=1}^{n} r_i \cdot t_i \cdot p_i$$

where $r_i$ is the resource count, $t_i$ is duration in hours, $p_i$ is per-unit price.
:::

# S3 Storage

## [single] Which S3 storage class is cheapest for infrequent access?
- S3 Standard
- S3 Glacier
- S3 Standard-IA
- S3 One Zone-IA *
?> Think about which class trades redundancy for lower cost.
> One Zone-IA is cheapest but lacks multi-AZ redundancy.

## [group] Answer the following questions about S3:

### [truefalse] S3 bucket names must be globally unique.
true *
> Bucket names share a global namespace across all AWS accounts.

### [freetext] What does S3 stand for?
= Simple Storage Service

# Serverless & IAM

## [multi] Which services are serverless? (select all that apply)
- EC2
- Lambda *
- DynamoDB *
- RDS
> Lambda and DynamoDB require no server management.

## [freetext] What does IAM stand for?
= Identity and Access Management
?> Three words: **I**___ **A**___ **M**___
> IAM controls who can do what in your AWS account.
```

---

## AI Generation

Use `/make-quiz` in Claude Code to generate `.quiz.md` files from codebases, notes, PDFs, URLs, or topics. The skill handles source ingestion, question design, and output to `.readrun/quizzes/`.

See the `make-quiz` skill in agentfiles for the full spec, including `.quizspec` recipe files for repeatable quiz generation.
