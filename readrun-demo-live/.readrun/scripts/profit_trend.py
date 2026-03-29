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
