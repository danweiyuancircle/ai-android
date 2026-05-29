# 可聚焦元素 Recipes

来源：`template/h5-vue/apps/shell/src/pages/Perf.vue`（真实迁移后代码）

---

## 1. 横向卡片墙

```vue
<ERow id="row1">
  <ECard
    v-for="item in items"
    :key="item.id"
    :focus-key="`card-${item.id}`"
    :title="item.title"
    :image="item.poster"
    :width="200"
  />
</ERow>
```

`ERow` 内子项自动横向空间导航，`id` 支持区域间焦点记忆。

---

## 2. 纵向无限列表（行内嵌水平卡片墙）

```vue
<EVirtualList
  section-id="rows-list"
  :items="rows"
  :item-size="220"
  :visible-count="3"
  :item-key="'id'"
  focus-key-prefix="row"
>
  <template #default="{ item: row, index: rowIdx }">
    <EHRow
      :section-id="`row-${rowIdx}`"
      :items="row.cards"
      :item-size="216"
      :visible-count="4"
      :item-key="'id'"
      :focus-key-prefix="`card-${rowIdx}`"
    >
      <template #default="{ item: card, focusKey }">
        <ECard
          :focus-key="focusKey"
          :title="card.title"
          :image="card.poster"
          :width="200"
        />
      </template>
    </EHRow>
  </template>
</EVirtualList>
```

> `EVirtualList` / `EHRow` 目前用 `section-id` prop（非 `id`）标识焦点 section，`focus-key-prefix` 自动生成子项 `focus-key`。

---

## 3. 锁焦区（菜单 / Tab 栏）

```vue
<EFocusGroup id="perf-menu" restrict="self-only" tag="div">
  <EButton
    v-for="cat in categories"
    :key="cat.id"
    :focus-key="`cat-${cat.id}`"
    :label="cat.name"
    @enter="selectedId = cat.id"
  />
</EFocusGroup>
```

`restrict="self-only"` 使焦点不会离开该容器（方向键到边界时停住）。

---

## 4. 自定义焦点项

场景：业务自画 UI（海报、自定义卡片等），需要参与焦点导航和高亮联动。

```vue
<EFocusable
  focus-key="poster-1"
  v-slot="{ focused }"
  @enter="handleSelect"
>
  <div
    class="my-poster"
    :class="{ 'my-poster--focused': focused }"
  >
    <!-- 自定义内容 -->
    <img :src="item.poster" />
    <span>{{ item.title }}</span>
  </div>
</EFocusable>
```

- `focused` slot prop：当前项是否获焦，用于控制高亮样式。
- `@enter`：OK 键事件，**不用** `@click`（遥控器不触发 click）。
- `focus-key` 必填，用于焦点记忆 / 调试 / 测试定位。
