/**
 * 维护当前所有活跃 FocusSection 的 id 集合。
 * 上游 SpatialNavigation 未暴露 listSections，FocusLayer 进入/离开时需要批量 disable/enable
 * section，依赖此 registry 提供"哪些 section 当前存在"的信息。
 */

const activeSectionIds = new Set<string>()

export function registerSection(id: string): void {
  activeSectionIds.add(id)
}

export function unregisterSection(id: string): void {
  activeSectionIds.delete(id)
}

export function listSections(): string[] {
  const out: string[] = []
  activeSectionIds.forEach((id) => out.push(id))
  return out
}
