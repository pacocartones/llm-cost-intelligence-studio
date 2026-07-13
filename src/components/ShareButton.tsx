import { useState } from 'react'
import { encodeShareUrl } from '../lib/share'
import { exportArtifactToJson } from '../lib/share'
import type { ShareableArtifact } from '../types/shareable'

interface ShareButtonProps {
  artifact: ShareableArtifact
}

export function ShareButton({ artifact }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    const url = encodeShareUrl(artifact)
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleDownloadJson() {
    exportArtifactToJson(artifact)
  }

  return (
    <div className="share-panel">
      <div className="share-panel__copy">
        <span>Share or export</span>
        <small>Send a live URL or keep a JSON snapshot of this planning state.</small>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Share link copied to clipboard.' : ''}
        </span>
      </div>
      <div className="share-group">
        <button
          type="button"
          className="ghost-button"
          aria-label="Copy share link to clipboard"
          onClick={handleCopyLink}
        >
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>
        <button
          type="button"
          className="ghost-button"
          aria-label="Export planning state as JSON"
          onClick={handleDownloadJson}
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}
