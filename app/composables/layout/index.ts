export const LayoutTitleKey = Symbol("layoutTitle")

export function useLayoutTitle() {
  const title = inject<Ref<string | undefined>>(LayoutTitleKey)
  if (title == null) {
    throw new Error("title not exist")
  }

  return title
}
