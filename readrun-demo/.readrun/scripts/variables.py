x = 42
name = "Alice"
pi = 3.14159
is_active = True

for var_name, var_val in [("x", x), ("name", name), ("pi", pi), ("is_active", is_active)]:
    print(f"{var_name} = {var_val} ({type(var_val).__name__})")
