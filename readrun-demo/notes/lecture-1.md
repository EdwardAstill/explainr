# Python Basics

This is a sample lesson with runnable code blocks. Click **Run** on any block to execute it in your browser — no Python installation required.

If you haven't already, check out the [getting started tutorial](../tutorials/intro.md) to learn how readrun works.

## Variables and types

Python figures out types for you. Run the code below to see it in action:

:::variables.py

## Lists

Lists are ordered collections that you can loop through, slice, and modify:

:::python
fruits = ["apple", "banana", "cherry", "date"]

print("All fruits:", fruits)
print("First two:", fruits[:2])
print("Last one:", fruits[-1])

fruits.append("elderberry")
print("After adding one:", fruits)
:::

## Dictionaries

Dictionaries store key-value pairs. They're useful for structured data:

:::python
student = {
    "name": "Bob",
    "grade": 85,
    "subjects": ["maths", "physics"]
}

for key, value in student.items():
    print(f"  {key}: {value}")
:::

## HTML blocks

You can also run HTML — it renders in a sandboxed iframe. This one is loaded from a file:

:::greeting.html

And inline HTML works too:

:::html
<div style="font-family: system-ui; padding: 16px;">
  <p style="color: #1976D2; font-size: 18px; margin: 0;">This HTML was written inline in the markdown.</p>
</div>
:::

## Regular code blocks

Not every code block needs to be runnable. Standard markdown fences display code without a Run button — good for showing commands, pseudocode, or examples you don't want executed:

```python
# This is a regular code block — display only
# Use triple backticks for these
print("You can't run this one")
```

## Next

Continue to [Functions](./lecture-2.md) to learn about defining and using functions.
