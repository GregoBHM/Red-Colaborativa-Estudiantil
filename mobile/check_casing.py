import os
import re

def check_imports(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        if 'node_modules' in dirpath or '.expo' in dirpath:
            continue
        for filename in filenames:
            if filename.endswith(('.js', '.jsx', '.ts', '.tsx')):
                file_path = os.path.join(dirpath, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                matches = re.findall(r"(?:import.*from\s+['\"](.*?)['\"]|require\(['\"](.*?)['\"]\))", content)
                imports = [m[0] or m[1] for m in matches if m[0] or m[1]]
                
                for imp in imports:
                    if imp.startswith('.'):
                        imp_parts = imp.split('/')
                        current_dir = dirpath
                        
                        valid = True
                        for part in imp_parts:
                            if part == '.':
                                continue
                            elif part == '..':
                                current_dir = os.path.dirname(current_dir)
                            else:
                                try:
                                    actual_files = os.listdir(current_dir)
                                except FileNotFoundError:
                                    print(f'Directory not found for {imp} in {file_path}')
                                    valid = False
                                    break
                                    
                                found = False
                                for actual in actual_files:
                                    actual_no_ext = os.path.splitext(actual)[0]
                                    if part == actual or part == actual_no_ext:
                                        found = True
                                        current_dir = os.path.join(current_dir, actual)
                                        break
                                        
                                if not found:
                                    print(f'CASE MISMATCH OR MISSING: {imp} in {file_path}. Expected {part} but not found with exact casing.')
                                    valid = False
                                    break

check_imports('.')
