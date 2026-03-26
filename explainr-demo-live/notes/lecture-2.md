# Functions

Building on the [Python Basics](./lecture-1.md) lesson, this page covers defining and using functions.

## Defining functions

Functions group reusable logic. The `def` keyword defines one:

:::python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("World"))
print(greet("Alice", "Hey"))
print(greet("Bob", "G'day"))
:::

## Functions with multiple returns

Python functions can return multiple values as tuples:

:::python
def analyse(numbers):
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

data = [23, 45, 12, 67, 34, 89, 11]
lo, hi, avg = analyse(data)

print(f"Data: {data}")
print(f"Min: {lo}, Max: {hi}, Avg: {avg:.1f}")
:::

## List comprehensions

A concise way to transform data — often used instead of loops:

:::python
numbers = range(1, 11)

squares = [n ** 2 for n in numbers]
evens = [n for n in numbers if n % 2 == 0]
labels = [f"{n} is {'even' if n % 2 == 0 else 'odd'}" for n in numbers]

print("Squares:", squares)
print("Evens:", evens)
for label in labels:
    print(f"  {label}")
:::

## Putting it together

Here's a slightly more involved example combining functions, lists, and dictionaries from [the basics](./lecture-1.md):

:::python
def summarise_scores(students):
    for student in students:
        avg = sum(student["scores"]) / len(student["scores"])
        status = "pass" if avg >= 50 else "fail"
        print(f"  {student['name']}: avg {avg:.0f} ({status})")

class_data = [
    {"name": "Alice", "scores": [85, 92, 78]},
    {"name": "Bob", "scores": [45, 52, 38]},
    {"name": "Charlie", "scores": [91, 88, 95]},
    {"name": "Diana", "scores": [60, 42, 55]},
]

print("Class results:")
summarise_scores(class_data)
:::

## That's the demo

You've seen everything explainr can do:

- **Plain Markdown** rendered as a navigable website ([welcome page](../welcome.md))
- **Runnable Python** with inline output ([Python Basics](./lecture-1.md))
- **Links between pages** that work as site navigation
- **Settings** (gear icon, top-right) for font size, width, and sidebar

Next up: [Data Visualization](./lecture-3.md) shows how live mode lets you read files and generate matplotlib plots.

To use explainr with your own notes, see the [getting started tutorial](../tutorials/intro.md).
