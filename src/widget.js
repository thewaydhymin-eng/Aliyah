
(function(){
  var T = {
    en:{label:"Aliyah of the Day", days:["Sun","Mon","Tue","Wed","Thu","Fri","Shabbat"], ord:["1st","2nd","3rd","4th","5th","6th","7th"], aliyah:"Aliyah",
        action:"Action", aod:"Action of the Day", remember:"Take this with you", deeper:"Haftarah & Brit Chadashah", none:"The next Aliyah is on its way.", tg:"Join us on Telegram", wa:"Join the WhatsApp group",
        months:["January","February","March","April","May","June","July","August","September","October","November","December"], wd:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Shabbat"]},
    af:{label:"Aliyah van die Dag", days:["Son","Ma","Di","Wo","Do","Vr","Shabbat"], ord:["1ste","2de","3de","4de","5de","6de","7de"], aliyah:"Aliyah",
        action:"Aksie", aod:"Aksie van die Dag", remember:"Neem dit saam", deeper:"Haftarah & Brit Chadashah", none:"Die volgende Aliyah is op pad.", tg:"Sluit aan by Telegram", wa:"Sluit aan by die WhatsApp-groep",
        months:["Januarie","Februarie","Maart","April","Mei","Junie","Julie","Augustus","September","Oktober","November","Desember"], wd:["Sondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrydag","Shabbat"]}
  };
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  // today's date in South Africa
  var today; try{ today = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Johannesburg"}).format(new Date()); }catch(e){ today = new Date().toISOString().slice(0,10); }
  var live = ALIYOT.filter(function(a){return a && a.date <= today;}).sort(function(a,b){return a.date<b.date?-1:1;});
  var lang = "en"; try{ lang = localStorage.getItem("tw-lang") || "en"; }catch(e){}
  var current = live.length ? live[live.length-1] : null;

  function fmt(d,L){ var p=d.split("-"), dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); return T[L].wd[dt.getUTCDay()]+" "+(+p[2])+" "+T[L].months[+p[1]-1]+" "+p[0]; }

  function render(){
    var L=T[lang];
    $("tw-en").setAttribute("aria-pressed", lang==="en"); $("tw-af").setAttribute("aria-pressed", lang==="af");
    $("tw-label").textContent = L.label; $("tw-tg").textContent = L.tg; $("tw-wa").textContent = L.wa;
    // week strip
    var wk = $("tw-week"); wk.innerHTML="";
    for(var i=1;i<=7;i++){
      var hit = current && live.filter(function(a){return a.parashah===current.parashah && a.aliyah===i;})[0];
      var b=document.createElement("button"); b.type="button"; b.className="tw-day";
      b.innerHTML="<b>"+i+"</b><small>"+L.days[i-1]+"</small>";
      b.setAttribute("aria-label", L.ord[i-1]+" "+L.aliyah);
      if(!hit){ b.disabled=true; } else { (function(a){ b.onclick=function(){ current=a; render(); }; })(hit); }
      if(hit && hit===current) b.setAttribute("aria-current","true");
      wk.appendChild(b);
    }
    var card=$("tw-card");
    if(!current){ $("tw-date").textContent=""; card.innerHTML='<p class="tw-empty">'+L.none+'</p>'; return; }
    $("tw-date").textContent = "· "+fmt(current.date,lang);
    var c = current[lang] || current.en, h="";
    h+='<div class="tw-head"><p class="tw-ref">Parashat '+esc(current.parashah)+' '+esc(current.year)+' · <span>'+L.ord[current.aliyah-1]+' '+L.aliyah+'</span> · '+esc(current.ref)+'</p>';
    if(c.blessing) h+='<p class="tw-bless">'+esc(c.blessing)+'</p>';
    h+='<h2 class="tw-hook">'+esc(c.hook)+'</h2></div>';
    h+='<p class="tw-sum">'+esc(c.summary)+'</p><ol class="tw-qs">';
    (c.questions||[]).forEach(function(q){
      h+='<li class="tw-q"><div><h3>'+esc(q.q)+(q.ref?' <span class="r">('+esc(q.ref)+')</span>':'')+'</h3>';
      if(q.answer) h+='<p>'+esc(q.answer)+'</p>';
      if(q.key && q.key.length){ h+='<div class="tw-key">'+q.key.map(function(k){return '<p>'+esc(k)+'</p>';}).join("")+'</div>'; }
      if(q.action){ h+='<div class="tw-act"><strong>'+L.action+'</strong><span class="h">'+esc(q.action)+'</span>'+(q.detail?'<p>'+esc(q.detail)+'</p>':'')+'</div>'; }
      h+='</div></li>';
    });
    h+='</ol>';
    if(c.deeper){ h+='<div class="tw-deep"><h3>'+L.deeper+'</h3><p>'+esc(c.deeper)+'</p></div>'; }
    if(c.closing || c.actionOfDay){
      h+='<div class="tw-close"><small>'+(c.actionOfDay?L.aod:L.remember)+'</small>';
      if(c.closing) h+='<p>'+esc(c.closing)+'</p>';
      if(c.actionOfDay) h+='<p>'+esc(c.actionOfDay)+'</p>';
      h+='</div>';
    }
    var slug=(BASE||'')+'/'+current.year+'/'+String(current.parashah).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'/'+current.aliyah+'/';
    h+='<p class="tw-perma"><a href="'+slug+'" target="_blank" rel="noopener">'+(lang==='af'?'Permanente skakel en argief':'Permanent link and archive')+' &rarr;</a></p>';
    card.innerHTML=h;
  }
  function setLang(l){ lang=l; try{ localStorage.setItem("tw-lang", l); }catch(e){} render(); }
  $("tw-en").onclick=function(){setLang("en");}; $("tw-af").onclick=function(){setLang("af");};
  render();
})();
