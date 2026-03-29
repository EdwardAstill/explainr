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
