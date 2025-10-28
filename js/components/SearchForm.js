// js/components/SearchForm.js
class SearchForm {
  constructor(container, onSearch) {
    this.el = container;
    this.onSearch = onSearch;
    this.state = { keyword: "", locations: [], jobs: [], prefs: [] };
    this.render();
  }

  async render() {
    const ds = await DataService.distincts();
    this.ds = ds;

    this.el.innerHTML = `
      <div class="card">
        <div style="display:grid;gap:16px;">
          <div>
            <label class="block text-sm font-semibold mb-1">キーワード検索</label>
            <input id="sf-key" class="input" placeholder="例：カフェ／接客／倉庫" />
          </div>

          <div class="search-condition" style="border:1px solid #e5e5e5;border-radius:8px;background:#fff;overflow:hidden;">
            ${this.condRowTpl("loc","勤務地")}
            ${this.condRowTpl("job","職種")}
            ${this.condRowTpl("pref","こだわり条件")}
          </div>

          <button id="btn-search" class="btn btn-primary">この条件で検索する</button>
        </div>
      </div>
    `;

    this.el.querySelector("#sf-key").addEventListener("input", e => {
      this.state.keyword = e.target.value.trim();
    });

    this.el.querySelector("#open-loc").addEventListener("click", () => this.openSlide("loc"));
    this.el.querySelector("#open-job").addEventListener("click", () => this.openSlide("job"));
    this.el.querySelector("#open-pref").addEventListener("click", () => this.openSlide("pref"));
    this.el.querySelector("#btn-search").addEventListener("click", () => this.applySearch());

    this.ensureSlideContainer();
    this.buildLocationPage();
    this.buildJobPage();
    this.buildPrefPage();
    this.updateConditionLabels();
  }

  condRowTpl(key, label) {
    return `
      <div class="cond-row" id="open-${key}"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;">
        <span style="font-weight:600;">${label}</span>
        <span id="val-${key}" style="flex:1;text-align:right;color:#666;margin-right:8px;">未設定</span>
        <span style="color:#888;">＞</span>
      </div>`;
  }

  updateConditionLabels() {
    const txt = (arr) => arr.length ? arr.slice(0,2).join("、") + (arr.length>2?" ほか":"") : "未設定";
    this.el.querySelector("#val-loc").textContent = txt(this.state.locations);
    this.el.querySelector("#val-job").textContent = txt(this.state.jobs);
    this.el.querySelector("#val-pref").textContent = txt(this.state.prefs);
  }

  ensureSlideContainer() {
    if (document.getElementById("slide-container")) return;
    const wrap = document.createElement("div");
    wrap.id = "slide-container";
    Object.assign(wrap.style, {position:"fixed",inset:"0",overflow:"hidden",zIndex:"2000",pointerEvents:"none"});
    ["loc","job","pref"].forEach(id=>{
      const p=document.createElement("div");
      p.id=`page-${id}`;p.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;visibility:hidden;";
      const inner=document.createElement("div");inner.className="slide-inner";inner.style.cssText="flex:1;display:flex;flex-direction:column;height:100%;";
      p.appendChild(inner);wrap.appendChild(p);
    });
    document.body.appendChild(wrap);
  }

  openSlide(key){
    const c=document.getElementById("slide-container");if(!c)return;c.style.pointerEvents="auto";
    const p=document.getElementById(`page-${key}`);if(!p)return;
    p.style.visibility="visible";requestAnimationFrame(()=>{p.style.transform="translateX(0)";});
  }

  closeSlide(key){
    const c=document.getElementById("slide-container");
    const p=document.getElementById(`page-${key}`);if(!p)return;
    p.style.transform="translateX(100%)";
    setTimeout(()=>{p.style.visibility="hidden";c.style.pointerEvents="none";},350);
  }

  headerTpl(title, backId){
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #eee;background:#fafafa;">
        <button id="${backId}" style="background:none;border:none;font-size:18px;cursor:pointer;">＜</button>
        <h3 style="font-size:18px;font-weight:600;margin:0;">${title}</h3>
      </div>`;
  }

  /** ========== 勤務地 ========== */
  buildLocationPage(){
    const page=document.querySelector("#page-loc .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("勤務地","back-loc")}
      <div id="loc-main" style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="region-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="footer-buttons">
        <button class="btn-clear" id="clear-loc">クリア</button>
        <button class="btn-apply" id="apply-loc">内容を反映する</button>
      </div>`;
    document.getElementById("back-loc").onclick=()=>this.closeSlide("loc");

    const regionMenu=page.querySelector("#region-menu");
    const prefWrap=page.querySelector("#pref-wrap");
    const regions=Object.keys(this.ds.REGION_PREFS);

    regionMenu.innerHTML=regions.map((r,i)=>`<li><button class="side-btn ${i===0?"active":""}" data-region="${r}" style="width:100%;text-align:left;padding:10px;">${r}</button></li>`).join("");

    const updateSelectionStyles=()=>{prefWrap.querySelectorAll("label.opt").forEach(l=>{const i=l.querySelector("input");l.style.background=i.checked?"#ffecec":"transparent";});prefWrap.querySelectorAll("input:checked").forEach(i=>i.style.accentColor="#e53935");};

    const renderPrefs=(region)=>{
      const prefs=this.ds.REGION_PREFS[region]||[];
      prefWrap.innerHTML=prefs.map(pref=>`
        <div style="border-bottom:1px solid #ddd;padding:8px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label class="opt" style="font-size:16px;"><input type="checkbox" data-loc="${pref}"> ${pref}</label>
            <button data-pref="${pref}" class="toggle" style="font-size:18px;border:none;background:none;">＋</button>
          </div>
          <div data-city-list="${pref}" style="display:none;padding-left:16px;"></div>
        </div>`).join("");

      prefWrap.querySelectorAll(".toggle").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const pref=btn.getAttribute("data-pref");
          const list=prefWrap.querySelector(`[data-city-list="${pref}"]`);
          const visible=list.style.display==="block";
          list.style.display=visible?"none":"block";
          btn.textContent=visible?"＋":"－";
          if(!visible && !list.dataset.loaded){
            const citiesObj=window.PREF_CITY_DATA[pref]||{};
            const html=Object.keys(citiesObj).map(city=>{
              const wards=citiesObj[city];
              const hasW=Array.isArray(wards)&&wards.length>0;
              return `
                <div style="border-bottom:1px solid #eee;padding:6px 0;">
                  <div style="display:flex;justify-content:space-between;">
                    <label class="opt" style="font-size:15px;"><input type="checkbox" data-loc="${pref}/${city}"> ${city}</label>
                    ${hasW?`<button data-city="${city}" class="toggle" style="border:none;background:none;font-size:16px;">＋</button>`:""}
                  </div>
                  ${hasW?`<div data-ward-list="${city}" style="display:none;padding-left:16px;">${wards.map(w=>`
                    <div style="border-bottom:1px solid #f0f0f0;padding:4px 0;">
                      <label class="opt" style="font-size:14px;"><input type="checkbox" data-loc="${pref}/${city}/${w}"> ${w}</label>
                    </div>`).join("")}</div>`:""}
                </div>`;}).join("");
            list.innerHTML=html;list.dataset.loaded=true;
          }
        });
      });

      prefWrap.addEventListener("change",e=>{
        if(!e.target.matches('input[type="checkbox"][data-loc]'))return;
        const input=e.target;const loc=input.getAttribute("data-loc");const checked=input.checked;
        const [pref,city,ward]=loc.split("/");

        // 親子連動
        if(ward){
          if(checked){
            const cityCb=prefWrap.querySelector(`input[data-loc="${pref}/${city}"]`);
            const prefCb=prefWrap.querySelector(`input[data-loc="${pref}"]`);
            if(cityCb)cityCb.checked=true;if(prefCb)prefCb.checked=true;
          }else{
            const wards=Array.from(prefWrap.querySelectorAll(`input[data-loc^="${pref}/${city}/"]`)).filter(cb=>cb.checked);
            if(wards.length===0){
              const cityCb=prefWrap.querySelector(`input[data-loc="${pref}/${city}"]`);
              if(cityCb)cityCb.checked=false;
              const cities=Array.from(prefWrap.querySelectorAll(`input[data-loc^="${pref}/"]`)).filter(cb=>cb.checked);
              if(cities.length===0){
                const prefCb=prefWrap.querySelector(`input[data-loc="${pref}"]`);
                if(prefCb)prefCb.checked=false;
              }
            }
          }
        }else if(city){
          const wards=Array.from(prefWrap.querySelectorAll(`input[data-loc^="${pref}/${city}/"]`));
          wards.forEach(cb=>cb.checked=checked);
          const prefCb=prefWrap.querySelector(`input[data-loc="${pref}"]`);
          if(checked&&prefCb)prefCb.checked=true;
        }else{
          const children=Array.from(prefWrap.querySelectorAll(`input[data-loc^="${pref}/"]`));
          children.forEach(cb=>cb.checked=checked);
        }
        updateSelectionStyles();
      });
    };

    regionMenu.querySelectorAll(".side-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        regionMenu.querySelectorAll(".side-btn").forEach(b=>{b.classList.remove("active");b.style.background="#fafafa";});
        btn.classList.add("active");btn.style.background="#eaeaea";
        renderPrefs(btn.getAttribute("data-region"));
      });
    });
    renderPrefs(regions[0]);

    document.getElementById("clear-loc").onclick=()=>{this.state.locations=[];this.updateConditionLabels();};
    document.getElementById("apply-loc").onclick=()=>{
      const checked=Array.from(document.querySelectorAll('#page-loc input[type="checkbox"]:checked')).map(c=>c.getAttribute("data-loc"));
      this.state.locations=checked;this.updateConditionLabels();this.closeSlide("loc");
    };
  }

  /** ========== 職種・こだわり ========== */
  buildJobPage(){
    const page=document.querySelector("#page-job .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("職種","back-job")}
      <div style="flex:1;overflow:auto;padding:16px;">
        <input id="job-key" class="input" placeholder="職種をフリーワードで探す" style="margin-bottom:10px;width:100%;">
        <div id="job-list" style="display:flex;flex-direction:column;gap:8px;">
          ${this.ds.jobCategories.map(j=>`<label class="opt" style="display:block;padding:4px 0;font-size:14px;"><input class="checkbox job-chk" type="checkbox" value="${j}"> ${j}</label>`).join("")}
        </div>
      </div>
      <div class="footer-buttons"><button class="btn-clear" id="clear-job">クリア</button><button class="btn-apply" id="apply-job">内容を反映する</button></div>`;
    document.getElementById("back-job").onclick=()=>this.closeSlide("job");
    document.getElementById("clear-job").onclick=()=>{this.state.jobs=[];this.updateConditionLabels();};
    document.getElementById("apply-job").onclick=()=>{
      const checked=Array.from(document.querySelectorAll("#page-job .job-chk:checked")).map(c=>c.value);
      this.state.jobs=checked;this.updateConditionLabels();this.closeSlide("job");
    };
  }

  buildPrefPage(){
    const page=document.querySelector("#page-pref .slide-inner");
    page.innerHTML=`
      ${this.headerTpl("こだわり条件","back-pref")}
      <div style="flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:33% 67%;gap:12px;">
        <ul id="pref-menu" style="list-style:none;padding:0;margin:0;border-right:1px solid #ddd;"></ul>
        <div id="pref-wrap"></div>
      </div>
      <div class="footer-buttons"><button class="btn-clear" id="clear-pref">クリア</button><button class="btn-apply" id="apply-pref">内容を反映する</button></div>`;
    document.getElementById("back-pref").onclick=()=>this.closeSlide("pref");
    const menu=page.querySelector("#pref-menu"),wrap=page.querySelector("#pref-wrap");
    const cats=Object.keys(this.ds.preferences);
    menu.innerHTML=cats.map((c,i)=>`<li><button class="side-btn ${i===0?"active":""}" data-cat="${c}" style="width:100%;text-align:left;padding:10px;">${c}</button></li>`).join("");
    const renderCat=(cat)=>{const opts=this.ds.preferences[cat]||[];wrap.innerHTML=opts.map(o=>`<label class="opt" style="display:block;padding:4px 0;font-size:14px;"><input class="checkbox pref-chk" type="checkbox" value="${o}"> ${o}</label>`).join("");};
    menu.querySelectorAll(".side-btn").forEach(b=>b.addEventListener("click",()=>{menu.querySelectorAll(".side-btn").forEach(a=>{a.classList.remove("active");a.style.background="#fafafa";});b.classList.add("active");b.style.background="#eaeaea";renderCat(b.getAttribute("data-cat"));}));
    renderCat(cats[0]);
    document.getElementById("clear-pref").onclick=()=>{this.state.prefs=[];this.updateConditionLabels();};
    document.getElementById("apply-pref").onclick=()=>{
      const checked=Array.from(document.querySelectorAll("#page-pref .pref-chk:checked")).map(c=>c.value);
      this.state.prefs=checked;this.updateConditionLabels();this.closeSlide("pref");
    };
  }

  async applySearch(){
    const all=await DataService.getAllAccounts();
    const k=(this.state.keyword||"").toLowerCase();
    const filtered=all.filter(job=>{
      const text=`${job.name} ${job.station} ${job.jobCategories?.join(" ")} ${job.jobDisplay} ${job.address}`.toLowerCase();
      const passKey=k?text.includes(k):true;
      const passLoc=this.state.locations.length?this.state.locations.some(loc=>{
        const [pref,city,ward]=loc.split("/");
        const s=`${job.prefecture}/${job.city}`;
        if(ward)return `${job.prefecture}/${job.city}/${job.ward||""}`.includes(loc);
        return s.includes(city)||job.prefecture===pref;
      }):true;
      const passJob=this.state.jobs.length?(job.jobCategories||[]).some(j=>this.state.jobs.includes(j)):true;
      const passPref=this.state.prefs.length?(job.tags||[]).some(t=>this.state.prefs.includes(t)):true;
      return passKey&&passLoc&&passJob&&passPref;
    });
    this.onSearch(filtered);
  }
}
