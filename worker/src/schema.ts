import { z } from "zod";

// ============================================
// 坑点条目 Schema（可复用）
// ============================================
export const FlawSchema = z.object({
  title: z.string().describe("坑点的简短标题"),
  quote: z.string().describe("引用原文或来源中对应该坑点的描述"),
  analysis: z.string().describe("对该坑点的深度分析说明"),
});

export type Flaw = z.infer<typeof FlawSchema>;

// ============================================
// 替代品条目 Schema
// ============================================
export const AlternativeSchema = z.object({
  productName: z.string().describe("替代商品名称"),
  price: z.string().describe("价格范围/描述"),
  advantage: z.string().describe("相比原品的主要优势"),
});

export type Alternative = z.infer<typeof AlternativeSchema>;

// ============================================
// 选品诊所 — 推荐条目 Schema
// ============================================
export const ClinicRecommendationSchema = z.object({
  productName: z.string().describe("推荐的商品名称"),
  reason: z.string().describe("推荐该商品的核心理由"),
  compromise: z.string().describe("该商品的核心妥协点/坑点，必须直言不讳。如果确实找不到明显坑点，填'无明显短板，但…'并指出相对竞品可改进处"),
  priceRange: z.string().describe("价格区间描述，如'¥2000-3000'"),
  score: z.number().min(0).max(10).describe("综合评分 0-10"),
});

export type ClinicRecommendation = z.infer<typeof ClinicRecommendationSchema>;

// ============================================
// 二手防坑 — 骗局话术拆解条目 Schema
// ============================================
export const ScamRoutineSchema = z.object({
  title: z.string().describe("骗局话术的简短名称"),
  routine: z.string().describe("骗子常见话术/套路完整拆解，按时间线或步骤叙述"),
  counterMeasure: z.string().describe("应对措施：如何识破该骗局、具体操作建议"),
});

export type ScamRoutine = z.infer<typeof ScamRoutineSchema>;

// ============================================
// 二手防坑 — 验机清单步骤 Schema
// ============================================
export const InspectionItemSchema = z.object({
  step: z.string().describe("验机步骤名称，如'外观检查'、'屏幕检测'、'电池健康度'"),
  detail: z.string().describe("该步骤的具体操作说明，保姆级粒度，面向非专业用户"),
});

export type InspectionItem = z.infer<typeof InspectionItemSchema>;

// ============================================
// 全网参考价条目 Schema
// ============================================
export const PriceReferenceSchema = z.object({
  platform: z.enum(["京东", "淘宝", "拼多多", "抖音", "苏宁"]).describe("电商平台名称"),
  price: z.number().min(0).describe("该平台的常态活动价（元），基于知识库估算"),
  url: z.string().url().optional().describe("参考链接（如有）"),
});

export type PriceReference = z.infer<typeof PriceReferenceSchema>;

// ============================================
// 数据溯源 Schema
// ============================================
export const SourceStatsSchema = z.object({
  sampleSize: z.number().min(1).max(99999).describe("估算的参考评价总数"),
  platforms: z.array(z.string()).min(1).max(6).describe("数据来源平台列表，如 ['京东', '小红书', 'B站', '什么值得买']"),
});

export type SourceStats = z.infer<typeof SourceStatsSchema>;

// ============================================
// 参数透视条目 Schema
// ============================================
export const SpecsCheckSchema = z.object({
  specName: z.string().min(1).max(60).describe("参数名称，如 '电池容量'、'屏幕刷新率'、'材质'"),
  officialClaim: z.string().min(1).max(200).describe("厂商官方宣称的规格/宣传语"),
  truth: z.string().min(1).max(300).describe("真实情况或其中的猫腻/水分"),
});

export type SpecsCheck = z.infer<typeof SpecsCheckSchema>;

// ============================================
// 大模型输出 Schema（discriminated union by intent）
// ============================================
export const LLMResponseSchema = z.discriminatedUnion("intent", [
  // ---- 分支 1：具体商品分析 ----
  z.object({
    intent: z.literal("product"),
    productName: z.string().describe("商品名称"),
    score: z.number().min(0).max(10).describe("综合评分 0-10"),
    priceAnalysis: z.string().describe("价格分析，含性价比评估"),
    priceReference: z
      .array(PriceReferenceSchema)
      .min(0)
      .max(4)
      .optional()
      .describe("各电商平台的全网参考底价（基于知识库估算常态活动价）"),
    sourceStats: z
      .object({
        sampleSize: z.number().min(1).max(99999).describe("估算的参考评价总数"),
        platforms: z.array(z.string()).min(1).max(6).describe("数据来源平台列表"),
      })
      .optional()
      .describe("数据溯源信息，说明分析所用参考数据的来源和规模"),
    specsCheck: z
      .array(
        z.object({
          specName: z.string().min(1).max(60).describe("参数名称"),
          officialClaim: z.string().min(1).max(200).describe("厂商宣称"),
          truth: z.string().min(1).max(300).describe("真实情况/猫腻"),
        })
      )
      .min(0)
      .max(8)
      .optional()
      .describe("参数透视：对比厂商宣称 vs 真实情况，揭露参数猫腻"),
    imageUrl: z
      .string()
      .describe(
        "该商品的白底主图（或官方渲染图）直链，用于前端产品卡片展示。" +
          "优先选择白底/透明背景的高清产品渲染图。若训练数据中无法找到有效直链，填空字符串 ''",
      ),
    productImage: z
      .object({
        url: z
          .string()
          .describe(
            "产品图片链接。有效图填 https:// 开头直链；知识库完全无法匹配时填字面量字符串 'null'；" +
              "代理抓取失败时填 'fallback'。禁止编造无效链接或通用占位链接。",
          ),
        alt: z
          .string()
          .min(1)
          .max(100)
          .describe(
            "图片替代文本，描述图片内容。url 为 'null' 时填对该商品外观的文字描述，如 'iPhone 17 Pro Max 沙漠金白底渲染图'",
          ),
      })
      .optional()
      .describe("该商品的高清产品图片信息（兼容旧字段）"),
    productVariants: z
      .array(
        z.object({
          variant_name: z
            .string()
            .min(1)
            .max(30)
            .describe(
              "SKU 配置维度名称，如 '机身套装'、'遥控器'、'存储容量'、'内存'、'颜色'、" +
                "'制式/频段'、'处理器'。禁止笼统写 '型号'、'配置' 等空泛词，必须具体到可购买的 SKU 维度",
            ),
          variant_value: z
            .string()
            .min(1)
            .max(120)
            .describe(
              "该 SKU 维度的具体值，如 '畅飞续航包 (三电)'、'RC 2 带屏遥控器'、" +
                "'256GB (NVMe)'、'16GB LPDDR5'、'星空黑'。" +
                "若训练数据无法确认，填 '标准配置' 或 '未明确'，禁止编造",
            ),
        })
      )
      .min(1)
      .max(10)
      .optional()
      .describe("该商品的精确 SKU 级配置拆解（兼容旧字段）。必须深入 SKU 粒度，禁止笼统概述"),
    skus: z
      .array(
        z.object({
          name: z.string().min(1).max(80).describe("SKU 型号名称，如 '128GB 标准版'、'畅飞套装 (三电)'、'16+512GB 顶配'"),
          priceStr: z.string().min(1).max(40).describe("该 SKU 的参考价格描述，如 '¥6999 (补贴后)'、'约¥8999'"),
          specs: z.string().min(1).max(200).describe("该 SKU 的核心参数摘要，如 'A18 Pro + 128GB + 8GB RAM'"),
          specificFlaw: z
            .string()
            .max(300)
            .optional()
            .describe(
              "该 SKU 特有的坑点或差异。例如：128GB 版存储不够用、基础版无避障传感器、" +
                "标准遥控器非带屏版需另购等。若该 SKU 无特有坑点，可省略此字段",
            ),
        }),
      )
      .min(1)
      .max(8)
      .optional()
      .describe(
        "该商品的可选 SKU/配置列表（新版交互字段）。每个 SKU 必须是独立可购买的完整商品型号，" +
          "必须包含参考价格和核心参数。必须拆解至少两个常见配置版本",
      ),
    visData: z
      .object({
        flawRadar: z
          .record(z.string(), z.number().min(0).max(10))
          .optional()
          .describe(
            "槽点分布雷达图数据。键为维度名称（如 '续航拉胯'、'散热问题'、'做工瑕疵'、" +
              "'参数虚标'、'溢价噱头'、'售后坑爹'、'品控不稳'），值为 0-10 的分数。" +
              "分数越高代表该维度问题越严重。必须生成 5-7 个维度",
          ),
      })
      .optional()
      .describe("可视化数据：供前端图表组件使用的结构化数据"),
    flaws: z.array(FlawSchema).min(1).describe("该商品的核心坑点列表"),
    alternatives: z
      .array(AlternativeSchema)
      .min(0)
      .describe("推荐的替代商品列表"),
  }),

  // ---- 分支 2：品类概览分析 ----
  z.object({
    intent: z.literal("category"),
    categoryName: z.string().describe("品类名称"),
    overview: z.string().describe("品类市场概览与选购建议"),
    comparisons: z.array(
      z.object({
        productName: z.string().describe("对比商品名称"),
        priceRange: z.string().describe("价格区间"),
        mainFlaw: z.string().describe("该商品的主要坑点"),
        score: z.number().min(0).max(10).describe("评分 0-10"),
      })
    ).min(1).describe("品类下多个商品的横向对比"),
  }),

  // ---- 分支 3：AI 选品推荐 ----
  z.object({
    intent: z.literal("recommend"),
    userProfile: z.string().describe("从用户自然语言需求中提取的用户画像摘要，简要总结用户的预算、场景、偏好等关键信息"),
    recommendations: z.array(ClinicRecommendationSchema).min(1).max(6).describe("根据用户需求反向推荐的商品列表，每个商品必须包含推荐理由和核心妥协点"),
  }),

  // ---- 分支 4：二手防坑鉴定 ----
  z.object({
    intent: z.literal("used_market"),
    productName: z.string().describe("被鉴定的二手商品名称，即用户在淘的二手型号"),
    riskLevel: z.enum(["极高", "中等", "低"]).describe("该二手商品交易的整体风险等级"),
    riskSummary: z.string().describe("风险概览总结，用一段话简洁概括该商品在二手市场中最需要警惕的核心风险"),
    scamRoutines: z.array(ScamRoutineSchema).min(1).max(10).describe("该商品在二手交易中常见的骗局话术拆解列表"),
    inspectionChecklist: z.array(InspectionItemSchema).min(3).max(25).describe("验机步骤清单，按线下验机顺序排列，每条均为可勾选的检查项"),
  }),

  // ---- 分支 5：1v1 深度对比 ----
  z.object({
    intent: z.literal("compare"),
    productA: z.object({
      productName: z.string().describe("商品 A 的名称"),
      imageUrl: z.string().optional().describe("商品 A 的白底主图直链，无有效链接时填空字符串"),
      score: z.number().min(0).max(10).describe("商品 A 的综合评分"),
      priceRange: z.string().describe("商品 A 的价格区间"),
      bestFor: z.string().describe("商品 A 最适合的用户画像/使用场景"),
      strengths: z.array(z.string()).min(1).max(5).describe("商品 A 的核心优势列表"),
      weaknesses: z.array(z.string()).min(1).max(5).describe("商品 A 的核心槽点列表"),
    }).describe("对比对象 A"),
    productB: z.object({
      productName: z.string().describe("商品 B 的名称"),
      imageUrl: z.string().optional().describe("商品 B 的白底主图直链，无有效链接时填空字符串"),
      score: z.number().min(0).max(10).describe("商品 B 的综合评分"),
      priceRange: z.string().describe("商品 B 的价格区间"),
      bestFor: z.string().describe("商品 B 最适合的用户画像/使用场景"),
      strengths: z.array(z.string()).min(1).max(5).describe("商品 B 的核心优势列表"),
      weaknesses: z.array(z.string()).min(1).max(5).describe("商品 B 的核心槽点列表"),
    }).describe("对比对象 B"),
    comparisonTable: z.array(z.object({
      dimension: z.string().describe("对比维度名称，如'性价比'、'做工质感'、'售后口碑'"),
      resultA: z.string().describe("商品 A 在该维度的表现"),
      resultB: z.string().describe("商品 B 在该维度的表现"),
      winner: z.enum(["A", "B", "tie"]).optional().describe("该维度的胜出方"),
    })).min(3).max(10).describe("逐维度逐项对比表格"),
    verdict: z.string().describe("综合对比结论：一句话总结两款商品的胜负关系和推荐建议"),
    winner: z.enum(["A", "B", "tie"]).describe("最终推荐：A 指左框商品, B 指右框商品, tie 表示打成平手"),
  }),
]);

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ============================================
// 前端请求 Schema
// ============================================
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(2000).describe("用户搜索关键词"),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// ============================================
// 反馈请求 Schema
// ============================================
export const FeedbackRequestSchema = z.object({
  query: z.string().min(1).max(200),
  flawTitle: z.string().min(1).max(100),
  vote: z.union([z.literal(-1), z.literal(0), z.literal(1)]).describe("投票: -1 踩, 0 中立, 1 赞"),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// ============================================
// 缓存记录 Schema（匹配 D1 search_cache 表）
// ============================================
export const CacheRecordSchema = z.object({
  queryHash: z.string(),
  responseJson: z.string(),
  createdAt: z.string(),
});

export type CacheRecord = z.infer<typeof CacheRecordSchema>;

// ============================================
// 避坑线索提交 Schema
// ============================================
export const PitSubmissionSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  productName: z.string().min(1, '商品名不能为空').max(200),
  pitTitle: z.string().min(1, '坑点标题不能为空').max(100, '标题最多100字'),
  description: z.string().min(1, '描述不能为空').max(2000, '描述最多2000字'),
});

export type PitSubmission = z.infer<typeof PitSubmissionSchema>;

// ============================================
// 排雷曝光台 — 提交 Schema
// ============================================
export const ExposeSubmissionSchema = z.object({
  userId: z.string().min(1, '用户ID不能为空'),
  productName: z.string().min(1, '商品名不能为空').max(200),
  pitTitle: z.string().min(1, '坑点标题不能为空').max(100, '标题最多100字'),
  description: z.string().max(2000).optional(),
});

export type ExposeSubmission = z.infer<typeof ExposeSubmissionSchema>;

// ============================================
// 排雷曝光台 — 前台列表条目
// ============================================
export const ExposePostSchema = z.object({
  id: z.number(),
  productName: z.string(),
  pitTitle: z.string(),
  description: z.string().nullable().optional(),
  voteCount: z.number(),
  createdAt: z.number(),
  status: z.enum(['pending', 'verified', 'rejected']),
});

export type ExposePost = z.infer<typeof ExposePostSchema>;
