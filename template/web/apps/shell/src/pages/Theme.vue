<template>
  <EPage id="theme" default-focus="theme-back" class="page theme">
    <EColumn :gap="28" class="theme-body">
      <ERow id="theme-nav" :gap="16">
        <EButton focus-key="theme-back" label="返回" size="sm" @enter="goBack" />
      </ERow>

      <EText text="1. 全局：改 src/theme.css 的 :root 变量" :font-size="22" color="#9ab" />
      <ERow id="theme-global" :gap="16">
        <EButton focus-key="theme-g1" label="默认焦点" @enter="noop" />
        <EButton focus-key="theme-g2" label="再按一下" @enter="noop" />
      </ERow>

      <EText text="2. 这一行用描边预设（tv-focus-effect-ring）" :font-size="22" color="#9ab" />
      <ERow id="theme-ring" class="tv-focus-effect-ring" :gap="16">
        <EButton focus-key="theme-r1" label="描边 A" @enter="noop" />
        <EButton focus-key="theme-r2" label="描边 B" @enter="noop" />
      </ERow>

      <EText text="3. 单实例 focus-class=my-gold（见 theme.css）" :font-size="22" color="#9ab" />
      <ERow id="theme-one" :gap="16">
        <EButton focus-key="theme-gold" focus-class="my-gold" label="金色框" @enter="noop" />
        <EButton focus-key="theme-plain" label="默认框" @enter="noop" />
      </ERow>

      <EText text="4. EFocusable 自绘焦点" :font-size="22" color="#9ab" />
      <ERow id="theme-custom" class="tv-focus-effect-none" :gap="16">
        <EFocusable focus-key="theme-c1" class="poster-wrap" v-slot="{ focused }" @enter="noop">
          <div class="poster" :class="{ hot: focused }">自绘块</div>
        </EFocusable>
        <EFocusable focus-key="theme-c2" class="poster-wrap" v-slot="{ focused }" @enter="noop">
          <div class="poster" :class="{ hot: focused }">再一块</div>
        </EFocusable>
      </ERow>
    </EColumn>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EColumn, ERow, EButton, EText, EFocusable } from '@chancestv/tv-ui'

const router = useRouter()
const goBack = () => router.push({ name: 'Examples' })
const noop = () => {}
</script>

<style scoped>
.theme-body { padding: 32px 48px; }
:deep(.poster-wrap) { display: block; line-height: 0; }
.poster {
  width: 200px;
  height: 120px;
  background: #1e293b;
  color: #e4e4e7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.poster.hot {
  box-shadow: inset 0 0 0 4px #ff7a18;
}
</style>
