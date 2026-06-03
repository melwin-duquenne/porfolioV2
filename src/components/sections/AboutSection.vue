<template>
  <section id="apropos" class="section-pad">
    <div class="wrap">
      <SectionHead kicker="À propos">
        Le <span class="mark">développeur</span><br />derrière le code
      </SectionHead>

      <div class="about__top">
        <p class="about__lede reveal" v-html="lede"></p>

        <div class="about__meta">
          <div class="meta-row reveal">
            <SvgIcon name="pin" />
            <div>
              <span class="mono">Localisation</span><br />
              <b>{{ location }}</b>
            </div>
          </div>
          <div class="meta-row reveal" data-d="1">
            <SvgIcon name="cap" />
            <div>
              <span class="mono">Formation</span><br />
              <b>{{ formationShort }}</b>
            </div>
          </div>
          <div class="meta-row reveal" data-d="2">
            <SvgIcon name="mail" />
            <div>
              <span class="mono">Contact</span><br />
              <b>{{ email }}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="about__grid">
        <TimelineCol label="Formation" :items="formation" />
        <TimelineCol label="Expériences" :items="experiences" />
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHead from '../ui/SectionHead.vue'
import SvgIcon from '../ui/SvgIcon.vue'
import TimelineCol from '../ui/TimelineCol.vue'
import aboutData from '../../data/about.json'

const lede = aboutData.lede
const location = aboutData.location
const formationShort = aboutData.formationShort
const email = aboutData.email

// normalise les données existantes vers le format de la timeline {date,title,org,loc}
const formation = aboutData.studies.map((s) => ({
  date: s.year,
  title: s.degree,
  org: s.school,
  loc: s.adress,
}))
const experiences = aboutData.experiences.map((e) => ({
  date: e.year,
  title: e.role,
  org: e.company,
  loc: '',
}))
</script>
