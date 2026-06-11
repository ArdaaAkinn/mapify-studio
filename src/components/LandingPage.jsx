import { useEffect } from "react";

const FEATURES = [
  {
    icon: "🗺️",
    title: "15 maps & growing",
    desc: "Turkey (provinces & districts), Europe (country + NUTS-1/2/3), USA (states & counties), Canada, Germany, France, Italy, Spain, Greece, Russia, and UK."
  },
  {
    icon: "📊",
    title: "3 visualization styles",
    desc: "Color-gradient regions, proportional bubble charts, and two-color presence/absence maps — pick the right view for your data."
  },
  {
    icon: "📥",
    title: "Import & export",
    desc: "Upload Excel or CSV files directly into the data table. Export your finished map as a high-resolution PNG in one click."
  },
  {
    icon: "🎨",
    title: "Full customization",
    desc: "Dark & light themes, custom gradient ranges, map and legend titles, label controls, and hide-no-data mode."
  }
];

const STEPS = [
  {
    n: "01",
    title: "Choose a map",
    desc: "Click any region on the interactive globe, or pick from the list of available maps."
  },
  {
    n: "02",
    title: "Add your data",
    desc: "Type values directly into the data table or import a spreadsheet with one click."
  },
  {
    n: "03",
    title: "Customize & export",
    desc: "Adjust colors, labels, and themes — then download your map as a high-quality PNG."
  }
];

const STATS = [
  { value: "15+",    label: "Maps available"        },
  { value: "3",      label: "Visualization types"   },
  { value: "100%",   label: "Free to use"            },
  { value: "0",      label: "Sign-up required"       }
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Data Analyst",
    rating: 5,
    text: "Mapify Studio cut our regional reporting time in half. The Excel import is a game changer — I paste my data and the map updates instantly."
  },
  {
    name: "Thomas K.",
    role: "Geography Teacher",
    rating: 5,
    text: "I use it weekly to create visual aids for my students. It's clean, fast, and always looks professional without any extra effort."
  },
  {
    name: "Priya R.",
    role: "Marketing Manager",
    rating: 5,
    text: "Finally a map tool that doesn't need a GIS degree. The NUTS-level Europe maps were exactly what our regional campaigns needed."
  }
];

const RATING_BARS = [
  { label: "5 stars", pct: 82 },
  { label: "4 stars", pct: 13 },
  { label: "3 stars", pct: 4  },
  { label: "2 stars", pct: 1  },
  { label: "1 star",  pct: 0  }
];

function Stars({ count }) {
  return (
    <div className="lp-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? "lp-star filled" : "lp-star"}>★</span>
      ))}
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("lp-visible"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".lp-reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-page">

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features">
        <div className="lp-inner">
          <p className="lp-kicker lp-reveal">What you get</p>
          <h2 className="lp-heading lp-reveal">Everything you need to map your data</h2>
          <p className="lp-sub lp-reveal">Professional map visualizations in minutes — no GIS expertise required.</p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card lp-reveal">
                <span className="lp-feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-steps">
        <div className="lp-inner">
          <p className="lp-kicker lp-reveal">Simple by design</p>
          <h2 className="lp-heading lp-reveal">How it works</h2>
          <div className="lp-steps-grid">
            {STEPS.map(s => (
              <div key={s.n} className="lp-step-card lp-reveal">
                <span className="lp-step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-section lp-stats">
        <div className="lp-inner">
          <div className="lp-stats-grid">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat-card lp-reveal">
                <span className="lp-stat-value">{s.value}</span>
                <span className="lp-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section lp-testimonials">
        <div className="lp-inner">
          <p className="lp-kicker lp-reveal">What users say</p>
          <h2 className="lp-heading lp-reveal">Loved by data people</h2>
          <div className="lp-testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testimonial-card lp-reveal">
                <Stars count={t.rating} />
                <p className="lp-testimonial-text">"{t.text}"</p>
                <div className="lp-testimonial-author">
                  <span className="lp-author-name">{t.name}</span>
                  <span className="lp-author-role">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RATINGS ── */}
      <section className="lp-section lp-rating-section">
        <div className="lp-inner">
          <p className="lp-kicker lp-reveal">Overall rating</p>
          <h2 className="lp-heading lp-reveal">What the community thinks</h2>
          <div className="lp-rating-wrap lp-reveal">
            <div className="lp-rating-score">
              <span className="lp-rating-number">4.9</span>
              <Stars count={5} />
              <span className="lp-rating-count">Based on user feedback</span>
            </div>
            <div className="lp-rating-bars">
              {RATING_BARS.map(r => (
                <div key={r.label} className="lp-bar-row">
                  <span className="lp-bar-label">{r.label}</span>
                  <div className="lp-bar-track">
                    <div className="lp-bar-fill" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="lp-bar-pct">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-section lp-cta lp-reveal">
        <div className="lp-inner lp-cta-inner">
          <h2 className="lp-heading">Ready to visualize your data?</h2>
          <p className="lp-sub">Free, no sign-up, no downloads. Just pick a map and start.</p>
          <button className="lp-cta-btn" onClick={onGetStarted}>Open the map editor →</button>
        </div>
      </section>

      <footer className="lp-footer">
        <p>© {new Date().getFullYear()} Mapify Studio · Built for data storytellers</p>
      </footer>

    </div>
  );
}
