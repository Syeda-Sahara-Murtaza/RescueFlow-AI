'use client';

import {Anchor,ArrowUpRight,BrainCircuit,Check,CheckCheck,Flag,Flame,HeartPulse,Layers3,MapPin,Play,Radio,Route,ShieldCheck,Siren,Target,Truck,Users} from 'lucide-react';
import {Brand,Cursor,Status} from './shared';
import styles from './home.module.css';

const links={platform:'/overview',command:'/command-center',report:'/reports?new=1',simulation:'/overview#live-simulation'};
const steps=[
  {title:'Collect',icon:Radio,text:'Gather reports from citizens, responders, sensors, and communication channels.'},
  {title:'Understand',icon:BrainCircuit,text:'Extract locations, hazards, urgency, and people who need help.'},
  {title:'Verify',icon:Layers3,text:'Connect related reports and combine supporting evidence.'},
  {title:'Prioritize',icon:Target,text:'Balance severity, medical risk, escalation, and resource readiness.'},
  {title:'Act',icon:Flag,text:'Create concrete missions. An authorized human approves every plan.'},
  {title:'Track',icon:CheckCheck,text:'Assign resources, follow mission progress, and close the loop.'},
];
const workflow=[['Messy Reports',Radio],['AI Extraction',BrainCircuit],['Verification',Layers3],['Severity',Flame],['Priority',Target],['Mission',Flag]] as const;

export default function Home(){
  return <div className={styles.home}>
    <Cursor/>
    <a href="#home-main" className={styles.skipLink}>Skip to content</a>
    <header className={styles.header}>
      <div className={styles.navbar}>
        <Brand/>
        <nav aria-label="Home navigation" className={styles.navLinks}>
          <a href="#how-it-works">How It Works</a>
          <a href={links.simulation}>Live Simulation</a>
          <a href={links.platform} className={`${styles.button} ${styles.navLaunch}`}>Launch Platform</a>
        </nav>
      </div>
    </header>

    <main id="home-main">
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span className={styles.signalDot}/><span>AI-POWERED EMERGENCY RESPONSE</span></div>
          <h1 id="home-title">From chaos to<br/><span>coordinated rescue.</span></h1>
          <p className={styles.heroDescription}>RescueFlow AI transforms scattered emergency reports into verified incidents, prioritized missions, and actionable response plans.</p>
          <div className={styles.heroActions}>
            <a href={links.command} className={`${styles.button} ${styles.primary}`}><MapPin size={18}/>Launch Command Center</a>
            <a href={links.simulation} className={`${styles.button} ${styles.secondary}`}><Play size={17}/>Run Live Demo</a>
          </div>
          <p className={styles.humanNote}><ShieldCheck size={17}/>Human approval at every critical step</p>
          <div className={styles.heroSignature}><span/>Built for the moments that matter.</div>
        </div>
        <HomeMapPreview/>
      </section>

      <div className={styles.container}>
        <section className={styles.reportBar} aria-label="Report an emergency">
          <div className={styles.reportPrompt}><span className={styles.sirenIcon}><Siren size={24}/></span><div><h2>Every response starts with a report.</h2><p>Share what happened, the city, and the country.</p></div></div>
          <a href={links.report} className={`${styles.button} ${styles.reportButton}`}><Siren size={18}/>Report an Emergency</a>
        </section>
      </div>

      <section id="how-it-works" className={`${styles.container} ${styles.howSection}`} aria-labelledby="how-title">
        <div className={styles.sectionIntro}><div><p className={styles.sectionLabel}>HOW IT WORKS</p><h2 id="how-title">A clear path from<br/>signal to action.</h2></div><p>One shared picture.<br/>People at the center of every decision.</p></div>
        <div className={styles.stepsGrid}>{steps.map(({title,icon:Icon,text},index)=><article key={title} className={styles.stepCard}>
          <div className={styles.stepTop}><span className={styles.stepIcon}><Icon size={23}/></span><span className={styles.stepNumber}>0{index+1}</span></div>
          <h3>{title}</h3><p>{text}</p>
        </article>)}</div>
      </section>

      <section className={`${styles.container} ${styles.workflowSection}`} aria-labelledby="workflow-title">
        <div className={styles.workflowHeader}><h2 id="workflow-title">ONE CONNECTED RESPONSE WORKFLOW</h2><Status/></div>
        <ol className={styles.flow}>{workflow.map(([name,Icon],index)=><li className={styles.flowStep} key={name} style={{animationDelay:`${index*180}ms`}}><span className={styles.flowIcon}><Icon size={23}/></span><span>{name}</span>{index<workflow.length-1&&<span className={styles.flowConnector} aria-hidden="true"/>}</li>)}</ol>
      </section>

      <section className={`${styles.container} ${styles.demoSection}`} aria-labelledby="demo-title">
        <div className={styles.demoCopy}>
          <span className={styles.demoLabel}><span/>FICTIONAL DEMO DATA</span>
          <h2 id="demo-title">Five reports.<br/><span>One moment of clarity.</span></h2>
          <p>Explore a fictional emergency scenario and see how RescueFlow AI transforms scattered reports into coordinated response actions.</p>
          <a href={links.simulation} className={`${styles.button} ${styles.primary}`}><Play size={18}/>Run Emergency Simulation</a>
          <small>Opens the existing simulation launch in Overview.</small>
        </div>
        <div className={styles.demoCardFrame}>
          <article className={styles.demoCard} aria-label="Fictional Village A mission example">
            <div className={styles.demoCardTop}><span className={styles.criticalBadge}><i/>CRITICAL · VILLAGE A</span><span className={styles.sampleTag}>DEMO</span></div>
            <div className={styles.sampleReport}><Radio size={18}/><p>40 families trapped near Village A.</p></div>
            <div className={styles.evidenceTags}><span><HeartPulse size={13}/>Medical needs</span><span><Flame size={13}/>Flood worsening</span></div>
            <div className={styles.missionDivider}><span/><BrainCircuit size={19}/><span/></div>
            <div className={styles.missionTitle}><span className={styles.missionIcon}><Flag size={24}/></span><div><p>RECOMMENDED MISSION</p><h3>Deploy Evacuation Unit</h3></div></div>
            <p className={styles.resourceLine}>2 rescue boats · 1 ambulance · 1 rescue team</p>
            <div className={styles.resourceIcons} aria-hidden="true"><span><Anchor size={18}/>02</span><span><Truck size={18}/>01</span><span><Users size={18}/>01</span></div>
            <div className={styles.approvalStatus}><ShieldCheck size={17}/><span>Awaiting human approval</span></div>
          </article>
          <p className={styles.sampleCaption}><Check size={14}/>Illustrative scenario. No real emergency or dispatch.</p>
        </div>
      </section>

      <section className={styles.finalSection} aria-labelledby="final-title"><div className={styles.container}>
        <span className={styles.finalIcon}><ShieldCheck size={29}/></span>
        <h2 id="final-title">Emergency information is messy.<br/><span>Response decisions don&apos;t have to be.</span></h2>
        <a href={links.command} className={`${styles.button} ${styles.primary}`}>Launch RescueFlow AI</a>
        <p className={styles.responsible}>AI assists emergency coordinators by organizing information and generating recommendations. Final response decisions remain with authorized human responders.</p>
      </div></section>
    </main>

    <footer className={styles.footer}><div className={styles.container}><Brand/><p>AI-powered emergency response and coordination.</p></div></footer>
  </div>;
}

/** A self-contained fictional illustration. Never reads or writes the operational map. */
function HomeMapPreview(){
  return <figure className={styles.mapPreview} aria-label="Fictional emergency response map preview">
    <div className={styles.mapHeader}><span><Route size={16}/>RESPONSE FIELD</span><span className={styles.previewLabel}>FICTIONAL PREVIEW</span></div>
    <div className={styles.previewField}>
      <svg className={styles.previewSvg} viewBox="0 0 600 410" role="img" aria-label="Fictional road network connecting Village A, Village B, and a rescue base">
        <defs><pattern id="home-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#21333b" strokeWidth=".65"/></pattern></defs>
        <rect width="600" height="410" fill="#0c191f"/><rect width="600" height="410" fill="url(#home-grid)"/>
        <path d="M-30 135C60 155 74 244 180 243S307 287 350 312 469 320 635 391" stroke="#153644" strokeWidth="37" fill="none"/>
        <path d="M-30 135C60 155 74 244 180 243S307 287 350 312 469 320 635 391" stroke="#2b5263" strokeWidth="1" fill="none"/>
        <g stroke="#263c44" strokeWidth="7" fill="none"><path d="M-10 74H157L247 152 387 144 455 82H610"/><path d="M86-10L125 115 163 220 110 340 84 420"/><path d="M340-10L316 77 247 152 273 256 381 420"/><path d="M510-10L483 155 529 262 478 420"/><path d="M-10 337L110 340 273 256 405 245 529 262 610 236"/></g>
        <g stroke="#4c6870" strokeWidth="1" fill="none"><path d="M-10 74H157L247 152 387 144 455 82H610"/><path d="M86-10L125 115 163 220 110 340 84 420"/><path d="M340-10L316 77 247 152 273 256 381 420"/><path d="M510-10L483 155 529 262 478 420"/><path d="M-10 337L110 340 273 256 405 245 529 262 610 236"/></g>
        <g stroke="#24363d" strokeWidth="2" fill="none"><path d="M0 35H300M0 110H85M172 0V80M375 0V90M555 0V400M0 380H235M38 0V155M419 100V243M225 290V410M420 286V410M188 100V185M380 180H510M565 130H610"/></g>
        <ellipse cx="247" cy="155" rx="74" ry="55" fill="#e4625110" stroke="#e2755d60" strokeWidth="1" strokeDasharray="4 6"/>
        <path className={styles.previewRoute} d="M112 338L164 219 247 155" stroke="#60dec8" strokeWidth="2.5" strokeDasharray="6 7" fill="none"/>
        <g fill="#6d909f" fontFamily="Arial, sans-serif" fontSize="12" letterSpacing="1.2"><text x="34" y="28">NORTH SECTOR</text><text x="387" y="393">RIVER CORRIDOR</text><text x="340" y="36">SECTOR 2</text></g>
      </svg>
      <div className={`${styles.previewMarker} ${styles.villageA}`}><span className={styles.criticalPin}><MapPin size={26} fill="currentColor"/></span><div><strong>Village A</strong><small>CRITICAL · FLOOD</small></div></div>
      <div className={`${styles.previewMarker} ${styles.villageB}`}><span className={styles.highPin}><MapPin size={23} fill="currentColor"/></span><div><strong>Village B</strong><small>HIGH · ROAD BLOCKED</small></div></div>
      <div className={styles.baseMarker}><span><Anchor size={17}/></span><div><strong>Rescue base</strong><small>Sector 4</small></div></div>
      <div className={styles.medicalMarker} aria-label="Fictional medical resource"><HeartPulse size={17}/></div>
      <div className={styles.previewCompass} aria-hidden="true"><span>N</span><ArrowUpRight size={22}/></div>
      <div className={styles.mapMission}><span className={styles.mapMissionIcon}><Check size={18}/></span><div><span>RECOMMENDED ACTION</span><strong>Deploy evacuation unit</strong><small>Human approval required</small></div></div>
    </div>
    <figcaption className={styles.previewSummary}><span><strong>05</strong>Reports</span><span><strong>02</strong>Incidents</span><span><strong>03</strong>Missions</span><span className={styles.previewSafe}><ShieldCheck size={17}/>Human-led</span></figcaption>
  </figure>;
}
