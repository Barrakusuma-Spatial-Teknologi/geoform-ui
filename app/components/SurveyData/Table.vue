<script setup lang="ts">
import { FilterMatchMode } from "@primevue/core/api"
import SearchField from "~/components/SurveyData/SearchField.vue"
import { type FieldConfig, FieldOptionSearchable, FieldType } from "~/composables/project/model/project"
import { remapFieldValue, useProjectStore } from "~/composables/project/project"
import { type PaginationOption, type ProjectDataQueryOption, useProjectData } from "~/composables/project/project-data"

const props = defineProps<{
  projectId: string
}>()

const emits = defineEmits<{
  edit: [dataId: string, coordinate: [number, number]]
}>()

const isLoadingData = ref(false)
const fields = ref<FieldConfig[]>([])
const allFieldsVisible = ref(false)

const searchableFields = computed(() => fields.value.filter((field) => FieldOptionSearchable.includes(field.type)))
const searchableFieldSelected = ref<number>(0)

const data = ref<Record<string, unknown>[]>([])
const { getById } = useProjectStore()
let projectData!: Awaited<ReturnType<typeof useProjectData>>

const statusOptions: {
  name: string
  value: string
}[] = [
  {
    name: "Submitted",
    value: "Submitted",
  },
  {
    name: "Pending",
    value: "Pending",
  },
]

const totalData = ref(0)
const paginationOpt = reactive<PaginationOption>({
  page: 1,
  perPage: 5,
})
const queryKeyword = ref<string>()

async function loadData() {
  let queryOpt: ProjectDataQueryOption | undefined
  if (queryKeyword.value != null && queryKeyword.value.length > 3) {
    queryOpt = {
      field: searchableFields.value[searchableFieldSelected.value]!.key,
      keyword: queryKeyword.value!,
    }
  }

  totalData.value = await projectData.count(queryOpt)

  const rawData = await projectData.getAll(paginationOpt, queryOpt)
  const rows = await Promise.all(
    rawData.map(async (f) => {
      const mappedData = await remapFieldValue(fields.value, f)
      const statusData = formatStatusValue(f.createdAt, f.syncAt)
      return { ...mappedData, status: statusData }
    }),
  )

  data.value = rows
}

watch([queryKeyword, searchableFieldSelected], async () => {
  await loadData()
})

async function deleteData(dataId: string) {
  await projectData.delete(dataId)
  await loadData()
}

function formatStatusValue(
  createdAt: number | undefined,
  syncAt: number | undefined,
): string {
  if (syncAt == null || createdAt == null || syncAt < createdAt) {
    return "Pending"
  }
  return "Submitted"
}

const filters = ref({
  status: { value: null, matchMode: FilterMatchMode.IN },
})

onMounted(async () => {
  isLoadingData.value = true
  try {
    const project = await getById(props.projectId)
    if (project == null) {
      isLoadingData.value = false
      return
    }
    fields.value = project.fields
    projectData = useProjectData(props.projectId)
    totalData.value = await projectData.count()

    await loadData()
  }
  catch (e) {
    captureToCloud(e)
  }
  finally {
    isLoadingData.value = false
  }
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="mb-4 w-full grow-0">
      <SearchField v-model:search-query="queryKeyword" v-model:field-selected="searchableFieldSelected" class="mb-4 w-full" :fields="searchableFields" />
      <div class="flex items-center space-x-2">
        <Checkbox v-model="allFieldsVisible" input-id="allFieldsVisible" size="small" binary />
        <label for="allFieldsVisible" class="text-xs"> Show all field </label>
      </div>
    </div>

    <DataTable
      v-model:filters="filters"
      class="grow"
      :value="data"
      :loading="isLoadingData"
      filter-display="menu"
    >
      <template v-if="allFieldsVisible">
        <template v-for="field in fields" :key="field.key">
          <Column :field="field.name" :header="field.name" style="min-width: 150px">
            <template v-if="field.type === FieldType.IMAGE" #body="slotProps">
              <Image :src="slotProps.data[field.name]" alt="Image" width="100" preview />
            </template>
          </Column>
        </template>
      </template>
      <template v-else>
        <Column :field="fields[0]?.name" :header="fields[0]?.name" style="min-width: 150px">
          <template v-if="fields[0]?.type === FieldType.IMAGE" #body="slotProps">
            <Image :src="slotProps.data[fields[0]?.name]" alt="Image" width="100" preview />
          </template>
        </Column>
      </template>

      <Column
        header="Status"
        field="status"
        filter-field="status"
        :show-filter-match-modes="false"
        :show-filter-menu="true"
      >
        <template #body="slotProps">
          <div> {{ slotProps.data.status }} </div>
        </template>
        <template #filter="{ filterModel }">
          <MultiSelect
            v-model="filterModel.value"
            :options="statusOptions"
            option-label="name"
            placeholder="Status"
            option-value="value"
          >
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </MultiSelect>
        </template>
      </Column>

      <Column header="Action" style="min-width: 150px">
        <template #body="slotProps">
          <ButtonGroup>
            <Button
              severity="secondary" variant="text" size="small" @click="() => {
                deleteData(slotProps.data.id)
              }"
            >
              Delete
            </Button>
            <Button
              severity="secondary" variant="text" size="small" @click="() => {
                emits('edit', slotProps.data.id, slotProps.data.geom.coordinates as [number, number])
              }"
            >
              Edit
            </Button>
          </ButtonGroup>
        </template>
      </Column>
    </DataTable>
    <Paginator
      class="grow-0"
      :rows="paginationOpt.perPage" :total-records="totalData" @page="(opt) => {
        console.log(opt)
        paginationOpt.page = opt.page + 1
        loadData()
      }"
    >
      <template #container="{ first, last, page, pageCount, prevPageCallback, nextPageCallback, totalRecords }">
        <div class="flex w-full items-center justify-between gap-4 rounded-full border border-surface-400 bg-transparent px-2 py-1 dark:border-surface-700">
          <Button rounded text :disabled="page === 0" @click="prevPageCallback">
            <i class="i-[solar--alt-arrow-left-bold] text-xl" />
          </Button>
          <div class="font-medium text-color">
            <span class="hidden sm:block">Showing {{ first }} to {{ last }} of {{ totalRecords }}</span>
            <span class="block sm:hidden">Page {{ page + 1 }} of {{ pageCount }}</span>
          </div>
          <Button icon="pi pi-chevron-right" rounded text :disabled="pageCount == null || (page === pageCount! - 1)" @click="nextPageCallback">
            <i class="i-[solar--alt-arrow-right-bold] text-xl" />
          </Button>
        </div>
      </template>
    </Paginator>
  </div>
</template>

<style scoped>

</style>
