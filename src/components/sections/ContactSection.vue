<template>
    <section id="contact" class="bg-ink px-6 py-24">
        <div class="mx-auto max-w-5xl">
            <p class="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-accent">
                Contact
            </p>
            <h2
                class="mb-6 font-serif leading-[0.9] text-parchment"
                style="font-size: clamp(2.8rem, 7vw, 5.5rem)"
            >
                Travaillons<br /><em>ensemble.</em>
            </h2>
            <p class="mb-12 max-w-md text-base leading-relaxed text-parchment/50">
                Une question ou une opportunité ? N'hésitez pas à me contacter.
            </p>
            <a
                :href="`mailto:${data.email}`"
                class="group inline-flex items-center gap-3 rounded-full border border-white/15 px-8 py-4 text-sm font-medium text-parchment/80 transition-all duration-300 hover:border-accent hover:bg-accent hover:text-white hover:gap-4"
            >
                <svg
                    class="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
                {{ data.email }}
            </a>
        </div>
    </section>
</template>

<script setup>
import aboutData from "../../data/about.json";

const data = aboutData;
</script>
