import sys, json
d = json.load(sys.stdin)
print("Keys:", list(d.keys()))
for k, v in d.items():
    if isinstance(v, list):
        print(f"{k}: list[{len(v)}]")
        if v and isinstance(v[0], dict):
            print(f"  first item: {json.dumps(v[0], ensure_ascii=False)[:200]}")
    elif isinstance(v, str):
        print(f"{k}: {v[:200]}")
    else:
        print(f"{k}: {repr(v)[:200]}")
