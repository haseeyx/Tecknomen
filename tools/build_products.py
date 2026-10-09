"""
Builds the product pages and the product index for the Teknomen site.

All product content lives in PRODUCTS below. After editing it, run from the
project folder:

    python tools/build_products.py

It writes products/<id>.html (one page per product) and refreshes the parts of
index.html between the <!-- BUILD:... --> markers. The generated files are plain
HTML, so the site still needs no build step to host.
"""
import html
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
WA_NUMBER = "923156185476"

PRODUCTS = [
    {
        "id": "spinguard-pro", "code": "SG", "name": "SpinGuard Pro",
        "category": "Textile · Retrofit software",
        "tagline": "Intelligent control, smarter spinning.",
        "subtitle": "Software-based automation for textile ring spinning frames.",
        "short": "Adds doffing control, power-failure recovery and lubrication timing to existing ring frames, with no new hardware.",
        "for": "Ring spinning frames",
        "key": "No added hardware · EJM-128, EJM-168, FA-507",
        "images": ["spinguard.webp"], "brochure": "SPINGUARD-Pro-Brochure.pdf",
        "description": [
            "Transform your existing ring spinning frame with intelligent software automation designed to improve doffing control, machine safety, power-failure recovery, production reliability, lubrication management and machine monitoring, without adding hardware or modifying the existing machine.",
            "SpinGuard Pro is a complete software-based automation solution for textile ring spinning frames that works through the machine's existing control system. It manages critical machine functions such as ring rail movement, doffing, power-failure recovery, limit-switch supervision, overhead cleaner positioning and automatic lubrication.",
        ],
        "features": [
            ("Smart doffing control", "Controls ring rail movement throughout the doffing sequence for smoother doffing, fewer yarn end-downs and a reliable restart."),
            ("Doffing switch supervision", "Continuously monitors ring rail limit-switch feedback to prevent unsafe rail movement and protect the machine against switch failures."),
            ("Overhead cleaner interlock", "Positions and interlocks the overhead cleaner during doffing so it never interferes with the operation."),
            ("Power-failure recovery", "Restores machine state and resumes production after an unexpected power cut, without operator intervention."),
            ("Full doff verification", "Confirms each doff cycle is complete and all spindles are positioned correctly before normal running resumes."),
            ("Automatic lubrication control", "Runs lubrication cycles based on actual machine running time, reducing wear and extending service intervals."),
        ],
        "specs": [
            ("Application", "Textile ring spinning frames"),
            ("Technology", "Software-based automation"),
            ("Installation", "Software upgrade"),
            ("Additional hardware", "Not required"),
            ("Compatible machines", "EJM-128 · EJM-168 · EJM-178 · FA-507 · F1518-A"),
            ("Monitoring parameters", "Pre-built and customizable"),
        ],
        "list_title": "Monitoring parameters",
        "list": ["Machine status", "Running time", "Stoppage analysis", "Fault information", "Production information", "Custom parameters"],
        "note": "Additional monitoring parameters can be configured to the customer's requirements.",
    },
    {
        "id": "fibrotek", "code": "FT", "name": "FibroTek",
        "category": "Textile · Suction control",
        "tagline": "Precision in every spindle.",
        "subtitle": "Suction and hairiness control system for textile ring spinning frames.",
        "short": "Regulates compacting-zone suction to keep yarn hairiness consistent across every spindle while cutting blower energy.",
        "for": "Compact & ring spinning",
        "key": "24 VDC · VFD blower control",
        "images": ["fibrotek-1.webp", "fibrotek-2.webp"], "brochure": "FIBROTEK-Brochure.pdf",
        "description": [
            "FibroTek is an intelligent suction-control system for textile ring spinning frames. It continuously regulates airflow at the compacting zone to keep yarn hairiness consistent across every spindle and through the complete doff.",
            "By matching suction to actual operating requirements, FibroTek improves Hairiness Index, Hairiness CV%, yarn evenness, fibre cohesion and overall yarn quality, while reducing suction-system energy use and maintenance.",
            "It suits all material counts and a wide range of fibre and material types used in yarn production.",
        ],
        "features": [
            ("Better yarn quality", "Improves Hairiness Index, Hairiness CV% and yarn evenness across every spindle."),
            ("Lower energy use", "Matches suction to actual operating needs, significantly reducing electrical consumption."),
            ("Early fault detection", "Detects low suction, blocked ducts and blower problems before they affect yarn quality."),
            ("Consistent spindle performance", "Keeps suction uniform across the whole doff cycle and every spindle position."),
            ("Less manual cleaning", "An automatic high-suction duct cleaning cycle reduces manual work and downtime."),
            ("One integrated package", "Suction control, monitoring display and duct cleaning in a single system."),
        ],
        "specs": [
            ("Application", "Textile ring spinning frames"),
            ("Primary function", "Yarn hairiness and hairiness CV control"),
            ("Material compatibility", "Various fibre and material types"),
            ("Material counts", "Suitable for different counts"),
            ("Power supply", "24 VDC"),
            ("Display", "Integrated monitoring display"),
            ("Blower control", "VFD-based"),
            ("Duct cleaning", "Automatic high-suction cleaning cycle"),
            ("Suction monitoring", "Continuous"),
            ("Low-suction alarm", "Yes"),
        ],
        "list_title": "Applications",
        "list": ["Textile ring spinning frames", "Different material counts", "Different fibre and material types", "Compact spinning", "Ring spinning production lines", "Mills that need consistent suction", "Suction monitoring and optimization"],
        "note": "",
    },
    {
        "id": "spindle-monitoring", "code": "SM", "name": "Spindle Monitoring System",
        "category": "Textile · Monitoring",
        "tagline": "Complete visibility, every spindle.",
        "subtitle": "Real-time spindle-level monitoring for textile ring spinning frames.",
        "short": "Shows the condition and output of every individual spindle in real time, from one frame to the whole mill.",
        "for": "Ring spinning frames",
        "key": "Per-spindle breakage, speed and twist",
        "images": ["spindle-monitoring.webp"], "photo": True,
        "description": [
            "The Spindle Monitoring System gives real-time visibility into the operating condition and production performance of individual spindles on ring spinning frames.",
            "From a single spindle to a centralized multi-machine view, it gives operators, supervisors and production teams the information they need to find problems faster, improve machine performance and keep yarn production consistent.",
        ],
        "features": [
            ("Yarn breakage detection", "Detects breakage at the individual spindle and alerts operators immediately to cut waste."),
            ("Yarn speed monitoring", "Tracks spindle speed continuously to catch deviations from target production rates."),
            ("Lazy spindle detection", "Finds spindles running below required speed, a hidden source of production loss."),
            ("Machine-level monitoring", "Combines spindle data into a complete view of each machine's performance."),
            ("Yarn twist monitoring", "Monitors twist consistency across spindles to keep yarn quality uniform."),
            ("Optical yarn quality monitoring", "Uses optical sensing to catch quality anomalies as the yarn is produced."),
            ("Spindle-level production data", "Records output per spindle for precise analysis and benchmarking."),
            ("Centralized multi-machine view", "Connects multiple machines to one dashboard for plant-wide visibility."),
        ],
        "specs": [
            ("Application", "Textile ring spinning frames"),
            ("Monitoring scope", "Individual spindle to plant-wide"),
            ("Detection", "Yarn breakage · Lazy spindle · Twist"),
            ("Data output", "Real-time production visibility"),
            ("Connectivity", "Centralized multi-machine dashboard"),
        ],
        "list_title": "Where it's used",
        "list": ["Spinning mills", "Compact spinning", "Ring spinning lines", "Quality assurance", "Production analytics", "Maintenance planning"],
        "note": "",
    },
    {
        "id": "industrial-usps", "code": "UP", "name": "Industrial USPS",
        "category": "Industrial power",
        "tagline": "Uninterrupted power, protected control.",
        "subtitle": "Industrial power backup for embedded computers and 24 VDC devices.",
        "short": "Up to one hour of backup for machine computers, so they save data and shut down cleanly when power fails.",
        "for": "Embedded computers, 24 VDC devices",
        "key": "220 VAC in · 24 VDC out · up to 1 h",
        "images": ["usps.webp"], "brochure": "Industrial_USPS_Brochure.pdf",
        "description": [
            "USPS is a dedicated power-backup unit that protects industrial embedded computers and machine-control systems from unexpected power interruptions.",
            "An unscheduled power failure can wipe machine settings, corrupt operating systems, leave data incomplete and cause downtime. USPS provides backup power for up to one hour, giving the system time to save critical data and shut down in a controlled way.",
            "If mains power returns within the backup period, the embedded computer carries on running without a full shutdown cycle.",
        ],
        "features": [
            ("Extended backup", "Up to one hour of backup power, enough to save critical data and shut down cleanly."),
            ("OS protection", "Keeps power stable through outages so the operating system is never corrupted."),
            ("Power recovery", "If mains returns within the backup window, the system resumes without a full shutdown."),
            ("Data protection", "Unsaved settings and production data survive power interruptions."),
            ("Automatic switchover", "Switches to battery automatically, with no operator action."),
            ("Voltage and backup display", "Shows live voltage and remaining backup time."),
        ],
        "specs": [
            ("Application", "Industrial embedded computers / all 24 VDC devices"),
            ("Input voltage", "220 VAC"),
            ("Output voltage", "24 VDC"),
            ("Backup time", "Up to 1 hour*"),
            ("Battery", "24 V, 7 Ah"),
            ("Display", "Voltage and backup time"),
            ("Power cables", "Included"),
            ("Computer connection cable", "Included"),
            ("Battery connection cable", "Included"),
            ("Battery supply", "Optional, at additional cost"),
        ],
        "list_title": "What it prevents",
        "list": ["Loss of unsaved settings", "Data corruption", "Operating system corruption", "Unexpected shutdowns", "Machine downtime", "Extra maintenance work", "Loss of production information"],
        "note": "*Actual backup time depends on the connected load and battery condition.",
    },
    {
        "id": "vfds", "code": "VF", "name": "Variable Frequency Drives",
        "category": "Motor control",
        "tagline": "Precise speed, efficient power.",
        "subtitle": "VFDs for industrial, commercial and domestic applications.",
        "short": "Economical, high-quality drives for every motor application, with selection, installation, repair and spare parts.",
        "for": "Motors, pumps, fans, textile machines",
        "key": "Industrial · commercial · domestic",
        "images": ["vfd.webp"], "repair": True,
        "description": [
            "Teknomen supplies a wide range of Variable Frequency Drives for different motor applications, offering economical, high-quality solutions matched to each customer's requirements.",
            "From standard motor control to demanding industrial environments, we provide application-specific and customized VFD solutions for reliable, efficient operation.",
        ],
        "features": [
            ("Industrial motors", "Heavy-duty drives for continuous industrial operation in harsh environments."),
            ("Domestic applications", "Compact, economical drives for domestic pumps, fans and household motors."),
            ("Pumps, fans and blowers", "Energy-saving drives tuned for variable-torque loads and flow control."),
            ("Commercial applications", "Reliable drives for HVAC, water treatment and building automation."),
            ("Textile machinery", "Drives matched to spinning, weaving and finishing equipment."),
            ("Specialized motor control", "Custom-configured drives for unusual motor profiles and constraints."),
        ],
        "specs": [
            ("Application", "Industrial · Commercial · Domestic"),
            ("Range", "Multiple performance and price grades"),
            ("Services", "Selection · Installation · Maintenance · Repair · Spare parts"),
        ],
        "list_title": "Services",
        "list": [
            "Sales and selection: drives chosen for your motor and machine",
            "Installation and commissioning: configuration and start-up on site",
            "Maintenance: preventive servicing to keep drives reliable",
            "Repair and troubleshooting: diagnosis and repair of faulty drives",
            "Spare parts: components on demand to cut downtime",
        ],
        "note": "",
    },
    {
        "id": "pressure-transmitters", "code": "PT", "name": "Pressure Transmitters",
        "category": "Process control",
        "tagline": "Measure, monitor, control.",
        "subtitle": "Industrial pressure transmitters for monitoring and process control.",
        "short": "Analog and digital industrial-grade transmitters, configured to your application.",
        "for": "Pneumatics, suction, process lines",
        "key": "Analog and digital output",
        "images": ["pressure-1.webp", "pressure-2.webp"],
        "description": [
            "Teknomen offers a wide range of industrial-grade pressure transmitters for pressure measurement, monitoring and process control.",
            "The range covers analog and digital transmitters, with application-specific configurations and customized solutions available on request.",
        ],
        "features": [
            ("Industrial automation", "Connects directly to automated control systems for continuous pressure feedback."),
            ("Pneumatic and air systems", "Accurate measurement for compressed-air networks and pneumatic control loops."),
            ("Process control", "Precise pressure data for closed-loop regulation and safety interlocks."),
            ("Textile machinery", "Monitors suction, compacting air and pneumatic actuators on spinning frames."),
            ("Suction and vacuum systems", "Measures negative pressure for duct monitoring and low-suction alarms."),
            ("Machine monitoring", "Feeds live pressure data to machine dashboards for diagnostics."),
        ],
        "specs": [
            ("Type", "Analog and digital"),
            ("Application", "Industrial · Process control · Textile"),
            ("Configuration", "Application-specific and customized"),
        ],
        "list_title": "Applications",
        "list": ["Industrial automation", "Pneumatic and air systems", "Process control", "Textile machinery", "Suction and vacuum systems", "Machine monitoring"],
        "note": "Whether you need a standard industrial transmitter or a custom pressure-sensing solution, we can configure one around your application.",
    },
    {
        "id": "length-batch", "code": "LB", "name": "Length & Batch Controllers",
        "category": "Machine control",
        "tagline": "Measure, count, control.",
        "subtitle": "Dedicated production and batch monitoring for industrial machines.",
        "short": "Tracks produced length and completed batches, with preset alarms and automatic machine actions.",
        "for": "Winding, cutting, packaging machines",
        "key": "220 VAC or 24 VDC versions",
        "images": ["length-batch.webp"],
        "description": [
            "Teknomen Length & Batch Controllers are dedicated production-monitoring devices that track produced length and completed batches, with preset alarms and automatic actions based on configured values.",
            "Operators set the length and batch targets, which improves production monitoring and process control.",
        ],
        "features": [
            ("Length counting", "Tracks produced length in real time with high accuracy."),
            ("Preset values", "Operators set target lengths and the controller acts when they are reached."),
            ("Automatic actions", "Triggers relays, alarms or a machine stop when presets are met."),
            ("Batch counting", "Counts completed batches and keeps a running total."),
            ("Preset alarms", "Warns when length or batch targets are approaching or reached."),
            ("Dedicated device", "Built only for length and batch accuracy, nothing else to configure."),
        ],
        "specs": [
            ("AC version", "220 VAC"),
            ("DC version", "24 VDC"),
            ("Applications", "Machines that need length measurement, production counting, batch tracking and preset-based control"),
        ],
        "list_title": "Functions",
        "list": ["Length measurement", "Production counting", "Batch tracking", "Preset-based control", "Automatic machine stop", "Production monitoring"],
        "note": "",
    },
    {
        "id": "servo-motors", "code": "SV", "name": "Servo Motors & Drives",
        "category": "Motion control",
        "tagline": "Precise motion, reliable control.",
        "subtitle": "Servo systems: supply, integration, troubleshooting and repair.",
        "short": "Servo systems from selection to commissioning, plus fault diagnosis and component-level drive repair.",
        "for": "Motion-critical machinery",
        "key": "Supply · integration · repair",
        "images": ["servo-1.webp", "servo-2.webp"], "repair": True,
        "description": [
            "Teknomen provides servo motor and drive solutions for industrial motion control, supporting customers from system selection and installation through troubleshooting, maintenance and repair.",
            "Whether you need a new servo system or want to bring an existing machine back into service, our team handles evaluation, configuration, commissioning and fault diagnosis.",
        ],
        "features": [
            ("New servo systems", "Selection and supply of servo motors, drives and accessories for new installations."),
            ("Servo integration", "Integration of servo systems into existing machine control architectures."),
            ("Troubleshooting", "Fault diagnosis for unstable or malfunctioning servo motion."),
            ("Preventive maintenance", "Scheduled servicing to avoid unplanned downtime and extend system life."),
            ("Commissioning and setup", "Tuning, parameter setting and commissioning for best performance."),
            ("Servo drive repair", "Component-level repair of faulty servo drives at our facility."),
        ],
        "specs": [
            ("Application", "Industrial motion control"),
            ("Services", "Selection · Integration · Commissioning · Repair"),
            ("Support", "System evaluation · Configuration · Fault diagnosis"),
        ],
        "list_title": "Applications",
        "list": ["Textile machinery", "Industrial automation", "Packaging machines", "Conveyors and material handling", "CNC and precision machinery", "Winding and unwinding systems", "Pick-and-place", "Specialized motion control"],
        "note": "",
    },
]

e = html.escape

# Bento layout on the homepage: grid span per product (4-column grid)
BENTO = {
    "spinguard-pro": "b-xl", "fibrotek": "b-sm", "spindle-monitoring": "b-tall",
    "industrial-usps": "b-sm", "vfds": "b-wide", "pressure-transmitters": "b-sm",
    "length-batch": "b-sm", "servo-motors": "b-wide",
}

# Pinned library versions (loaded from CDNs, no build step needed)
GSAP = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5"
LENIS = "https://unpkg.com/lenis@1.3.26/dist"
THREE = "https://cdn.jsdelivr.net/npm/three@0.170.0"
AOS = "https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4"


def wa(msg):
    return f"https://wa.me/{WA_NUMBER}?text={urllib.parse.quote(msg)}"


ARROW = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
BACK = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3.5M7.5 4l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
DOWN = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
WA_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>'
TOOL = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5a3 3 0 0 0-3.8 3.8L2.5 10.5l3 3 4.2-4.2a3 3 0 0 0 3.8-3.8l-2 2-2-.5-.5-2 2-2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'


def head(title, desc, prefix):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" href="{prefix}header logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{LENIS}/lenis.css">
<link rel="stylesheet" href="{AOS}/aos.css">
<link rel="stylesheet" href="{prefix}style.css">
</head>'''


def scripts(prefix, with_3d=False):
    s = f'''<script src="{GSAP}/gsap.min.js"></script>
<script src="{GSAP}/ScrollTrigger.min.js"></script>
<script src="{LENIS}/lenis.min.js"></script>
<script src="{AOS}/aos.js"></script>
<script src="{GSAP}/Flip.min.js"></script>
<script src="{prefix}script.js"></script>
<script src="{prefix}motion.js"></script>'''
    if with_3d:
        s += f'''
<script type="importmap">{{"imports":{{"three":"{THREE}/build/three.module.js","three/addons/":"{THREE}/examples/jsm/"}}}}</script>
<script type="module" src="{prefix}hero3d.js"></script>
<script type="module" src="{prefix}bobbin3d.js"></script>'''
    return s


def header(prefix):
    p = prefix
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="nav-bar" id="navBar">
  <span class="nav-progress" aria-hidden="true"><i id="navProgress"></i></span>
  <div class="container nav-inner">
    <a href="{p}index.html" class="logo" aria-label="Teknomen home"><img src="{p}Weblogo.png" alt="Teknomen (Pvt) Ltd" width="1254" height="327"></a>
    <nav class="nav-links" id="nav" aria-label="Main">
      <a href="{p}index.html#products">Products</a>
      <a href="{p}index.html#services">Services</a>
      <a href="{p}index.html#process">Process</a>
      <a href="{p}index.html#clients">Clients</a>
      <a href="{p}index.html#about">About</a>
      <a href="{p}index.html#quote" class="nav-mobile-cta">Request a quote</a>
    </nav>
    <div class="nav-cta">
      <a class="link-arrow" href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener">Ask an engineer</a>
      <a class="btn btn-dark btn-sm" href="{p}index.html#quote">Request a quote {ARROW}</a>
      <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Open menu"><span></span><span></span></button>
    </div>
  </div>
</header>'''


def footer(prefix):
    p = prefix
    links = "\n".join(f'          <a href="{p}products/{x["id"]}.html">{e(x["name"])}</a>' for x in PRODUCTS)
    return f'''<footer class="footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="{p}Weblogo.png" alt="Teknomen (Pvt) Ltd" width="1254" height="327" loading="lazy">
        <p>Practical engineering for industrial automation, equipment performance and reliability. Pakistan, since 2010.</p>
        <a class="btn btn-dark btn-sm" href="{p}index.html#quote">Request a quote {ARROW}</a>
      </div>
      <div class="footer-col">
        <h2>Products</h2>
{links}
      </div>
      <div class="footer-col">
        <h2>Company</h2>
          <a href="{p}index.html#services">Services</a>
          <a href="{p}index.html#process">Process</a>
          <a href="{p}index.html#clients">Clients</a>
          <a href="{p}index.html#about">About</a>
          <a href="{p}index.html#faq">FAQ</a>
      </div>
      <div class="footer-col">
        <h2>Contact</h2>
          <a href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener">+92 315 6185476</a>
          <a href="mailto:info@teknomenltd.com">info@teknomenltd.com</a>
          <span>Pakistan</span>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span data-year>2026</span> Teknomen (Pvt) Ltd</span>
      <span>Your partner in progress</span>
    </div>
  </div>
</footer>
<a class="wa-float" href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">{WA_ICON}</a>
<div class="m-cta" id="mCta">
  <a class="btn btn-dark" href="{p}index.html#quote">Request a quote {ARROW}</a>
  <a class="m-wa" href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">{WA_ICON}</a>
</div>'''


def product_page(i, p):
    n = len(PRODUCTS)
    imgs = p["images"]
    photo = p.get("photo")
    thumbs = ""
    if len(imgs) > 1:
        thumbs = '<div class="pv-thumbs" role="group" aria-label="Product views">' + "".join(
            f'<button type="button" class="pv-thumb{" is-on" if k == 0 else ""}" data-src="../img/products/{s}" aria-label="View {k + 1}" aria-pressed="{"true" if k == 0 else "false"}"><img src="../img/products/{s}" alt="" loading="lazy"></button>'
            for k, s in enumerate(imgs)) + "</div>"
    chips = "".join(f'<li><span>{e(l)}</span><strong>{e(v)}</strong></li>' for l, v in p["specs"][:3])
    spec_rows = "".join(f'<tr><th scope="row">{e(l)}</th><td>{e(v)}</td></tr>' for l, v in [("Product", p["name"])] + p["specs"])
    features = "".join(
        f'<article class="feat reveal"><span class="feat-no">{k + 1:02d}</span><h3>{e(t)}</h3><p>{e(d)}</p></article>'
        for k, (t, d) in enumerate(p["features"]))
    items = "".join(f"<li>{e(x)}</li>" for x in p["list"])
    note = f'<p class="list-note">{e(p["note"])}</p>' if p.get("note") else ""
    paras = "".join(f"<p>{e(x)}</p>" for x in p["description"][1:])
    others = [PRODUCTS[(i + k) % n] for k in (1, 2, 3)]
    more = "\n".join(bento_card(o, f'{o["id"]}.html', "../", "b-sm") for o in others)
    # second floating card: key data, unless it just repeats a spec chip shown below the title
    chip_values = {v.lower() for _, v in p["specs"][:3]}
    hud2 = ("Engineer support", "Reply within one working day") if p["key"].lower() in chip_values else ("Key data", p["key"])
    hud = f'''<div class="hud hud-p1"><span class="hud-dot"></span><span><small>Used on</small><strong>{e(p["for"])}</strong></span></div>
        <div class="hud hud-p2"><small>{e(hud2[0])}</small><strong>{e(hud2[1])}</strong></div>'''

    actions = [f'<a class="btn btn-dark" href="../index.html?product={p["id"]}#quote">Request a quote {ARROW}</a>']
    if p.get("brochure"):
        actions.append(f'<a class="btn btn-ghost" href="../{urllib.parse.quote(p["brochure"])}" target="_blank" rel="noopener">{DOWN} Brochure</a>')
    if p.get("repair"):
        actions.append(f'<a class="btn btn-ghost" href="{e(wa("Hi, I would like to request repair service for " + p["name"] + ". Please let me know the process."))}" target="_blank" rel="noopener">{TOOL} Request repair</a>')
    actions.append(f'<a class="link-arrow" href="{e(wa("Hi, I would like technical consultation for " + p["name"] + "."))}" target="_blank" rel="noopener">Ask an engineer</a>')

    return f'''{head(p["name"] + " | Teknomen (Pvt) Ltd", p["short"], "../")}
<body class="pg-product">
{header("../")}
<main id="main">
  <section class="p-hero">
    <div class="mesh mesh-soft" aria-hidden="true"><canvas class="mesh-canvas"></canvas></div>
    <div class="container p-hero-grid">
      <div class="p-hero-text">
        <a class="crumb" href="../index.html#products">{BACK} All products</a>
        <p class="kicker">{e(p["category"])}</p>
        <h1 class="hero-anim">{e(p["name"])}</h1>
        <p class="p-lead hero-anim">{e(p["tagline"])} {e(p["subtitle"])}</p>
        <div class="actions hero-anim">{"".join(actions)}</div>
        <ul class="chips hero-anim">{chips}</ul>
      </div>
      <figure class="pv hero-anim">
        <div class="pv-card tilt{" is-photo" if photo else ""}">
          <img id="pvMain" src="../img/products/{imgs[0]}" alt="{e(p["name"])}" width="1200" height="1200">
        </div>
        {hud}
        {thumbs}
      </figure>
    </div>
  </section>

  <section class="section section-overview">
    <div class="container overview">
      <div class="overview-lead reveal">
        <p class="kicker">Overview</p>
        <p class="statement">{e(p["description"][0])}</p>
      </div>
      <div class="overview-body reveal">{paras}</div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="container">
      <div class="sec-head reveal"><p class="kicker">Features</p><h2>Key features</h2></div>
      <div class="feat-grid">{features}</div>
    </div>
  </section>

  <section class="section dark spec-section">
    <div class="dark-glow" aria-hidden="true"></div>
    <div class="container">
      <div class="sec-head reveal"><p class="kicker">Specifications</p><h2>Technical details</h2></div>
      <div class="spec-layout">
        <div class="spec-card reveal">
          <h3>Technical specifications</h3>
          <table class="spec-table"><tbody>{spec_rows}</tbody></table>
        </div>
        <div class="list-card reveal">
          <h3>{e(p["list_title"])}</h3>
          <ul class="check-list">{items}</ul>
          {note}
        </div>
      </div>
    </div>
  </section>

  <section class="section cta-section">
    <div class="container">
      <div class="cta-panel reveal">
        <div class="mesh" aria-hidden="true"><canvas class="mesh-canvas"></canvas></div>
        <div class="cta-content">
          <h2>Get a quote for {e(p["name"])}</h2>
          <p>Tell us your machine model and quantity. An engineer replies on WhatsApp, usually within one working day.</p>
          <a class="btn btn-dark" href="../index.html?product={p["id"]}#quote">Request a quote {ARROW}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-tight">
    <div class="container">
      <div class="sec-head sec-head-row reveal"><h2>More products</h2><a class="link-arrow" href="../index.html#products">View all</a></div>
      <div class="bento bento-3">
{more}
      </div>
    </div>
  </section>
</main>
{footer("../")}
{scripts("../")}
</body>
</html>
'''


def index_rows():
    cards = []
    for p in PRODUCTS:
        cards.append(bento_card(p, f'products/{p["id"]}.html', "", BENTO.get(p["id"], "b-sm")))
    return "\n".join(cards)


GROUPS = {"Textile": "textile", "Industrial power": "power", "Motor control": "power", "Motion control": "power",
          "Process control": "control", "Machine control": "control"}


def group_of(p):
    return GROUPS.get(p["category"].split(" \u00b7 ")[0], "control")


SPOTLIGHT = ["spinguard-pro", "fibrotek", "spindle-monitoring", "vfds"]


def spotlight_cards():
    by_id = {x["id"]: x for x in PRODUCTS}
    out = []
    for n, pid in enumerate(SPOTLIGHT, 1):
        p = by_id[pid]
        photo = " is-photo" if p.get("photo") else ""
        out.append(f'''        <article class="spot-card" data-title="{e(p["name"])}">
          <a class="spot-link" href="products/{p["id"]}.html">
            <span class="spot-img{photo}"><img src="img/products/{p["images"][0]}" alt="{e(p["name"])}" loading="lazy"></span>
            <span class="spot-body">
              <span class="spot-meta"><span class="spot-no">{n:02d}</span><span class="spot-cat">{e(p["category"])}</span></span>
              <strong>{e(p["name"])}</strong>
              <span class="spot-desc">{e(p["tagline"])} {e(p["short"])}</span>
              <span class="link-arrow">Explore {e(p["name"])}</span>
            </span>
          </a>
        </article>''')
    return "\n".join(out)


def bento_card(p, href, prefix, size):
    """Product card used on the homepage grid and in 'More products'."""
    photo = " is-photo" if p.get("photo") else ""
    return f'''        <a class="bento-card tilt reveal {size}{photo}" href="{href}" data-group="{group_of(p)}">
          <span class="bento-text">
            <span class="bento-cat">{e(p["category"])}</span>
            <strong>{e(p["name"])}</strong>
            <span class="bento-desc">{e(p["short"])}</span>
          </span>
          <span class="bento-img"><img src="{prefix}img/products/{p["images"][0]}" alt="{e(p["name"])}" loading="lazy"></span>
          <span class="bento-go" aria-hidden="true">{ARROW}</span>
        </a>'''


def select_options():
    return "\n".join(f'            <option value="{p["id"]}">{e(p["name"])}</option>' for p in PRODUCTS)


def replace_block(text, name, content):
    pat = re.compile(rf"(<!-- BUILD:{name} -->).*?(<!-- /BUILD:{name} -->)", re.S)
    if not pat.search(text):
        raise SystemExit(f"Marker BUILD:{name} not found in index.html")
    return pat.sub(lambda m: m.group(1) + "\n" + content + "\n" + m.group(2), text)


def main():
    out = ROOT / "products"
    out.mkdir(exist_ok=True)
    for i, p in enumerate(PRODUCTS):
        (out / f'{p["id"]}.html').write_text(product_page(i, p), encoding="utf-8")
    idx = ROOT / "index.html"
    text = idx.read_text(encoding="utf-8")
    text = replace_block(text, "products", index_rows())
    text = replace_block(text, "options", select_options())
    text = replace_block(text, "header", header(""))
    text = replace_block(text, "footer", footer(""))
    text = replace_block(text, "scripts", scripts("", with_3d=True))
    text = replace_block(text, "spotlight", spotlight_cards())
    idx.write_text(text, encoding="utf-8")
    print(f"Wrote {len(PRODUCTS)} product pages and updated index.html")


if __name__ == "__main__":
    main()
