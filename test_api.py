import json, urllib.request
base = "http://127.0.0.1:8000/api/v1"

endpoints = [
    "/stocks/sz.300414/events",
    "/stocks/sz.300414/pattern",
    "/stocks/sz.300414/financials",
    "/market/sectors/BK0440/stocks",
]

for ep in endpoints:
    url = base + ep
    print(f"\n=== {ep} ===")
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            if isinstance(data, dict):
                print(f"Keys: {list(data.keys())}")
                for k, v in data.items():
                    if isinstance(v, list):
                        print(f"  {k}: list[{len(v)}]")
                        if v and isinstance(v[0], dict):
                            print(f"    first: {json.dumps(v[0], ensure_ascii=False)[:200]}")
                    elif isinstance(v, dict):
                        print(f"  {k}: dict keys={list(v.keys())[:6]}")
                    else:
                        print(f"  {k}: {repr(v)[:100]}")
            elif isinstance(data, list):
                print(f"List[{len(data)}]")
                if data:
                    print(json.dumps(data[0], ensure_ascii=False)[:200])
    except Exception as e:
        print(f"ERROR: {e}")
