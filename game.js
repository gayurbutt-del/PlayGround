(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmtMoney = n => '$ ' + Math.max(0, Math.floor(n)).toLocaleString('en-US');
  const countries = [
    {id:'pk',name:'Pakistan',flag:'🇵🇰',lang:'اردو · Urdu',locale:'ur-PK',city:'Karachi',district:'Clifton',lat:24.8138,lon:67.0294,color:'#c2d4b8',home:'Clifton safehouse',greeting:'چلو، شہر دیکھتے ہیں۔'},
    {id:'us',name:'USA',flag:'🇺🇸',lang:'English · US',locale:'en-US',city:'Los Santos',district:'Vespucci',lat:34.0205,lon:-118.2856,color:'#dca9a2',home:'Vespucci safehouse',greeting:'All right. Let’s see where the day takes us.'},
    {id:'in',name:'India',flag:'🇮🇳',lang:'हिन्दी · Hindi',locale:'hi-IN',city:'Mumbai',district:'Bandra West',lat:19.0596,lon:72.8295,color:'#deb38b',home:'Bandra safehouse',greeting:'चलो, शहर घूमते हैं।'},
    {id:'cn',name:'China',flag:'🇨🇳',lang:'中文 · Chinese',locale:'zh-CN',city:'Shanghai',district:'The Bund',lat:31.2304,lon:121.4737,color:'#b9b58e',home:'Bund safehouse',greeting:'走吧，去城里看看。'},
    {id:'bd',name:'Bangladesh',flag:'🇧🇩',lang:'বাংলা · Bengali',locale:'bn-BD',city:'Dhaka',district:'Gulshan',lat:23.7925,lon:90.4078,color:'#a6c5a5',home:'Gulshan safehouse',greeting:'চলো, শহরটা ঘুরে দেখি।'},
    {id:'tr',name:'Turkey',flag:'🇹🇷',lang:'Türkçe · Turkish',locale:'tr-TR',city:'Istanbul',district:'Karaköy',lat:41.0255,lon:28.9741,color:'#d8a2a3',home:'Karaköy safehouse',greeting:'Hadi şehri keşfedelim.'},
    {id:'ir',name:'Iran',flag:'🇮🇷',lang:'فارسی · Persian',locale:'fa-IR',city:'Tehran',district:'Niavaran',lat:35.8034,lon:51.4318,color:'#b9c9a6',home:'Niavaran safehouse',greeting:'بیا شهر را بگردیم.'},
    {id:'sa',name:'Saudi Arabia',flag:'🇸🇦',lang:'العربية · Arabic',locale:'ar-SA',city:'Jeddah',district:'Al-Balad',lat:21.5433,lon:39.1728,color:'#dab98b',home:'Al-Balad safehouse',greeting:'هيا بنا لنكتشف المدينة.'}
  ];
  const $el = id => document.getElementById(id);
  const savedCountry = localStorage.getItem('gtaLite.country');
  let profile = {verified:localStorage.getItem('gtaLite.verified') === 'yes', country:savedCountry, firstRun:!savedCountry};
  let currentCountry = countries.find(c => c.id === profile.country) || countries[1];
  let activeCharacter = 'lucia', cash = 2450, health = 86, stamina = 77, wanted = 0;
  let appReady = false, rainAmount = 0, weatherText = 'CLEAR', weatherIcon = '☀', temperature = 24, weatherSource = 'LOCAL WORLD CLOCK';
  let gameTime = new Date(), gameDate = new Date(), lightStatus = false;
  let vehicle = null, speed = 0, fuel = 78, mud = 0, carColorIndex = 0, race = null;
  let cameraIndex = 2, cameraModes = ['CINEMATIC','FIRST PERSON','THIRD PERSON','DRONE / AERIAL','DIRECTOR MODE'];
  let player = {x:0,y:0,angle:0}, lastFrame = 0, keys = new Set(), nearbyLandmark = null;
  let toastTimer, dialogueTimer, raceTimer, rainTimer = 0, lastWorldWeather = 0;
  let canvas, ctx, mapCanvas, mapCtx, cw = 0, ch = 0, dpr = 1, elapsed = 0;
  const BLOCK = 430, ROAD = 104;
  const landmarks = [
    {id:'safehouse',name:'SAFEHOUSE',x:-118,y:-105,kind:'home',action:'safehouse',label:'LIVING ROOM'},
    {id:'showroom',name:'MOTOR CLUB',x:370,y:-210,kind:'shop',action:'showroom',label:'SHOWROOM'},
    {id:'race',name:'PINK SLIP SPRINT',x:680,y:225,kind:'race',action:'race',label:'RACE MEET'},
    {id:'hospital',name:'ST. FIACRE CLINIC',x:-450,y:210,kind:'hospital',action:'hospital',label:'CLINIC'},
    {id:'police',name:'POLICE STATION',x:-425,y:-240,kind:'police',action:'police',label:'POLICE STATION'},
    {id:'garage',name:'CAR WASH + MODS',x:205,y:430,kind:'garage',action:'garage',label:'WASH / CUSTOMIZE'},
    {id:'fuel',name:'PETROL PUMP',x:500,y:-430,kind:'fuel',action:'fuel',label:'FUEL STATION'},
    {id:'station1',name:'STATION 01',x:-650,y:20,kind:'train',action:'station',label:'OUTGOING TRAIN'},
    {id:'station2',name:'STATION 02',x:645,y:-215,kind:'train',action:'station',label:'INCOMING TRAIN'},
    {id:'food',name:'LITTLE SEOUL DELI',x:-200,y:460,kind:'food',action:'food',label:'FOOD + DRINK'},
    {id:'court',name:'VESPUCCI COURTS',x:215,y:-620,kind:'court',action:'court',label:'BASKETBALL'},
    {id:'airport',name:'CITY AIRFIELD',x:860,y:-540,kind:'airport',action:'airport',label:'AIRFIELD'}
  ];

  function showToast(message) {
    const el = $el('toast'); if (!el) return;
    el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function t(key, fallback) {
    const dict = {
      pk:{'Good afternoon':'السلام علیکم','The city is alive.':'شہر جاگ رہا ہے۔','Hey, watch where you’re going!':'ارے، ذرا دیکھ کر!'},
      in:{'Good afternoon':'नमस्ते','The city is alive.':'शहर जाग रहा है।','Hey, watch where you’re going!':'अरे, संभलकर चलो!'},
      cn:{'Good afternoon':'下午好','The city is alive.':'城市醒来了。','Hey, watch where you’re going!':'嘿，看着点！'},
      bd:{'Good afternoon':'শুভ অপরাহ্ন','The city is alive.':'শহর জেগে উঠছে।','Hey, watch where you’re going!':'এই, দেখে চলো!'},
      tr:{'Good afternoon':'İyi günler','The city is alive.':'Şehir uyanıyor.','Hey, watch where you’re going!':'Önüne baksana!'},
      ir:{'Good afternoon':'عصر بخیر','The city is alive.':'شهر بیدار می‌شود.','Hey, watch where you’re going!':'جلویت را نگاه کن!'},
      sa:{'Good afternoon':'مساء الخير','The city is alive.':'المدينة تستيقظ.','Hey, watch where you’re going!':'انتبه إلى طريقك!'}
    };
    return dict[currentCountry.id]?.[key] || fallback || key;
  }
  function setView(view) {
    $el('onboarding').classList.toggle('hidden', view !== 'onboard');
    $el('game').classList.toggle('hidden', view !== 'game');
    if (view === 'game') { appReady = true; resizeCanvases(); syncHud(); }
  }
  function showAgeError() {
    const el = $el('ageMessage'); el.textContent = 'ACCESS RESTRICTED — YOU MUST BE 18 OR OLDER TO ENTER.'; el.classList.add('blocked');
    setTimeout(() => el.classList.remove('blocked'), 3500);
  }
  function verifyBirth(dayId, monthId, yearId) {
    const day = Number($el(dayId).value), month = Number($el(monthId).value), year = Number($el(yearId).value);
    const today = new Date();
    if (!day || !month || !year || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      const el = $el('ageMessage'); el.textContent = 'ENTER A VALID DATE OF BIRTH TO CONTINUE.'; el.classList.remove('blocked'); return;
    }
    const born = new Date(year, month - 1, day);
    if (born.getFullYear() !== year || born.getMonth() !== month - 1 || born.getDate() !== day || born > today) {
      const el = $el('ageMessage'); el.textContent = 'THAT DATE DOESN’T LOOK RIGHT — CHECK AND TRY AGAIN.'; el.classList.remove('blocked'); return;
    }
    const age = today.getFullYear() - year - (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0);
    if (age < 18) { showAgeError(); return; }
    localStorage.setItem('gtaLite.verified','yes'); profile.verified = true;
    $el('ageMessage').textContent = '';
    $el('verifyView').classList.add('hidden'); $el('countryView').classList.remove('hidden');
    if (savedCountry) chooseCountry(countries.find(c => c.id === savedCountry) || countries[1]);
  }
  function buildCountryList() {
    const grid = $el('countryGrid'); grid.innerHTML = '';
    countries.forEach((c, i) => {
      const btn = document.createElement('button'); btn.className = 'country-card';
      btn.innerHTML = `<span class="flag">${c.flag}</span><b>${c.name}</b><small>${c.lang}</small><span class="coordinates">REGION 0${i+1}</span>`;
      btn.addEventListener('click', () => chooseCountry(c)); grid.appendChild(btn);
    });
  }
  function chooseCountry(country) {
    currentCountry = country; profile.country = country.id; localStorage.setItem('gtaLite.country', country.id);
    player.x = -118; player.y = -105; player.angle = 0; vehicle = null; cash = 2450; health = 86; stamina = 77;
    if (!profile.verified) { setView('onboard'); return; }
    setView('game'); applyCountry(); setupWeather(); showToast(`${country.flag} ${country.city} loaded · ${country.home}`);
    setTimeout(() => showDialogue('LUCIA', country.greeting), 700);
  }
  function applyCountry() {
    const city = currentCountry.city.toUpperCase(), district = currentCountry.district.toUpperCase();
    $el('regionLabel').textContent = `${city}, ${currentCountry.id === 'us' ? 'USA' : currentCountry.name.toUpperCase()}`;
    $el('districtLabel').textContent = district;
    $('.map-label').textContent = district;
    $el('sceneLabel').textContent = `${district} · ${weatherText}`;
    $el('gpsLabel').textContent = currentCountry.home.toUpperCase();
    $el('welcomeTitle').textContent = `${t('Good afternoon','Good afternoon')}, Lucia.`;
  }
  function startSplash() {
    setTimeout(() => {
      const splash = $el('splash'); splash.classList.add('out');
      setTimeout(() => { splash.remove(); if (profile.verified) { if (profile.country) { setView('game'); applyCountry(); setupWeather(); } else { setView('onboard'); $el('verifyView').classList.add('hidden'); $el('countryView').classList.remove('hidden'); } } else setView('onboard'); }, 650);
    }, 1900);
  }

  function resizeCanvases() {
    if (!canvas || !canvas.isConnected) return;
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); cw = rect.width; ch = rect.height;
    canvas.width = Math.round(cw*dpr); canvas.height = Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    mapCanvas = $el('minimap'); mapCtx = mapCanvas.getContext('2d');
    drawMinimap();
  }
  function hash(x,y) { const n=Math.sin(x*127.1+y*311.7+41.3)*43758.5453; return n-Math.floor(n); }
  function worldToScreen(x,y,cameraX,cameraY,scale) {
    let dx=(x-cameraX)*scale, dy=(y-cameraY)*scale;
    if (cameraIndex === 3) dy *= .72;
    if (cameraIndex === 0 || cameraIndex === 4) { const a=player.angle*.2; const rx=dx*Math.cos(a)-dy*Math.sin(a); dy=dx*Math.sin(a)+dy*Math.cos(a); dx=rx; }
    return [cw/2+dx,ch/2+dy];
  }
  function drawWorld(ts) {
    if (!ctx) return;
    if (!appReady) { requestAnimationFrame(drawWorld); return; }
    const elapsedSec = Math.min(.05,(ts-lastFrame)/1000 || 0); lastFrame=ts; elapsed += elapsedSec;
    if (!race) movePlayer(elapsedSec);
    const scale = cameraIndex===3?0.57:cameraIndex===1?1.48:cameraIndex===0?0.88:cameraIndex===4?0.73:1.04;
    const cameraX=player.x, cameraY=player.y;
    ctx.clearRect(0,0,cw,ch);
    const night=gameTime.getHours()<7||gameTime.getHours()>=18;
    const base=night?'#33363b':currentCountry.color;
    ctx.fillStyle=base; ctx.fillRect(0,0,cw,ch);
    const range=Math.ceil(Math.max(cw,ch)/(BLOCK*scale))+2;
    const px=player.x/BLOCK, py=player.y/BLOCK;
    for(let gx=Math.floor(px)-range;gx<=Math.floor(px)+range;gx++) for(let gy=Math.floor(py)-range;gy<=Math.floor(py)+range;gy++) drawBlock(gx,gy,cameraX,cameraY,scale,night);
    drawRoads(cameraX,cameraY,scale,night);
    drawLandmarks(cameraX,cameraY,scale,night);
    drawStreetProps(cameraX,cameraY,scale,night);
    drawVehicles(cameraX,cameraY,scale,night);
    drawPeople(cameraX,cameraY,scale);
    if(vehicle) drawCar(cw/2,ch/2,player.angle,vehicle.color,vehicle.model,true,scale);
    else drawPlayer(cw/2,ch/2,player.angle,scale);
    if(rainAmount>0) drawRain();
    if(night) drawNightOverlay();
    const nearest=findNearby(); nearbyLandmark=nearest;
    $el('interactHint').classList.toggle('hidden',!nearest || nearest.distance>78);
    if(nearest && nearest.distance<78) $el('hintText').textContent=`${nearest.landmark.label} · E TO INTERACT`;
    $el('speedNumber').textContent=String(Math.round(Math.abs(speed))).padStart(2,'0');
    $el('gearLabel').textContent=vehicle ? (vehicle.model.toUpperCase().slice(0,12)) : 'ON FOOT';
    $el('sceneLabel').textContent=`${currentCountry.district.toUpperCase()} · ${weatherText}`;
    updateClock(ts); drawMinimap();
    requestAnimationFrame(drawWorld);
  }
  function drawBlock(gx,gy,cameraX,cameraY,scale,night) {
    const x0=gx*BLOCK+ROAD/2+8, y0=gy*BLOCK+ROAD/2+8, size=BLOCK-ROAD-16;
    const [sx,sy]=worldToScreen(x0,y0,cameraX,cameraY,scale), s=size*scale;
    if(sx+s<-80||sy+s<-80||sx>cw+80||sy>ch+80)return;
    const h=hash(gx,gy), park=h<.12;
    ctx.fillStyle=park?(night?'#263a32':'#6d9870'):(night?'#555057':'#c3a99b');
    ctx.fillRect(sx,sy,s,s);
    ctx.fillStyle=park?(night?'#355044':'#82a67c'):(night?'#4b4850':'#b69486');
    ctx.fillRect(sx+5*scale,sy+5*scale,s-10*scale,s-10*scale);
    if(park){drawPark(sx,sy,s,gx,gy,scale);return;}
    const inset=16+(h*20); const bx=sx+inset*scale,by=sy+inset*scale,bw=s-(inset+28)*scale,bh=s-(inset+28)*scale;
    const palette=night?['#67616b','#595e67','#6a5a61','#555e5d']:['#d4c3b4','#d9c6a9','#c9b9ae','#d0b1a3','#bac2ad'];
    const shadow=Math.max(2,8*scale);
    ctx.fillStyle='#24242b75';ctx.fillRect(bx+shadow,by+shadow,bw,bh);
    ctx.fillStyle=palette[Math.floor(hash(gx+4,gy-3)*palette.length)];ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle=night?'#8f7978':'#e2c6af';ctx.fillRect(bx,by,bw,Math.max(3,5*scale));
    const floors=1+Math.floor(hash(gx-2,gy+4)*3), winW=Math.max(2,7*scale), winH=Math.max(2,9*scale), gap=18*scale;
    for(let r=0;r<floors;r++)for(let col=0;col<4;col++){
      const wx=bx+gap+col*((bw-gap*1.6)/4), wy=by+13*scale+r*((bh-20*scale)/floors);
      if(wx+winW<bx+bw&&wy+winH<by+bh){ctx.fillStyle=night?(hash(gx+col,gy+r)<.43?'#ffd18b':'#343943'):'#788b8d';ctx.fillRect(wx,wy,winW,winH);}
    }
    if(scale>.38){ctx.fillStyle=night?'#dab87c':'#98735f';ctx.fillRect(bx+bw*.43,by+bh-13*scale,12*scale,13*scale);}
    if(h>.77&&scale>.5){ctx.fillStyle='#f6d5bd';ctx.font=`${Math.max(5,7*scale)}px DM Mono`;ctx.fillText(['MOTEL','MARKET','LAUNDRY','CAFÉ'][Math.floor(h*12)%4],bx+5*scale,by+bh+9*scale);}
  }
  function drawPark(x,y,s,gx,gy,scale){
    ctx.strokeStyle='#c9d4ad';ctx.lineWidth=Math.max(1,2*scale);ctx.strokeRect(x+s*.18,y+s*.18,s*.64,s*.64);
    ctx.strokeStyle='#d5cfac';ctx.beginPath();ctx.moveTo(x+s*.18,y+s*.55);ctx.lineTo(x+s*.82,y+s*.55);ctx.moveTo(x+s*.5,y+s*.18);ctx.lineTo(x+s*.5,y+s*.82);ctx.stroke();
    for(let n=0;n<6;n++){const tx=x+(hash(gx+n,gy+2)*.7+.13)*s,ty=y+(hash(gx-4,gy+n)*.7+.13)*s;drawTree(tx,ty,Math.max(2,6*scale),scale);}
  }
  function drawRoads(cameraX,cameraY,scale,night){
    const startX=Math.floor((cameraX-cw/scale/2)/BLOCK)-2,endX=Math.ceil((cameraX+cw/scale/2)/BLOCK)+2;
    const startY=Math.floor((cameraY-ch/scale/2)/BLOCK)-2,endY=Math.ceil((cameraY+ch/scale/2)/BLOCK)+2;
    for(let gx=startX;gx<=endX;gx++){
      const [x,y]=worldToScreen(gx*BLOCK-ROAD/2,cameraY,cameraX,cameraY,scale),w=ROAD*scale;
      ctx.fillStyle=night?'#52515a':'#d0bca8';ctx.fillRect(x-7*scale,0,w+14*scale,ch);
      ctx.fillStyle=night?'#292a30':'#646066';ctx.fillRect(x,0,w,ch);
      ctx.strokeStyle=night?'#88818b':'#e0cba6';ctx.lineWidth=Math.max(.7,1*scale);ctx.setLineDash([12*scale,12*scale]);ctx.beginPath();ctx.moveTo(x+w/2,0);ctx.lineTo(x+w/2,ch);ctx.stroke();ctx.setLineDash([]);
      drawCrosswalk(x,y,w,scale);
    }
    for(let gy=startY;gy<=endY;gy++){
      const [x,y]=worldToScreen(cameraX,gy*BLOCK-ROAD/2,cameraX,cameraY,scale),h=ROAD*scale;
      ctx.fillStyle=night?'#52515a':'#d0bca8';ctx.fillRect(0,y-7*scale,cw,h+14*scale);
      ctx.fillStyle=night?'#292a30':'#646066';ctx.fillRect(0,y,cw,h);
      ctx.strokeStyle=night?'#88818b':'#e0cba6';ctx.lineWidth=Math.max(.7,1*scale);ctx.setLineDash([12*scale,12*scale]);ctx.beginPath();ctx.moveTo(0,y+h/2);ctx.lineTo(cw,y+h/2);ctx.stroke();ctx.setLineDash([]);
      drawCrosswalk(x,y,h,scale);
    }
  }
  function drawCrosswalk(x,y,size,scale){
    if(size<50)return;ctx.fillStyle='#eee4d448';
    const sw=4*scale, gap=7*scale;
    for(let i=0;i<5;i++){ctx.fillRect(x+5*scale,y+ROAD*scale/2-ROAD*scale*.43+i*(sw+gap),size*.44,sw);ctx.fillRect(x+ROAD*scale/2-ROAD*scale*.43+i*(sw+gap),y+5*scale,sw,size*.42);}
  }
  function drawTree(x,y,r,scale){
    if(x<-30||y<-30||x>cw+30||y>ch+30)return;
    ctx.fillStyle='#24262650';ctx.beginPath();ctx.ellipse(x+2*scale,y+3*scale,r*1.2,r*.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#345342';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#53795a';ctx.beginPath();ctx.arc(x-r*.25,y-r*.27,r*.58,0,Math.PI*2);ctx.fill();
  }
  function drawStreetProps(cx,cy,scale,night){
    for(let gx=Math.floor(cx/BLOCK)-3;gx<=Math.floor(cx/BLOCK)+3;gx++)for(let gy=Math.floor(cy/BLOCK)-3;gy<=Math.floor(cy/BLOCK)+3;gy++){
      const seed=hash(gx*2,gy*2), bx=gx*BLOCK+ROAD/2+20,by=gy*BLOCK+ROAD/2+20;
      for(let j=0;j<3;j++){
        const x=bx+j*(BLOCK-ROAD-40)/3+(seed*15),y=by+12+hash(gx+j,gy)*20;const [sx,sy]=worldToScreen(x,y,cx,cy,scale);
        if(seed>.35)drawTree(sx,sy,7*scale,scale);else{ctx.fillStyle=night?'#d9b677':'#727579';ctx.fillRect(sx,sy,4*scale,16*scale);ctx.fillStyle=night?'#ffe9a1':'#9a9ba0';ctx.beginPath();ctx.arc(sx,sy,3*scale,0,Math.PI*2);ctx.fill();}
      }
    }
  }
  function drawLandmarks(cx,cy,scale,night){
    landmarks.forEach((l,i)=>{
      const [x,y]=worldToScreen(l.x,l.y,cx,cy,scale);if(x<-70||y<-70||x>cw+70||y>ch+70)return;
      const palette={home:'#ff789c',shop:'#f3b26e',race:'#ff63aa',hospital:'#83c8ed',police:'#8eb7f6',garage:'#d0a6ff',fuel:'#f7d36b',train:'#b9d1c5',food:'#e7a97d',court:'#b5db9a',airport:'#a6badc'};
      const color=palette[l.kind]||'#fff';
      ctx.fillStyle='#17171c';ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-18*scale,y-13*scale,36*scale,26*scale,3*scale);ctx.fill();ctx.stroke();
      ctx.fillStyle=color;ctx.font=`${Math.max(9,15*scale)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const glyph={home:'⌂',shop:'◇',race:'⌁',hospital:'✚',police:'✧',garage:'◈',fuel:'⛽',train:'▰',food:'▣',court:'●',airport:'✈'}[l.kind]||'•';ctx.fillText(glyph,x,y);
      if(scale>.48){ctx.font=`${Math.max(6,7*scale)}px DM Mono`;ctx.fillStyle='#fff';ctx.fillText(l.label,x,y+22*scale);}
      if(l.id==='race'){ctx.strokeStyle='#ff68a6';ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,y,25*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    });
    // Two distinct city train platforms, with a tiny moving train at each.
    ['station1','station2'].forEach((id,i)=>{const l=landmarks.find(a=>a.id===id),[x,y]=worldToScreen(l.x,l.y,cx,cy,scale),off=((elapsed*(i?24:-20))%60)-30;ctx.fillStyle='#b9c9c4';ctx.fillRect(x-25*scale,y+19*scale,50*scale,3*scale);ctx.fillStyle='#eee';ctx.fillRect(x+off*scale-8*scale,y+13*scale,18*scale,7*scale);ctx.fillStyle='#88c9dd';ctx.fillRect(x+off*scale-4*scale,y+14*scale,4*scale,3*scale);});
    // Game billboards with a small scaffold and workers on alternating blocks.
    for(let gx=-4;gx<=4;gx++)for(let gy=-3;gy<=3;gy++)if(hash(gx+17,gy+9)>.86){const [x,y]=worldToScreen(gx*BLOCK+ROAD/2+45,gy*BLOCK+ROAD/2+45,cx,cy,scale);if(x<-80||y<-80||x>cw+80||y>ch+80)continue;ctx.fillStyle='#22212a';ctx.fillRect(x,y,50*scale,26*scale);ctx.fillStyle='#ff759d';ctx.fillRect(x+3*scale,y+3*scale,44*scale,20*scale);ctx.fillStyle='#fff';ctx.font=`${Math.max(5,6*scale)}px DM Mono`;ctx.textAlign='center';ctx.fillText('FIVE STAR',x+25*scale,y+12*scale);ctx.fillText('CITY STORIES',x+25*scale,y+19*scale);ctx.strokeStyle='#d2a27a';ctx.lineWidth=Math.max(1,1.3*scale);ctx.strokeRect(x-4*scale,y-8*scale,58*scale,38*scale);for(let n=0;n<3;n++){ctx.fillStyle='#e7c2a3';ctx.beginPath();ctx.arc(x+(10+n*16)*scale,y-4*scale+Math.sin(elapsed*3+n)*2*scale,2.2*scale,0,Math.PI*2);ctx.fill();ctx.fillRect(x+(8+n*16)*scale,y-2*scale,4*scale,7*scale);}}
  }
  function drawVehicles(cx,cy,scale,night){
    for(let i=0;i<17;i++){
      const gx=Math.floor(player.x/BLOCK)+Math.floor(hash(i,4)*9)-4,gy=Math.floor(player.y/BLOCK)+Math.floor(hash(8,i)*9)-4;
      const vertical=hash(i,6)>.5, along=(hash(i,12)*BLOCK), x=gx*BLOCK+(vertical?ROAD*(.2+hash(i,3)*.6):along),y=gy*BLOCK+(vertical?along:ROAD*(.2+hash(i,9)*.6));
      const [sx,sy]=worldToScreen(x,y,cx,cy,scale);if(sx<-40||sy<-40||sx>cw+40||sy>ch+40)continue;
      const colors=['#d7c6a9','#697f82','#d88d68','#85926d','#d5d4cb','#5b6270'];drawCar(sx,sy,vertical?Math.PI/2:0,colors[i%colors.length],i%7===0?'LOWRIDER':'SEDAN',false,scale);
    }
    // A conspicuous display car just outside the motor club.
    const showroom=landmarks.find(l=>l.id==='showroom'),[sx,sy]=worldToScreen(showroom.x+65,showroom.y+35,cx,cy,scale);drawCar(sx,sy,.2,'#ef75aa','BLUE-PINK GT',false,scale);
  }
  function drawCar(x,y,angle,color,model,isPlayer,scale=1){
    if(x<-60||y<-60||x>cw+60||y>ch+60)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    const w=isPlayer?41:30,h=isPlayer?23:16;
    ctx.fillStyle='#10111666';ctx.beginPath();ctx.ellipse(1,4,w*.63,h*.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111216';ctx.fillRect(-w*.54,-h*.55,w*.18,h*.31);ctx.fillRect(w*.34,-h*.55,w*.18,h*.31);ctx.fillRect(-w*.54,h*.22,w*.18,h*.31);ctx.fillRect(w*.34,h*.22,w*.18,h*.31);
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-w/2,-h/2);ctx.lineTo(w*.25,-h*.52);ctx.quadraticCurveTo(w*.52,-h*.43,w*.52,0);ctx.quadraticCurveTo(w*.49,h*.46,w*.25,h*.5);ctx.lineTo(-w*.4,h*.48);ctx.quadraticCurveTo(-w*.58,h*.35,-w*.5,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#242832';ctx.beginPath();ctx.moveTo(-w*.19,-h*.38);ctx.lineTo(w*.18,-h*.36);ctx.lineTo(w*.32,0);ctx.lineTo(-w*.18,0);ctx.closePath();ctx.fill();ctx.fillStyle='#eddfc7';ctx.fillRect(w*.4,-h*.35,w*.08,h*.19);ctx.fillRect(w*.4,h*.16,w*.08,h*.19);ctx.fillStyle='#d84f60';ctx.fillRect(-w*.49,-h*.34,w*.07,h*.17);ctx.fillRect(-w*.49,h*.17,w*.07,h*.17);
    if(isPlayer&&model==='FLYING TESLA'){ctx.strokeStyle='#ddd';ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(0,h);ctx.stroke();}
    if(mud>0&&isPlayer){ctx.fillStyle='#70533d';for(let i=0;i<Math.floor(mud*6);i++){ctx.beginPath();ctx.arc((hash(i,3)-.5)*w,(hash(2,i)-.5)*h,2+hash(i,i)*2,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }
  function drawPlayer(x,y,angle,scale=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.fillStyle='#10111670';ctx.beginPath();ctx.ellipse(2,7,10,6,0,0,Math.PI*2);ctx.fill();
    const col=activeCharacter==='lucia'?'#d67083':'#82906a';ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-6,-7,12,17,4);ctx.fill();ctx.fillStyle='#d9ad91';ctx.beginPath();ctx.arc(0,-11,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#27232a';ctx.beginPath();ctx.arc(0,-13,5,Math.PI,Math.PI*2);ctx.fill();ctx.strokeStyle='#17171b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,7);ctx.lineTo(-4,12);ctx.moveTo(3,7);ctx.lineTo(4,12);ctx.stroke();ctx.restore();
  }
  function drawPeople(cx,cy,scale){
    for(let i=0;i<20;i++){
      const a=i*11+Math.floor(elapsed*.22),x=Math.floor(player.x/BLOCK)*BLOCK+hash(i,51)*BLOCK+(elapsed*(i%2?7:-5))%BLOCK,y=Math.floor(player.y/BLOCK)*BLOCK+hash(11,i)*BLOCK;
      const [sx,sy]=worldToScreen(x,y,cx,cy,scale);if(sx<-20||sy<-20||sx>cw+20||sy>ch+20)continue;
      ctx.fillStyle=['#d2a586','#4e5964','#e0c3a5','#8c6670'][i%4];ctx.beginPath();ctx.arc(sx,sy,3*scale,0,Math.PI*2);ctx.fill();ctx.fillRect(sx-2*scale,sy+3*scale,4*scale,8*scale);
      if(i===2&&Math.sin(elapsed*.7)>0.98){ctx.fillStyle='#fff';ctx.font=`${8*scale}px sans-serif`;ctx.fillText(currentCountry.greeting,sx+5,sy-8);}
    }
    // A basketball hoop and the active court's moving players.
    const court=landmarks.find(l=>l.id==='court'),[x,y]=worldToScreen(court.x,court.y,cx,cy,scale);if(x>-40&&y>-40&&x<cw+40&&y<ch+40){ctx.strokeStyle='#ddd';ctx.lineWidth=2*scale;ctx.strokeRect(x-20*scale,y-20*scale,40*scale,40*scale);ctx.fillStyle='#f29b55';ctx.beginPath();ctx.arc(x+Math.sin(elapsed)*9*scale,y,3*scale,0,7);ctx.fill();}
  }
  function drawRain(){
    ctx.save();ctx.strokeStyle='rgba(194,216,238,.48)';ctx.lineWidth=1;for(let i=0;i<Math.floor(cw*ch/850);i++){let x=hash(i,Math.floor(elapsed*17))*cw,y=(hash(i+8,Math.floor(elapsed*14))*ch+elapsed*420)%ch;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+16);ctx.stroke();}ctx.restore();
    ctx.fillStyle='rgba(55,74,95,.12)';ctx.fillRect(0,0,cw,ch);
  }
  function drawNightOverlay(){ctx.fillStyle='rgba(16,23,42,.27)';ctx.fillRect(0,0,cw,ch);}
  function drawMinimap(){
    if(!mapCtx||!mapCanvas)return;const w=mapCanvas.width,h=mapCanvas.height,cx=w/2,cy=h/2;mapCtx.clearRect(0,0,w,h);mapCtx.fillStyle='#1f2c2a';mapCtx.fillRect(0,0,w,h);
    const unit=BLOCK*.22,offX=(player.x%BLOCK)*.22,offY=(player.y%BLOCK)*.22;
    for(let i=-3;i<=3;i++){mapCtx.fillStyle='#555257';mapCtx.fillRect(cx+i*unit-offX-4,0,8,h);mapCtx.fillRect(0,cy+i*unit-offY-4,w,8);mapCtx.strokeStyle='#aaa39b';mapCtx.setLineDash([4,5]);mapCtx.beginPath();mapCtx.moveTo(cx+i*unit-offX,0);mapCtx.lineTo(cx+i*unit-offX,h);mapCtx.moveTo(0,cy+i*unit-offY);mapCtx.lineTo(w,cy+i*unit-offY);mapCtx.stroke();mapCtx.setLineDash([]);}
    mapCtx.strokeStyle='#fa70a5';mapCtx.lineWidth=3;mapCtx.beginPath();mapCtx.moveTo(cx,cy);mapCtx.lineTo(cx+38,cy-27);mapCtx.lineTo(cx+64,cy-27);mapCtx.stroke();
    landmarks.forEach(l=>{const x=cx+(l.x-player.x)*.22,y=cy+(l.y-player.y)*.22;if(x>0&&x<w&&y>0&&y<h){mapCtx.fillStyle=l.id==='race'?'#ff61a4':'#e6d9c6';mapCtx.beginPath();mapCtx.arc(x,y,l.id==='race'?4:2.5,0,Math.PI*2);mapCtx.fill();}});
    mapCtx.save();mapCtx.translate(cx,cy);mapCtx.rotate(player.angle);mapCtx.fillStyle='#fff';mapCtx.beginPath();mapCtx.moveTo(0,-7);mapCtx.lineTo(5,6);mapCtx.lineTo(0,3);mapCtx.lineTo(-5,6);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
  }
  function syncHud(){
    if(!$el('cashValue'))return;
    $el('cashValue').textContent=fmtMoney(cash);$el('healthBar').style.width=`${clamp(health,0,100)}%`;
    $el('activeName').textContent=activeCharacter.toUpperCase();$el('activeAvatar').textContent=activeCharacter==='lucia'?'L':'J';
    $el('activeRole').textContent=activeCharacter==='lucia'?'THE DRIVER':'THE WILDCARD';
    $el('switchLucia').classList.toggle('active',activeCharacter==='lucia');$el('switchJason').classList.toggle('active',activeCharacter==='jason');
    $el('wantedStars').textContent='★'.repeat(wanted)+'☆'.repeat(10-wanted);$el('wantedStars').style.color=wanted?'#ffcd72':'';
    $el('weatherIcon').textContent=weatherIcon;$el('weatherBig').textContent=weatherIcon;$el('weatherLabel').textContent=weatherText;
    $el('weatherLong').textContent=`${weatherText} · ${currentCountry.district.toUpperCase()}`;$el('temperature').textContent=`${temperature}°`;
    $el('weatherSource').textContent=weatherSource;$el('sceneLabel').textContent=`${currentCountry.district.toUpperCase()} · ${weatherText}`;
    $el('cameraMode').textContent=cameraModes[cameraIndex];$('.camera-count').textContent=`0${cameraIndex+1} / 05`;
  }
  function updateClock(){
    gameTime=new Date();
    const time=new Intl.DateTimeFormat(currentCountry.locale,{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:currentCountry.id==='us'?'America/Los_Angeles':currentCountry.id==='pk'?'Asia/Karachi':currentCountry.id==='in'?'Asia/Kolkata':currentCountry.id==='cn'?'Asia/Shanghai':currentCountry.id==='bd'?'Asia/Dhaka':currentCountry.id==='tr'?'Europe/Istanbul':currentCountry.id==='ir'?'Asia/Tehran':'Asia/Riyadh'}).format(gameTime);
    const date=new Intl.DateTimeFormat(currentCountry.locale,{month:'short',day:'2-digit',timeZone:currentCountry.id==='us'?'America/Los_Angeles':currentCountry.id==='pk'?'Asia/Karachi':currentCountry.id==='in'?'Asia/Kolkata':currentCountry.id==='cn'?'Asia/Shanghai':currentCountry.id==='bd'?'Asia/Dhaka':currentCountry.id==='tr'?'Europe/Istanbul':currentCountry.id==='ir'?'Asia/Tehran':'Asia/Riyadh'}).format(gameTime);
    ['clock','localTime'].forEach(id=>{const el=$el(id);if(el)el.textContent=time;});$el('localDate').textContent=date;
  }
  function setupWeather(){
    const conditions=[['CLEAR','☀',0],['PARTLY CLOUDY','⛅',0],['LIGHT RAIN','🌧',.68],['OVERCAST','☁',0]];
    const choice=conditions[Math.floor(Math.random()*conditions.length)];weatherText=choice[0];weatherIcon=choice[1];rainAmount=choice[2];
    temperature=Math.round(17+Math.random()*15);weatherSource='LOCAL LIVE CONDITIONS · '+currentCountry.city.toUpperCase();syncHud();updateClock();
    clearInterval(rainTimer);rainTimer=setInterval(()=>{if(Math.random()<.28){const c=conditions[Math.floor(Math.random()*conditions.length)];weatherText=c[0];weatherIcon=c[1];rainAmount=c[2];temperature=clamp(temperature+(Math.random()<.5?-1:1),12,36);syncHud();}},45000);
  }
  function findNearby(){
    let best=null;for(const landmark of landmarks){const distance=Math.hypot(player.x-landmark.x,player.y-landmark.y);if(!best||distance<best.distance)best={landmark,distance};}return best;
  }
  function movePlayer(dt){
    const up=keys.has('w')||keys.has('arrowup'),down=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright');
    if(left)player.angle-=dt*(vehicle?2.45:2.8);if(right)player.angle+=dt*(vehicle?2.45:2.8);
    const throttle=(up?1:0)-(down?1:0),max=vehicle?285:keys.has('shift')?150:92;
    if(vehicle){speed=lerp(speed,throttle*max,Math.min(1,dt*2.7));if(keys.has(' '))speed*=Math.max(0,1-dt*7);fuel=Math.max(0,fuel-Math.abs(speed)*dt*.00012);if(fuel===0)speed=0;}
    else{speed=lerp(speed,throttle*max,Math.min(1,dt*8));stamina=clamp(stamina+(keys.has('shift')&&up?-dt*10:dt*4),0,100);}
    player.x+=Math.sin(player.angle)*speed*dt;player.y-=Math.cos(player.angle)*speed*dt;
    if(vehicle&&Math.abs(speed)>160&&Math.random()<dt*.22){health=Math.max(0,health-1);if(health===0){health=35;player.x=-118;player.y=-105;vehicle=null;speed=0;showToast('You were taken to the clinic.');}}
  }
  function showDialogue(name,text){$el('dialogueName').textContent=name;$el('dialogueText').textContent=text;$el('dialogue').classList.remove('hidden');clearTimeout(dialogueTimer);dialogueTimer=setTimeout(()=>$el('dialogue').classList.add('hidden'),4200);}
  function openModal(html){$el('modalContent').innerHTML=html;$el('modalRoot').classList.remove('hidden');}
  function closeModal(){$el('modalRoot').classList.add('hidden');}
  function modalHead(kicker,title,desc){return `<div class="modal-kicker">${kicker}</div><h2 class="modal-title">${title}</h2><p class="modal-desc">${desc}</p>`;}
  function modalButton(label,action,secondary=false){return `<button class="${secondary?'tab-btn':'primary-button'}" data-modal-action="${action}">${label}</button>`;}
  function doAction(action){
    const place=landmarks.find(l=>l.action===action);if(place&&Math.hypot(player.x-place.x,player.y-place.y)>85&&action!=='map'){showToast(`Travel to ${place.name} to use this service.`);player.x=lerp(player.x,place.x,.25);player.y=lerp(player.y,place.y,.25);return;}
    switch(action){
      case 'safehouse':openModal(modalHead('HOME · '+currentCountry.district.toUpperCase(),'Your safehouse','A quiet place to reset, change your look, and plan the next move.')+`<div class="detail-row"><span>REST & RECOVER</span><b>Free</b></div><div class="detail-row"><span>WALLET</span><b>${fmtMoney(cash)}</b></div><div class="modal-actions">${modalButton('REST UP · RESTORE HEALTH','rest')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'race':openModal(modalHead('CITY EVENT · OPEN ENTRY','Pink Slip Sprint','A short mixed-terrain sprint through the downtown grid. Finish the route to win a cash prize.')+`<div class="detail-row"><span>ENTRY FEE</span><b>$ 150</b></div><div class="detail-row"><span>PRIZE</span><b>$ 1,200</b></div><div class="race-meter"><i id="raceProgress"></i></div><div class="race-status" id="raceStatus">READY AT THE START LINE</div><div class="modal-actions">${modalButton('START SPRINT','startRace')} ${modalButton('NOT NOW','close',true)}</div>`);break;
      case 'showroom':openModal(modalHead('MOTOR CLUB · CUSTOM SHOP','Pick your next ride','Browse four city-ready rides. Your current vehicle remains yours until you buy another.')+`<div class="service-choice"><b>01 · SANDPIPER GT</b><span>Balanced coupe · $ 1,800</span>${modalButton('BUY','buy:Sandpiper GT:1800')}</div><div class="service-choice"><b>02 · PALM BEACH LOWRIDER</b><span>Classic cruiser · $ 1,250</span>${modalButton('BUY','buy:Palm Beach Lowrider:1250')}</div><div class="service-choice"><b>03 · NIGHTSHIFT SPORT</b><span>Street-tuned · $ 2,100</span>${modalButton('BUY','buy:Nightshift Sport:2100')}</div><div class="modal-actions">${modalButton('CLOSE','close',true)}</div>`);break;
      case 'hospital':openModal(modalHead('ST. FIACRE CLINIC','Walk-in care','Get back on your feet. Care costs $250 and restores your health.')+`<div class="detail-row"><span>HEALTH</span><b>${health}%</b></div><div class="modal-actions">${modalButton('GET TREATED · $250','heal')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'garage':openModal(modalHead('SERVICE BAY','Car wash + mods','Clean the road grime off your ride, or tune its finish for $180.')+`<div class="detail-row"><span>FUEL</span><b>${Math.round(fuel)}%</b></div><div class="modal-actions">${modalButton('WASH + REPAIR · $180','wash')} ${modalButton('REFUEL · $90','refuel')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'fuel':if(cash>=90){cash-=90;fuel=100;syncHud();showToast('Tank topped up · $90.');}else showToast('Not enough cash for fuel.');break;
      case 'food':openModal(modalHead('LITTLE SEOUL DELI','Take a breather','A warm meal restores stamina and a little health.')+`<div class="modal-actions">${modalButton('ORDER LUNCH · $35','foodBuy')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'police':openModal(modalHead('CITY POLICE','A quiet word','Lose one wanted level by paying a $300 fine. Or leave before anyone notices.')+`<div class="detail-row"><span>WANTED LEVEL</span><b>${wanted} / 10</b></div><div class="modal-actions">${modalButton('PAY FINE · $300','fine')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'station':showToast('Train service is running · platforms connect the east and west districts.');break;
      case 'court':openModal(modalHead('VESPUCCI COURTS','Pickup game','The court is open. Take a quick shot and enjoy the neighborhood.')+`<div class="modal-actions">${modalButton('SHOOT HOOPS','hoops')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'airport':openModal(modalHead('CITY AIRFIELD','Flight school','The airfield is open for sightseeing. Hire a light aircraft for $500.')+`<div class="modal-actions">${modalButton('TAKE A FLIGHT · $500','flight')} ${modalButton('CLOSE','close',true)}</div>`);break;
      case 'map':openModal(modalHead('CITY MAP','Find your next stop','Select a place to set out. The city is yours to explore.')+landmarks.map(l=>`<button class="map-destination" data-dest="${l.id}"><b>${l.label}</b><span>${l.name}</span></button>`).join(''));break;
      case 'phone':openPhone();break;
      default:showToast('Nothing to do here yet.');
    }
  }
  function openPhone(){
    openModal(modalHead('PERSONAL DEVICE · FIVE STAR OS','City phone','Call a contact, check your map, or take a quick ride.')+`<div class="phone-shell"><div class="phone-brand">FIVE STAR MOBILE</div><div class="phone-time" id="phoneTime">--:--</div><div class="phone-date">${currentCountry.city.toUpperCase()} · ${currentCountry.district.toUpperCase()}</div><div class="phone-tabs"><button class="active" data-phone-tab="contacts">CONTACTS</button><button data-phone-tab="rides">RIDES</button></div><div class="phone-screen" id="phoneScreen"><button class="contact-tile" data-call="Lucia">LUCIA <small>Favorite · available</small></button><button class="contact-tile" data-call="Jason">JASON <small>Partner · available</small></button><button class="contact-tile" data-call="Dre">DRE <small>Motor club · busy</small></button></div></div><div class="modal-actions">${modalButton('CLOSE','close',true)}</div>`);
    $el('phoneTime').textContent=$el('clock').textContent;
  }
  function startRace(){
    if(cash<150){showToast('You need $150 for the entry fee.');return;}cash-=150;syncHud();race={start:performance.now(),duration:vehicle?38:55,progress:0};
    $el('raceStatus').textContent='SPRINT ACTIVE · KEEP MOVING';showToast('Sprint started · follow the pink route!');
  }
  function tickRace(dt){
    if(!race)return;
    if(keys.has('w')||keys.has('arrowup'))race.progress+=dt*(vehicle?Math.max(.4,Math.abs(speed)/95):.32);
    if(keys.has('s')||keys.has('arrowdown'))race.progress+=dt*.15;
    const fill=$el('raceProgress');if(fill)fill.style.width=`${Math.min(100,race.progress*100)}%`;
    const status=$el('raceStatus');if(status)status.textContent=`SPRINT ACTIVE · ${Math.floor(race.progress*100)}%`;
    if(race.progress>=1){race=null;cash+=1200;wanted=Math.max(0,wanted-1);syncHud();openModal(modalHead('EVENT COMPLETE · FIRST PLACE','Clean getaway.','You completed the Pink Slip Sprint and collected your prize.')+`<div class="detail-row"><span>PRIZE MONEY</span><b>$ 1,200</b></div><div class="modal-actions">${modalButton('BACK TO THE CITY','close')}</div>`);showToast('Race won · $1,200 added to your wallet!');}
    else if(performance.now()-race.start>120000){race=null;openModal(modalHead('EVENT OVER','The pack got away.','No worries—take a breather and try the sprint again.')+`<div class="modal-actions">${modalButton('OKAY','close')}</div>`);}
  }
  function performModalAction(action){
    if(action==='close'){closeModal();return;}
    if(action==='rest'){health=100;stamina=100;wanted=0;vehicle=null;speed=0;player.x=-118;player.y=-105;closeModal();syncHud();showToast('Rested up · home sweet home.');return;}
    if(action==='heal'){if(cash<250){showToast('Not enough cash for treatment.');return;}cash-=250;health=100;syncHud();closeModal();showToast('You feel good as new.');return;}
    if(action==='wash'){if(cash<180){showToast('Not enough cash for service.');return;}cash-=180;mud=0;health=Math.min(100,health+20);syncHud();closeModal();showToast('Fresh detail · vehicle repaired.');return;}
    if(action==='refuel'){if(cash<90){showToast('Not enough cash for fuel.');return;}cash-=90;fuel=100;syncHud();closeModal();showToast('Tank topped up.');return;}
    if(action==='foodBuy'){if(cash<35){showToast('Not enough cash for lunch.');return;}cash-=35;health=Math.min(100,health+8);stamina=100;syncHud();closeModal();showToast('Lunch was exactly what you needed.');return;}
    if(action==='fine'){if(!wanted){showToast('You have no wanted level.');return;}if(cash<300){showToast('Not enough cash for the fine.');return;}cash-=300;wanted=0;syncHud();closeModal();showToast('Fine paid · the heat is off.');return;}
    if(action==='hoops'){stamina=Math.max(0,stamina-12);if(Math.random()<.58){cash+=25;showToast('Nothing but net · $25 from the friendly wager.');}else showToast('Good shot. The next one is yours.');syncHud();closeModal();return;}
    if(action==='flight'){if(cash<500){showToast('Not enough cash for a flight.');return;}cash-=500;vehicle={model:'FLYING TESLA',color:'#a7c7d7'};player.x=860;player.y=-540;syncHud();closeModal();showToast('Sightseeing flight started · enjoy the view!');return;}
    if(action.startsWith('buy:')){const [,model,priceText]=action.split(':'),price=Number(priceText);if(cash<price){showToast('Not enough cash for that ride.');return;}cash-=price;vehicle={model:model.toUpperCase(),color:['#ee79a4','#d4bd91','#89a6b1'][Math.floor(Math.random()*3)]};fuel=100;syncHud();closeModal();showToast(`${model} is yours. Take it for a spin!`);return;}
  }
  function setDestination(id){const l=landmarks.find(a=>a.id===id);if(!l)return;player.x=l.x-48;player.y=l.y-32;closeModal();showToast(`GPS set · ${l.name}`);}
  function interact(){if(!nearbyLandmark||nearbyLandmark.distance>78){if(vehicle){vehicle=null;speed=0;showToast('You stepped out of the vehicle.');}else{const car=findNearbyCar();if(car){vehicle={model:car,color:'#d7c6a9'};showToast(`You got into a ${car}.`);}else showToast('Nothing nearby to interact with.');}return;}const l=nearbyLandmark.landmark;if(l.action==='safehouse'||l.action==='showroom'||l.action==='race'||l.action==='hospital'||l.action==='police'||l.action==='garage'||l.action==='fuel'||l.action==='food'||l.action==='court'||l.action==='airport'||l.action==='station')doAction(l.action);}
  function findNearbyCar(){return Math.hypot(player.x-30,player.y)<65?'SEDAN':null;}
  function cycleCamera(){cameraIndex=(cameraIndex+1)%cameraModes.length;syncHud();showToast(`Camera · ${cameraModes[cameraIndex]}`);}
  function switchCharacter(character){activeCharacter=character;syncHud();showDialogue(character.toUpperCase(),character==='lucia'?'Ready when you are.':'Let’s make this interesting.');}
  function toggleVoice(){const lines=[t('The city is alive.','The city is alive.'),t('Hey, watch where you’re going!','Looking good out there.'),currentCountry.greeting];showDialogue(activeCharacter.toUpperCase(),lines[Math.floor(Math.random()*lines.length)]);}
  function bindEvents(){
    $el('verifyEmail').addEventListener('click',()=>verifyBirth('day1','month1','year1'));
    $el('verifyDob').addEventListener('click',()=>verifyBirth('day2','month2','year2'));
    $el('verifyView').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verifyBirth('day2','month2','year2');}});
    $el('switchLucia').addEventListener('click',()=>switchCharacter('lucia'));$el('switchJason').addEventListener('click',()=>switchCharacter('jason'));
    $el('cameraBtn').addEventListener('click',cycleCamera);$el('phoneBtn').addEventListener('click',openPhone);$el('voiceBtn').addEventListener('click',toggleVoice);
    $el('allActivities').addEventListener('click',()=>doAction('map'));$el('settingsBtn').addEventListener('click',()=>openModal(modalHead('SETTINGS','Your city, your rules','Change your region or return to the opening screen.')+`<div class="detail-row"><span>CURRENT REGION</span><b>${currentCountry.name}</b></div><div class="modal-actions">${modalButton('CHANGE CITY','changeCity')} ${modalButton('HELP / CONTROLS','help',true)}</div>`));
    $el('refreshWeather').addEventListener('click',()=>{setupWeather();showToast('Local weather refreshed.');});
    document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(key)){if(!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))e.preventDefault();keys.add(key);}if(key==='e'&&!$el('modalRoot').classList.contains('hidden'))return;if(key==='e')interact();if(key==='c')cycleCamera();if(key==='p')openPhone();if(key==='v')toggleVoice();if(key==='escape')closeModal();});
    document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    $el('modalClose').addEventListener('click',closeModal);$el('modalScrim').addEventListener('click',closeModal);
    $el('modalContent').addEventListener('click',e=>{const button=e.target.closest('[data-modal-action]');if(button){const action=button.dataset.modalAction;if(action==='startRace'){startRace();return;}if(action==='changeCity'){closeModal();profile.verified=true;$el('onboarding').classList.remove('hidden');$el('game').classList.add('hidden');$el('verifyView').classList.add('hidden');$el('countryView').classList.remove('hidden');return;}if(action==='help'){openModal(modalHead('QUICK HELP','City controls','WASD to move · Shift to sprint · E to interact / enter a car · C camera · P phone · V voice · Space brake.')+`<div class="modal-actions">${modalButton('GOT IT','close')}</div>`);return;}if(action.startsWith('buy:')){performModalAction(action);return;}performModalAction(action);return;}const destination=e.target.closest('[data-dest]');if(destination){setDestination(destination.dataset.dest);return;}const call=e.target.closest('[data-call]');if(call){showToast(`Calling ${call.dataset.call}… no answer right now.`);return;}const tab=e.target.closest('[data-phone-tab]');if(tab){$$('[data-phone-tab]').forEach(x=>x.classList.toggle('active',x===tab));$el('phoneScreen').innerHTML=tab.dataset.phoneTab==='rides'?`<button class="contact-tile" data-modal-action="buy:Sandpiper GT:1800">SANDPIPER GT <small>Request vehicle · $1,800</small></button><button class="contact-tile" data-modal-action="buy:Palm Beach Lowrider:1250">PALM BEACH <small>Request vehicle · $1,250</small></button>`:`<button class="contact-tile" data-call="Lucia">LUCIA <small>Favorite · available</small></button><button class="contact-tile" data-call="Jason">JASON <small>Partner · available</small></button>`;}});
    $$('[data-action]').forEach(el=>el.addEventListener('click',()=>doAction(el.dataset.action)));
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){canvas.setPointerCapture(e.pointerId);keys.add('w');}});canvas.addEventListener('pointerup',()=>keys.delete('w'));canvas.addEventListener('pointercancel',()=>keys.delete('w'));
    window.addEventListener('resize',resizeCanvases);
  }
  function init(){canvas=$el('world');ctx=canvas.getContext('2d');mapCanvas=$el('minimap');mapCtx=mapCanvas.getContext('2d');buildCountryList();bindEvents();
    const today=new Date();for(const id of ['day1','day2'])$el(id).value=String(today.getDate()).padStart(2,'0');for(const id of ['month1','month2'])$el(id).value=String(today.getMonth()+1).padStart(2,'0');$el('year1').value=$el('year2').value=String(today.getFullYear()-25);
    startSplash();requestAnimationFrame(drawWorld);
  }
  const originalDrawWorld=drawWorld;
  drawWorld=function(ts){if(appReady&&race){const dt=Math.min(.05,(ts-lastFrame)/1000||0);movePlayer(dt);tickRace(dt);}originalDrawWorld(ts);};
  init();
})();
