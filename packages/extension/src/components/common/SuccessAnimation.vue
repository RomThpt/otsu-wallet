<script setup lang="ts">
withDefaults(
  defineProps<{
    kind?: 'transaction' | 'wallet' | 'collectible'
    size?: 'compact' | 'hero'
  }>(),
  {
    kind: 'transaction',
    size: 'compact',
  },
)

const sparks = [
  { x: '-38px', y: '-30px', delay: '80ms' },
  { x: '4px', y: '-45px', delay: '120ms' },
  { x: '40px', y: '-22px', delay: '160ms' },
  { x: '39px', y: '28px', delay: '100ms' },
  { x: '-2px', y: '44px', delay: '180ms' },
  { x: '-42px', y: '23px', delay: '140ms' },
]
</script>

<template>
  <div
    class="success-animation"
    :class="`success-animation--${size}`"
    :data-kind="kind"
    data-testid="success-animation"
    aria-hidden="true"
  >
    <span class="success-animation__halo" data-motion="halo" />
    <span class="success-animation__ring" data-motion="ring" />
    <span class="success-animation__particles" data-motion="particles">
      <span
        v-for="(spark, index) in sparks"
        :key="index"
        class="success-animation__spark"
        :style="{
          '--spark-x': spark.x,
          '--spark-y': spark.y,
          '--spark-delay': spark.delay,
        }"
      />
    </span>

    <span class="success-animation__core" data-motion="core">
      <svg
        v-if="kind === 'wallet'"
        class="success-animation__icon success-animation__icon--wallet"
        focusable="false"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 32 32"
      >
        <path
          class="success-animation__draw"
          pathLength="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          d="M7 10.5h17.5a2.5 2.5 0 012.5 2.5v10a2.5 2.5 0 01-2.5 2.5h-17A2.5 2.5 0 015 23V9a2.5 2.5 0 012.5-2.5H23"
        />
        <path
          class="success-animation__draw success-animation__draw--late"
          pathLength="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          d="M18 18l2.2 2.2L25 15.5"
        />
      </svg>

      <svg
        v-else-if="kind === 'collectible'"
        class="success-animation__icon"
        focusable="false"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 32 32"
      >
        <path
          class="success-animation__draw"
          pathLength="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          d="M16 5.5l9 6.2v9.1L16 26.5l-9-5.7v-9.1l9-6.2zm-9 6.2l9 5.7 9-5.7M16 17.4v9.1"
        />
      </svg>

      <svg
        v-else
        class="success-animation__icon"
        focusable="false"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 32 32"
      >
        <path
          class="success-animation__draw"
          pathLength="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.6"
          d="M8.5 16.5l5 5L24 10.5"
        />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.success-animation {
  --success-size: 5.5rem;
  position: relative;
  width: var(--success-size);
  height: var(--success-size);
  margin-inline: auto;
  isolation: isolate;
}

.success-animation--hero {
  --success-size: 7rem;
}

.success-animation__core,
.success-animation__halo,
.success-animation__ring,
.success-animation__spark {
  position: absolute;
  left: 50%;
  top: 50%;
}

.success-animation__particles {
  position: absolute;
  inset: 0;
}

.success-animation__core {
  z-index: 2;
  display: flex;
  width: 64%;
  height: 64%;
  align-items: center;
  justify-content: center;
  border-radius: 1.35rem;
  color: white;
  background: rgb(var(--success));
  box-shadow: 0 12px 28px rgb(var(--success) / 0.24);
  transform: translate(-50%, -50%) scale(0.4) rotate(-8deg);
  animation: success-core-in 680ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.success-animation--hero .success-animation__core {
  border-radius: 1.6rem;
}

.success-animation__halo {
  z-index: 0;
  width: 74%;
  height: 74%;
  border-radius: 50%;
  background: rgb(var(--success) / 0.12);
  transform: translate(-50%, -50%) scale(0.6);
  animation: success-halo-in 760ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.success-animation__ring {
  z-index: 1;
  width: 64%;
  height: 64%;
  border: 1.5px solid rgb(var(--success) / 0.5);
  border-radius: 1.35rem;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
  animation: success-ring-out 720ms 140ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.success-animation__icon {
  width: 50%;
  height: 50%;
}

.success-animation__icon--wallet {
  width: 58%;
  height: 58%;
}

.success-animation__draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: success-draw 480ms 260ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

.success-animation__draw--late {
  animation-delay: 470ms;
}

.success-animation__spark {
  z-index: 3;
  width: 5px;
  height: 5px;
  border-radius: 2px;
  background: rgb(var(--success));
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.2);
  animation: success-spark 620ms var(--spark-delay) cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.success-animation__spark:nth-of-type(even) {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

@keyframes success-core-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4) rotate(-8deg);
  }
  62% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.08) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0);
  }
}

@keyframes success-halo-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes success-ring-out {
  0% {
    opacity: 0.75;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}

@keyframes success-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes success-spark {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }
  28% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .success-animation__core,
  .success-animation__halo,
  .success-animation__ring,
  .success-animation__draw,
  .success-animation__spark {
    animation: none;
  }

  .success-animation__core,
  .success-animation__halo {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  .success-animation__draw {
    stroke-dashoffset: 0;
  }

  .success-animation__ring,
  .success-animation__spark {
    display: none;
  }
}
</style>
