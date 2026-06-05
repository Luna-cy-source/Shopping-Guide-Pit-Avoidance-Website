"""从 CSV 数据集提取轻量 JSON 摘要，供 Worker API 使用"""
import csv, json
from collections import Counter

BASE = 'c:/Users/王倩/CodeBuddy/20260524182246/data/datasets'

# ========== 1. 产品召回摘要 ==========
hazard_counter = Counter()
man_counter = Counter()
yr_counter = Counter()
total = 0

hazard_map = {
    'fire': '火灾/烧伤', 'burn': '火灾/烧伤',
    'chok': '窒息风险', 'suffoc': '窒息风险',
    'shock': '触电/电击', 'electroc': '触电/电击', 'electric': '触电/电击',
    'lacer': '割伤/划伤', 'cut ': '割伤/划伤',
    'fall': '跌落/翻倒', 'tip ': '跌落/翻倒',
    'injur': '交通事故/撞击', 'crash': '交通事故/撞击', 'collision': '交通事故/撞击',
    'poison': '中毒/化学风险', 'lead': '中毒/化学风险', 'toxi': '中毒/化学风险',
}

with open(f'{BASE}/product_recalls.csv', encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        total += 1
        h = (row.get('Hazard', '') or '').strip().lower()
        m = (row.get('Manufacturer', '') or '').strip()
        d = (row.get('RecallDate', '') or '')[:4]
        
        if m and m != 'Unknown':
            man_counter[m] += 1
        if d.isdigit():
            yr_counter[d] += 1
        if h and h != 'not specified':
            found = False
            for kw, label in hazard_map.items():
                if kw in h:
                    hazard_counter[label] += 1
                    found = True
                    break
            if not found:
                hazard_counter['其他安全风险'] += 1

total_hazards = sum(hazard_counter.values())

recall_summary = {
    'source': 'U.S. CPSC Product Recalls',
    'sourceUrl': 'https://github.com/the-codingschool/datasets',
    'totalRecords': total,
    'summary': '美国消费品安全委员会（CPSC）官方产品召回记录，覆盖家电、家具、玩具、工具等品类。',
    'hazardDistribution': [
        {'name': k, 'count': v, 'pct': round(v / total_hazards * 100, 1)}
        for k, v in hazard_counter.most_common(10)
    ],
    'topManufacturers': [[m, c] for m, c in man_counter.most_common(5)],
    'yearlyTrend': [{'year': y, 'count': c} for y, c in sorted(yr_counter.items())[-5:]],
}

with open(f'{BASE}/recall_summary.json', 'w', encoding='utf-8') as f:
    json.dump(recall_summary, f, ensure_ascii=False, indent=2)
print(f'[Recall] {total} records → recall_summary.json ({total_hazards} hazards categorized)')

# ========== 2. 虚假评论摘要 ==========
deceptive = truthful = 0
p_deceptive = n_deceptive = p_truthful = n_truthful = 0

with open(f'{BASE}/deceptive_reviews.csv', encoding='utf-8', errors='replace') as f:
    for row in csv.DictReader(f):
        is_fake = row.get('deceptive', '') == 'deceptive'
        pos = row.get('polarity', '') == 'positive'
        if is_fake:
            deceptive += 1
            if pos: p_deceptive += 1
            else: n_deceptive += 1
        else:
            truthful += 1
            if pos: p_truthful += 1
            else: n_truthful += 1

review_summary = {
    'source': 'Deceptive Opinion Spam Corpus',
    'sourceUrl': 'https://github.com/chotipy/Deceptive-Opinion-Spam',
    'totalRecords': deceptive + truthful,
    'description': 'TripAdvisor 酒店评论经专家人工标注真伪的黄金标准语料库。',
    'fakeVsReal': {
        'fake': {'count': deceptive, 'pct': round(deceptive / (deceptive + truthful) * 100, 1)},
        'real': {'count': truthful, 'pct': round(truthful / (deceptive + truthful) * 100, 1)},
    },
    'polarityBreakdown': {
        'fake': {'positive': p_deceptive, 'negative': n_deceptive},
        'real': {'positive': p_truthful, 'negative': n_truthful},
    },
    'keyInsight': '虚假评论中正面评价偏多，说明虚假评论常用于"刷好评"。AI 分析商品时可参考此模式识别可疑评价。',
}

with open(f'{BASE}/review_summary.json', 'w', encoding='utf-8') as f:
    json.dump(review_summary, f, ensure_ascii=False, indent=2)
print(f'[Reviews] {deceptive + truthful} records → review_summary.json (fake={deceptive}, real={truthful})')

print('\n[Done] All summaries generated!')
