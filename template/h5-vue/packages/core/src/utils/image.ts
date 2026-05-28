import { isDev } from "./appUtils";
import { getConfig } from "../config";

/**
 * 根据后台配置映射规则，动态替换图片URL的路径或域名，适配专网图片代理访问。
 * 
 * 支持的替换逻辑：
 * 1. 路径替换（优先级最高）：优先根据配置中的完整路径（如 "https://mdn.alipayobjects.com"）进行字符串替换。key 按长度从长到短排序，保证优先匹配更具体的路径。
 * 2. 不再支持单纯域名替换，全部依赖路径映射进行处理。即只要 key 命中 imageUrl 中的对应部分（通常为前缀），就会直接替换。
 * 
 * @param imageUrl 待处理的原图片URL
 * @returns 替换后的图片URL，若无配置则返回原始URL，输入为空则返回空字符串
 *
 * @example
 * // 配置: { "https://mdn.alipayobjects.com": "http://192.168.220.127:58095/pic/mdn" }
 * replaceImageUrl('https://mdn.alipayobjects.com/xx/yy.png')
 * // => 'http://192.168.220.127:58095/pic/mdn/xx/yy.png'
 */
export function replaceImageUrl(
  imageUrl: string | null | undefined
): string {
  if (isDev()) {
    return imageUrl || "";
  }
  // 无效输入直接返回空字符串
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }

  // 获取映射配置
  const config = getConfig();
  const imageUrlMapping = config.imageUrlMapping || {};

  // 无映射直接返回原始地址
  if (Object.keys(imageUrlMapping).length === 0) {
    return imageUrl;
  }
  const keys = Object.keys(imageUrlMapping);

  for (const key of keys) {
    if (imageUrl.startsWith(key)) {
      const value = imageUrlMapping[key];
      return imageUrl.replace(key, value);
    }
  }
  return imageUrl;
}

/**
 * 批量替换对象或数组中的图片URL字段，依赖 replaceImageUrl 和配置进行处理。
 * 
 * 递归遍历对象及数组，遇到指定图片 URL 字段则自动调用 replaceImageUrl 替换；其余类型字段保持不变。
 * 
 * @param data 待批量处理的数据（对象或数组）
 * @param imageFields 待替换的图片URL字段名数组，默认为 ["img", "image", ...]
 * @returns 替换后的深拷贝数据（源数据不变）
 *
 * @example
 * // 配置: { "https://xxx.com": "http://192.168.0.1/img" }
 * const data = {
 *   scenicImage: 'https://xxx.com/a.png',
 *   items: [ { img: 'https://xxx.com/b.png' } ]
 * }
 * replaceImageFields(data)
 * // => {
 * //   scenicImage: 'http://192.168.0.1/img/a.png',
 * //   items: [ { img: 'http://192.168.0.1/img/b.png' } ]
 * // }
 */
export function replaceImageFields<T extends Record<string, any> | any[]>(
  data: T,
  imageFields: string[] = [
    "img",
    "image",
    "scenicImage",
    "activityImage",
    "facilityImage",
    "routeImage",
    "imageUrl",
  ]
): T {
  if (isDev()) {
    return data;
  }
  if (!data || (typeof data !== "object" && !Array.isArray(data))) {
    return data;
  }

  // 数组批量递归处理
  if (Array.isArray(data)) {
    return data.map((item) => replaceImageFields(item, imageFields)) as T;
  }

  // 对象递归处理
  const result = { ...data } as Record<string, any>;

  for (const key in result) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) {
      continue;
    }

    const value = result[key];

    // 命中图片字段名且为字符串，替换URL
    if (imageFields.includes(key) && typeof value === "string") {
      result[key] = replaceImageUrl(value);
    }
    // 子对象或数组递归处理
    else if (value && (typeof value === "object" || Array.isArray(value))) {
      result[key] = replaceImageFields(value, imageFields);
    }
  }

  return result as T;
}
