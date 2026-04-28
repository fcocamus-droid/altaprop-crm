import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { LiveChat } from '@/components/web-chat/live-chat'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <LiveChat />
    </div>
  )
}
