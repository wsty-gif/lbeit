
class SearchResults {
  constructor(container){ this.container = container; }

  render(list){
    this.container.innerHTML = list.map(job => `
      <div class="result-card">
        <h3 class="result-title">${job.name}</h3>
        <p class="result-sub">${job.prefecture} / ${job.city} ・ 最寄り：${job.station}</p>
        <div class="summary">
          <span class="badge">${(job.jobCategories||[]).join("・")}</span>
          <span class="badge">時給 ${job.wage?.toLocaleString()}円〜</span>
          ${(job.tags||[]).map(t=>`<span class="badge">${t}</span>`).join("")}
        </div>
      </div>
    `).join("");
  }
}
