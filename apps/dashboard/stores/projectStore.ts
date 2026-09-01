import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ProjectStore {
  selectedProjectId: string
  setSelectedProjectId: (id: string) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      selectedProjectId: "",
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
    }),
    {
      name: "orch_project_storage",
    }
  )
)
