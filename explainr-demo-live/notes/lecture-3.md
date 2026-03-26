# Data Visualization

Building on [Functions](./lecture-2.md), this page shows how live mode lets you work with **files on your computer** and generate plots with matplotlib.

## The data

There's a CSV file at `.explainr/files/sales_data.csv` that contains monthly sales data. In live mode, your code runs natively and can read files directly. Let's take a look:

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

:::python
import csv
import matplotlib.pyplot as plt

with open("sales_data.csv") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

months = [r["month"] for r in rows]
revenue = [int(r["revenue"]) for r in rows]
expenses = [int(r["expenses"]) for r in rows]

fig, ax = plt.subplots(figsize=(10, 5))
ax.bar(months, revenue, label="Revenue", color="#4CAF50", alpha=0.85)
ax.bar(months, expenses, label="Expenses", color="#F44336", alpha=0.85)
ax.set_ylabel("Amount ($)")
ax.set_title("Monthly Revenue vs Expenses")
ax.legend()
ax.grid(axis="y", alpha=0.3)
fig.tight_layout()
fig.savefig("revenue_vs_expenses.png", dpi=120)
print("Chart saved!")
:::

## Profit trend

Let's compute profit per month and plot the trend:

:::python
import csv
import matplotlib.pyplot as plt

with open("sales_data.csv") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

months = [r["month"] for r in rows]
profit = [int(r["revenue"]) - int(r["expenses"]) for r in rows]

fig, ax = plt.subplots(figsize=(10, 4))
ax.plot(months, profit, marker="o", linewidth=2, color="#2196F3")
ax.fill_between(months, profit, alpha=0.15, color="#2196F3")
ax.set_ylabel("Profit ($)")
ax.set_title("Monthly Profit Trend")
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig("profit_trend.png", dpi=120)
print("Profit trend saved!")
:::

## Units sold scatter

One more — a scatter plot comparing units sold to revenue:

:::python
import csv
import matplotlib.pyplot as plt

with open("sales_data.csv") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

units = [int(r["units_sold"]) for r in rows]
revenue = [int(r["revenue"]) for r in rows]
months = [r["month"] for r in rows]

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter(units, revenue, s=80, color="#9C27B0", zorder=3)
for i, m in enumerate(months):
    ax.annotate(m, (units[i], revenue[i]), textcoords="offset points", xytext=(6, 6), fontsize=8)
ax.set_xlabel("Units Sold")
ax.set_ylabel("Revenue ($)")
ax.set_title("Units Sold vs Revenue")
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig("units_vs_revenue.png", dpi=120)
print("Scatter plot saved!")
:::

## Why live mode?

These examples only work in **live mode** (`--live` flag) because they need:

- **File access** — reading `sales_data.csv` from `.explainr/files/`
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
