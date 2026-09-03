# 焦点配方

每个方向分组一个 section 容器，给稳定 `id`。行内左右走 `ERow`，列内上下走 `EColumn`，嵌套即「行间上下、行内左右」。

## 横向卡片墙

```vue
<ERow id="rail" :gap="20">
  <ECard
    v-for="item in items" :key="item.id"
    :focus-key="`rail-${item.id}`"
    :title="item.title"
    :image="item.cover"
    :width="200"
    @enter="open(item)"
  />
</ERow>
```

## 纵向列表 / 网格（大量项）

```vue
<EVirtual
  section-id="grid" direction="vertical" :cross="4" :items="items"
  :item-width="150" :item-height="90" :main-visible="3" :gap="14"
  focus-key-prefix="cell" v-slot="{ item, focusKey }"
>
  <EFocusable :focus-key="focusKey" v-slot="{ focused }" @enter="open(item)">
    <div class="cell" :class="{ hot: focused }">{{ item.name }}</div>
  </EFocusable>
</EVirtual>
```

横向列表：`direction="horizontal"`，去掉 `cross` 或 `cross=1`。

## 锁焦区（菜单不把焦点漏到旁边）

```vue
<ERow id="tabs" restrict="self-only" :gap="16">
  <EButton v-for="tab in tabs" :key="tab.id"
    :focus-key="`tab-${tab.id}`" :label="tab.label" @enter="select(tab)" />
</ERow>
```

## 自定义可聚焦块

```vue
<EFocusable focus-key="home-poster" v-slot="{ focused }" @enter="play">
  <div class="poster" :class="{ hot: focused }">播放</div>
</EFocusable>
```

不要给裸 `div` 写 `tabindex`。
