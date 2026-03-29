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
