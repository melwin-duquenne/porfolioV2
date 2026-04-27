<template>
    <section
        id="hero"
        class="relative flex min-h-screen flex-col justify-center overflow-hidden bg-parchment px-6 pt-20"
    >
        <!-- Grille de points décorative -->
        <div
            class="pointer-events-none absolute inset-0 opacity-50"
            style="
                background-image: radial-gradient(
                    circle,
                    #d8d4cc 1.5px,
                    transparent 1.5px
                );
                background-size: 30px 30px;
            "
        ></div>

        <!-- Lueur douce en haut à droite -->
        <div
            class="pointer-events-none absolute -right-40 -top-20 h-[700px] w-[700px] rounded-full bg-accent-light opacity-40 blur-3xl"
        ></div>

        <div class="relative mx-auto w-full max-w-5xl">
            <!-- Eyebrow -->
            <p
                class="mb-6 text-xs font-medium uppercase tracking-[0.4em] text-accent"
                style="
                    animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s
                        both;
                "
            >
                Portfolio · Développeur Full Stack
            </p>

            <!-- Nom — énorme DM Serif Display -->
            <h1
                class="mb-6 font-serif leading-[0.88] text-ink"
                style="
                    font-size: clamp(3.8rem, 11vw, 9rem);
                    animation: slideUp 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s
                        both;
                "
            >
                <em class="text-ink-muted">{{ firstName }}</em
                ><br />
                {{ lastName }}
            </h1>

            <!-- Ligne décorative -->
            <div
                class="mb-8 h-px w-20 bg-accent"
                style="
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s
                        both;
                "
            ></div>

            <!-- Intro -->
            <p
                class="mb-10 max-w-md text-base leading-relaxed text-ink-muted"
                style="
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s
                        both;
                "
            >
                {{ data.intro }}
            </p>

            <!-- CTA -->
            <a
                href="#about"
                class="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-parchment transition-all duration-300 hover:bg-accent hover:gap-4"
                style="
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.55s
                        both;
                "
            >
                En savoir plus
                <svg
                    class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                </svg>
            </a>
        </div>

        <!-- Indicateur de scroll -->
        <div
            class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
            style="
                animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both;
            "
        >
            <span
                class="text-[9px] font-semibold uppercase tracking-[0.35em] text-ink-muted/50"
                >Défiler</span
            >
            <div class="relative h-12 w-px overflow-hidden bg-warm-border">
                <div
                    class="absolute inset-0 bg-accent"
                    style="animation: scrollLine 2.2s ease-in-out infinite"
                ></div>
            </div>
        </div>
    </section>
</template>

<script setup>
import aboutData from "../../data/about.json";
const data = aboutData;
const parts = data.name.split(" ");
const firstName = parts[0];
const lastName = parts.slice(1).join(" ");
</script>
