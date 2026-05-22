
/**
 * 区域类型
 */
export type AreaType = 'banner' | 'grid' | 'list' | 'card' | 'img' | 'menu'

/**
 * 区域内的单个元素
 */
export interface AreaItem {
  /** 元素标题 */
  itemTitle: string
  /** 元素副标题 */
  itemSubTitle: string
  /** 元素图标/图片URL */
  itemIcon: string
  /** 数据链接 */
  dataLink: string
  /** 链接类型 */
  linkType: string
  /** 元素描述（可选） */
  itemDesc?: string
  /** 元素标签（可选） */
  itemTag?: string
  /** 元素类型 */
  itemType?: string
  /** 查询参数 */
  queryParams?: Record<string, any>
}

/**
 * 区域数据配置
 */
export interface AreaData {
  /** 区域编码 */
  areaCode: string
  /** 区域类型 */
  areaType: AreaType
  /** 区域位置和大小 格式: "x,y,width,height" */
  areaRect: string
  /** 区域标题 */
  areaTitle: string
  /** 区域图标 */
  areaIcon: string
  /** 数据链接 */
  dataLink: string
  /** 默认选中项索引 */
  defaultItem: number
  /** 右侧焦点目标区域 */
  nextFocusRight: string
  /** 左侧焦点目标区域 */
  nextFocusLeft: string
  /** 上方焦点目标区域 */
  nextFocusTop: string
  /** 下方焦点目标区域 */
  nextFocusBottom: string
  /** 链接类型 */
  linkType: string
  /** 区域内的元素列表 */
  items: AreaItem[]
}


/**
 * 展示栏目数据
 */
export interface PageData {
  /** 状态码 */
  status: string
  /** 页面标题 */
  title: string
  /** 页面编码 */
  code: string
  /** 背景图片URL */
  background: string
  /** 刷新间隔（分钟） */
  refreshMinute?: string
  /** 区域数据列表 */
  areaDatas: AreaData[]
}

/**
 * 区域位置解析结果
 */
export interface AreaRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 解析区域位置字符串
 * @param rectStr 位置字符串 格式: "x,y,width,height"
 * @returns 解析后的位置对象
 */
export function parseAreaRect(rectStr: string): AreaRect {
  const [x, y, width, height] = rectStr.split(',').map(Number)
  return { x, y, width, height }
}

/**
 * 根据区域编码查找区域数据
 * @param areaDatas 区域数据列表
 * @param areaCode 区域编码
 * @returns 区域数据或 undefined
 */
export function findAreaByCode(areaDatas: AreaData[], areaCode: string): AreaData | undefined {
  return areaDatas.find(area => area.areaCode === areaCode)
}

/**
 * 根据区域类型查找区域数据列表
 * @param areaDatas 区域数据列表
 * @param areaType 区域类型
 * @returns 匹配的区域数据列表
 */
export function findAreasByType(areaDatas: AreaData[], areaType: AreaType): AreaData[] {
  return areaDatas.filter(area => area.areaType === areaType)
}
