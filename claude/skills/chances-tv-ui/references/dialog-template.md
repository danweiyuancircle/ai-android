# 弹层模板

弹层自动隔离背景焦点、关闭后复焦。`EDialog` / `EDrawer` **必须**给 `default-focus`（打开后落在哪一项，组件不猜）。

不要手写 Teleport + 手动 `focus()`。脚手架里退出确认用工程内 `ExitConfirm`（已是 `EDialog`），不要再引已删除的 `@shell/feature-shared`。

## EDialog

```vue
<EDialog v-model="open" title="提示" default-focus="dlg-ok">
  <EText text="内容" :font-size="22" color="#ddd" />
  <template #footer>
    <EButton focus-key="dlg-ok" variant="primary" label="知道了" @enter="open = false" />
  </template>
</EDialog>
```

## EDrawer

```vue
<EDrawer v-model="open" placement="right" title="菜单" default-focus="drw-close">
  <EText text="抽屉内容" :font-size="22" color="#ddd" />
  <template #footer>
    <EButton focus-key="drw-close" label="关闭" @enter="open = false" />
  </template>
</EDrawer>
```

`placement`：`left` / `right` / `top` / `bottom`。

## EHintDialog / EToast

```vue
<EHintDialog v-model="hint" message="确认删除？" @confirm="hint = false" />
<EToast v-model="toast" message="操作成功" placement="center" :duration="1500" />
```
