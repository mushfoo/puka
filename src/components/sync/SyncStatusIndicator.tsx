interface SyncStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function SyncStatusIndicator(_props: SyncStatusIndicatorProps) {
  // Since sync functionality has been removed, always return null
  // This component is kept for compatibility but doesn't show anything
  return null
}

export default SyncStatusIndicator