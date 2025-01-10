// import { useStorage } from "@vueuse/core"
//
// export function useProjectStore() {
//   const projects = useStorage<Project[]>("project", [])
//
//   function save(project: Project) {
//     projects.value.unshift(project)
//   }
//
//   function update(project: Project) {
//     projects.value.splice(projects.value.indexOf(project), 1)
//     projects.value.unshift(project)
//   }
//
//   function remove(project: Project) {
//     projects.value.splice(projects.value.indexOf(project), 1)
//   }
//
//   return {
//     projects,
//     save,
//     update,
//     remove,
//   }
// }
