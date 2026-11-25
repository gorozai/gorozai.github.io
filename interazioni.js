// Goroz AI · interazioni dei capitoli (v2): prossima parola, terminale sul portatile 3D, indice, velo, titolo.
(function () {
  const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 02 · Prossima parola con temperatura (la lavagnetta 3D mostra la scelta)
  const base = [["notte", 3.2], ["giorno", 1.6], ["corsa", 1.1], ["lato", 0.6], ["fretta", 0.3]];
  const barre = document.getElementById("barre"), temp = document.getElementById("temp"), scelta = document.getElementById("scelta");
  let prob = [], ultima = 0;
  function calcola() {
    const T = parseFloat(temp.value);
    const e = base.map(([, l]) => Math.exp(l / T)), somma = e.reduce((a, b) => a + b, 0);
    prob = e.map((v) => v / somma);
    barre.innerHTML = base.map(([w], i) =>
      `<li data-i="${i}" class="${i === ultima ? "vinta" : ""}"><span>${w}</span><span class="tubo"><span class="pieno" style="width:${(prob[i] * 100).toFixed(1)}%"></span></span><span class="perc">${Math.round(prob[i] * 100)}%</span></li>`
    ).join("");
    window.gorozLavagna?.(base[ultima][0], Math.round(prob[ultima] * 100));
  }
  function estrai() {
    let r = Math.random(), i = 0;
    while (i < prob.length - 1 && (r -= prob[i]) > 0) i++;
    ultima = i; scelta.textContent = base[i][0];
    barre.querySelectorAll("li").forEach((li) => li.classList.toggle("vinta", +li.dataset.i === i));
    window.gorozLavagna?.(base[i][0], Math.round(prob[i] * 100));
  }
  temp.addEventListener("input", calcola);
  document.getElementById("estrai").addEventListener("click", estrai);
  calcola(); scelta.textContent = base[0][0];
  addEventListener("load", () => window.gorozLavagna?.(base[ultima][0], Math.round(prob[ultima] * 100)));

  // 04 · Terminale sullo schermo del portatile 3D
  const righe = [
    ["io", "> sistema i titoli delle foto nella cartella Vacanze"],
    ["", "Leggo la cartella… 48 file trovati."],
    ["", "Propongo: 2026-08-12_mare_01.jpg, …"],
    ["chiede", "? Rinomino 48 file. Procedo? (sì / no)"],
    ["io", "> sì"],
    ["ok", "✓ Fatto. Nessun file cancellato."],
  ];
  document.getElementById("termTesto").textContent = righe.map((r) => r[1]).join(" ");
  let scritto = false;
  function scrivi() {
    if (scritto || !window.gorozTerminale) return; scritto = true;
    if (ridotto) { window.gorozTerminale(righe); return; }
    let r = 0, k = 0;
    (function passo() {
      if (r >= righe.length) return;
      const [c, t] = righe[r]; k += c === "io" ? 1 : 3;
      window.gorozTerminale([...righe.slice(0, r), [c, t.slice(0, k) + (k < t.length ? "▌" : "")]]);
      if (k >= t.length) { r++; k = 0; setTimeout(passo, 420); } else setTimeout(passo, 34);
    })();
  }
  new IntersectionObserver((v, o) => { if (v[0].isIntersecting) { scrivi(); if (scritto) o.disconnect(); } }, { threshold: 0.25 }).observe(document.getElementById("agenti"));

  // Blocchi di testo più alti dello schermo: niente sticky, scorrono con la pagina
  const misura = () => document.querySelectorAll(".scena .testo").forEach((t) => t.classList.toggle("lungo", innerWidth >= 760 && t.offsetHeight > innerHeight * 0.84));
  misura(); addEventListener("resize", misura); document.fonts?.ready.then(misura);

  // Saluto dal bottone
  document.getElementById("premi").addEventListener("click", () => window.gorozSaluta?.());

  // Indice laterale e velo dal lato del testo
  const sezioni = [...document.querySelectorAll("[data-cap]")], link = [...document.querySelectorAll(".indice a")], velo = document.querySelector(".velo"), bagliore = document.querySelector(".bagliore");
  const io = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (!v.isIntersecting) return;
    const i = +v.target.dataset.cap;
    link.forEach((a) => a.classList.toggle("attivo", +a.dataset.i === i));
    velo.classList.toggle("attivo", i >= 1 && i <= 4);
    velo.classList.toggle("dx", v.target.classList.contains("scena-dx"));
    const sx = v.target.classList.contains("scena-dx");
    bagliore.classList.toggle("attivo", i >= 1 && i <= 4); bagliore.classList.toggle("sx", sx);
    const radice = document.documentElement, fondo = v.target.dataset.fondo, acc = v.target.dataset.accento;
    if (window.gsap && !ridotto) gsap.to(radice, { "--fondo": fondo, "--accento": acc, duration: 1.1, ease: "power2.out" });
    else { radice.style.setProperty("--fondo", fondo); radice.style.setProperty("--accento", acc); }
    window.gorozFondo?.(fondo);
  }), { rootMargin: "-45% 0px -45% 0px" });
  sezioni.forEach((s) => io.observe(s));

  // Movimenti con GSAP
  if (!window.gsap || ridotto) return;
  const { gsap } = window;
  gsap.from(".titolo-gigante span", { yPercent: 110, opacity: 0, stagger: 0.07, duration: 1.1, ease: "expo.out", delay: 0.2 });
  gsap.from(".occhiello, .hero-sotto, .premi", { y: 20, opacity: 0, duration: 0.9, delay: 0.7, stagger: 0.1, ease: "power3.out" });
  gsap.fromTo(".titolo-gigante", { y: 0, opacity: 1 }, { y: () => -innerHeight * 0.35, opacity: 0, ease: "none", immediateRender: false,
    scrollTrigger: { trigger: ".cap-hero", start: "top top", end: "bottom 30%", scrub: true } });
  gsap.to(".alone", { opacity: 0.2, yPercent: 25, ease: "none", scrollTrigger: { trigger: ".cap-hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.utils.toArray(".testo").forEach((t) => {
    const pezzi = t.querySelectorAll(".numero, h2, .corpo, .nota, .prob, .consigli li");
    gsap.from(pezzi, { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: "power3.out", scrollTrigger: { trigger: t.parentElement, start: "top 65%" } });
    gsap.fromTo(t.querySelector(".cifra"), { yPercent: 30 }, { yPercent: -30, ease: "none", scrollTrigger: { trigger: t.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });
  gsap.from(".canale", { y: 50, opacity: 0, stagger: 0.07, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".canali", start: "top 85%" } });
  gsap.from(".finale-titolo", { y: 80, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: ".cap-finale", start: "top 70%" } });
})();
