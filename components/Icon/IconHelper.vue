<template>
  <span class="svg-icon">
    <slot></slot>
  </span>
</template>

<style scoped>
.svg-icon {
  @apply inline-flex;
  @apply self-center;
  @apply relative;
}

.svg-icon >>> svg {
  height: 1em;
  width: 1em;
  stroke: none;
  fill: none;
}

.svg-icon >>> svg.fill {
  @apply fill-current;
}

.svg-icon >>> svg.stroke {
  @apply stroke-current;
  @apply stroke-2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
