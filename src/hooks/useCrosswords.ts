import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getUserCrosswords,
  getAllCrosswords,
  getCrossword,
  saveCrossword,
  overwriteCrossword,
  archiveCrossword,
} from "@/lib/firestore"
import { useAuth } from "./useAuth"
import type { Crossword } from "@/types/crossword"

const ADMIN_EMAIL = "yonatanm@gmail.com"

export function useCrosswords() {
  const { user } = useAuth()
  const isAdmin = user?.email === ADMIN_EMAIL
  return useQuery({
    queryKey: ["crosswords", isAdmin ? "all" : user?.uid],
    queryFn: () => isAdmin ? getAllCrosswords() : getUserCrosswords(user!.uid),
    enabled: !!user,
  })
}

export function useCrossword(id: string | null) {
  return useQuery({
    queryKey: ["crossword", id],
    queryFn: () => getCrossword(id!),
    enabled: !!id,
  })
}

export function useSaveCrossword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Omit<Crossword, "id"> }) => {
      if (id) {
        await overwriteCrossword(id, data)
        return id
      }
      return saveCrossword(data)
    },
    onSuccess: (_id, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["crosswords"] })
      if (id) queryClient.invalidateQueries({ queryKey: ["crossword", id] })
    },
  })
}

export function useArchiveCrossword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveCrossword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crosswords"] })
    },
  })
}
