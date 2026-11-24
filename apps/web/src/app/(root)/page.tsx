import SectionHeader from '@fe/components/section-header';
import XiRplMascot from '@xirpl/shared/components/mascot';
import AlbumPreview from './album-preview';
import Banner from './banner';
import TodaySchedule from './today-schedule';

export default function Home() {
  return (
    <>
      <Banner />
      <div className="mx-auto flex max-w-360 flex-col gap-10 px-4 pb-16">
        <TodaySchedule />

        <AlbumPreview />

        <section id="assigments" className="scroll-mt-20">
          <SectionHeader
            title="Informasi"
            desc="Informasi terbaru akan segera hadir!"
          />
          <div className="border-border bg-card flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center">
            <XiRplMascot
              pose="cozy"
              size={160}
              className="h-auto w-full max-w-40"
            />
            <p className="text-muted-foreground font-bold uppercase">
              Belum ada informasi yang terbaru.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
