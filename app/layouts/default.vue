<template>
  <div class="relative flex size-full flex-col">
    <div class="header box-border flex w-full grow-0 justify-between px-6 py-8">
      <CommonThemeButton />

      <Button severity="secondary" size="small" text>
        <i class="i-[solar--settings-bold] text-2xl" />
      </Button>
    </div>

    <main class="grow basis-0 overflow-y-scroll">
      <slot />
    </main>
  </div>
</template>
