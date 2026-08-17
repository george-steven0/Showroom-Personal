import { useState } from 'react'
import { Button, Image, Upload, type UploadProps } from 'antd'
import { useTranslation } from 'react-i18next'
import imageCompression from 'browser-image-compression'
import { fileToDataUrl } from '@/lib/format'
import { MAX_LOGO_UPLOAD_BYTES } from '@/lib/constants'
import { useNotify } from '@/lib/hooks/useNotify'

export interface FileUploadProps {
  value?: string | null
  onChange?: (value: string | null) => void
  disabled?: boolean
  /** Target size after compression, in MB. */
  maxSizeMB?: number
}

/**
 * A logo picker, not a file uploader — antd's `Upload` is used purely as
 * a file-picker trigger (`beforeUpload` always returns `Upload.LIST_IGNORE`,
 * so antd never renders or manages its own file list). The result is a
 * compressed base64 data URL held as controlled `value`/`onChange` state,
 * sent later as part of the regular settings PATCH — no network request
 * happens inside this component itself.
 */
export function FileUpload({ value, onChange, disabled, maxSizeMB = 1 }: FileUploadProps) {
  const { t } = useTranslation()
  const notify = useNotify()
  const [busy, setBusy] = useState(false)

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!file.type.startsWith('image/')) {
      notify.error(t('common.error'), t('settings.logoInvalidType'))
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      notify.error(t('common.error'), t('settings.logoTooLarge'))
      return Upload.LIST_IGNORE
    }

    setBusy(true)
    try {
      const compressed = await imageCompression(file, { maxSizeMB, maxWidthOrHeight: 1200, useWebWorker: true })
      onChange?.(await fileToDataUrl(compressed))
    } catch {
      // Compression is an optimisation, not a requirement — fall back to the original file.
      onChange?.(await fileToDataUrl(file))
    } finally {
      setBusy(false)
    }
    return Upload.LIST_IGNORE
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        <Image src={value} alt="" width={72} height={72} className="rounded-lg border border-line object-contain" />
      ) : (
        <div className="flex size-[72px] items-center justify-center rounded-lg border border-dashed border-line-strong text-xs text-subtle">
          {t('settings.noLogo')}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload} disabled={disabled || busy}>
          <Button loading={busy} disabled={disabled}>
            {value ? t('settings.changeLogo') : t('settings.uploadLogo')}
          </Button>
        </Upload>
        {value && (
          <Button type="text" danger size="small" disabled={disabled || busy} onClick={() => onChange?.(null)}>
            {t('common.remove')}
          </Button>
        )}
      </div>
    </div>
  )
}
