'use client'

import { FileText, Download, Music, Video } from 'lucide-react'

interface Props {
  url: string
  type: string | null            // 'image' | 'video' | 'audio' | 'document' | 'sticker'
  filename?: string | null
  isOutbound?: boolean
}

export function MediaAttachment({ url, type, filename, isOutbound }: Props) {
  if (type === 'image' || type === 'sticker') {
    return (
      <a href={url} target="_blank" rel="noopener" className="block mt-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename || 'imagen'}
          className="rounded-lg max-w-full max-h-64 object-cover"
        />
      </a>
    )
  }
  if (type === 'video') {
    return (
      <video
        controls
        src={url}
        className="rounded-lg max-w-full max-h-64 mt-1"
      />
    )
  }
  if (type === 'audio') {
    return (
      <div className="mt-1 flex items-center gap-2">
        <Music className={`h-4 w-4 ${isOutbound ? 'text-white/80' : 'text-slate-500'}`} />
        <audio controls src={url} className="h-8 max-w-full" />
      </div>
    )
  }
  // document or unknown
  const cls = isOutbound
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className={`mt-1 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${cls}`}
    >
      <FileText className="h-3.5 w-3.5" />
      <span className="truncate max-w-[180px]">{filename || 'Documento'}</span>
      <Download className="h-3 w-3 opacity-70" />
    </a>
  )
}
