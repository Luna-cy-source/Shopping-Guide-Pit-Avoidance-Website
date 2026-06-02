/**
 * embed-knowledge.ts
 *
 * 知识库向量化录入脚本
 *
 * 功能：
 *   1. 读取本地 JSON 数组（如 test-reviews.json）
 *   2. 循环调用 Cloudflare Workers AI REST API 将每条文本生成向量
 *   3. 打印向量及其原始文本 payload，模拟后续批量插入 Vectorize 的流程
 *
 * 使用方式：
 *   npx tsx worker/scripts/embed-knowledge.ts
 *
 * 前置条件：
 *   - Node.js >= 18
 *   - 设置环境变量 CLOUDFLARE_ACCOUNT_ID 和 CLOUDFLARE_API_TOKEN
 *   - 或直接修改脚本中的 accountId / apiToken
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================
// 配置区
// ============================================
const CONFIG = {
  // Cloudflare 账户 ID（从 Dashboard → Workers & Pages → 右侧栏获取）
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'your-cloudflare-account-id',

  // Cloudflare API Token（需具备 Workers AI 权限）
  apiToken: process.env.CLOUDFLARE_API_TOKEN || 'your-cloudflare-api-token',

  // 文本嵌入模型（使用 Cloudflare Workers AI 的 bge-m3 多语言模型）
  embeddingModel: '@cf/baai/bge-m3',

  // 每批处理条数
  batchSize: 10,

  // 请求间隔（毫秒），避免触发限流
  requestDelay: 500,
};

// ============================================
// 类型定义
// ============================================
interface ReviewItem {
  text: string;
  source?: string;
  product?: string;
}

interface EmbeddingResponse {
  result: {
    shape: number[];
    data: number[][];
  };
  success: boolean;
  errors: unknown[];
  messages: unknown[];
}

interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    text: string;
    source?: string;
    product?: string;
    index: number;
  };
}

// ============================================
// 工具函数：延迟
// ============================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 工具函数：生成唯一 ID
// ============================================
function generateId(text: string, index: number): string {
  const hash = Array.from(text)
    .reduce((acc, char) => {
      const h = ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      return h;
    }, 0)
    .toString(16);
  return `review-${index}-${hash}`;
}

// ============================================
// 核心函数：调用 Cloudflare Workers AI 生成向量
// ============================================
async function generateEmbedding(
  text: string,
  model: string,
  accountId: string,
  apiToken: string
): Promise<number[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Workers AI 请求失败 (${response.status}): ${errorBody}`
    );
  }

  const result: EmbeddingResponse = (await response.json()) as EmbeddingResponse;

  if (!result.success || !result.result.data || result.result.data.length === 0) {
    throw new Error(
      `Workers AI 返回异常: ${JSON.stringify(result.errors)}`
    );
  }

  return result.result.data[0];
}

// ============================================
// 核心函数：批量生成向量
// ============================================
async function batchGenerateEmbeddings(
  items: ReviewItem[],
  config: typeof CONFIG
): Promise<VectorRecord[]> {
  const results: VectorRecord[] = [];
  const total = items.length;

  console.log(`\n📊 共 ${total} 条待处理记录，每批 ${config.batchSize} 条\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = `[${i + 1}/${total}]`;

    try {
      console.log(`${progress} 🔄 正在向量化: "${item.text.slice(0, 40)}..."`);

      const vector = await generateEmbedding(
        item.text,
        config.embeddingModel,
        config.accountId,
        config.apiToken
      );

      const record: VectorRecord = {
        id: generateId(item.text, i),
        values: vector,
        metadata: {
          text: item.text,
          source: item.source,
          product: item.product,
          index: i,
        },
      };

      results.push(record);
      console.log(`   ✅ 成功 | 向量维度: ${vector.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ 失败: ${message}`);
      // 失败不阻塞，继续处理下一条
    }

    // 请求间隔，避免限流
    if (i < items.length - 1) {
      await sleep(config.requestDelay);
    }
  }

  return results;
}

// ============================================
// 核心函数：打印 Vectorize 插入 payload
// ============================================
function printVectorizePayload(records: VectorRecord[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Vectorize 批量插入 Payload 预览');
  console.log('='.repeat(60));

  // 模拟 Vectorize upsert 请求格式
  const ndjson = records
    .map((r) =>
      JSON.stringify({
        id: r.id,
        values: r.values.length > 1024
          ? `[<${r.values.length}维向量>...省略]`
          : `[${r.values.slice(0, 5).join(', ')}, ...]`,
        metadata: r.metadata,
      }, null, 2)
    )
    .join('\n---\n');

  console.log(ndjson);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 成功生成 ${records.length} 条向量记录\n`);

  // 打印 cURL 示例
  if (records.length > 0 && CONFIG.accountId !== 'your-cloudflare-account-id') {
    console.log('📡 批量插入 cURL 示例（单条）:\n');
    const first = records[0];
    console.log(
      `curl -X POST \\\n` +
        `  "https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/vectorize/v2/indexes/YOUR_INDEX_NAME/upsert" \\\n` +
        `  -H "Authorization: Bearer ${CONFIG.apiToken.slice(0, 8)}..." \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${JSON.stringify({ id: first.id, values: `[<${first.values.length}维向量>]`, metadata: first.metadata })}'`
    );
  }

  // 打印完整向量数据（仅前3条）
  console.log('\n📦 完整向量数据（前3条，将输出到 embed-results.json）:\n');

  const exportRecords = records.slice(0, 3).map((r) => ({
    id: r.id,
    values_sample: r.values.slice(0, 5).concat(['...']),
    values_dimension: r.values.length,
    metadata: r.metadata,
  }));

  console.log(JSON.stringify(exportRecords, null, 2));
}

// ============================================
// 主函数
// ============================================
async function main() {
  console.log('🚀 AI 避坑导购 - 知识库向量化录入脚本');
  console.log('='.repeat(60));

  // 1. 校验配置
  if (CONFIG.accountId === 'your-cloudflare-account-id') {
    console.warn(
      '\n⚠️  警告: CLOUDFLARE_ACCOUNT_ID 未设置，脚本将以"预览模式"运行。\n' +
        '   请设置环境变量后重新运行:\n' +
        '   export CLOUDFLARE_ACCOUNT_ID=xxx\n' +
        '   export CLOUDFLARE_API_TOKEN=xxx\n'
    );
  }

  // 2. 读取评价数据（优先使用真实数据，不存在时回退到测试数据）
  const realPath = path.resolve(__dirname, 'real-reviews.json');
  const testPath = path.resolve(__dirname, 'test-reviews.json');
  const jsonPath = fs.existsSync(realPath) ? realPath : testPath;

  const isRealData = jsonPath === realPath;
  console.log(`\n📂 读取${isRealData ? '真实' : '测试'}数据文件: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`\n❌ 找不到测试数据文件: ${jsonPath}`);
    console.error('   请确保 test-reviews.json 与脚本在同一目录');
    process.exit(1);
  }

  console.log(`\n📂 读取数据文件: ${jsonPath}`);

  let items: ReviewItem[];
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    items = JSON.parse(raw) as ReviewItem[];

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('JSON 文件内容为空或不是数组');
    }

    console.log(`   共加载 ${items.length} 条记录`);
    items.forEach((item, i) => {
      console.log(
        `   [${i + 1}] ${item.product ?? '未知商品'} | ${item.text.slice(0, 50)}...`
      );
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ JSON 解析失败: ${message}`);
    process.exit(1);
  }

  // 3. 批量生成向量
  const records = await batchGenerateEmbeddings(items, CONFIG);

  // 4. 输出结果
  if (records.length > 0) {
    // 4a. 打印 Vectorize 插入格式预览
    printVectorizePayload(records);

    // 4b. 保存完整结果到文件（供后续批量插入）
    const outputPath = path.resolve(__dirname, 'embed-results.json');
    const exportData = records.map((r) => ({
      id: r.id,
      values: r.values,
      metadata: r.metadata,
    }));
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`💾 完整向量数据已保存到: ${outputPath}`);
    console.log(`   文件大小: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
  } else {
    console.warn('\n⚠️  没有成功生成任何向量记录，请检查网络和 API 配置');
  }

  // 5. 输出后续步骤提示
  console.log('\n' + '='.repeat(60));
  console.log('📌 后续步骤:');
  console.log('   1. 确认向量正确后，可通过 Cloudflare API 批量 upsert 到 Vectorize');
  console.log('   2. 或使用 wrangler CLI: npx wrangler vectorize insert ai-avoid-pit-vector');
  console.log('   3. 验证检索: curl http://localhost:8787/api/search -d \'{"query":"洗地机"}'\'');
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('\n💥 脚本异常退出:', err);
  process.exit(1);
});
