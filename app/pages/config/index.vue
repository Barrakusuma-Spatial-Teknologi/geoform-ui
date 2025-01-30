<script setup lang="ts">
import type { ExportProgress } from "dexie-export-import"
import type { ImportProgress } from "dexie-export-import/dist/import"
import { UseTimeAgo } from "@vueuse/components"
import { supported } from "browser-fs-access"
import { sleep } from "radash"
import { useDbTimeMachine } from "~/composables/project/db-time-machine"
import { tryPersistWithoutPromptingUser } from "~/composables/project/persist-db"
import { useAppConfig } from "~/composables/ui/app-config"
import { useUiBlocker } from "~/composables/ui/blocker"
import "dexie-export-import"

definePageMeta({
  backTo: "/",
})

const cameraStatus = usePermission({
  name: "camera",
})

const geolocationStatus = usePermission({
  name: "geolocation",
})

const persistStatus = usePermission({
  name: "persistent-storage",
})

const toast = useToast()

function showErrorToastPersist() {
  toast.add({
    severity: "warn",
    closable: true,
    group: "bc",
    summary: "Failed to persist data",
    detail: "Browser not supported. Please remember to always submit data, storage may be deleted by the browser without notice",
  })
}

async function tryPersist() {
  const result = await tryPersistWithoutPromptingUser()
  if (result === "prompt") {
    try {
      await Notification.requestPermission()
      const result = await tryPersistWithoutPromptingUser()
      if (result !== "persisted") {
        showErrorToastPersist()
      }
    }
    catch {
      showErrorToastPersist()
    }
  }
}

async function requestGeolocationPermission() {
  if (geolocationStatus.value === "granted") {
    return
  }

  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition((data) => {
        return resolve(data)
      }, (error) => {
        return reject(error)
      })
    })
  }
  catch {
    toast.add({
      severity: "error",
      closable: true,
      group: "bc",
      summary: "Failed to allow geolocation permission",
      detail: "Please change it in your browser",
    })
  }
}

async function requestCameraPermission() {
  if (cameraStatus.value === "granted") {
    return
  }

  try {
    await window.navigator.mediaDevices.getUserMedia({
      video: true,
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      severity: "error",
      closable: true,
      group: "bc",
      summary: "Failed to allow camera permission",
      detail: "Please change it in your browser",
    })
  }
}

const timeMachine = await useDbTimeMachine()
const backupFileLocation = computed(() => {
  return timeMachine.handler.value?.name
})

const blocker = useUiBlocker()
const { config } = storeToRefs(useAppConfig())
const runtimeConfig = useRuntimeConfig()

async function backupToFile() {
  blocker.show("Backing up file...")

  const progessHandler = (progress: ExportProgress) => {
    blocker.setProgress((progress.completedTables / progress.totalTables) * 100)
  }

  try {
    await timeMachine.backup(progessHandler)
    toast.add({
      severity: "success",
      closable: true,
      group: "bc",
      summary: "Successfully backed up file",
      life: 3000,
    })
  }
  catch (error) {
    toast.add({
      severity: "error",
      closable: true,
      group: "bc",
      summary: "Failed to backup file",
      detail: error?.message,
      life: 3000,
    })
  }
  finally {
    await sleep(800)
    blocker.hide()
  }
}

async function restoreFromFile() {
  blocker.show("Restoring ...")

  const progessHandler = (progress: ImportProgress) => {
    blocker.setProgress((progress.completedTables / progress.totalTables) * 100)
  }

  try {
    await timeMachine.restore(progessHandler)
    toast.add({
      severity: "success",
      closable: true,
      group: "bc",
      summary: "Successfully restore file",
      life: 3000,
    })
  }
  catch (error) {
    toast.add({
      severity: "error",
      closable: true,
      group: "bc",
      summary: "Failed to restore file",
      detail: error?.message,
      life: 3000,
    })
  }
  finally {
    await sleep(800)
    blocker.hide()
  }
}

function toggleVconsole() {
  const dom = document.querySelector(".vc-switch")
  if (dom == null) {
    toast.add({
      severity: "error",
      closable: true,
      group: "bc",
      summary: "vConsole instance not included in app",
      detail: error?.message,
      life: 3000,
    })

    return
  }

  const div = dom as HTMLDivElement
  div.style.display = config.value?.devTools?.enabled === true ? "none" : "block"
  if (config.value?.devTools == null) {
    config.value.devTools = { enabled: true }
  }
  else {
    config.value.devTools.enabled = !config.value.devTools.enabled
  }
}
</script>

<template>
  <div class="mt-8 box-border size-full px-2">
    <div class="mb-6">
      <div class="ml-4 text-sm">
        Permission
      </div>
      <div class="box-border rounded-lg bg-surface-200/50 px-4 py-2 dark:bg-surface-800">
        <ul class="permission-list">
          <li>
            <div class="">
              <div>Persistent storage</div>
              <div class="pr-2 text-xs text-surface-500 dark:text-surface-300">
                The data will not be deleted without notice. Supported browser is limited
              </div>
            </div>
            <div @click="tryPersist">
              <Checkbox
                :default-value="persistStatus === 'granted'" binary
                :value="persistStatus === 'granted'"
                readonly
              />
            </div>
          </li>
          <li>
            <div>
              <div>Camera</div>
            </div>
            <div @click="requestCameraPermission">
              <!--              {{ cameraStatus }} -->
              <Checkbox
                :default-value="cameraStatus !== 'denied'"
                :value="cameraStatus !== 'denied'"
                binary
                readonly
              />
            </div>
          </li>
          <li>
            <div>Geolocation</div>

            <div @click="requestGeolocationPermission">
              <!--              {{ geolocationStatus }} -->
              <Checkbox
                :default-value="geolocationStatus !== 'denied'"
                :value="geolocationStatus !== 'denied'"
                binary
                readonly
              />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="mb-6">
      <div class="ml-4 text-sm">
        Backup
      </div>
      <div class="box-border rounded-lg bg-surface-200/50 px-4 py-2 dark:bg-surface-800">
        <TransitionFade>
          <ul v-if="backupFileLocation != null" class="permission-list">
            <li>
              <div class="text-sm">
                <div class="mb-1">
                  Backup location
                </div>
                <div class="-ml-1 text-xs text-surface-300">
                  <InputText
                    class="!text-xs" :value="backupFileLocation" :default-value="backupFileLocation"
                    size="small" readonly
                  />
                </div>
              </div>

              <div @click="requestGeolocationPermission">
                <!--              {{ geolocationStatus }} -->
                <Button text size="small" @click="backupToFile">
                  Change
                </Button>
              </div>
            </li>

            <li>
              <div class="text-sm">
                <div>Continuous backup</div>
                <div class="pr-2 text-xs text-surface-500 dark:text-surface-300">
                  <div class="mb-1">
                    The data will be automatically backed-up on each add new data
                  </div>
                  <div v-if="config.timeMachine?.lastUpdated != null">
                    <UseTimeAgo v-slot="{ timeAgo }" :time="config.timeMachine?.lastUpdated">
                      Last updated {{ timeAgo }}
                    </UseTimeAgo>
                  </div>
                </div>
              </div>

              <div
                @click="() => {
                  timeMachine.toggleContinuous()
                }"
              >
                <!--              {{ geolocationStatus }} -->
                <Checkbox
                  :default-value="config.timeMachine?.isContinuous"
                  :value="config.timeMachine?.isContinuous"
                  binary
                  readonly
                />
              </div>
            </li>

            <li>
              <div>
                <Button
                  fluid size="small" s
                  severity="secondary"
                  variant="outlined"
                  @click="backupToFile"
                >
                  <div class="flex flex-col">
                    <div>Backup now</div>
                    <div class="text-xs">
                      Trigger backup manually
                    </div>
                  </div>
                </Button>
              </div>
            </li>
          </ul>
          <ul v-else class="permission-list">
            <li>
              <div class="text-sm">
                <div>Continuous backup</div>
              </div>

              <div>
                <span v-if="!supported" class="text-red-500">
                  Not Supported
                </span>
                <span v-else class="text-green-500">
                  Supported
                </span>
              </div>
            </li>

            <li>
              <div>
                <Button
                  fluid size="small" s
                  severity="primary"
                  variant="outlined"
                  @click="backupToFile"
                >
                  <div class="flex flex-col">
                    <div>Backup now</div>
                    <div class="text-xs">
                      Also activate Continuous backup if supported by browser
                    </div>
                  </div>
                </Button>
              </div>
            </li>
          </ul>
        </TransitionFade>
      </div>
    </div>

    <div class="mb-8">
      <div class="ml-4 text-sm">
        Restore
      </div>
      <div class="box-border rounded-lg bg-surface-200/50 px-4 py-2 dark:bg-surface-800">
        <ul class="permission-list">
          <li>
            <div>
              <Button fluid size="small" severity="secondary" variant="outlined" @click="restoreFromFile">
                Restore from file
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="Number.parseInt(runtimeConfig.public?.includeVconsole ?? '0') === 1">
      <div class="ml-4 text-sm">
        Devtools
      </div>
      <div class="box-border rounded-lg bg-surface-200/50 px-4 py-2 dark:bg-surface-800">
        <ul class="permission-list">
          <li>
            <div class="">
              <div>vConsole</div>
              <div class="pr-2 text-xs text-surface-500 dark:text-surface-300">
                Display vConsole log to debug console in mobile web browser
              </div>
            </div>
            <div @click="toggleVconsole">
              <Checkbox
                :default-value="config?.devTools?.enabled ?? false" binary
                :value="config?.devTools?.enabled ?? false"
                readonly
              />
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
ul.permission-list > li {
  @apply flex w-full py-2 items-center;
}

ul.permission-list > li > div:last-child {
  @apply grow-0 flex items-center justify-end;
  min-width: 2rem;
}

ul.permission-list > li > div:first-child {
  @apply grow items-center;
}

ul > li:not(:last-child) {
  border-bottom: 1px solid var(--p-surface-300);
}

ul > li:where([class~="dark"], [class~="dark"] *):not(:last-child) {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-700);
}
</style>
