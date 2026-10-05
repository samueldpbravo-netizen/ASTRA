/* ==========================================================================
   ASTRA // FACE DATA   (edit this file - no need to touch index.html)
   - AREAS  : the 9 face areas and every factor, with the exact names
   - ideal  : target range per gender.  null = "ideal pending" (measured, not scored yet)
   - src    : where the ideal comes from  doc | clin | res | comm | app
   - FIXES  : fix guides per factor id (added later, rated for effectiveness + safety)
   ========================================================================== */

export const CONFIG = {
  aiEndpoint: '',                                  // your AI scanner URL (POST). '' = not connected yet
  ratingFromScore: s => Math.round(s) / 10,        // overall score 0-100  ->  rating 0-10 (tier uses this)
  minAgeInvasive: 18                               // fixes of kind 'procedure' / 'surgical' are hidden below this age
};

export const SRC = {
  doc:  'Your reference document',
  clin: 'Clinical norm',
  res:  'Research average',
  comm: 'Community norm (approximate)',
  lib:  'Looksmaxxing library (ideal facial ratios)',
  app:  'App-defined'
};

/* photo views used by the scanner */
export const VIEWS = [
  { id:'front', name:'Front',          req:true,  tip:'Look straight into the lens. Neutral face, lips relaxed, hair off forehead and ears, no glasses. Camera at eye level.' },
  { id:'right', name:'Right profile',  req:true,  tip:'Turn your head fully to the LEFT so the camera sees your RIGHT side. Eyes level, chin neutral.' },
  { id:'left',  name:'Left profile',   req:true,  tip:'Turn your head fully to the RIGHT so the camera sees your LEFT side. Eyes level, chin neutral.' },
  { id:'smile', name:'Smile',          req:false, tip:'Natural smile showing your teeth. Look straight at the lens.' },
  { id:'up',    name:'Chin up',        req:false, tip:'Tilt your chin up about 30 degrees so the camera sees the nose base and the underside of your jaw.' },
  { id:'close', name:'Skin and hair',  req:false, tip:'Move closer in soft daylight, no makeup. Show forehead, hairline and cheeks.' }
];

/* ---- factor builders ---- */
const N = (id,name,abbr,view,unit,ideal,desc,o) => Object.assign({id,name,abbr,view,type:'num',unit,ideal,desc},o||{});
const C = (id,name,abbr,view,opts,desc,o)       => Object.assign({id,name,abbr,view,type:'cat',opts,desc},o||{});   // opts: {label:score} or [labels]
const G = (id,name,abbr,view,labels,desc,o)     => Object.assign({id,name,abbr,view,type:'grade',labels,desc},o||{}); // labels best -> worst
const I = (id,name,abbr,view,desc,o)            => Object.assign({id,name,abbr,view,type:'info',desc},o||{});

export const AREAS = [
{ id:'eyes', name:'Eyes', w:.17, factors:[
  N('pfl','Palpebral Fissure Length (PFL)','PFL','front','mm',null,'Horizontal distance from the inner corner (medial canthus) to the outer corner (lateral canthus).',{demo:[26,33]}),
  N('pfh','Palpebral Fissure Height (PFH)','PFH','front','mm',[2.8,3.5],'Vertical opening between the upper and lower eyelid margins. Scored as the eye aspect ratio PFL / PFH.',{ratio:['pfl','pfh'],tol:1,src:'lib',demo:[8,12]}),
  N('icd','Intercanthal Distance (ICD)','ICD','front','mm',[0.93,1.04],'Distance between the medial canthi of both eyes. Scored as ICD / PFL (ideal: about one eye width apart).',{ratio:['icd','pfl'],tol:.25,src:'lib',demo:[30,38]}),
  N('ipd','Interpupillary Distance (IPD)','IPD','front','mm',[0.44,0.48],'Distance between the centers of both pupils. Scored as the Eye Separation Ratio: IPD / Bizygomatic Breadth. Also the calibration reference for the scan.',{ratio:['ipd','bizygomatic'],tol:.06,src:'lib',demo:[58,68]}),
  N('ocd','Biocular Distance (OCD)','OCD','front','mm',[2.8,3.3],'Distance between the lateral canthi (outer eye span). Scored as OCD / PFL.',{ratio:['ocd','pfl'],tol:.8,src:'comm',demo:[85,100]}),
  N('canthal_tilt','Canthal Tilt Angle','Tilt','front','deg',[1,7],'Inclination of the line connecting medial and lateral canthi relative to the horizontal axis (positive = outer corner higher; negative = outer corner lower).',{tol:8,src:'lib',demo:[-4,10]}),
  N('uee','Upper Eyelid Exposure (UEE)','UEE','front','mm',null,'Height of visible upper eyelid skin (tarsal platform show) when looking straight ahead.',{demo:[0,6]}),
  G('hooding','Suprastromal Hooding / Dermatochalasis','Hood','front',['None','Mild','Moderate','Severe'],'Overhanging skin fold from the brow covering the upper eyelid space.',{src:'app'}),
  C('scleral','Scleral Show','Sclera','front',{'None':100,'Minimal inferior':80,'Inferior':45,'Superior':45,'Inferior and superior':25},'Visible white sclera below the lower iris border (inferior scleral show) or above the upper border (superior scleral show).',{src:'app'}),
  C('infraorbital','Infraorbital Vector','IOV','right',{'Positive':100,'Neutral':85,'Negative':35},'Sagittal alignment of the cheekbone rim relative to the cornea (positive = rim protrudes past eye; negative = rim recedes behind eye, predisposing to dark circles/bags).',{src:'app'}),
  G('tear_trough','Tear Trough & Palpebral-Malar Groove','Trough','front',['None','Mild','Moderate','Deep'],'Depth of the bone groove beneath the inner lower lid and its transition into the upper cheek.',{src:'app'}),
  I('lashes','Eyelash Morphology','Lash',['front','close'],'Upper and lower lash length (mm), volume density, and upward curl curvature angle.')
]},
{ id:'eyebrows', name:'Eyebrows', w:.06, factors:[
  N('brow_apex','Eyebrow Apex Position','Apex','front','mm',{m:[-2,2],f:[-1,4]},'Horizontal placement of the highest point of the brow arch relative to the outer pupil edge (lateral limbus). Positive = further out.',{tol:4,src:'comm',demo:[-6,8]}),
  N('bpd','Brow-to-Pupil Distance (BPD)','BPD','front','mm',null,'Vertical distance from the center of the pupil to the lower border of the eyebrow.',{demo:[17,29]}),
  I('brow_shape','Brow Angle, Density & Synophrys','Brow','close','Inclination slope of the brow axis, follicle density per cm2, hair grain direction, and unibrow gap width.')
]},
{ id:'hair', name:'Hair', w:.05, factors:[
  I('hair_melanin','Hair Melanin Ratio','Melanin','close','Balance of eumelanin (brown/black) to pheomelanin (red/yellow) dictating exact shade.'),
  I('curl','Andre Walker Curl Classification','Curl','close','Scale from Type 1A (bone straight) through Type 4C (tight zig-zag coils).',{opts:['1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C']}),
  I('strand','Strand Cross-Sectional Diameter','Strand','close','Fine (<60 um), Medium (60-80 um), or Coarse (>80 um) strand thickness.',{opts:['Fine','Medium','Coarse']}),
  I('follicular','Follicular Density','Density','close','Hair follicle count per cm2 across scalp regions.'),
  G('hairline','Hairline Pattern & Recession Scale','Hairline',['front','close'],{m:['I','II','III','IV','V','VI','VII'],f:['I','II','III']},'Norwood Scale (Types I-VII for male pattern loss) or Ludwig Scale (Types I-III for female diffuse loss); temporal peak sharpness.',{src:'app'}),
  I('facial_hair','Facial Hair Follicle Density & Grain','Beard',['front','close'],'Follicle density and growth vectors across mustache, cheeks, chin, and neck regions.')
]},
{ id:'skin', name:'Skin', w:.12, factors:[
  I('fitzpatrick','Fitzpatrick Phototype Scale','Fitz','close','Classification from Type I (pale white, burns easily) to Type VI (deeply pigmented, dark brown/black). Used for care advice, never scored.',{opts:['I','II','III','IV','V','VI']}),
  C('sebum','Sebum Excretion Rate','Sebum','close',{'Normal':100,'Combination':80,'Dry':70,'Oily':70,'Dehydrated':55},'Lipid activity level determining dry, normal, combination, oily, or dehydrated barrier states.',{src:'app'}),
  G('pores','Pore Diameter & T-Zone Distribution','Pores','close',['Fine','Mild','Moderate','Enlarged'],'Surface pore diameter (um) and density across nose, forehead, and inner cheeks.',{src:'app'}),
  G('acne','Acne Severity & Lesion Types','Acne','close',['Clear','Mild comedonal','Moderate papulopustular','Severe nodulocystic'],'Comedonal (blackheads/whiteheads), papulopustular, or nodulocystic lesion count per zone.',{src:'app'}),
  G('scarring','Atrophic & Hypertrophic Scarring','Scars','close',['None','Mild','Moderate','Severe'],'Scar classification: icepick, boxcar, rolling, or hypertrophic/keloidal.',{src:'app'}),
  G('wrinkles','Wrinkle Classification (Glogau Scale)','Glogau','close',['I','II','III','IV'],'Dynamic versus static wrinkling across forehead lines, glabella "11" lines, periorbital crow\'s feet, nasolabial lines, and marionette folds.',{src:'app'}),
  G('vascular','Vascularity & Dyschromia','Color','close',['None','Mild','Moderate','Marked'],'Erythema/rosacea/telangiectasia presence versus hyperpigmentation and sun spots.',{src:'app'})
]},
{ id:'nose', name:'Nose', w:.13, factors:[
  N('nasal_length','Nasal Length & Radix Placement','NL','right','mm',null,'Distance from the nasal root crease (nasion) to the tip; vertical height of the radix origin relative to the upper eyelid crease.',{demo:[44,56]}),
  N('radix','Radix Depth & Dorsal Height','Radix','right','mm',null,'Depth of the crease beneath the brow ridge, and height/straightness of the nasal bridge bone/cartilage.',{demo:[6,15]}),
  N('alar_dorsal','Alar Base Breadth vs. Dorsal Width','Alar','front','ratio',null,'Transverse width across outer nostril bases compared to the narrower dorsal bridge width.',{demo:[1.2,2.4]}),
  N('goode','Nasal Tip Projection (Goode Ratio)','Goode','right','ratio',[0.55,0.60],'How far the tip extends forward from the face relative to total nasal length (ideal ratio about 0.55-0.60).',{tol:.1,src:'doc',demo:[.45,.7]}),
  N('nasolabial','Nasolabial Angle (Tip Rotation)','NLA','right','deg',{m:[90,95],f:[95,105]},'Angle formed between the columella (underside of nose) and upper lip (typically 90-95 deg in males, 95-105 deg in females).',{tol:20,src:'doc',demo:[80,118]}),
  N('columella','Columella Show & Supratip Break','Col','right','mm',[2,4],'Visible height of central nostril cartilage in profile view, and the subtle step-off dip right above the nose tip.',{tol:3,src:'clin',demo:[0,7]}),
  I('nostril','Nostril Morphology & Alar Flare','Nostril','up','Nostril opening shape (oval, teardrop, round), bilateral symmetry, and lateral alar rim flaring.')
]},
{ id:'mouth', name:'Mouth', w:.13, factors:[
  N('philtrum','Philtrum Length & Column Definition','Phil','front','mm',null,'Vertical height from nose base (subnasale) to upper lip border (labiale superius), along with the depth/sharpness of vertical philtral ridges.',{demo:[10,18]}),
  N('lower_third','Lower Third Ratio','L3','front','ratio',[0.45,0.55],'Vertical proportion comparing upper lip/philtrum length to lower lip/chin height (ideal balance about 1:2).',{tol:.25,src:'doc',demo:[.3,.7]}),
  N('vermilion','Vermilion Thickness & Ratio','Verm','front','ratio',[0.5,0.71],'Vertical thickness of upper lip red border versus lower lip red border (ideal ratio about 1:1.6, i.e. 0.62; library range 1:1.4 to 1:2).',{tol:.3,src:'lib',demo:[.35,1]}),
  C('cupid','Cupid\'s Bow Definition','Bow','front',{'Well defined':100,'Soft':80,'Flat':55},'Width and inclination angle of the double-peaked arch on the upper lip border.',{src:'app'}),
  N('mouth_width','Intercomissural Width (Mouth Width)','Width','front','ratio',[1.38,1.53],'Transverse width from mouth corner to corner, evaluated relative to outer nose base width (ideal ratio about 1.5:1).',{tol:.5,src:'lib',demo:[1.1,1.9]}),
  C('commissure','Commissure Slope','Slope','front',{'Neutral':100,'Slightly upturned':95,'Upturned':80,'Downturned':45},'Resting direction of mouth corners (neutral/horizontal, upturned, downturned).',{src:'app'}),
  N('incisor','Resting Incisor Display','Incisor','front','mm',[1,3],'Millimeters of upper front teeth exposed when lips are fully relaxed at rest (typically 1-3 mm).',{tol:3,src:'doc',demo:[-1,6]}),
  C('occlusion','Dental Occlusion & Alignment','Bite','smile',{'Class I':100,'Class II':55,'Class III':45},'Bite classification (Angle Class I normal, Class II overbite/retrognathic maxilla, Class III underbite/prognathic mandible), overjet distance, tooth shade index, and arch crowding.',{src:'app'}),
  N('eline','Ricketts\' E-Line Alignment','E-Line','right','mm',[0,1.5],'Line from nose tip to chin tip. Value = average deviation of the lips from the targets (upper lip -4 mm, lower lip -2 mm); 0 is perfect.',{tol:4,src:'doc',demo:[0,6]}),
  N('sline','Steiner\'s S-Line','S-Line','right','mm',[-1.5,1.5],'Line connecting chin tip to midpoint of nose columella curve. Value = average lip distance to the line (0 = touching).',{tol:4,src:'clin',demo:[-4,5]})
]},
{ id:'cheeks', name:'Cheeks & Cheekbones', w:.10, factors:[
  I('bizygomatic','Bizygomatic Breadth','Bizyg','front','Total facial width across the prominent outer arches of the cheekbones.',{unit:'mm',demo:[125,150]}),
  N('fwhr','Facial Width-to-Height Ratio (fWHR)','fWHR','front','ratio',[1.9,2.06],'Bizygomatic width divided by the vertical distance between the upper lip margin (subnasale) and brow midpoint.',{tol:.4,src:'lib',demo:[1.5,2.3]}),
  N('compact_midface','Compact Midface Ratio','Midface','front','ratio',[0.97,1.10],'Distance between pupils divided by the distance from the pupil midpoint line down to the upper lip line.',{tol:.3,src:'lib',demo:[.8,1.3]}),
  C('zygomatic','Zygomatic Projection Balance','Zyg',['front','right'],{'Balanced':100,'Forward-dominant':80,'Flare-dominant':75,'Flat':45},'Anterior (forward) cheekbone projection versus lateral (outward flare) zygomatic arch breadth.',{src:'app'}),
  C('buccal','Buccal Fat Volume & Subzygomatic Hollowing','Buccal','front',{'Defined hollowing':100,'Slight hollowing':90,'Neutral':75,'Full':60,'Excess fullness':45,'Excess hollowing':50},'Volume of deep buccal fat pad relative to cheekbone protrusion, creating hollowed versus plump lower midface cheeks.',{src:'app'}),
  G('nl_fold','Nasolabial Fold Depth & Angle','NL Fold','front',['None','Mild','Moderate','Deep'],'Depth and angle of the crease running from the outer nostril base down to the corner of the mouth.',{src:'app'})
]},
{ id:'maxilla', name:'Maxilla', w:.09, factors:[
  C('maxillary','Maxillary Projection & Paranasal Support','Maxilla','right',{'Forward and supported':100,'Neutral':85,'Recessed':40},'Anterior projection of the maxilla bone surrounding the base of the nose.',{src:'app'}),
  C('palatal','Palatal Vault Width & Transverse Projection','Palate','smile',{'Wide':100,'Normal':85,'Narrow (gothic)':40},'Width and arching height of the maxillary roof (narrow/gothic palate vs. wide broad palate), affecting cheek support and smile fullness (buccal corridors).',{src:'app'}),
  N('convexity','Facial Convexity Angle','Convex','right','deg',[165,175],'Angle formed by lines connecting Glabella - Subnasale - Pogonion (165-175 deg = straight profile; <165 = convex; >180 = concave).',{tol:15,src:'doc',demo:[150,185]}),
  I('frankfort','Frankfort Horizontal Alignment','FH','right','Standard baseline passing from top of ear canal to lower border of eye socket. Used to normalise head pose.',{unit:'deg',demo:[-6,6]})
]},
{ id:'underjaw', name:'Underjaw', w:.15, factors:[
  N('ramus','Ramus Vertical Length','Ramus','right','mm',[0.59,0.75],'Distance from the jaw joint (mandibular condyle) down to the corner angle of the jaw (gonion). Scored as ramus-to-mandible ratio: ramus / mandibular body length.',{ratio:['ramus','mand_body'],tol:.2,src:'lib',demo:[45,70]}),
  N('gonial','Gonial Angle','Gonial','right','deg',[112,123],'Internal angle where the vertical ramus meets the horizontal jaw body (typically 110-125 deg).',{tol:15,src:'lib',demo:[100,140]}),
  N('bigonial','Bigonial Breadth','Bigon','front','mm',[0.855,0.94],'Transverse width measured across the left and right gonial jaw angles. Scored as bigonial width / bizygomatic breadth.',{ratio:['bigonial','bizygomatic'],tol:.12,src:'lib',demo:[95,125]}),
  N('mand_body','Mandibular Body Length','Body','right','mm',null,'Distance from the jaw angle (gonion) forward to the chin tip (menton/pogonion).',{demo:[70,95]}),
  C('mand_flare','Mandibular Flare','Flare',['front','up'],['Narrow','Moderate','Pronounced'],'Lateral outward angle of the jaw bone combined with masseter muscle thickness.'),
  N('chin_proj','Chin Projection (Pogonion Alignment)','Chin','right','mm',{m:[-2,3],f:[-4,1]},'Forward horizontal position of the chin relative to a vertical line dropped from the nose base or forehead.',{tol:6,src:'comm',demo:[-10,8]}),
  I('chin_morph','Chin Morphology','Chin form',['front','right'],'Chin vertical height, transverse width, squareness, pointedness, and mental cleft (dimple) presence.'),
  G('prejowl','Pre-Jowl Sulcus Depth','Jowl','front',['None','Mild','Moderate','Deep'],'Depression notch along the jawline border situated between the chin and jaw angle.',{src:'app'}),
  N('submental','Submental-Cervical Angle','SCA',['right','up'],'deg',[90,105],'Angle formed between the jaw underside and front of the neck (ideal angle 90-105 deg).',{tol:25,src:'doc',demo:[80,140]}),
  N('gonion_comm','Gonion-to-Commissure Level','G-C','front','mm',null,'Vertical position of the jaw corner relative to the mouth line.',{demo:[-10,12]}),
  N('mentolabial','Mentolabial Sulcus Depth','MLS','right','mm',null,'Horizontal indentation depth separating lower lip from top of chin.',{demo:[2,8]}),
  C('hyoid','Hyoid Bone Position','Hyoid','right',['High and forward','Average','Low and back'],'Vertical and forward placement of the hyoid bone, dictating tight neck-line contour versus soft tissue sag.')
]}
];

/* ==========================================================================
   FIXES  -  filled in later. Structure (one list per factor id):

   FIXES.canthal_tilt = [{
     title:    'Name of the fix',
     kind:     'lifestyle' | 'non-invasive' | 'procedure' | 'surgical',   // procedure + surgical are 18+ only
     works:    0-5,                       // how well it works
     safe:     0-5,                       // how safe it is
     evidence: 'verified' | 'mixed' | 'unverified',   // unverified = people claim it works, not proven
     summary:  'Short explanation',
     risks:    'Known risks',
     minAge:   18                         // optional override
   }];
   ========================================================================== */
export const FIXES = {};
const put = (ids, o) => ids.forEach(id => (FIXES[id] = FIXES[id] || []).push(Object.assign({ source: 'Looksmaxxing library' }, o)));

/* ---------- body fat, water, posture ---------- */
put(['buccal','zygomatic','gonial','mand_flare','submental','prejowl'], { title:'Lose excess body fat (moderate deficit)', kind:'lifestyle', works:4, safe:4, evidence:'verified',
  summary:'Facial structure shows once the fat sitting over the bone drops. Library protocol: a moderate deficit (about 400-500 kcal a day, roughly 0.5-1 lb a week), protein around 1 g per lb of bodyweight, keep lifting heavy, 8,000-12,000 steps a day. It puts the facial sweet spot around 10-12% body fat and warns most people overestimate their leanness by 3-5 points.',
  risks:'Cutting too fast or too lean looks gaunt and harms health. Skip this and talk to a professional if you have a history of disordered eating.' });
put(['buccal','tear_trough','submental','vascular'], { title:'Sodium, alcohol and sleep de-bloat', kind:'lifestyle', works:3, safe:5, evidence:'mixed',
  summary:'Puffiness is often water, not fat. Library: keep sodium under about 2,000 mg a day (visible in 24-48 h), drop alcohol (one night can puff you for about 3 days), sleep 8 hours at the same time, drink plenty of water and eat potassium-rich food. Water only: it does not change fat or bone.',
  risks:'Extreme sodium or water manipulation is not healthy long term.' });
put(['tear_trough','buccal'], { title:'Cold splash, ice roller and light lymphatic massage', kind:'non-invasive', works:1, safe:5, evidence:'unverified',
  summary:'Morning routine from the library: sit upright, cold-water splash, a chilled roller or fingertips from the center of the face outward with very light pressure. Temporary at best; the library itself says it is a 5% fix next to sleep and sodium.',
  risks:'Pressing hard marks the skin and does not help drainage.' });
put(['tear_trough'], { title:'Allergy check for puffy eyes (antihistamine trial)', kind:'non-invasive', works:2, safe:4, evidence:'mixed',
  summary:'If eyes are puffy even with good sleep, low sodium and no alcohol, the library suggests a 5-day over-the-counter antihistamine trial with a daily photo, and a bedroom air purifier and weekly hot-wash bedding. Improvement suggests allergy. "Histamine intolerance" as a diagnosis is not well established, so see an allergist.',
  risks:'Drowsiness and drug interactions; check the leaflet or ask a pharmacist.' });
put(['submental','prejowl'], { title:'Head posture', kind:'lifestyle', works:2, safe:5, evidence:'unverified',
  summary:'The library calls it minor: a better head position tightens the skin around the jaw and may give a small illusion of more projection.' });

/* ---------- jaw, chin, cheekbone growth claims ---------- */
put(['ramus','mand_body','gonial','mand_flare','chin_proj'], { title:'Chewing very tough foods for jaw growth (claimed)', kind:'lifestyle', works:1, safe:3, evidence:'unverified',
  summary:'The library claims chewing very chewy food, even rare meat, makes jaw bone adapt, and that nothing else works. There is no evidence that adults grow jaw bone this way. Masseter muscle may thicken a little. Gonion shape and masseter insertions are genetic.',
  risks:'Jaw joint pain, tooth wear, and food poisoning from undercooked meat.' });
put(['chin_proj','zygomatic','mand_flare','gonial','ramus'], { title:'Bonesmashing (striking the facial bones)', kind:'non-invasive', works:0, safe:0, evidence:'unverified',
  summary:'Claimed to trigger bone growth by repeatedly hitting the bone. No studies exist on facial bones, the library admits natural results are minimal, and one creator in it warns it can cause brain damage. The technique is deliberately not described here.',
  risks:'Bruising, fractures, concussion or brain injury, nerve damage and asymmetry.' });
put(['infraorbital','zygomatic','chin_proj','ramus','mand_body','mand_flare','gonial','bigonial','maxillary'], { title:'Testosterone, HGH and anabolic steroids for facial bone', kind:'medical', works:1, safe:1, evidence:'unverified',
  summary:'The library claims hormones grow facial bone in healthy adults. Medicine does show bone-density benefits in men with low testosterone, but growing facial bone in healthy adults is not supported. Protocols, doses and sourcing are deliberately not included.',
  risks:'Infertility, cholesterol and blood-pressure problems, mood changes, acne, hair loss, and shutdown of your natural hormone production.' });
put(['chin_proj','zygomatic','ramus','mand_body'], { title:'DIY facial injections of growth factors (IGF-1 and similar)', kind:'medical', works:0, safe:0, evidence:'unverified',
  summary:'Some forums claim injecting beside the facial bone grows it. There is no evidence of benefit, and the steps are deliberately not included.',
  risks:'Nerve damage, hematoma, infection and asymmetry.' });
put(['buccal','gonial','zygomatic','submental'], { title:'GLP-1 type weight-loss drugs (e.g. retatrutide, investigational)', kind:'medical', works:3, safe:1, evidence:'mixed',
  summary:'The library mentions an unapproved triple-agonist drug as an appetite suppressant. Trial data show real fat loss, but it is not approved, and buying it from grey-market sellers is unsafe. Ask a doctor about approved options.',
  risks:'GI side effects, unknown purity from underground sellers, and no long-term safety data.' });
put(['buccal','tear_trough','submental'], { title:'Prescription diuretics for puffiness', kind:'medical', works:2, safe:1, evidence:'unverified',
  summary:'Removes water for 24-48 hours only, with no fat loss. The library lists them as a last resort after everything else and its own verdict on the strongest one is: not for looks. Never self-dose.',
  risks:'Dangerous potassium changes (heart rhythm), dehydration, permanent hearing damage with loop diuretics, and rebound puffiness.' });

/* ---------- surgery and orthodontics the library points to ---------- */
put(['occlusion','maxillary','convexity','chin_proj','mand_body','ramus','gonial'], { title:'Double-jaw (orthognathic) surgery', kind:'surgical', works:5, safe:2, evidence:'verified',
  summary:'The library points to it for real skeletal problems. A surgeon moves the upper and/or lower jaw, planned together with an orthodontist.',
  risks:'Major surgery, numbness, relapse, long recovery and bite changes.' });
put(['palatal','maxillary','occlusion'], { title:'MSE / MARPE palate expander', kind:'procedure', works:3, safe:3, evidence:'mixed',
  summary:'A mini-screw appliance that applies constant pressure to widen the palate. In the library study it widened the nose more (about 2.7 mm) than the cheekbones (about 2.4 mm), results can partly revert, and it typically takes 3-5 years and about $30,000-50,000 with braces. Think of it for real deformities only.',
  risks:'Asymmetry, relapse, cost and discomfort.' });
put(['palatal','maxillary'], { title:'Thumbpulling', kind:'non-invasive', works:0, safe:3, evidence:'unverified',
  summary:'Claimed to widen the palate sutures by hand. The library verdict: it does nothing. Expanders work with constant pressure, and many before/after photos are just head-angle or lighting changes.',
  risks:'Wasted time; gum or tooth irritation if you pull hard.' });
put(['nasal_length','radix','alar_dorsal','goode','nasolabial','columella','nostril'], { title:'Rhinoplasty', kind:'surgical', works:4, safe:3, evidence:'verified',
  summary:'The library notes the nose is mostly bone and cartilage, so only surgery changes its shape; non-surgical methods only touch skin and oil glands. Choose a qualified facial plastic surgeon.',
  risks:'Asymmetry, breathing problems, revision surgery, scarring and anesthesia risks.' });
put(['alar_dorsal'], { title:'Isotretinoin or tretinoin for nose bulk (claimed)', kind:'medical', works:1, safe:2, evidence:'unverified',
  summary:'The library claims 5-20% "perceived" slimming by shrinking oil glands and pores. It is soft tissue only, never bone, and the library itself marks it disputed.',
  risks:'Dryness, irritation, sun sensitivity; isotretinoin needs medical monitoring.' });
put(['alar_dorsal'], { title:'Topical steroid skin-thinning for the nose', kind:'medical', works:1, safe:1, evidence:'unverified',
  summary:'Claimed to thin the nose skin so it looks slimmer. The library flags it as unsafe. The regimen is deliberately not included.',
  risks:'Skin thinning and damage that can be permanent, and rebound problems.' });

/* ---------- skin ---------- */
put(['wrinkles','vascular','scarring'], { title:'Daily broad-spectrum SPF 50', kind:'lifestyle', works:5, safe:5, evidence:'verified',
  summary:'UV is the biggest driver of visible aging, and UVA reaches you all year and through windows. Use enough (about half a teaspoon for face and neck, the "two-finger rule"), apply it last in the morning, reapply every 2 hours outdoors. Gel or Asian-formula sunscreens avoid the white cast.',
  risks:'If it breaks you out, try another formula, a mineral one, or a gel.' });
put(['wrinkles','acne','pores','scarring','vascular','tear_trough','nl_fold'], { title:'Tretinoin (prescription vitamin A cream)', kind:'medical', minAge:16, works:4, safe:3, evidence:'verified',
  summary:'The library calls it the best-evidenced topical for rebuilding collagen and clearing pores. Start with a low strength and a pea-sized amount a few nights a week, buffer with moisturizer, and wear sunscreen every day. Expect dryness and a rough patch around weeks 3-6; real gains come over 3-12 months.',
  risks:'Irritation, sun sensitivity, and it is not safe in pregnancy. Get it from a doctor.' });
put(['acne','vascular','pores'], { title:'Azelaic acid', kind:'non-invasive', works:3, safe:4, evidence:'verified',
  summary:'Anti-inflammatory; the library cites a study where a 20% cream matched 0.05% tretinoin for comedonal acne, and it also helps rosacea and dark spots. Its claim that it lowers DHT in the skin is weakly supported.',
  risks:'Mild stinging or dryness.' });
put(['acne','pores','sebum','scarring'], { title:'Isotretinoin (Accutane)', kind:'medical', minAge:16, works:5, safe:2, evidence:'verified',
  summary:'The most effective treatment for moderate to severe acne; it shrinks oil glands. It needs a prescriber, blood tests (liver, lipids) and a pregnancy-prevention program. The library also claims it slims the nose, which is disputed.',
  risks:'Dry skin and lips, mood and eye side effects, birth defects, liver and cholesterol changes.' });
put(['scarring','pores','wrinkles','nl_fold','tear_trough'], { title:'Microneedling', kind:'procedure', works:3, safe:3, evidence:'mixed',
  summary:'Controlled micro-injuries trigger new collagen. The library calls it the only known way to improve under-eye elasticity and rates the results close to lasers, which is disputed. Professional treatment is safer than at-home; never needle over the orbital bone and pause strong retinoids around it.',
  risks:'Infection, scarring, irritation and pigment changes.' });
put(['scarring','nl_fold','wrinkles'], { title:'Localized GHK-Cu peptide injections', kind:'medical', works:1, safe:0, evidence:'unverified',
  summary:'The library calls topical use pointless and suggests injecting into scars. Steps are deliberately not included; unregulated peptides in the face are risky.',
  risks:'Infection, vascular occlusion and scarring.' });
put(['wrinkles','vascular','tear_trough'], { title:'Vitamin C serum', kind:'non-invasive', works:2, safe:4, evidence:'mixed',
  summary:'Antioxidant used in the morning before moisturizer and SPF; evens mild discoloration.' });
put(['wrinkles'], { title:'Collagen + vitamin C, omega-3, vitamin D, astaxanthin', kind:'lifestyle', works:2, safe:4, evidence:'mixed',
  summary:'The library\'s foundation stack, but it states no stack replaces SPF and tretinoin. Some marketing claims in it (like astaxanthin\'s strength) are hype, and collagen creams on the skin do not work.' });
put(['wrinkles','acne','vascular','sebum','pores'], { title:'Low-sugar anti-inflammatory diet', kind:'lifestyle', works:3, safe:5, evidence:'mixed',
  summary:'Cut refined sugar (glycation stiffens collagen), alcohol and ultra-processed food; eat protein, fatty fish, berries, greens and olive oil. The library expects skin changes in 4-8 weeks.' });
put(['tear_trough','wrinkles','nl_fold','vascular'], { title:'Sleep 8 hours, cool dark room, back sleeping', kind:'lifestyle', works:3, safe:5, evidence:'mixed',
  summary:'Skin repairs overnight and poor sleep raises cortisol. Library: 8 hours in bed at a consistent time, no alcohol within 4 hours of bed, screens off 30-60 minutes before, and sleeping on your back to avoid one-sided compression wrinkles.' });
put(['wrinkles','vascular','nl_fold','tear_trough'], { title:'Quit smoking', kind:'lifestyle', works:4, safe:5, evidence:'verified',
  summary:'The library claims smoking adds 7-10 years of facial aging and ranks quitting as the top step after SPF. The skin damage from smoking is well established.' });
put(['wrinkles','tear_trough'], { title:'Sunglasses outdoors', kind:'lifestyle', works:2, safe:5, evidence:'verified',
  summary:'Cuts UV around the eyes and the squinting that deepens crow\'s feet.' });
put(['wrinkles'], { title:'Regular exercise (resistance + easy cardio)', kind:'lifestyle', works:2, safe:4, evidence:'mixed',
  summary:'Library: lift 3-4 times a week plus easy zone-2 cardio and 8,000-10,000 steps. It claims better skin tone, less puffiness and a leaner face.' });

/* ---------- eyes, brows, lashes, lips ---------- */
put(['brow_shape'], { title:'Topical minoxidil on the brows', kind:'non-invasive', minAge:18, works:3, safe:3, evidence:'mixed',
  summary:'Off-label use to thicken brow hair by prolonging the growth phase. Results take months and fade when you stop.',
  risks:'Skin irritation and unwanted hair nearby. Keep it away from the eyes.' });
put(['brow_shape','lashes'], { title:'Dye brows and lashes 1-2 shades darker', kind:'non-invasive', works:3, safe:4, evidence:'unverified',
  summary:'Raises contrast so the eye frame looks sharper. The library suggests beard dye; use a product made for eyebrows and lashes instead and patch test first.',
  risks:'Allergic reaction, and eye injury if dye gets in the eye.' });
put(['lashes'], { title:'Bimatoprost lash serum (Latisse)', kind:'medical', works:4, safe:3, evidence:'verified',
  summary:'Prescription serum that lengthens, thickens and darkens lashes by prolonging the growth phase.',
  risks:'Eye irritation, darkening of the eyelid skin, and rare iris color change.' });
put(['scleral'], { title:'Redness-relief eye drops', kind:'non-invasive', works:2, safe:3, evidence:'mixed',
  summary:'Vasoconstrictor drops reduce redness for a brighter sclera. The library says they mostly matter if you have a darker sclera or bright iris. They do not change how much sclera shows.',
  risks:'Rebound redness with overuse.' });
put(['canthal_tilt'], { title:'Orbital pushing', kind:'non-invasive', works:1, safe:2, evidence:'unverified',
  summary:'Pressing the corner of the orbit is claimed to raise the apparent tilt by 1-2 degrees for about 15-20 minutes. It is temporary and the library calls it a fraud.',
  risks:'Eye irritation; no lasting effect.' });
put(['canthal_tilt','hooding'], { title:'Tight hat or hoodie pull', kind:'non-invasive', works:1, safe:4, evidence:'unverified',
  summary:'Pulling the forehead skin back with a snug hat (and hoodie) temporarily gives the look of a higher tilt or more brow-ridge hooding, mostly in photos.',
  risks:'Headache if too tight.' });
put(['vermilion'], { title:'Lip massage and resistance training', kind:'non-invasive', works:1, safe:5, evidence:'unverified',
  summary:'Stretching, flicking and flexing against resistance for a few minutes, claimed to raise blood flow for slightly fuller lips. The library calls it minor.' });
put(['vermilion'], { title:'Isotretinoin for fuller lips (claimed)', kind:'medical', works:1, safe:2, evidence:'unverified',
  summary:'The library claims lips look fuller after a drying, inflamed phase. That is a side effect, not a real improvement, and the library marks it disputed.',
  risks:'Cracked, sore lips plus all isotretinoin risks.' });
