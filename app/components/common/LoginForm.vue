<script setup lang="ts">
import { Form, type FormSubmitEvent } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { get } from "es-toolkit/compat"
import { z } from "zod"
import { useAuth } from "~/composables/auth"

const emits = defineEmits<{
  success: []
}>()

const initialValues = ref({
  username: "",
  password: "",
})

const resolver = ref(
  zodResolver(
    z.object({
      username: z.string().min(1).email(),
      password: z.string().min(6),
    }),
  ),
)

const toast = useToast()
const auth = useAuth()

async function onSubmit(e: FormSubmitEvent) {
  if (!e.valid) {
    return
  }

  try {
    await auth.login(e.states.username!.value, e.states.password!.value)

    toast.add({
      severity: "success",
      summary: "Login successfully!",
    })
    emits("success")
  }
  catch (error) {
    const message = get(error, "response._data.error.message", "Invalid credentials")
    toast.add({
      severity: "error",
      summary: message,
    })
  }
}
</script>

<template>
  <Form
    v-slot="$form"
    :resolver="resolver"
    :initial-values="initialValues"
    :validate-on-value-update="false"
    :validate-on-blur="true"
    class="box-border space-y-4 px-4"
    @submit="onSubmit"
  >
    <IftaLabel>
      <InputText id="username" name="username" :invalid="$form.username?.invalid" fluid />
      <label for="username">Username</label>
      <Message v-if="$form.username?.invalid" severity="error" size="small" variant="simple">
        {{ $form.username.error.message }}
      </Message>
    </IftaLabel>

    <IftaLabel>
      <Password
        name="password" input-id="password" toggle-mask :feedback="false" :invalid="$form.password?.invalid"
        fluid
      />
      <label for="username">Password</label>
      <Message v-if="$form.password?.invalid" severity="error" size="small" variant="simple">
        {{ $form.password.error.message }}
      </Message>
    </IftaLabel>

    <div>
      <Button class="mt-6" type="submit" fluid>
        Login
      </Button>
    </div>
  </form>
</template>

<style scoped>

</style>
