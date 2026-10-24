# Research Triage — alphaXiv Trending Feed, Oct 20–23, 2026

> Working note for `scope.md` and `spec.md`. Not a literature review.
> Question for every paper: **does it change what ShoreProof stores, checks, or shows in a 2-day build?**
> If no, it gets a verdict and no more of our time.

## The short answer

Out of ~180 papers in the feed, **six change the build** and **ten are worth citing**. The rest are
robotics, world models, video generation, speech, or LLM infrastructure. None of them are bad; they
are simply not about proving what a human removed from a beach.

The most important finding is negative and useful: the feed's own evidence says **do not let a model
write the record**. AgentVQA's best VLM scores 58.5% on agentic visual understanding and fails mainly
on grounding and state tracking. Inverse-scaling work says a bigger model can be worse on a specific
task. So the AI gets a narrow, visible job — propose regions, measure photo quality, flag review
reasons — and a human keeps the pen.

## Tier A — changes the build (6)

| Paper | Finding we can use | What it changes in ShoreProof |
|---|---|---|
| **AgentVQA: A Unified Benchmark for Agentic Visual Understanding** (2610.31494, Oct 22) | Across 22 models the best reaches **58.5%**; errors are dominated by failing to ground and maintain the visual state, not by reasoning. | Suggestion boxes are **never auto-accepted**. No confidence threshold grants authority. Every box needs a named accept/reject/edit. The UI shows the model's confidence next to the human's decision so the gap is visible. |
| **Is Complex Agentic Memory Always Needed? Naive RAG Is Stronger Than We Thought** (2610.30755, Oct 22) | Raw-history retrieval beats transformed memory stores in 6 of 7 settings; transformed stores lose accuracy even with complete access. | Store **raw evidence** (original bytes, original observation text, append-only events). No summarized "case state" that the app trusts over the log. Export reads from the log, not from a rolled-up record. |
| **Good Judgment, Bad Advice: Decision-Model Controllers Raise Agent Cost Without Improving Success** (Oct 2026) | Learned controllers added cost without improving outcomes. | Review-queue ordering is **deterministic rules** (`queue-rules.ts`), not a model. Rules are readable in the UI: "no region", "near-duplicate", "not comparable", "absolute wording". |
| **More Memory, Worse Agents: Error Reproduction and Anti-Persistence in LLM Agents** (Oct 2026) | Persisted context reproduces earlier errors instead of correcting them. | No cross-record memory: no "apply last decision", no pre-filled reviewer notes, no remembered category from the previous claim. Each claim starts blank. |
| **Same Simulation, Different Evidence: Where Retrieved Tool Output Costs LLM Agents Accuracy** (Oct 2026) | Stale retrieved output degrades accuracy versus fresh evidence. | Checks are keyed to the **SHA-256 of the uploaded bytes**. Change the file, the check re-runs. Never display a cached result for different bytes. |
| **VerifierBench: Benchmarking the Generation of Executable Verifiers for LLM Agents** (Oct 2026) | Verification is more reliable as executable code than as prose judgment. | Every check returns a **typed result** (`pass` / `warn` / `fail` + raw number + threshold), not a sentence like "looks fine". The export lists the checks and their values. |

## Tier B — cite in the docs, do not code (10)

| Paper | Why it is cited |
|---|---|
| **On the Limits of Scale: Inverse Scaling in Vision-Language Models** (Oct 19) | Justifies using the **smallest** detector (YOLO26n) and not swapping in a larger VLM. The argument is task-specific evaluation, not scale. |
| **Measuring the Verifier's Floor** (Oct 22) | A measured score can overstate the thing it names. Blur and exposure are shown as **heuristic numbers with thresholds**, never as a "quality grade" or a pass/fail on the photo's truthfulness. |
| **RIDAR: Safeguarding Research Integrity in Autonomous Research Agents** (Oct 2026) | The review gate is a **runtime intervention**, not a post-hoc disclaimer. Reviewers can stop a claim from shipping; that is the point. |
| **SCOPE: Compiling Natural-Language Policies into Neurosymbolic Predicate Programs** (Oct 2026) | Direction for turning a cleanup org's written rules into checkable predicates. Too much for the POC; it is the honest answer to "can rules be configured per organization?" later. |
| **DecisionPivot: A Diagnostic Benchmark for Decision Models in LLM Systems** (Oct 2026) | Supports testing the queue rules against seeded edge cases instead of trusting a controller. |
| **EvaOmni: An Evidence-Grounded Benchmark for Audio-Visual Reasoning** (Oct 2026) | "Evidence-grounded" is the right frame; also a reminder that multimodal models need evidence links, which is exactly what the export provides. |
| **MMEnterprise-Bench: Evaluating Enterprise Agents over Evolving Multimodal Records** (Oct 2026) | Records change over time. ShoreProof's append-only log is the small version of that problem. |
| **Verus-Insight: Towards Explainable Artifact Detection in AI-Generated Videos** (Oct 2026) | Later synthetic-media flag. Not POC: photos, not video, and the check needs a model we do not have. |
| **WeVisOne-VL: Unified Visual Perception from Objects to Pixels** (Tencent, Oct 2026) | A stronger open perception stack could replace COCO-only proposals later. No CPU/browser story today. |
| **HRoPE: Homography Relative Positional Encoding** (Oct 2026) | The research direction for real before/after alignment. The POC uses a cheap framing signal, not homography. |

## Tier C — roadmap, explicitly not now (10)

| Paper | What it would buy us | Why it waits |
|---|---|---|
| **SpatialBrain: Spatial Intelligence Growing from Experience** (SJTU) | Better spatial reasoning about a cleanup site. | Research system, no small CPU artifact. |
| **WinARDet: Compressed Window Auto-Regression for Long-Horizon Vision-Language Grounding** (Nankai) | Grounding across a sequence of frames. | Long-horizon video, not single photos. |
| **Event-STVG: Spatio-Temporal Video Grounding for Long-Form Event Reasoning** (Tsinghua) | Find "the moment the bag was picked up" in a clip. | We cut video from the POC. |
| **SpatialScout: Can VLM Agents Actively Explore and Map 3D Scenes?** (PKU) | Site-level 3D coverage instead of one spot. | Needs multi-view capture and compute. |
| **Muse Glimmer 30B: An On-Device Agentic Model** (Meta) | On-device agentic assistance. | 30B is not a browser/CPU model. |
| **ALPS: Visual State Encoders for World Models** (UCSC) | State tracking for before/after. | World-model research, no drop-in. |
| **Policy-Mask: Budget-Aware Adaptation of Diffusion Features to Discriminative Tasks** (Oct 2026) | Cheap adaptation of a vision backbone to litter. | Needs labeled litter data and training. |
| **CompactSplat / RLSplat / SplatLab** (Oct 2026) | 3D reconstruction of the cleaned site. | Cool demo, wrong deadline; also implies a capture protocol we do not have. |
| **Epi: Towards a Persistent, Self-Improving Agent for Autonomous Research** (BakeLab) | Long-running agent memory. | We deliberately have no agent memory. |
| **VX-One: Typed, Calibrated Decision Heads for Real-Time Perimeter Triage** (Oct 2026) | Calibrated decision heads with gray zones. | Security domain, and we do not want model decisions at all. |

## Tier D — read and set aside

Every remaining title is accounted for here. "Read" means the abstract or title was checked against
the kernel question; none of them change the POC.

- **Robot manipulation / humanoids / VLA:** Agentic World Action Models · SuperMimic · Humanoid Mobility via Attention-based Contacts · DONIC · SP-HLM · UniFlowWAM · MambaAct · VLA-Rolling · RoboCasa-Shift · BiDex-100 · λ₀ · Ropedia W0 · S-Agent 2.0 · TARSphere · Skeleton-Grounded Latent Action Model · Self-Distilling Future Video Representations · From VLM Planners to Robotic Agents · Not All Features Are Created Equal · Bridging Exploration and Persona.
- **World models / 4D / video generation:** Reading, Writing, Sharing, and Interacting with the World through Video · WorldForge V2 · Learning the 4D World through Point Trajectory Forecasting · LaLa-World · WorldStream · Matrix-Game 4.0 · AnyGameRenderer · SolarRenderer · RealMe · HumanSkill-4D · VideoMaMa++ · PhysSkin++ · Joints, Camera, Action! · OmniCam · Foundation4D · Real In, Real Out · Looking Ahead · StreamEval · Code2Video-Compass · Making MLLM Latents Matter · What Generation Knows · Entertain, then Cancel · Correction Training for Diffusion Models · SWIFT · SpecKCast · Large Flow Language Models · Looped Uniform Diffusion Language Models · Different Tasks, Different Timesteps · What Makes a Good Unmasking Policy? · Breaking Diffusion · DiffResearch · Sparsity Should Be ALLOTted · Stratified Sparse Attention · RTAformer · PVBench · Axiomatic World Modeling · World Models with Configurable Perception · Slot-JEPA · OverSeer · Evolving with Open Worlds · Evolving Agent Interfaces · Painting Change Map.
- **LLM infrastructure / training / inference:** Kimi K3.1 Pro · A Fix for Softmax and Cross-Entropy · IQuest-Q1 · TTR-Compressor · BeNice! · Harness Scaling · HarnessRL · Harness Self-Evolution · Self-Credit · CoEvo-RSI · Cache Engineering for Agents · Specter · Meta Expert · Deep Fusion Memory · ATEST · PACE · FlowState · RouteWeaver · HybridResearcher · Deep Search in Real-World Web Environments · FrontierCS 2 · PrismaCoder · TraceForge · Ask to Distill · Language Models Learn to Improve Language Models · Bridged Self-Distillation · On the Fragility of Tasks under Composition · Training the Whole Agent, Not Just the Model · Evaluating Agentic Capabilities Before Post-Training · Automating ML for Science · Building AI Research Teams · EvalResearchBench · From RL Papers to Framework Code · The LLM-Attacker · Agent Mosaic · RIDAR (cited above) · Inherited, Not Invented · On the Tip of the Tongue · Multimodal Reranking Is a System One Decision · Who Takes the Lead? · Answering in the User's Variety · CulturalRiddles · MolLean · Beyond Compilation.
- **Speech / audio / music:** HeyGen Voice · Qwen-Audio-3.1-ASR · StyleStream 2.0 · RubatoCodec · SEAM · Toward Part-Aware Choral Transcription.
- **Science / math / domain:** Boundary regularity of k-Hessian eigenfunctions · Ricci flow of Integrable Sigma Models · A Personal History in Quantum Foundations · Action Learning for Scientific Simulations · EMBER · TRACE · MMedAgent-Plus · Quant-Arena · HyperDrone.
- **Games / graphics / design:** BrickWright · FilmFlow · Design Anything, Design at Scale · Scaling in Games · Spectral-Spatial Interpretation · Editing Images into Reusable Layers · Code2Video-Compass · LLM2R · PhysLDM.
- **Misc:** Whole-Body Motion Guided Reference Generation for Uncertainty-Aware Compliant Assistance · Toward Recursive Self-Improvement in Physical AI · Multimodal Embodied Agents · Socratic Skill Learning · AgenticRoboRL · DeLoop · Unsupervised Tool Evolution · Memory-Centric Continual Learning · Which Agent's Skill Should Change? · IF-MAP · Realism VS Accuracy · ToM2Vec · Exploring The Empirical Privacy Landscape of Synthetic Data · Focused Omni-Modal GUI Agents · Right Screen, Wrong Transition · Agent World Model in the Wild · Heartbeat Thinking · EAU · EdgeKernelBench.

## Oct 20 feed addendum — three that matter

The Oct 20 daily feed added ~90 more papers. Three are worth acting on, and one is the paper you
liked: **Manga2Animate**.

| Paper | Repo | What it actually is | Verdict for ShoreProof |
|---|---|---|---|
| **Manga2Animate** (2610.26851, NYCU) | `github.com/annchenn/Manga2Animate` — real, public | A Python 3.12 pipeline that crops manga panels, writes a script and storyboard with **Gemini creator/reviewer agents**, then generates video with Seedance 2.0, MiniMax-H3, Wan 2.7, or AniSora. The open FLUX.2-dev storyboard path needs a **~97 GB GPU**; the API paths need paid keys. Demo manga is copyrighted (Manga109), non-commercial only. | **Borrow the pattern, not the stack.** Its real idea is: creator proposes, a separate reviewer checks against the **source**, and the best candidate is assembled from reviewed parts. That is exactly ShoreProof's `AI proposes → human checks against the photo`. The GPU/video stack is impossible here: no GPU, no budget, 2 days, and a public demo cannot ship copyrighted manga. |
| **Evidence-First Agentic Verification** (2610.17724, Scale AI) | `github.com/rsanayei/sauron` — MIT, Python | Investigator proposes claims, a separate verifier resolves each against its source, a finalizer decides. Every verdict carries an **evidence receipt**; anything unresolved gets `not_awarded` with **`evidence_missing=true`** instead of a guess. | **Integrate two ideas, not the code.** (1) Every exported claim gets an **evidence receipt**: source hash, region, reviewer, timestamp, check results. (2) Reviewers get a fourth action: **"insufficient evidence — send back"**, distinct from reject. This is the strongest validation of the kernel in the whole feed. The package itself needs an LLM endpoint and is out of scope. |
| **RealityBench** (2610.14397, Relantic) | Dataset: `huggingface.co/datasets/relantic/realitybench` | 1,378 Blender-rendered frames across 11 physical-work environments; 26 VLMs asked **"is this photo adequate proof of work?"** and **"what does it show?"**. Top models solve text-in-frame but are **weak at measurements, small parts, and spatial relations**. On-device models reach ~80% of top documentation scores. | **Cite as the closest benchmark.** It is literally photo-as-proof-of-work. It justifies the human region mark and the plain-language observation: a model that misreads small parts cannot be the one that writes the claim. It also supports the "evidence sufficient?" review step. |

Four more from the same feed, title-level only: **HERA** (reliable agentic abstention) supports an
explicit "no confident suggestion" state; **StopLoss** (predict failure, stop early) supports
escalating a claim instead of guessing; **Remembering Has a Price** supports keeping memory cost at
zero; **Token-Set Choice Confounds POPE** is another warning that VLM yes/no scores are not verdicts.

The remaining 68 titles from Oct 20, read and set aside by cluster:

- **Robotics / embodied:** EgoXperience · Holi-World · Learning from Fleet Experience · AnyGoal · AffordanceWAM · HandsOn · LIBERO-Industry · RoboValue · Vision-Language-Delta-Action · Vision as Proprioception · Sparse Feature Policy Unlearning · Where is Physical RSI capability from? · ScaleNav.
- **World models / video / 3D:** MT Forcing · RoAR-VAE · BlenderWorld · InfiniDream · FineSplat · Frechet Forcing · State World Models · ACEdit · UniAVC · DeOverlay · Any 3D Scene is Worth 1K Tokens · Think Visually Across Space and Time · ActionRoPE · World Model Interpretability · Learning to Discriminate Scene Structures · Competing Learning in Hybrid Architectures.
- **Agents / harness / memory / security:** MemT-1.0 · OpenVLHarness · Self-Evolving Coding Agents via Harness-Policy Optimization · CoworkEnv · Interlock · OR-License · MemPilot · AdaExploreBench · HarnessPro · Self-Evaluating Recursive Agents · Progress-Aware Distillation · Co-Evolving Acting and Forecasting · Empowering Edge Agents · Harness-Delta Attribution · RSIFlow · Heterogeneous Agentic Coevolution · EAU · CyberArena · Beyond Maliciousness · TokenGate · SPARC · Legal Guidance in the Wild · QD-Rec.
- **LLM training / safety / evaluation:** Scaling Parameter-Efficient Fine-Tuning for Brain Encoding · SpecMRL · Kronecker Delta Rule for Long Context Linear Attention · N-Gram Memories at Two Bits · Text-to-Image Generative Modeling Without Language Pretraining · HSPR · Policy Is Not Capability · Factorization-Guided Training and Inference · Predicting Privileged Information Effectiveness · A Conditional No-Hair Theorem for Transformers · Training Reasoning Models to Generate Diverse Scientific Ideas · Competence-Based Evaluation of Logical Reasoning · Measuring Mechanistic Uncertainty · A Language-Informed Loss · First Passage Attention.

## What the feed does **not** contain

- A beach-litter detector, a cleanup dataset, or a citizen-science evidence standard.
- A CPU-feasible VLM worth putting in front of a reviewer.
- A provenance or C2PA paper. (C2PA comes from the standards body, not alphaXiv.)
- Anything that beats a human-marked rectangle for "where is the litter in this photo".

That absence is the design argument: ShoreProof should not pretend the feed solves litter
detection. It should use the feed's **failure evidence** to justify a narrow AI role and a strong
human review record.

## Repos we will actually pull from

| Repo / artifact | Use | License note |
|---|---|---|
| `ultralytics/ultralytics` | YOLO26 architecture, export reference, class names | AGPL-3.0 |
| `onnx-community/yolo26n-ONNX` (Hugging Face, ~9.89 MB) | The ONNX weights we run in the browser | Derived from AGPL-3.0 YOLO26 |
| `microsoft/onnxruntime` → npm `onnxruntime-web` | WASM inference in a Web Worker | MIT |
| `opencv/opencv` 5.x | Later: best-frame extraction, homography experiments | Apache-2.0 |
| `contentauth/c2pa-rs` / C2PA web SDK | Later: Content Credentials signing | Apache-2.0 / MIT |

**License decision for the build:** the repo ships **AGPL-3.0** and the model is fetched by
`scripts/fetch-model.mjs` (checksum pinned, not committed). This is the honest choice if we
redistribute YOLO26 weights or a derivative. The app code could be MIT, but a split license on a
2-day hackathon repo creates more confusion than it prevents.

## Real cleanup data — what exists and what it can support

The product question was: can ShoreProof feed its kernel from a public cleanup dataset? The answer is no. The public sources contain counts, locations, and single photos, not paired before/after evidence of the same spot.

| Source | What it actually exposes | License / access | Can it feed a claim? |
|---|---|---|---|
| **TIDES / Clean Swell** (Ocean Conservancy) | Item counts by country/state/location; cleanup totals; the world's largest ocean-trash dataset | Public reports; citation requested | No. Counts and locations, not paired photos. Useful later as context. |
| **Surfrider cleanup database** | Cleanup results, counts, a photo gallery | Public results; photos need permission | No. No matched pair per spot; gallery images are not evidence. |
| **OpenLitterMap** | Single geotagged litter photos; public API and CSV export for approved records | ODbL; coordinates are sensitive | No. Single photos, not removal pairs. Could be a later single-photo import with consent. |
| **NOAA Marine Debris** | Public-domain debris and cleanup photos | Public domain (check each item) | No. Real photos, but not paired evidence of the same spot. |
| **Wikimedia Commons** | Real cleanup photos under varied licenses | Varies per file | No. Matched pairs are unreliable; attribution and license review per file. |
| **Instagram / TikTok** | Viral cleanup videos and posts | Creator-owned; permission required | No. Identifiable people, no license, not paired stills. Cite, do not ingest. |

**Conclusion:** the honest feed path is **first-party capture** (the lead takes the before/after pair) plus a **manifest importer** for a whole cleanup delivered as a folder of real photos. The importer creates the cleanup, pairs, sanitized photos, and checks; it never creates claims. This is the path in `scope.md > Where Real Data Comes From`.

**Instagram lead:** Bittu Tabahi / Surendra Singh Choudhary cleaned the Ajnar River in Biaora, Rajgarh, Madhya Pradesh; the before/after posts and news coverage went viral in September 2026. It is a strong real-world reference for the problem, but it is not a licensed paired-photo dataset and the video shows identifiable people. The plan cites it on `/about` with a link and does not download, clip, or import it. The demo record uses first-party photos captured with consent.

**Demo dependency:** two real before/after pairs, same spot, rough matching framing, no faces. The build can proceed without them; the three-minute video cannot honestly show the core loop without them.

## Sources

- alphaXiv trending feed, 20–23 Oct 2026 (titles, abstracts, dates as shown).
- Ultralytics YOLO26 docs and ONNX CPU benchmark (38.9 ms, Xeon).
- OpenCV 5 DNN benchmark (9.9–55.6 ms across i9/i7/M1/M5).
- Fly.io pricing and volumes docs; Render disks and pricing docs (checked Oct 2026).
- Devpost "Build With AI: Basics" rules and judging criteria.
