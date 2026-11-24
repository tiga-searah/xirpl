'use client';

import SectionHeader from '@fe/components/section-header';
import { AspectRatio } from '@fe/components/ui/aspect-ratio';
import XiRplMascot from '@xirpl/shared/components/mascot';
import { motion as m } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { albums } from '../../../data/albums';

// The last four albums, newest first. Data still comes from the existing source.
const recent = albums.slice(-4).reverse();

export default function AlbumPreview() {
  return (
    <section id="pictures" className="scroll-mt-20">
      <SectionHeader
        title="Album"
        desc="Foto kita adalah kenangan kita di masa lampau. Bernostalgialah!"
      />

      {recent.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {recent.map((a, i) => (
            <m.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href="/albums"
                className="group focus-visible:ring-ring flex flex-col gap-2 rounded-3xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <AspectRatio
                  ratio={4 / 5}
                  className="border-border duo-card duo-press overflow-hidden rounded-2xl"
                >
                  <Image
                    src={a.cover}
                    alt={`Album ${a.title}`}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </AspectRatio>
                <div className="px-1">
                  <p className="text-sm font-extrabold tracking-wide uppercase md:text-base">
                    {a.title}
                  </p>
                  <p className="text-muted-foreground text-xs font-bold">
                    {a.date}
                  </p>
                </div>
              </Link>
            </m.div>
          ))}
        </div>
      ) : (
        <div className="border-border bg-card duo-card flex flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center">
          <XiRplMascot
            pose="cozy"
            size={160}
            className="h-auto w-full max-w-40"
          />
          <p className="text-muted-foreground font-medium">
            Belum ada album. Momen pertama menunggu untuk diabadikan!
          </p>
        </div>
      )}

      <Link
        href="/albums"
        className="text-[var(--brand-ink)] border-brand-blue/40 bg-card duo-card duo-press mt-5 inline-flex h-11 items-center rounded-2xl px-5 text-sm font-extrabold tracking-wide uppercase"
      >
        Lihat semua album →
      </Link>
    </section>
  );
}
