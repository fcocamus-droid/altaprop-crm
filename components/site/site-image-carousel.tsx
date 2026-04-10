'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Maximize2 } from 'lucide-react'

interface CarouselImage {
  url: string
  alt?: string
}

interface Props {
  images: CarouselImage[]
  title: string
}

export function SiteImageCarousel({ images, title }: Props) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Sin imágenes disponibles</p>
      </div>
    )
  }

  const prev = () => { setZoomed(false); setCurrent(i => (i - 1 + images.length) % images.length) }
  const next = () => { setZoomed(false); setCurrent(i => (i + 1) % images.length) }

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setLightbox(false); setZoomed(false) } }}
        >
          <button
            onClick={() => { setLightbox(false); setZoomed(false) }}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2 z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full">
            {current + 1} / {images.length}
          </div>

          <button
            onClick={() => setZoomed(z => !z)}
            className="absolute bottom-20 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2"
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 rounded-full p-3"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 rounded-full p-3"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className={`overflow-auto cursor-${zoomed ? 'zoom-out' : 'zoom-in'}`}
            onClick={() => setZoomed(z => !z)}
          >
            <img
              src={images[current].url}
              alt={images[current].alt || title}
              className="block"
              style={{
                maxWidth: zoomed ? 'none' : '90vw',
                maxHeight: zoomed ? 'none' : '82vh',
                width: zoomed ? '150%' : 'auto',
              }}
            />
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setZoomed(false); setCurrent(i) }}
                  className={`flex-shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all ${
                    i === current ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-90'
                  }`}
                >
                  <img src={img.url} alt="" className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main carousel ── */}
      <div className="relative rounded-xl overflow-hidden bg-muted group">
        {/* Main image */}
        <div
          className="aspect-[4/3] cursor-zoom-in relative"
          onClick={() => setLightbox(true)}
        >
          <img
            src={images[current].url}
            alt={images[current].alt || title}
            className="w-full h-full object-cover transition-opacity duration-200"
          />
          {/* Fullscreen hint */}
          <div className="absolute top-3 right-3 bg-black/50 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-4 w-4" />
          </div>
          {/* Counter badge */}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            {current + 1} / {images.length}
          </div>
        </div>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-primary ring-1 ring-primary' : 'border-muted hover:border-muted-foreground/40 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt="" className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
