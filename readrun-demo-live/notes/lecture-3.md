# Data Visualization

Building on [Functions](./lecture-2.md), this page shows how live mode lets you work with **files on your computer** and generate plots with matplotlib.

## The data

There's a CSV file at `.readrun/files/sales_data.csv` that contains monthly sales data. In live mode, your code runs natively and can read files directly. Let's take a look:

:::python
import csv

with open("sales_data.csv") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"{'Month':<6} {'Revenue':>10} {'Expenses':>10} {'Units':>6}")
print("-" * 36)
for row in rows:
    print(f"{row['month']:<6} ${int(row['revenue']):>9,} ${int(row['expenses']):>9,} {row['units_sold']:>6}")
:::

## Plotting with matplotlib

Since live mode runs real Python, you can use matplotlib to generate charts. Any images created during execution are displayed inline automatically.

:::revenue_chart.py

## Profit trend

Let's compute profit per month and plot the trend:

:::profit_trend.py

## Units sold scatter

One more — a scatter plot comparing units sold to revenue:

:::scatter.py

## Why live mode?

These examples only work in **live mode** (`--live` flag) because they need:

- **File access** — reading `sales_data.csv` from `.readrun/files/`
- **matplotlib** — a native Python library that can't run in the browser
- **Image output** — plots saved as PNG files are automatically detected and displayed

Live mode runs code with [uv](https://docs.astral.sh/uv/), so you don't need to install packages yourself. Imports are auto-detected — `import matplotlib` automatically triggers `uv run --with matplotlib`. No `pip install` needed.

For edge cases where the import name doesn't match the PyPI package (e.g. `import cv2` needs `opencv-python`), you can add [PEP 723](https://peps.python.org/pep-0723/) inline metadata to override auto-detection:

```python
# /// script
# dependencies = ["opencv-python"]
# ///
import cv2
```

Without live mode, code runs via Pyodide in the browser, which doesn't have filesystem access or matplotlib.

## Next

Go back to the [welcome page](../welcome.md) or revisit [Python Basics](./lecture-1.md).
