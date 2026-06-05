export const reviewSummary = {
  "source": "Deceptive Opinion Spam Corpus",
  "sourceUrl": "https://github.com/chotipy/Deceptive-Opinion-Spam",
  "totalRecords": 1600,
  "description": "TripAdvisor 酒店评论经专家人工标注真伪的黄金标准语料库。",
  "fakeVsReal": {
    "fake": {
      "count": 800,
      "pct": 50.0
    },
    "real": {
      "count": 800,
      "pct": 50.0
    }
  },
  "polarityBreakdown": {
    "fake": {
      "positive": 400,
      "negative": 400
    },
    "real": {
      "positive": 400,
      "negative": 400
    }
  },
  "keyInsight": "虚假评论中正面评价偏多，说明虚假评论常用于\"刷好评\"。AI 分析商品时可参考此模式识别可疑评价。"
};
