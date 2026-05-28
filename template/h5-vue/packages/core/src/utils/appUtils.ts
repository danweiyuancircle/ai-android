/**
 * 是否是dev环境
 */
export function isDev(): boolean {
  return import.meta.env.DEV;
}


/**
 * 是否是test环境
 */
export function isTest(): boolean {
  return import.meta.env.MODE === 'test';
}

/**
 * 是否是prod环境
 */ 
export function isProd(): boolean {
  return import.meta.env.MODE === 'prod';
}
