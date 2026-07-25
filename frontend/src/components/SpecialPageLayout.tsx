import type { ReactNode } from "react";
import DesktopDecorations from "@/components/DesktopDecorations";
import DesktopFooter from "@/components/DesktopFooter";
import EditPostModal from "@/components/EditPostModal";
import FloatingActions from "@/components/FloatingActions";
import Footer from "@/components/Footer";
import ProfileFadeIn from "@/components/profile/ProfileFadeIn";
import ProfileTopBar from "@/components/profile/ProfileTopBar";
import Sidebar from "@/components/Sidebar";
import ArticleTOC from "@/components/ArticleTOC";
import type { User } from "@/lib/mock-data";

interface SpecialPageLayoutProps {
  owner: User;
  children: ReactNode;
  showToc?: boolean;
}

export default function SpecialPageLayout({ owner, children, showToc = false }: SpecialPageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="md:pt-6">
        <div
          id="scroll-root"
          className="md:fixed md:top-6 md:left-[calc(50%-300px)] md:z-10 md:h-[calc(100vh-24px)] md:w-[600px] md:overflow-y-auto md:overflow-x-hidden md:rounded-2xl md:bg-wechat-white md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ProfileTopBar surfaceColor="white" initialBgAlpha={1} />
          <main className="relative flex min-h-[calc(100vh-3rem)] w-full flex-col bg-wechat-white pb-8 pt-12 md:min-h-[calc(100vh-4rem)] md:pb-12">
            <ProfileFadeIn>
              <div className="flex-1">{children}</div>
              <Footer />
            </ProfileFadeIn>
          </main>
        </div>
        <Sidebar owner={owner} />
        {showToc && <ArticleTOC hideWhenEmpty />}
      </div>
      <FloatingActions />
      <DesktopFooter />
      <EditPostModal />
    </div>
  );
}
