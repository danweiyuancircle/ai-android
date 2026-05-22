import { getConfig } from "@/utils/config";
import { replaceImageFields } from "@/utils/image";

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  token?: string;
}

/**
 * 封装的请求方法
 */
export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {
    
  }
): Promise<T> {
  const config = getConfig();
  const { params, token, ...fetchOptions } = options;

  // 构建URL
  let url = `${endpoint}`;

  // 添加查询参数
  if (params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        continue;
      }
      const value = params[key];
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // 设置默认headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "token": config.accessToken,
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // 自动替换响应数据中的图片URL域名
    // 递归处理所有图片字段，使用配置中的 imageDomainMapping 进行域名映射
    return replaceImageFields(data) as T;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
}

/**
 * GET 请求
 */
export function get<T = any>(
  endpoint: string,
  params?: Record<string, any>,
  options?: { token?: string; headers?: HeadersInit }
): Promise<T> {
  return request<T>(endpoint, {
    method: "GET",
    params,
    token: options?.token,
    headers: options?.headers,
  });
}

/**
 * POST 请求
 */
export function post<T = any>(
  endpoint: string,
  data?: any,
  options?: { token?: string; headers?: HeadersInit }
): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    token: options?.token,
    headers: options?.headers,
  });
}

/**
 * PUT 请求
 */
export function put<T = any>(
  endpoint: string,
  data?: any,
  options?: { token?: string; headers?: HeadersInit }
): Promise<T> {
  return request<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
    token: options?.token,
    headers: options?.headers,
  });
}

/**
 * DELETE 请求
 */
export function del<T = any>(
  endpoint: string,
  options?: { token?: string; headers?: HeadersInit }
): Promise<T> {
  return request<T>(endpoint, {
    method: "DELETE",
    token: options?.token,
    headers: options?.headers,
  });
}
