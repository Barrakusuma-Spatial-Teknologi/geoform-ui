<script setup lang="ts">
import { useAuth } from "~/composables/auth"
import { LayoutTitleKey } from "~/composables/layout"

const route = useRoute()
const definedTitle = ref<string>()
provide(LayoutTitleKey, definedTitle)

const routeTitle = computed(() => {
  if ("title" in route.meta) {
    return route.meta.title
  }

  if (definedTitle.value) {
    return definedTitle.value
  }

  return "GEOFORM"
})

const backToRoute = computed(() => {
  if ("backTo" in route.meta) {
    return route.meta.backTo
  }

  return undefined
})

const configVisible = ref(false)

const auth = useAuth()
async function logout() {
  await useAuth().logout()
  await navigateTo("/login")
}
</script>

<template>
  <div class="relative flex size-full flex-col justify-center">
    <Drawer
      v-model:visible="configVisible" position="right"
      pt:mask:class="backdrop-blur-sm"
    >
      <template #header>
        Configuration
      </template>

      <div class="flex flex-col space-y-2 ">
        <CommonThemeButton show-label />
        <Button
          v-if="auth.isValid"
          severity="secondary"
          @click="() => {
            logout()
          }"
        >
          <i class="i-[solar--logout-2-bold] text-2xl" /> Logout
        </Button>
      </div>
    </Drawer>

    <div class="header box-border flex w-full grow-0 items-center justify-between self-center px-6 py-2 xl:max-w-screen-md">
      <div>
        <slot name="leftHeader">
          <template v-if="backToRoute == null">
            <CommonThemeButton />
          </template>
          <template v-else-if="backToRoute === 'logout'">
            <Button
              severity="secondary" size="small" text @click="() => {
                logout()
              }"
            >
              <i class="i-[solar--logout-2-bold] text-2xl" />
            </Button>
          </template>
          <template v-else>
            <Button
              severity="secondary" size="small" rounded @click="() => {
                navigateTo(backToRoute as string)
              }"
            >
              <i class="i-[solar--alt-arrow-left-line-duotone] text-2xl" />
            </Button>
          </template>
        </slot>
      </div>

      <div>
        <slot name="title">
          <div class="text-lg font-medium ">
            {{ routeTitle }}
          </div>
        </slot>
      </div>

      <Button severity="secondary" size="small" text @click="configVisible = true">
        <i class="i-[solar--settings-bold] text-2xl" />
      </Button>
    </div>

    <main class="w-full grow basis-0 self-center overflow-y-auto xl:max-w-screen-md">
      <slot />
    </main>
  </div>
</template>
