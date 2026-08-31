import os
import re

directory = r"e:\ReVault\frontend\src"
# Match the broken string and capture the trailing path (Group 1) and the closing quote (Group 2)
pattern = re.compile(r"\$\{import\.meta\.env\.VITE_API_URL \|\| 'http://localhost:8000'\}(.*?)(['\"\`])")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith((".ts", ".tsx", ".js", ".jsx")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Replace it properly, wrapping the whole thing in backticks
            new_content = pattern.sub(r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}\1`", content)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
