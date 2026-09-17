path = "build.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CATEGORY_ORDER globally
old_cat_order = """CATEGORY_ORDER = [
    "Documents & PDF",
    "Media & Video",
    "Security & System",
    "Utilities"
]"""
new_cat_order = """CATEGORY_ORDER = [
    "Documents & PDF",
    "Media & Video",
    "Security & System",
    "Data & Analytics",
    "Utilities"
]"""
content = content.replace(old_cat_order, new_cat_order)

# 2. Update the main grid sorting logic
old_grid_logic = """    categories = []
    # Collect unique categories, maintaining a stable order based on tools.json appearance
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories:
            categories.append(cat)"""
new_grid_logic = """    categories_raw = []
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories_raw:
            categories_raw.append(cat)
            
    categories = [c for c in CATEGORY_ORDER if c in categories_raw]
    for c in categories_raw:
        if c not in categories:
            categories.append(c)"""
content = content.replace(old_grid_logic, new_grid_logic)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated build.py category logic.")
