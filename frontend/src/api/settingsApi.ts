import { baseApi, TAGS } from './baseApi'
import type { BackupFileInfo, BackupResult, RestoreResult, SystemSettings } from '@/types'

export interface UpdateSettingsPayload {
  systemName?: string
  systemNameAr?: string
  logo?: string | null
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<SystemSettings, void>({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation<SystemSettings, UpdateSettingsPayload>({
      query: (body) => ({ url: '/settings', method: 'PATCH', body }),
      invalidatesTags: ['Settings'],
    }),
    listBackups: builder.query<BackupFileInfo[], void>({
      query: () => '/settings/backups',
      providesTags: ['Backups'],
    }),
    createBackup: builder.mutation<BackupResult, void>({
      query: () => ({ url: '/settings/backups', method: 'POST' }),
      invalidatesTags: ['Backups'],
    }),
    downloadBackupFile: builder.mutation<Blob, string>({
      query: (filename) => ({ url: `/settings/backups/${filename}/download`, responseHandler: (response) => response.blob() }),
    }),
    resetDatabase: builder.mutation<RestoreResult, { confirmation: string }>({
      query: (body) => ({ url: '/settings/reset', method: 'POST', body }),
      invalidatesTags: [...TAGS],
    }),
    restoreFromBackup: builder.mutation<RestoreResult, string>({
      query: (filename) => ({ url: `/settings/backups/${filename}/restore`, method: 'POST' }),
      invalidatesTags: [...TAGS],
    }),
    restoreFromUpload: builder.mutation<RestoreResult, File>({
      query: (file) => {
        const body = new FormData()
        body.append('file', file)
        return { url: '/settings/restore', method: 'POST', body }
      },
      invalidatesTags: [...TAGS],
    }),
  }),
})

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useListBackupsQuery,
  useCreateBackupMutation,
  useDownloadBackupFileMutation,
  useResetDatabaseMutation,
  useRestoreFromBackupMutation,
  useRestoreFromUploadMutation,
} = settingsApi
