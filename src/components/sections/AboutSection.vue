<template>
  <section id="about" class="bg-white px-6 py-24">
    <div class="mx-auto max-w-5xl">
      <SectionTitle title="À propos" />

      <p class="mb-16 max-w-2xl text-base leading-relaxed text-ink-muted">
        {{ data.intro }}
      </p>

      <div class="grid gap-16 md:grid-cols-2">
        <!-- Formation -->
        <div>
          <h3 class="mb-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            <span class="h-px w-8 bg-accent shrink-0"></span>
            Formation
          </h3>
          <div class="relative ml-1.5 border-l border-warm-border pl-7 space-y-7">
            <div
              v-for="study in data.studies"
              :key="study.degree"
              class="group relative"
            >
              <span class="absolute -left-[33px] top-[5px] h-2.5 w-2.5 rounded-full border-2 border-accent bg-white transition-all duration-300 group-hover:bg-accent group-hover:scale-125"></span>
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent">{{ study.year }}</p>
              <p class="font-medium text-ink leading-snug">{{ study.degree }}</p>
              <p class="text-sm text-ink-muted">{{ study.school }}</p>
              <p v-if="study.adress" class="text-xs text-ink-muted/60 mt-0.5">{{ study.adress }}</p>
            </div>
          </div>
        </div>

        <!-- Expériences -->
        <div>
          <h3 class="mb-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            <span class="h-px w-8 bg-accent shrink-0"></span>
            Expériences
          </h3>
          <div class="relative ml-1.5 border-l border-warm-border pl-7 space-y-7">
            <div
              v-for="exp in data.experiences"
              :key="exp.role"
              class="group relative"
            >
              <span class="absolute -left-[33px] top-[5px] h-2.5 w-2.5 rounded-full border-2 border-accent bg-white transition-all duration-300 group-hover:bg-accent group-hover:scale-125"></span>
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent">{{ exp.year }}</p>
              <p class="font-medium text-ink leading-snug">{{ exp.role }}</p>
              <p class="text-sm text-ink-muted">{{ exp.company }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionTitle from '../ui/SectionTitle.vue'
import aboutData from '../../data/about.json'
const data = aboutData
</script>
