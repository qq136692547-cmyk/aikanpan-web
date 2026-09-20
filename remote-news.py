from pathlib import Path

path = Path("/opt/dsa-mp/server.py")
backup = Path("/opt/dsa-mp/server.py.before-stock-news-zh-20260902")
text = path.read_text()
if not backup.exists():
    backup.write_text(text)

old_sig = "async def _translate_us_news_bg(news: List[Dict[str, Any]]) -> None:"
new_sig = "async def _translate_us_news_bg(news: List[Dict[str, Any]], cache_key: str = \"us-news-zh\") -> None:"
old_cache = "            _cache_set(\"us-news-zh\", result)"
new_cache = "            _cache_set(cache_key, result)"
old_endpoint = '''async def us_stock_news(symbol: str, limit: int = Query(8, ge=1, le=30)):
    items = await us_provider.fetch_news(symbol, limit)
    return {"news": items, "count": len(items)}'''
new_endpoint = '''async def us_stock_news(symbol: str, limit: int = Query(8, ge=1, le=30)):
    items = await us_provider.fetch_news(symbol, limit)
    cache_key = f"us-stock-news-zh:{symbol.upper()}"
    zh_items = _cache_get(cache_key, 1800)
    if zh_items is not None:
        items = zh_items + items[len(zh_items):]
    elif items:
        asyncio.create_task(_translate_us_news_bg(items[:8], cache_key))
    return {"news": items, "count": len(items)}'''

for old, new in [(old_sig, new_sig), (old_cache, new_cache), (old_endpoint, new_endpoint)]:
    if old not in text:
        raise SystemExit(f"Expected text not found: {old[:60]}")
    text = text.replace(old, new, 1)

path.write_text(text)
print(backup)
