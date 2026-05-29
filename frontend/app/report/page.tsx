import { redirect } from 'next/navigation';

// /report 根路径 → 自动重定向到首页
// 报告页必须有查询参数（/report/[query]），空路径无意义
export default function ReportRootPage() {
  redirect('/');
}
