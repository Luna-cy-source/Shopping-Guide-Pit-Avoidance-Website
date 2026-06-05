/**
 * 云函数：注册用户
 * 使用 Tencent Cloud API CreateUser 创建用户
 */
const tencentcloud = require('tencentcloud-sdk-nodejs');
const TcbClient = tencentcloud.tcb.v20180608.Client;

exports.main = async (event, context) => {
  const { username, password, nickname } = event;

  if (!username || !password) {
    return { success: false, error: '用户名和密码不能为空' };
  }

  // 用户名格式验证
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,19}$/.test(username)) {
    return { success: false, error: '用户名格式不正确' };
  }

  // 密码复杂度验证（前端已验证，这里做兜底）
  if (password.length < 8 || password.length > 32) {
    return { success: false, error: '密码长度需 8-32 位' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const complexityCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (complexityCount < 3) {
    return { success: false, error: '密码需要包含大写、小写、数字、特殊字符中至少3种' };
  }

  try {
    const client = new TcbClient({
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRETID,
        secretKey: process.env.TENCENTCLOUD_SECRETKEY,
        token: process.env.TENCENTCLOUD_SESSIONTOKEN,
      },
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai',
    });

    const envId = process.env.SCF_NAMESPACE || 'pit-avoidance-d3gx1xj3j622007d9';

    const res = await client.CreateUser({
      EnvId: envId,
      Name: username,
      Password: password,
      NickName: nickname || username,
      UserStatus: 'ACTIVE',
    });

    console.log('[registerUser] 创建成功, UID:', res?.Data?.Uid);

    return {
      success: true,
      uid: res?.Data?.Uid,
      username,
    };
  } catch (e) {
    console.error('[registerUser] 创建失败:', e);
    const msg = String(e?.message || e?.code || '');

    if (/已存在|already|exist|taken|duplicate|DuplicatedData/i.test(msg)) {
      return { success: false, error: '用户名已被注册' };
    }
    if (/password|密码/i.test(msg)) {
      return { success: false, error: '密码不满足要求：8-32位，包含大小写字母、数字、特殊字符中至少3种' };
    }
    return { success: false, error: msg || '注册失败，请重试' };
  }
};
