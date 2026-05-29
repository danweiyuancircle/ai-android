# 弹框 / 抽屉 / Toast 模板

## EDialog

**场景**：需要阻断操作的确认弹框，含标题 + 底部操作按钮。

来源：`template/h5-vue/packages/ui/src/components/ExitDialog.vue`（真实迁移后代码的用法精简版）

```vue
<template>
  <EDialog
    v-model="open"
    title="确认退出？"
    default-focus="confirm-btn"
    :width="420"
    @close="handleClose"
  >
    <template #footer>
      <EButton focus-key="confirm-btn" variant="primary" label="确定" @enter="handleConfirm" />
      <EButton focus-key="cancel-btn" variant="secondary" label="取消" @enter="handleCancel" />
    </template>
  </EDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDialog, EButton } from '@dwy/tv-ui'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm'): void
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => emit('update:modelValue', false)
const handleClose = () => emit('update:modelValue', false)
</script>
```

**关键参数**：
- `default-focus`（必填）：弹框打开时自动聚焦的按钮 `focus-key`，必须在 `#footer` slot 内有对应 `EButton`。
- `close-on-back`（默认 true）：返回键关闭弹框。
- `close-on-mask-click`（默认 true）：点击蒙层关闭。

> 不要自己组合 `FocusLayer` + `watch(modelValue)` + `SpatialNavigation.focus`。用 `EDialog`，焦点捕获/释放已内置。

---

## EDrawer

**场景**：从边缘滑入的侧边面板，用于设置 / 详情展开等。

```vue
<template>
  <EDrawer
    v-model="open"
    default-focus="drawer-close-btn"
    placement="right"
    :size="360"
  >
    <EButton focus-key="drawer-close-btn" label="关闭" @enter="open = false" />
    <!-- 其他内容 -->
  </EDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EDrawer, EButton } from '@dwy/tv-ui'

const open = ref(false)
</script>
```

**关键参数**：
- `placement`：`"left"` / `"right"` / `"top"` / `"bottom"`，默认 `"right"`。
- `size`：抽屉宽度（placement 为 left/right）或高度（top/bottom），单位 px。
- `default-focus`：同 EDialog，必填，指定打开时首个获焦元素。
- 焦点行为与 EDialog 相同：打开时锁焦在抽屉内，关闭后焦点自动归还触发元素。

---

## EToast

**场景**：无交互的短暂提示，不参与焦点。

```vue
<template>
  <EToast v-model:modelValue="showToast" message="操作成功" :duration="2000" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EToast } from '@dwy/tv-ui'

const showToast = ref(false)

// 触发时置为 true
const triggerToast = () => { showToast.value = true }
</script>
```

**关键参数**：
- `message`：提示文本。
- `duration`：自动关闭毫秒数，`0` 表示不自动关闭。
- EToast 不参与焦点系统，显示期间焦点不变。
