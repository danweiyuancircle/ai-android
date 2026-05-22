<template>
  <div class="page-header">
    <img src="/img/ic_back.png" class="back-img">
    <div class="page-title">{{ title }}</div>
    <div class="header-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
}

const props = defineProps<Props>()

</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  padding: 20px 57px;
}


.back-img {
  width: 17px;
  height: 23px;
}

.page-title {
  font-size: 30px;
  font-weight: bold;
  color:#43609A;
  margin-left: 15px;
}

.header-actions {
  margin-left: auto;
  display: flex;
}
</style>
